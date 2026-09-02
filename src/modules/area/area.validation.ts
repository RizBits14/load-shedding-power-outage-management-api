import { z } from "zod";

export const createAreaSchema = z
    .object({
        name: z.string().trim().min(2).max(100),

        code: z
            .string()
            .trim()
            .min(2)
            .max(20)
            .regex(/^[A-Za-z0-9-]+$/, "Invalid area code"),

        description: z.string().trim().max(500).optional(),

        priority: z
            .enum(["NORMAL", "HIGH", "CRITICAL"])
            .optional(),

        latitude: z
            .number()
            .min(-90)
            .max(90)
            .optional(),

        longitude: z
            .number()
            .min(-180)
            .max(180)
            .optional(),

        feederId: z.string().min(1, "Feeder ID is required"),
    })
    .strict();

export const updateAreaSchema = createAreaSchema
    .omit({
        feederId: true,
    })
    .partial()
    .extend({
        feederId: z.string().min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    });