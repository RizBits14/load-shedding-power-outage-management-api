import type {
    Request,
    Response,
} from "express";

import jwt from "jsonwebtoken";

import { getGoogleClient } from "../../lib/google.js";
import { prisma } from "../../lib/prisma.js";

import { createAuditLogSafely } from "../audit/audit.service.js";

import { googleLoginSchema } from "./google-auth.validation.js";

const createPowerSyncToken = (user: {
    id: string;
    role:
    | "CUSTOMER"
    | "OPERATOR"
    | "ADMIN";
}) => {
    const jwtSecret =
        process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error(
            "JWT_SECRET is not configured",
        );
    }

    /*
      Both id and userId are included intentionally.
  
      This keeps the Google-issued PowerSync token
      compatible with the existing authentication
      middleware regardless of which identifier name
      that middleware currently reads.
    */
    return jwt.sign(
        {
            id: user.id,
            userId: user.id,
            role: user.role,
        },
        jwtSecret,
        {
            expiresIn: "1d",
        },
    );
};

export const googleLogin = async (
    req: Request,
    res: Response,
) => {
    try {
        const result =
            googleLoginSchema.safeParse(
                req.body,
            );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Validation failed",
                errors:
                    result.error.flatten(),
            });
        }

        const googleClientId =
            process.env.GOOGLE_CLIENT_ID;

        if (!googleClientId) {
            console.error(
                "GOOGLE_CLIENT_ID is not configured",
            );

            return res.status(500).json({
                success: false,
                message:
                    "Google authentication is not configured",
            });
        }

        const googleClient =
            getGoogleClient();

        let ticket;

        try {
            ticket =
                await googleClient.verifyIdToken({
                    idToken:
                        result.data.credential,

                    audience:
                        googleClientId,
                });
        } catch (error) {
            console.error(
                "Google ID token verification error:",
                error,
            );

            return res.status(401).json({
                success: false,
                message:
                    "Invalid Google credential",
            });
        }

        const payload =
            ticket.getPayload();

        if (!payload) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid Google credential",
            });
        }

        const googleId =
            payload.sub;

        const googleEmail =
            payload.email
                ?.trim()
                .toLowerCase();

        const emailVerified =
            payload.email_verified;

        const googleName =
            payload.name?.trim();

        if (
            !googleId ||
            !googleEmail
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Google account information is incomplete",
            });
        }

        if (!emailVerified) {
            return res.status(401).json({
                success: false,
                message:
                    "Google email address is not verified",
            });
        }

        /*
          Lookup is intentionally performed using
          both googleId and email.
    
          This supports:
          1. Returning Google users.
          2. Existing local users who later choose
             "Continue with Google".
        */
        let user =
            await prisma.user.findFirst({
                where: {
                    OR: [
                        {
                            googleId,
                        },
                        {
                            email:
                                googleEmail,
                        },
                    ],
                },
            });

        let auditAction =
            "GOOGLE_LOGIN";

        /*
          Existing user:
          Link Google account if necessary.
        */
        if (user) {
            if (user.deletedAt) {
                return res.status(403).json({
                    success: false,
                    message:
                        "This account is unavailable",
                });
            }

            if (
                user.status ===
                "SUSPENDED"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Your account has been suspended",
                });
            }

            /*
              The email matched an account that is already
              connected to a different Google subject ID.
      
              Do not silently overwrite that relationship.
            */
            if (
                user.googleId &&
                user.googleId !== googleId
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This email is already linked to another Google account",
                });
            }

            if (!user.googleId) {
                user =
                    await prisma.user.update({
                        where: {
                            id: user.id,
                        },

                        data: {
                            googleId,
                        },
                    });

                auditAction =
                    "GOOGLE_ACCOUNT_LINKED";
            }
        } else {
            /*
              Brand-new Google users always start as
              CUSTOMER.
      
              Google login must never allow somebody
              to self-create an OPERATOR or ADMIN.
            */
            user =
                await prisma.user.create({
                    data: {
                        name:
                            googleName ||
                            googleEmail
                                .split("@")[0] ||
                            "Google User",

                        email:
                            googleEmail,

                        googleId,

                        password: null,

                        role:
                            "CUSTOMER",

                        status:
                            "ACTIVE",
                    },
                });

            auditAction =
                "GOOGLE_ACCOUNT_CREATED";
        }

        const accessToken =
            createPowerSyncToken({
                id: user.id,
                role: user.role,
            });

        await createAuditLogSafely({
            req,

            actorId:
                user.id,

            actorRole:
                user.role,

            action:
                auditAction,

            entityType:
                "USER",

            entityId:
                user.id,

            description:
                auditAction ===
                    "GOOGLE_ACCOUNT_CREATED"
                    ? "Customer account was created using Google authentication."
                    : auditAction ===
                        "GOOGLE_ACCOUNT_LINKED"
                        ? "Existing account was linked with Google authentication."
                        : "User authenticated using Google.",

            metadata: {
                authenticationProvider:
                    "GOOGLE",
            },
        });

        return res.status(200).json({
            success: true,

            message:
                auditAction ===
                    "GOOGLE_ACCOUNT_CREATED"
                    ? "Google account registered and authenticated successfully"
                    : "Google authentication successful",

            data: {
                accessToken,

                user: {
                    id:
                        user.id,

                    name:
                        user.name,

                    email:
                        user.email,

                    role:
                        user.role,

                    status:
                        user.status,

                    authenticationProvider:
                        "GOOGLE",
                },
            },
        });
    } catch (error) {
        console.error(
            "Google authentication error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to authenticate with Google",
        });
    }
};