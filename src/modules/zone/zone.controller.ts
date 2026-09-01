import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import { createZoneSchema } from "./zone.validation.js";

export const createZone = async (req: Request, res: Response) => {
    try {
        const result = createZoneSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten().fieldErrors,
            });
        }

        const { name, code, description } = result.data;

        const normalizedCode = code.toUpperCase();

        const existingZone = await prisma.zone.findFirst({
            where: {
                OR: [
                    {
                        name: {
                            equals: name,
                            mode: "insensitive",
                        },
                    },
                    {
                        code: normalizedCode,
                    },
                ],
            },
        });

        if (existingZone) {
            return res.status(409).json({
                success: false,
                message: "Zone with this name or code already exists",
            });
        }

        const zone = await prisma.zone.create({
            data: {
                name,
                code: normalizedCode,
                description,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Zone created successfully",
            data: zone,
        });
    } catch (error) {
        console.error("Create zone error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getZones = async (_req: Request, res: Response) => {
    try {
        const zones = await prisma.zone.findMany({
            where: {
                deletedAt: null,
            },
            orderBy: {
                name: "asc",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Zones retrieved successfully",
            data: zones,
        });
    } catch (error) {
        console.error("Get zones error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getZoneById = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const zone = await prisma.zone.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!zone) {
            return res.status(404).json({
                success: false,
                message: "Zone not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Zone retrieved successfully",
            data: zone,
        });
    } catch (error) {
        console.error("Get zone error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};