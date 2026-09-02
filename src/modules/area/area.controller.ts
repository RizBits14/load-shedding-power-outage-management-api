import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import {
    createAreaSchema,
    updateAreaSchema,
} from "./area.validation.js";

export const createArea = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = createAreaSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten().fieldErrors,
            });
        }

        const {
            name,
            code,
            description,
            priority,
            latitude,
            longitude,
            feederId,
        } = result.data;

        const feeder = await prisma.feeder.findFirst({
            where: {
                id: feederId,
                deletedAt: null,
            },
        });

        if (!feeder) {
            return res.status(404).json({
                success: false,
                message: "Feeder not found",
            });
        }

        const normalizedCode = code.toUpperCase();

        const duplicate = await prisma.area.findFirst({
            where: {
                OR: [
                    {
                        code: normalizedCode,
                    },
                    {
                        feederId,
                        name: {
                            equals: name,
                            mode: "insensitive",
                        },
                    },
                ],
            },
        });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: "Area already exists",
            });
        }

        const area = await prisma.area.create({
            data: {
                name,
                code: normalizedCode,
                description,
                priority,
                latitude,
                longitude,
                feederId,
            },
            include: {
                feeder: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        substation: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                zone: {
                                    select: {
                                        id: true,
                                        name: true,
                                        code: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return res.status(201).json({
            success: true,
            message: "Area created successfully",
            data: area,
        });
    } catch (error) {
        console.error("Create area error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getAreas = async (
    req: Request,
    res: Response,
) => {
    try {
        const feederId =
            typeof req.query.feederId === "string"
                ? req.query.feederId
                : undefined;

        const areas = await prisma.area.findMany({
            where: {
                deletedAt: null,
                ...(feederId && { feederId }),
            },
            include: {
                feeder: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Areas retrieved successfully",
            data: areas,
        });
    } catch (error) {
        console.error("Get areas error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getAreaById = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const area = await prisma.area.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            include: {
                feeder: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        substation: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                zone: {
                                    select: {
                                        id: true,
                                        name: true,
                                        code: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!area) {
            return res.status(404).json({
                success: false,
                message: "Area not found",
            });
        }

        const customerCount = await prisma.customerProfile.count({
            where: {
                areaId: id,
            },
        });

        if (customerCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Area cannot be deleted while customers are assigned to it",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Area retrieved successfully",
            data: area,
        });
    } catch (error) {
        console.error("Get area error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateArea = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const result = updateAreaSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const existingArea = await prisma.area.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!existingArea) {
            return res.status(404).json({
                success: false,
                message: "Area not found",
            });
        }

        const {
            name,
            code,
            description,
            priority,
            latitude,
            longitude,
            feederId,
        } = result.data;

        if (feederId) {
            const feeder = await prisma.feeder.findFirst({
                where: {
                    id: feederId,
                    deletedAt: null,
                },
            });

            if (!feeder) {
                return res.status(404).json({
                    success: false,
                    message: "Feeder not found",
                });
            }
        }

        if (name || code || feederId) {
            const targetFeederId =
                feederId ?? existingArea.feederId;

            const duplicate = await prisma.area.findFirst({
                where: {
                    id: {
                        not: id,
                    },
                    OR: [
                        ...(code
                            ? [{ code: code.toUpperCase() }]
                            : []),

                        ...(name
                            ? [
                                {
                                    feederId: targetFeederId,
                                    name: {
                                        equals: name,
                                        mode: "insensitive" as const,
                                    },
                                },
                            ]
                            : []),
                    ],
                },
            });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message: "Area already exists",
                });
            }
        }

        const area = await prisma.area.update({
            where: {
                id,
            },
            data: {
                ...(name !== undefined && { name }),

                ...(code !== undefined && {
                    code: code.toUpperCase(),
                }),

                ...(description !== undefined && {
                    description,
                }),

                ...(priority !== undefined && {
                    priority,
                }),

                ...(latitude !== undefined && {
                    latitude,
                }),

                ...(longitude !== undefined && {
                    longitude,
                }),

                ...(feederId !== undefined && {
                    feederId,
                }),
            },
        });

        return res.status(200).json({
            success: true,
            message: "Area updated successfully",
            data: area,
        });
    } catch (error) {
        console.error("Update area error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const deleteArea = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const area = await prisma.area.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!area) {
            return res.status(404).json({
                success: false,
                message: "Area not found",
            });
        }

        await prisma.area.update({
            where: {
                id,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        return res.status(200).json({
            success: true,
            message: "Area deleted successfully",
        });
    } catch (error) {
        console.error("Delete area error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};