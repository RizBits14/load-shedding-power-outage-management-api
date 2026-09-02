import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import {
    createOutageReportSchema,
    outageReportQuerySchema,
    reviewOutageReportSchema,
} from "./outage-report.validation.js";

export const createOutageReport = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = createOutageReportSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten().fieldErrors,
            });
        }

        const customerId = res.locals.user.id;

        const profile = await prisma.customerProfile.findUnique({
            where: {
                userId: customerId,
            },
            include: {
                area: true,
            },
        });

        if (!profile) {
            return res.status(400).json({
                success: false,
                message: "Create your customer profile before reporting an outage",
            });
        }

        if (profile.area.deletedAt) {
            return res.status(400).json({
                success: false,
                message: "Your assigned area is currently unavailable",
            });
        }

        const existingReport = await prisma.outageReport.findFirst({
            where: {
                customerId,
                areaId: profile.areaId,
                status: {
                    in: ["PENDING", "VERIFIED"],
                },
            },
        });

        if (existingReport) {
            return res.status(409).json({
                success: false,
                message: "You already have an unresolved outage report",
            });
        }

        const report = await prisma.outageReport.create({
            data: {
                issueType: result.data.issueType,
                description: result.data.description,
                customerId,
                areaId: profile.areaId,
            },
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        priority: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return res.status(201).json({
            success: true,
            message: "Outage report submitted successfully",
            data: report,
        });
    } catch (error) {
        console.error("Create outage report error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getMyOutageReports = async (
    _req: Request,
    res: Response,
) => {
    try {
        const customerId = res.locals.user.id;

        const reports = await prisma.outageReport.findMany({
            where: {
                customerId,
            },
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
            orderBy: {
                reportedAt: "desc",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Your outage reports retrieved successfully",
            data: reports,
        });
    } catch (error) {
        console.error("Get customer outage reports error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getMyOutageReportById = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const customerId = res.locals.user.id;
        const { id } = req.params;

        const report = await prisma.outageReport.findFirst({
            where: {
                id,
                customerId,
            },
            include: {
                area: {
                    include: {
                        feeder: {
                            include: {
                                substation: {
                                    include: {
                                        zone: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "Outage report not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Outage report retrieved successfully",
            data: report,
        });
    } catch (error) {
        console.error("Get outage report error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getOutageReports = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = outageReportQuerySchema.safeParse(req.query);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: result.error.flatten(),
            });
        }

        const {
            page,
            limit,
            status,
            issueType,
            areaId,
        } = result.data;

        const where = {
            ...(status && { status }),
            ...(issueType && { issueType }),
            ...(areaId && { areaId }),
        };

        const [reports, total] = await Promise.all([
            prisma.outageReport.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },

                    area: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            priority: true,
                        },
                    },

                    reviewedBy: {
                        select: {
                            id: true,
                            name: true,
                            role: true,
                        },
                    },
                },

                orderBy: {
                    reportedAt: "desc",
                },

                skip: (page - 1) * limit,
                take: limit,
            }),

            prisma.outageReport.count({
                where,
            }),
        ]);

        return res.status(200).json({
            success: true,
            message: "Outage reports retrieved successfully",
            data: reports,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get outage reports error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getOutageReportById = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const report = await prisma.outageReport.findUnique({
            where: {
                id,
            },

            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                area: {
                    include: {
                        feeder: {
                            include: {
                                substation: {
                                    include: {
                                        zone: true,
                                    },
                                },
                            },
                        },
                    },
                },

                reviewedBy: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "Outage report not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Outage report retrieved successfully",
            data: report,
        });
    } catch (error) {
        console.error("Get outage report error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const reviewOutageReport = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const result = reviewOutageReportSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const report = await prisma.outageReport.findUnique({
            where: {
                id,
            },
        });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "Outage report not found",
            });
        }

        if (report.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: "Only pending outage reports can be reviewed",
            });
        }

        const updatedReport = await prisma.outageReport.update({
            where: {
                id,
            },

            data: {
                status: result.data.status,
                reviewNote: result.data.reviewNote,
                reviewedById: res.locals.user.id,
                reviewedAt: new Date(),
            },

            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                area: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        priority: true,
                    },
                },

                reviewedBy: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            message:
                result.data.status === "VERIFIED"
                    ? "Outage report verified successfully"
                    : "Outage report rejected successfully",
            data: updatedReport,
        });
    } catch (error) {
        console.error("Review outage report error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};