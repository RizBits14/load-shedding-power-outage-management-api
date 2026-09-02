import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import {
    createCustomerProfileSchema,
    updateCustomerProfileSchema,
} from "./customer.validation.js";

export const createCustomerProfile = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = createCustomerProfileSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten().fieldErrors,
            });
        }

        const userId = res.locals.user.id;

        const existingProfile = await prisma.customerProfile.findUnique({
            where: {
                userId,
            },
        });

        if (existingProfile) {
            return res.status(409).json({
                success: false,
                message: "Customer profile already exists",
            });
        }

        const { phone, address, areaId } = result.data;

        const area = await prisma.area.findFirst({
            where: {
                id: areaId,
                deletedAt: null,
            },
        });

        if (!area) {
            return res.status(404).json({
                success: false,
                message: "Area not found",
            });
        }

        const profile = await prisma.customerProfile.create({
            data: {
                userId,
                areaId,
                phone,
                address,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
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
            },
        });

        return res.status(201).json({
            success: true,
            message: "Customer profile created successfully",
            data: profile,
        });
    } catch (error) {
        console.error("Create customer profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getMyCustomerProfile = async (
    _req: Request,
    res: Response,
) => {
    try {
        const userId = res.locals.user.id;

        const profile = await prisma.customerProfile.findUnique({
            where: {
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        status: true,
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
            },
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Customer profile not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Customer profile retrieved successfully",
            data: profile,
        });
    } catch (error) {
        console.error("Get customer profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateMyCustomerProfile = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = updateCustomerProfileSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const userId = res.locals.user.id;

        const existingProfile = await prisma.customerProfile.findUnique({
            where: {
                userId,
            },
        });

        if (!existingProfile) {
            return res.status(404).json({
                success: false,
                message: "Customer profile not found",
            });
        }

        const profile = await prisma.customerProfile.update({
            where: {
                userId,
            },
            data: result.data,
        });

        return res.status(200).json({
            success: true,
            message: "Customer profile updated successfully",
            data: profile,
        });
    } catch (error) {
        console.error("Update customer profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};