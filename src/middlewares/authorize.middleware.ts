import type { NextFunction, Request, Response } from "express";

type UserRole = "CUSTOMER" | "OPERATOR" | "ADMIN";

export const authorize =
    (...allowedRoles: UserRole[]) =>
        (_req: Request, res: Response, next: NextFunction) => {
            const user = res.locals.user;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to perform this action",
                });
            }

            next();
        };