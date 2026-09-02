import { z } from "zod";

export const createSubstationSchema = z
    .object({
        name: z.string().trim().min(2).max(100),

        code: z
            .string()
            .trim()
            .min(2)
            .max(20)
            .regex(/^[A-Za-z0-9-]+$/, "Invalid substation code"),

        description: z.string().trim().max(500).optional(),

        zoneId: z.string().min(1, "Zone ID is required"),
    })
    .strict();

export const updateSubstationSchema = createSubstationSchema
    .omit({
        zoneId: true,
    })
    .partial()
    .extend({
        zoneId: z.string().min(1, "Zone ID is required").optional(),

        status: z
            .enum(["ACTIVE", "MAINTENANCE", "INACTIVE"])
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    });