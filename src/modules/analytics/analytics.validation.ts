import { z } from "zod";

export const analyticsWindowSchema = z
    .object({
        days: z.coerce
            .number()
            .int()
            .min(7)
            .max(365)
            .default(30),
    })
    .strict();

export const priorityQueueQuerySchema = z
    .object({
        limit: z.coerce
            .number()
            .int()
            .positive()
            .max(50)
            .default(10),
    })
    .strict();