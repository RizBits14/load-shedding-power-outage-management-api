import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";

export const getAllUsers = async (_req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Users retrieved successfully",
            data: users,
        });
    } catch (error) {
        console.error("Get users error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};