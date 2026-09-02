import { z } from "zod";

export const createCustomerProfileSchema = z
    .object({
        phone: z.string().trim().min(7).max(20).optional(),

        address: z.string().trim().min(3).max(300).optional(),

        areaId: z.string().min(1, "Area ID is required"),
    })
    .strict();

export const updateCustomerProfileSchema = z
    .object({
        phone: z.string().trim().min(7).max(20).optional(),

        address: z.string().trim().min(3).max(300).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    });