import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import {
    createSubstationSchema,
    updateSubstationSchema,
} from "./substation.validation.js";

export const createSubstation = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = createSubstationSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten().fieldErrors,
            });
        }

        const { name, code, description, zoneId } = result.data;

        const zone = await prisma.zone.findFirst({
            where: {
                id: zoneId,
                deletedAt: null,
            },
        });

        if (!zone) {
            return res.status(404).json({
                success: false,
                message: "Zone not found",
            });
        }

        const normalizedCode = code.toUpperCase();

        const duplicate = await prisma.substation.findFirst({
            where: {
                OR: [
                    {
                        code: normalizedCode,
                    },
                    {
                        zoneId,
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
                message: "Substation already exists",
            });
        }

        const substation = await prisma.substation.create({
            data: {
                name,
                code: normalizedCode,
                description,
                zoneId,
            },
            include: {
                zone: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });

        return res.status(201).json({
            success: true,
            message: "Substation created successfully",
            data: substation,
        });
    } catch (error) {
        console.error("Create substation error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getSubstations = async (
    req: Request,
    res: Response,
) => {
    try {
        const zoneId =
            typeof req.query.zoneId === "string"
                ? req.query.zoneId
                : undefined;

        const substations = await prisma.substation.findMany({
            where: {
                deletedAt: null,
                ...(zoneId && { zoneId }),
            },
            include: {
                zone: {
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
            message: "Substations retrieved successfully",
            data: substations,
        });
    } catch (error) {
        console.error("Get substations error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getSubstationById = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const substation = await prisma.substation.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            include: {
                zone: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });

        if (!substation) {
            return res.status(404).json({
                success: false,
                message: "Substation not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Substation retrieved successfully",
            data: substation,
        });
    } catch (error) {
        console.error("Get substation error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateSubstation = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const result = updateSubstationSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const existingSubstation = await prisma.substation.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!existingSubstation) {
            return res.status(404).json({
                success: false,
                message: "Substation not found",
            });
        }

        const {
            name,
            code,
            description,
            zoneId,
            status,
        } = result.data;

        if (zoneId) {
            const zone = await prisma.zone.findFirst({
                where: {
                    id: zoneId,
                    deletedAt: null,
                },
            });

            if (!zone) {
                return res.status(404).json({
                    success: false,
                    message: "Zone not found",
                });
            }
        }

        if (name || code || zoneId) {
            const targetZoneId = zoneId ?? existingSubstation.zoneId;

            const duplicate = await prisma.substation.findFirst({
                where: {
                    id: {
                        not: id,
                    },
                    OR: [
                        ...(code
                            ? [
                                {
                                    code: code.toUpperCase(),
                                },
                            ]
                            : []),
                        ...(name
                            ? [
                                {
                                    zoneId: targetZoneId,
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
                    message: "Substation already exists",
                });
            }
        }

        const updatedSubstation = await prisma.substation.update({
            where: {
                id,
            },
            data: {
                ...(name !== undefined && { name }),
                ...(code !== undefined && {
                    code: code.toUpperCase(),
                }),
                ...(description !== undefined && { description }),
                ...(zoneId !== undefined && { zoneId }),
                ...(status !== undefined && { status }),
            },
            include: {
                zone: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            message: "Substation updated successfully",
            data: updatedSubstation,
        });
    } catch (error) {
        console.error("Update substation error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const deleteSubstation = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const substation = await prisma.substation.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!substation) {
            return res.status(404).json({
                success: false,
                message: "Substation not found",
            });
        }

        await prisma.substation.update({
            where: {
                id,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        return res.status(200).json({
            success: true,
            message: "Substation deleted successfully",
        });
    } catch (error) {
        console.error("Delete substation error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};