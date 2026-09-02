import { z } from "zod";

export const createOutageReportSchema = z
    .object({
        issueType: z.enum([
            "TOTAL_OUTAGE",
            "PARTIAL_OUTAGE",
            "VOLTAGE_FLUCTUATION",
            "OTHER",
        ]),

        description: z
            .string()
            .trim()
            .min(5, "Description must be at least 5 characters")
            .max(500)
            .optional(),
    })
    .strict();

export const reviewOutageReportSchema = z
    .object({
        status: z.enum(["VERIFIED", "REJECTED"]),

        reviewNote: z
            .string()
            .trim()
            .min(3, "Review note must be at least 3 characters")
            .max(500)
            .optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
        if (data.status === "REJECTED" && !data.reviewNote) {
            ctx.addIssue({
                code: "custom",
                path: ["reviewNote"],
                message: "Review note is required when rejecting a report",
            });
        }
    });

export const outageReportQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),

    limit: z.coerce
        .number()
        .int()
        .positive()
        .max(50)
        .default(10),

    status: z
        .enum(["PENDING", "VERIFIED", "LINKED", "REJECTED"])
        .optional(),

    issueType: z
        .enum([
            "TOTAL_OUTAGE",
            "PARTIAL_OUTAGE",
            "VOLTAGE_FLUCTUATION",
            "OTHER",
        ])
        .optional(),

    areaId: z.string().optional(),
});