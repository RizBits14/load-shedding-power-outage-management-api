import { z } from "zod";

export const createScheduleSchema = z
    .object({
        title: z.string().trim().min(3).max(150),

        reason: z.string().trim().max(500).optional(),

        areaId: z.string().min(1, "Area ID is required"),

        startTime: z.coerce.date(),

        endTime: z.coerce.date(),
    })
    .strict()
    .refine((data) => data.endTime > data.startTime, {
        message: "End time must be after start time",
        path: ["endTime"],
    });

export const updateScheduleStatusSchema = z
    .object({
        status: z.enum([
            "PUBLISHED",
            "ACTIVE",
            "COMPLETED",
            "CANCELLED",
        ]),
    })
    .strict();