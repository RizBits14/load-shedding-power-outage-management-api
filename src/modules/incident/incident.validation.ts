import { z } from "zod";

export const incidentQuerySchema = z
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
                "OPEN",
                "ASSIGNED",
                "IN_PROGRESS",
                "RESTORED",
                "CLOSED",
                "CANCELLED",
            ])
            .optional(),

        severity: z
            .enum([
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL",
            ])
            .optional(),

        areaId: z.string().optional(),

        search: z.string().trim().min(1).optional(),
    })
    .strict();