import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";

import {
    broadcastNotificationSchema,
    notificationQuerySchema,
} from "./notification.validation.js";

import { createAuditLogSafely } from "../audit/audit.service.js";

export const getMyNotifications = async (
    req: Request,
    res: Response,
) => {
    try {
        const result =
            notificationQuerySchema.safeParse(
                req.query,
            );

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
            type,
            isRead,
        } = result.data;

        const recipientId = res.locals.user.id;

        const where = {
            recipientId,
            deletedAt: null,

            ...(type && {
                type,
            }),

            ...(isRead !== undefined && {
                isRead,
            }),
        };

        const [notifications, total] =
            await Promise.all([
                prisma.notification.findMany({
                    where,

                    orderBy: {
                        createdAt: "desc",
                    },

                    skip: (page - 1) * limit,
                    take: limit,
                }),

                prisma.notification.count({
                    where,
                }),
            ]);

        return res.status(200).json({
            success: true,
            message:
                "Notifications retrieved successfully",
            data: notifications,

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
            "Get notifications error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getUnreadNotificationCount = async (
    _req: Request,
    res: Response,
) => {
    try {
        const count =
            await prisma.notification.count({
                where: {
                    recipientId:
                        res.locals.user.id,

                    isRead: false,
                    deletedAt: null,
                },
            });

        return res.status(200).json({
            success: true,
            message:
                "Unread notification count retrieved successfully",

            data: {
                unreadCount: count,
            },
        });
    } catch (error) {
        console.error(
            "Unread notification count error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const markNotificationAsRead = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const notification =
            await prisma.notification.findFirst({
                where: {
                    id,
                    recipientId:
                        res.locals.user.id,
                    deletedAt: null,
                },
            });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }

        if (notification.isRead) {
            return res.status(200).json({
                success: true,
                message:
                    "Notification is already read",
                data: notification,
            });
        }

        const updatedNotification =
            await prisma.notification.update({
                where: {
                    id,
                },

                data: {
                    isRead: true,
                    readAt: new Date(),
                },
            });

        return res.status(200).json({
            success: true,
            message:
                "Notification marked as read",
            data: updatedNotification,
        });
    } catch (error) {
        console.error(
            "Mark notification read error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const markAllNotificationsAsRead =
    async (
        _req: Request,
        res: Response,
    ) => {
        try {
            const readAt = new Date();

            const result =
                await prisma.notification.updateMany({
                    where: {
                        recipientId:
                            res.locals.user.id,

                        isRead: false,
                        deletedAt: null,
                    },

                    data: {
                        isRead: true,
                        readAt,
                    },
                });

            return res.status(200).json({
                success: true,
                message:
                    "All notifications marked as read",

                data: {
                    updatedCount: result.count,
                },
            });
        } catch (error) {
            console.error(
                "Mark all notifications error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    };

export const dismissNotification = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const notification =
            await prisma.notification.findFirst({
                where: {
                    id,
                    recipientId:
                        res.locals.user.id,
                    deletedAt: null,
                },
            });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }

        await prisma.notification.update({
            where: {
                id,
            },

            data: {
                deletedAt: new Date(),
            },
        });

        return res.status(200).json({
            success: true,
            message:
                "Notification dismissed successfully",
        });
    } catch (error) {
        console.error(
            "Dismiss notification error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const broadcastNotification = async (
    req: Request,
    res: Response,
) => {
    try {
        const result =
            broadcastNotificationSchema.safeParse(
                req.body,
            );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const {
            recipientRole,
            title,
            message,
        } = result.data;

        const users = await prisma.user.findMany({
            where: {
                deletedAt: null,
                status: "ACTIVE",

                ...(recipientRole !== "ALL" && {
                    role: recipientRole,
                }),
            },

            select: {
                id: true,
            },
        });

        if (users.length === 0) {
            return res.status(200).json({
                success: true,
                message:
                    "No active recipients found",

                data: {
                    recipientCount: 0,
                },
            });
        }

        const broadcastId =
            `${Date.now()}-${res.locals.user.id}`;

        const created =
            await prisma.notification.createMany({
                data: users.map((user) => ({
                    recipientId: user.id,
                    type: "SYSTEM",
                    title,
                    message,

                    entityType: "SYSTEM",

                    dedupeKey:
                        `broadcast-${broadcastId}-${user.id}`,
                })),
            });

        await createAuditLogSafely({
            req,

            actorId:
                res.locals.user.id,

            actorRole:
                res.locals.user.role,

            action:
                "SYSTEM_NOTIFICATION_BROADCAST",

            entityType:
                "NOTIFICATION",

            description:
                "Administrator sent a system notification broadcast.",

            metadata: {
                recipientRole,
                recipientCount:
                    created.count,

                title,
            },
        });

        return res.status(201).json({
            success: true,
            message:
                "System notification broadcast successfully",

            data: {
                recipientCount: created.count,
            },
        });
    } catch (error) {
        console.error(
            "Broadcast notification error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};