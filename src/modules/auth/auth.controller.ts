import bcrypt from "bcryptjs";
import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import { registerSchema } from "./auth.validation.js";

export const registerUser = async (req: Request, res: Response) => {
    try {
        const result = registerSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten().fieldErrors,
            });
        }

        const { name, email, password } = result.data;

        const normalizedEmail = email.toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                password: hashedPassword,
                role: "CUSTOMER",
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Customer registered successfully",
            data: user,
        });
    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};