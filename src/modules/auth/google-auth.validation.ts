import { z } from "zod";

export const googleLoginSchema = z
    .object({
        credential: z
            .string()
            .trim()
            .min(
                20,
                "Google credential is required",
            ),
    })
    .strict();