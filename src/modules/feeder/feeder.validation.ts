import { z } from "zod";

export const createFeederSchema = z
    .object({
        name: z.string().trim().min(2).max(100),

        code: z
            .string()
            .trim()
            .min(2)
            .max(20)
            .regex(/^[A-Za-z0-9-]+$/, "Invalid feeder code"),

        description: z.string().trim().max(500).optional(),

        capacityMw: z
            .number()
            .positive("Capacity must be greater than 0")
            .optional(),

        substationId: z.string().min(1, "Substation ID is required"),
    })
    .strict();

export const updateFeederSchema = createFeederSchema
    .omit({
        substationId: true,
    })
    .partial()
    .extend({
        substationId: z.string().min(1).optional(),

        status: z
            .enum(["ACTIVE", "MAINTENANCE", "INACTIVE"])
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    });