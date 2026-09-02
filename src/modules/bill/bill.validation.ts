import { z } from "zod";

export const createBillSchema = z
    .object({
        customerId: z.string().min(1, "Customer ID is required"),

        billingMonth: z
            .number()
            .int()
            .min(1)
            .max(12),

        billingYear: z
            .number()
            .int()
            .min(2020)
            .max(2100),

        unitsConsumed: z
            .number()
            .nonnegative()
            .optional(),

        energyCharge: z
            .number()
            .positive("Energy charge must be greater than 0"),

        serviceCharge: z
            .number()
            .nonnegative()
            .default(0),

        taxAmount: z
            .number()
            .nonnegative()
            .default(0),

        dueDate: z.coerce.date(),
    })
    .strict();

export const updateBillSchema = z
    .object({
        unitsConsumed: z
            .number()
            .nonnegative()
            .optional(),

        energyCharge: z
            .number()
            .positive()
            .optional(),

        serviceCharge: z
            .number()
            .nonnegative()
            .optional(),

        taxAmount: z
            .number()
            .nonnegative()
            .optional(),

        dueDate: z.coerce.date().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    });

export const cancelBillSchema = z
    .object({
        reason: z
            .string()
            .trim()
            .min(5, "Cancellation reason must be at least 5 characters")
            .max(500),
    })
    .strict();

export const billQuerySchema = z
    .object({
        page: z.coerce.number().int().positive().default(1),

        limit: z.coerce
            .number()
            .int()
            .positive()
            .max(50)
            .default(10),

        status: z
            .enum(["UNPAID", "PAID", "CANCELLED"])
            .optional(),

        customerId: z.string().optional(),

        billingMonth: z.coerce
            .number()
            .int()
            .min(1)
            .max(12)
            .optional(),

        billingYear: z.coerce
            .number()
            .int()
            .min(2020)
            .max(2100)
            .optional(),
    })
    .strict();