import { z } from "zod";

export const createCheckoutSchema = z
    .object({
        billId: z.string().min(1, "Bill ID is required"),
    })
    .strict();

export const paymentQuerySchema = z
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
                "PENDING",
                "SUCCEEDED",
                "FAILED",
                "CANCELLED",
            ])
            .optional(),

        billId: z.string().optional(),
    })
    .strict();