import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";

import { incidentQuerySchema } from "./incident.validation.js";

import { createAuditLogSafely } from "../audit/audit.service.js";

export const createIncidentFromReport = async (
    req: Request<{ reportId: string }>,
    res: Response,
) => {
    try {
        const { reportId } = req.params;

        const sourceReport = await prisma.outageReport.findUnique({
            where: {
                id: reportId,
            },
            include: {
                area: true,
            },
        });

        if (!sourceReport) {
            return res.status(404).json({
                success: false,
                message: "Outage report not found",
            });
        }

        if (sourceReport.status !== "VERIFIED") {
            return res.status(400).json({
                success: false,
                message: "Only verified outage reports can create an incident",
            });
        }

        if (sourceReport.incidentId) {
            return res.status(409).json({
                success: false,
                message: "This outage report is already linked to an incident",
            });
        }

        const windowStart = new Date(
            sourceReport.reportedAt.getTime() - 30 * 60 * 1000,
        );

        const windowEnd = new Date(
            sourceReport.reportedAt.getTime() + 30 * 60 * 1000,
        );

        const clusterReports = await prisma.outageReport.findMany({
            where: {
                areaId: sourceReport.areaId,
                status: "VERIFIED",
                incidentId: null,

                reportedAt: {
                    gte: windowStart,
                    lte: windowEnd,
                },
            },
            orderBy: {
                reportedAt: "asc",
            },
        });

        const priorityWeights = {
            NORMAL: 10,
            HIGH: 25,
            CRITICAL: 40,
        };

        const areaScore =
            priorityWeights[sourceReport.area.priority];

        const reportScore = Math.min(
            clusterReports.length * 10,
            40,
        );

        const hasTotalOutage = clusterReports.some(
            (report) => report.issueType === "TOTAL_OUTAGE",
        );

        const issueScore = hasTotalOutage ? 20 : 10;

        const priorityScore = Math.min(
            areaScore + reportScore + issueScore,
            100,
        );

        let severity:
            | "LOW"
            | "MEDIUM"
            | "HIGH"
            | "CRITICAL";

        if (priorityScore >= 80) {
            severity = "CRITICAL";
        } else if (priorityScore >= 60) {
            severity = "HIGH";
        } else if (priorityScore >= 35) {
            severity = "MEDIUM";
        } else {
            severity = "LOW";
        }

        const incidentCode =
            `PS-${new Date().getFullYear()}-${randomUUID()
                .slice(0, 8)
                .toUpperCase()}`;

        const startedAt =
            clusterReports[0]?.reportedAt ??
            sourceReport.reportedAt;

        const incident = await prisma.$transaction(
            async (tx) => {
                const createdIncident =
                    await tx.outageIncident.create({
                        data: {
                            incidentCode,
                            title: `Outage in ${sourceReport.area.name}`,

                            summary:
                                `Automatically clustered ${clusterReports.length} verified outage report(s)`,

                            areaId: sourceReport.areaId,
                            createdById: res.locals.user.id,

                            severity,
                            priorityScore,
                            startedAt,
                        },
                    });

                await tx.outageReport.updateMany({
                    where: {
                        id: {
                            in: clusterReports.map(
                                (report) => report.id,
                            ),
                        },
                    },

                    data: {
                        status: "LINKED",
                        incidentId: createdIncident.id,
                    },
                });

                return tx.outageIncident.findUnique({
                    where: {
                        id: createdIncident.id,
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

                        reports: {
                            select: {
                                id: true,
                                issueType: true,
                                status: true,
                                reportedAt: true,
                                customer: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },

                        createdBy: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                            },
                        },
                    },
                });
            },
        );

        if (incident) {
            await createAuditLogSafely({
                req,

                actorId:
                    res.locals.user.id,

                actorRole:
                    res.locals.user.role,

                action:
                    "INCIDENT_CLUSTER_CREATED",

                entityType:
                    "INCIDENT",

                entityId:
                    incident.id,

                description:
                    `Incident ${incident.incidentCode} was created from clustered outage reports.`,

                metadata: {
                    areaId:
                        incident.area.id,

                    linkedReportCount:
                        incident.reports.length,

                    severity:
                        incident.severity,

                    priorityScore:
                        incident.priorityScore,
                },
            });
        }

        return res.status(201).json({
            success: true,
            message:
                "Outage incident created and reports clustered successfully",
            data: incident,
        });
    } catch (error) {
        console.error("Create incident error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getIncidents = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = incidentQuerySchema.safeParse(req.query);

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
            severity,
            areaId,
            search,
        } = result.data;

        const where = {
            deletedAt: null,

            ...(status && { status }),
            ...(severity && { severity }),
            ...(areaId && { areaId }),

            ...(search && {
                OR: [
                    {
                        incidentCode: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },
                    {
                        title: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },
                ],
            }),
        };

        const [incidents, total] = await Promise.all([
            prisma.outageIncident.findMany({
                where,

                include: {
                    area: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            priority: true,
                        },
                    },

                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            role: true,
                        },
                    },

                    _count: {
                        select: {
                            reports: true,
                        },
                    },
                },

                orderBy: [
                    {
                        priorityScore: "desc",
                    },
                    {
                        createdAt: "desc",
                    },
                ],

                skip: (page - 1) * limit,
                take: limit,
            }),

            prisma.outageIncident.count({
                where,
            }),
        ]);

        return res.status(200).json({
            success: true,
            message: "Outage incidents retrieved successfully",
            data: incidents,

            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get incidents error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getIncidentById = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const incident = await prisma.outageIncident.findFirst({
            where: {
                id,
                deletedAt: null,
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

                reports: {
                    orderBy: {
                        reportedAt: "asc",
                    },

                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
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
                },

                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Outage incident not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Outage incident retrieved successfully",
            data: incident,
        });
    } catch (error) {
        console.error("Get incident error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};