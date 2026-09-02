import { z } from "zod";

export const notificationQuerySchema = z
    .object({
        page: z.coerce.number().int().positive().default(1),

        limit: z.coerce
            .number()
            .int()
            .positive()
            .max(50)
            .default(10),

        type: z
            .enum([
                "OUTAGE_REPORT",
                "INCIDENT",
                "ASSIGNMENT",
                "BILL",
                "PAYMENT",
                "SYSTEM",
            ])
            .optional(),

        isRead: z
            .enum(["true", "false"])
            .transform((value) => value === "true")
            .optional(),
    })
    .strict();

export const broadcastNotificationSchema = z
    .object({
        recipientRole: z.enum([
            "CUSTOMER",
            "OPERATOR",
            "ADMIN",
            "ALL",
        ]),

        title: z
            .string()
            .trim()
            .min(3)
            .max(120),

        message: z
            .string()
            .trim()
            .min(3)
            .max(500),
    })
    .strict();