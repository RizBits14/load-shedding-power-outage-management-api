import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";

const VALID_ROLES = [
    "CUSTOMER",
    "OPERATOR",
    "ADMIN",
] as const;

type ValidRole = (typeof VALID_ROLES)[number];

export const getAllUsers = async (
    req: Request,
    res: Response,
) => {
    try {
        const {
            role,
            search,
            page = "1",
            limit = "10",
        } = req.query;

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        if (
            !Number.isInteger(pageNumber) ||
            pageNumber < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "page must be a positive integer",
            });
        }

        if (
            !Number.isInteger(limitNumber) ||
            limitNumber < 1 ||
            limitNumber > 100
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "limit must be between 1 and 100",
            });
        }

        let roleFilter: ValidRole | undefined;

        if (typeof role === "string") {
            const normalizedRole =
                role.toUpperCase();

            if (
                !VALID_ROLES.includes(
                    normalizedRole as ValidRole,
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "role must be CUSTOMER, OPERATOR, or ADMIN",
                });
            }

            roleFilter =
                normalizedRole as ValidRole;
        }

        const searchValue =
            typeof search === "string"
                ? search.trim()
                : "";

        const where = {
            deletedAt: null,

            ...(roleFilter
                ? {
                    role: roleFilter,
                }
                : {}),

            ...(searchValue
                ? {
                    OR: [
                        {
                            name: {
                                contains:
                                    searchValue,
                                mode: "insensitive" as const,
                            },
                        },
                        {
                            email: {
                                contains:
                                    searchValue,
                                mode: "insensitive" as const,
                            },
                        },
                    ],
                }
                : {}),
        };

        const skip =
            (pageNumber - 1) * limitNumber;

        const [users, total] =
            await prisma.$transaction([
                prisma.user.findMany({
                    where,

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

                    skip,

                    take: limitNumber,
                }),

                prisma.user.count({
                    where,
                }),
            ]);

        return res.status(200).json({
            success: true,
            message:
                "Users retrieved successfully",

            data: users,

            meta: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(
                    total / limitNumber,
                ),
            },
        });
    } catch (error) {
        console.error(
            "Get users error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal server error",
        });
    }
};