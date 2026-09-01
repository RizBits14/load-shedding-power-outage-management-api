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