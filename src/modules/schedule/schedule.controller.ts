import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import {
    createScheduleSchema,
    updateScheduleStatusSchema,
} from "./schedule.validation.js";

export const createSchedule = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = createScheduleSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const {
            title,
            reason,
            areaId,
            startTime,
            endTime,
        } = result.data;

        if (startTime <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "Schedule start time must be in the future",
            });
        }

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

        const conflictingSchedule =
            await prisma.outageSchedule.findFirst({
                where: {
                    areaId,
                    deletedAt: null,

                    status: {
                        notIn: ["CANCELLED", "COMPLETED"],
                    },

                    startTime: {
                        lt: endTime,
                    },

                    endTime: {
                        gt: startTime,
                    },
                },
            });

        if (conflictingSchedule) {
            return res.status(409).json({
                success: false,
                message:
                    "Another load-shedding schedule already overlaps this time period",
            });
        }

        const schedule = await prisma.outageSchedule.create({
            data: {
                title,
                reason,
                areaId,
                startTime,
                endTime,
                createdById: res.locals.user.id,
            },
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        priority: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });

        return res.status(201).json({
            success: true,
            message: "Load-shedding schedule created successfully",
            data: schedule,
        });
    } catch (error) {
        console.error("Create schedule error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getPublicSchedules = async (
    req: Request,
    res: Response,
) => {
    try {
        const areaId =
            typeof req.query.areaId === "string"
                ? req.query.areaId
                : undefined;

        const schedules = await prisma.outageSchedule.findMany({
            where: {
                deletedAt: null,

                status: {
                    in: ["PUBLISHED", "ACTIVE"],
                },

                ...(areaId && { areaId }),
            },
            include: {
                area: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        priority: true,
                    },
                },
            },
            orderBy: {
                startTime: "asc",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Load-shedding schedules retrieved successfully",
            data: schedules,
        });
    } catch (error) {
        console.error("Get schedules error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getScheduleById = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const schedule = await prisma.outageSchedule.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            include: {
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

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: "Schedule not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Schedule retrieved successfully",
            data: schedule,
        });
    } catch (error) {
        console.error("Get schedule error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateScheduleStatus = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const result = updateScheduleStatusSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const schedule = await prisma.outageSchedule.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: "Schedule not found",
            });
        }

        const nextStatus = result.data.status;

        const allowedTransitions: Record<string, string[]> = {
            DRAFT: ["PUBLISHED", "CANCELLED"],
            PUBLISHED: ["ACTIVE", "CANCELLED"],
            ACTIVE: ["COMPLETED"],
            COMPLETED: [],
            CANCELLED: [],
        };

        const allowedStatuses =
            allowedTransitions[schedule.status] ?? [];

        if (!allowedStatuses.includes(nextStatus)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change schedule status from ${schedule.status} to ${nextStatus}`,
            });
        }

        const updatedSchedule = await prisma.outageSchedule.update({
            where: {
                id,
            },
            data: {
                status: nextStatus,
            },
            include: {
                area: {
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
            message: `Schedule status changed to ${nextStatus}`,
            data: updatedSchedule,
        });
    } catch (error) {
        console.error("Update schedule status error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};