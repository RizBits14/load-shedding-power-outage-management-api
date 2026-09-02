import type {
    Request,
    Response,
} from "express";

import { prisma } from "../../lib/prisma.js";

import {
    auditQuerySchema,
    auditSummaryQuerySchema,
} from "./audit.validation.js";

export const getAuditLogs = async (
    req: Request,
    res: Response,
) => {
    try {
        const result =
            auditQuerySchema.safeParse(
                req.query,
            );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid query parameters",
                errors:
                    result.error.flatten(),
            });
        }

        const {
            page,
            limit,
            actorId,
            action,
            entityType,
            entityId,
            search,
            startDate,
            endDate,
        } = result.data;

        const where = {
            ...(actorId && {
                actorId,
            }),

            ...(action && {
                action,
            }),

            ...(entityType && {
                entityType,
            }),

            ...(entityId && {
                entityId,
            }),

            ...((startDate || endDate) && {
                createdAt: {
                    ...(startDate && {
                        gte: startDate,
                    }),

                    ...(endDate && {
                        lte: endDate,
                    }),
                },
            }),

            ...(search && {
                OR: [
                    {
                        action: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },

                    {
                        entityType: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },

                    {
                        description: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },

                    {
                        entityId: {
                            contains: search,
                            mode: "insensitive" as const,
                        },
                    },
                ],
            }),
        };

        const [logs, total] =
            await Promise.all([
                prisma.auditLog.findMany({
                    where,

                    include: {
                        actor: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                            },
                        },
                    },

                    orderBy: {
                        createdAt: "desc",
                    },

                    skip:
                        (page - 1) * limit,

                    take: limit,
                }),

                prisma.auditLog.count({
                    where,
                }),
            ]);

        return res.status(200).json({
            success: true,
            message:
                "Audit logs retrieved successfully",

            data: logs,

            meta: {
                page,
                limit,
                total,

                totalPages:
                    Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error(
            "Get audit logs error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal server error",
        });
    }
};

export const getAuditLogById = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const log =
            await prisma.auditLog.findUnique({
                where: {
                    id,
                },

                include: {
                    actor: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            });

        if (!log) {
            return res.status(404).json({
                success: false,
                message:
                    "Audit log not found",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                "Audit log retrieved successfully",
            data: log,
        });
    } catch (error) {
        console.error(
            "Get audit log error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal server error",
        });
    }
};

export const getAuditSummary = async (
    req: Request,
    res: Response,
) => {
    try {
        const result =
            auditSummaryQuerySchema.safeParse(
                req.query,
            );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid query parameters",
                errors:
                    result.error.flatten(),
            });
        }

        const { days } = result.data;

        const since = new Date();

        since.setDate(
            since.getDate() - days,
        );

        const [
            totalEvents,
            actionGroups,
            entityGroups,
        ] = await Promise.all([
            prisma.auditLog.count({
                where: {
                    createdAt: {
                        gte: since,
                    },
                },
            }),

            prisma.auditLog.groupBy({
                by: ["action"],

                where: {
                    createdAt: {
                        gte: since,
                    },
                },

                _count: {
                    _all: true,
                },

                orderBy: {
                    _count: {
                        action: "desc",
                    },
                },
            }),

            prisma.auditLog.groupBy({
                by: ["entityType"],

                where: {
                    createdAt: {
                        gte: since,
                    },
                },

                _count: {
                    _all: true,
                },

                orderBy: {
                    _count: {
                        entityType: "desc",
                    },
                },
            }),
        ]);

        return res.status(200).json({
            success: true,
            message:
                "Audit summary retrieved successfully",

            data: {
                analysisWindowDays: days,
                totalEvents,

                actions:
                    actionGroups.map(
                        (item) => ({
                            action:
                                item.action,

                            count:
                                item._count._all,
                        }),
                    ),

                entities:
                    entityGroups.map(
                        (item) => ({
                            entityType:
                                item.entityType,

                            count:
                                item._count._all,
                        }),
                    ),
            },
        });
    } catch (error) {
        console.error(
            "Audit summary error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal server error",
        });
    }
};