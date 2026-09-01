import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import { createSubstationSchema } from "./substation.validation.js";

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