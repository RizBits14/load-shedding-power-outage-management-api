import { z } from "zod";

export const auditQuerySchema = z
    .object({
        page: z.coerce
            .number()
            .int()
            .positive()
            .default(1),

        limit: z.coerce
            .number()
            .int()
            .positive()
            .max(100)
            .default(20),

        actorId: z
            .string()
            .trim()
            .min(1)
            .optional(),

        action: z
            .string()
            .trim()
            .min(1)
            .optional(),

        entityType: z
            .string()
            .trim()
            .min(1)
            .optional(),

        entityId: z
            .string()
            .trim()
            .min(1)
            .optional(),

        search: z
            .string()
            .trim()
            .min(1)
            .optional(),

        startDate: z.coerce
            .date()
            .optional(),

        endDate: z.coerce
            .date()
            .optional(),
    })
    .strict()
    .superRefine(
        (data, ctx) => {
            if (
                data.startDate &&
                data.endDate &&
                data.startDate > data.endDate
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["endDate"],
                    message:
                        "End date must be after start date",
                });
            }
        },
    );

export const auditSummaryQuerySchema = z
    .object({
        days: z.coerce
            .number()
            .int()
            .min(1)
            .max(365)
            .default(30),
    })
    .strict();