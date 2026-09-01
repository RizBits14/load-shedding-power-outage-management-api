import { z } from "zod";

export const createZoneSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Zone name must be at least 2 characters")
            .max(100, "Zone name is too long"),

        code: z
            .string()
            .trim()
            .min(2, "Zone code must be at least 2 characters")
            .max(20, "Zone code is too long")
            .regex(
                /^[A-Za-z0-9-]+$/,
                "Zone code can contain only letters, numbers and hyphens",
            ),

        description: z
            .string()
            .trim()
            .max(500, "Description is too long")
            .optional(),
    })
    .strict();