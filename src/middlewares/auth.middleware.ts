import jwt, { type JwtPayload } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma.js";

interface AccessTokenPayload extends JwtPayload {
    userId: string;
}

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const authorization = req.headers.authorization;

        if (!authorization?.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const token = authorization.split(" ")[1];

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not defined");
        }

        const decoded = jwt.verify(token, jwtSecret) as AccessTokenPayload;

        const user = await prisma.user.findFirst({
            where: {
                id: decoded.userId,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
            },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token",
            });
        }

        if (user.status === "SUSPENDED") {
            return res.status(403).json({
                success: false,
                message: "Your account is suspended",
            });
        }

        res.locals.user = user;

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
        }

        console.error("Authentication error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};