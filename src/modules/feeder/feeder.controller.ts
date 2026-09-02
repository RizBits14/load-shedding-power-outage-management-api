import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import {
    createFeederSchema,
    updateFeederSchema,
} from "./feeder.validation.js";

export const createFeeder = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = createFeederSchema.safeParse(req.body);

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
            capacityMw,
            substationId,
        } = result.data;

        const substation = await prisma.substation.findFirst({
            where: {
                id: substationId,
                deletedAt: null,
            },
        });

        if (!substation) {
            return res.status(404).json({
                success: false,
                message: "Substation not found",
            });
        }

        const normalizedCode = code.toUpperCase();

        const duplicate = await prisma.feeder.findFirst({
            where: {
                OR: [
                    {
                        code: normalizedCode,
                    },
                    {
                        substationId,
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
                message: "Feeder already exists",
            });
        }

        const feeder = await prisma.feeder.create({
            data: {
                name,
                code: normalizedCode,
                description,
                capacityMw,
                substationId,
            },
            include: {
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
        });

        return res.status(201).json({
            success: true,
            message: "Feeder created successfully",
            data: feeder,
        });
    } catch (error) {
        console.error("Create feeder error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getFeeders = async (
    req: Request,
    res: Response,
) => {
    try {
        const substationId =
            typeof req.query.substationId === "string"
                ? req.query.substationId
                : undefined;

        const feeders = await prisma.feeder.findMany({
            where: {
                deletedAt: null,
                ...(substationId && { substationId }),
            },
            include: {
                substation: {
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
            message: "Feeders retrieved successfully",
            data: feeders,
        });
    } catch (error) {
        console.error("Get feeders error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getFeederById = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const feeder = await prisma.feeder.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            include: {
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
        });

        if (!feeder) {
            return res.status(404).json({
                success: false,
                message: "Feeder not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Feeder retrieved successfully",
            data: feeder,
        });
    } catch (error) {
        console.error("Get feeder error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateFeeder = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const result = updateFeederSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const existingFeeder = await prisma.feeder.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!existingFeeder) {
            return res.status(404).json({
                success: false,
                message: "Feeder not found",
            });
        }

        const {
            name,
            code,
            description,
            capacityMw,
            substationId,
            status,
        } = result.data;

        if (substationId) {
            const substation = await prisma.substation.findFirst({
                where: {
                    id: substationId,
                    deletedAt: null,
                },
            });

            if (!substation) {
                return res.status(404).json({
                    success: false,
                    message: "Substation not found",
                });
            }
        }

        if (name || code || substationId) {
            const targetSubstationId =
                substationId ?? existingFeeder.substationId;

            const duplicate = await prisma.feeder.findFirst({
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
                                    substationId: targetSubstationId,
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
                    message: "Feeder already exists",
                });
            }
        }

        const feeder = await prisma.feeder.update({
            where: {
                id,
            },
            data: {
                ...(name !== undefined && { name }),
                ...(code !== undefined && {
                    code: code.toUpperCase(),
                }),
                ...(description !== undefined && { description }),
                ...(capacityMw !== undefined && { capacityMw }),
                ...(substationId !== undefined && { substationId }),
                ...(status !== undefined && { status }),
            },
        });

        return res.status(200).json({
            success: true,
            message: "Feeder updated successfully",
            data: feeder,
        });
    } catch (error) {
        console.error("Update feeder error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const deleteFeeder = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const feeder = await prisma.feeder.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!feeder) {
            return res.status(404).json({
                success: false,
                message: "Feeder not found",
            });
        }

        await prisma.feeder.update({
            where: {
                id,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        return res.status(200).json({
            success: true,
            message: "Feeder deleted successfully",
        });
    } catch (error) {
        console.error("Delete feeder error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};