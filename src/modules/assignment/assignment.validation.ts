import { z } from "zod";

export const assignOperatorSchema = z
    .object({
        operatorId: z.string().min(1, "Operator ID is required"),

        note: z
            .string()
            .trim()
            .min(3)
            .max(500)
            .optional(),
    })
    .strict();

export const cancelIncidentSchema = z
    .object({
        reason: z
            .string()
            .trim()
            .min(5, "Cancellation reason must be at least 5 characters")
            .max(500),
    })
    .strict();

export const assignmentQuerySchema = z
    .object({
        page: z.coerce.number().int().positive().default(1),

        limit: z.coerce
            .number()
            .int()
            .positive()
            .max(50)
            .default(10),

        status: z
            .enum([
                "ASSIGNED",
                "ACCEPTED",
                "COMPLETED",
                "REASSIGNED",
                "CANCELLED",
            ])
            .optional(),
    })
    .strict();