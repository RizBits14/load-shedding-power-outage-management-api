import bcrypt from "bcryptjs";
import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import { loginSchema, registerSchema } from "./auth.validation.js";
import jwt from "jsonwebtoken";

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

export const loginUser = async (req: Request, res: Response) => {
    try {
        const result = loginSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten().fieldErrors,
            });
        }

        const { email, password } = result.data;
        const normalizedEmail = email.toLowerCase();

        const user = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });

        if (!user || !user.password) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (user.status === "SUSPENDED") {
            return res.status(403).json({
                success: false,
                message: "Your account is suspended",
            });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not defined");
        }

        const accessToken = jwt.sign(
            {
                userId: user.id,
                role: user.role,
            },
            jwtSecret,
            {
                expiresIn: "1d",
            },
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                accessToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                },
            },
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getMe = async (_req: Request, res: Response) => {
    return res.status(200).json({
        success: true,
        message: "Current user retrieved successfully",
        data: res.locals.user,
    });
};