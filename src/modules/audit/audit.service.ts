import type { Request } from "express";
import type { Prisma } from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";

type ActorRole =
    | "CUSTOMER"
    | "OPERATOR"
    | "ADMIN";

type CreateAuditLogInput = {
    req?: Request;

    actorId?: string;
    actorRole?: ActorRole;

    action: string;

    entityType: string;
    entityId?: string;

    description: string;

    metadata?: Prisma.InputJsonValue;
};

const getRequestIp = (
    req?: Request,
) => {
    if (!req) {
        return undefined;
    }

    const forwarded =
        req.headers["x-forwarded-for"];

    if (typeof forwarded === "string") {
        return forwarded
            .split(",")[0]
            ?.trim();
    }

    if (Array.isArray(forwarded)) {
        return forwarded[0]
            ?.split(",")[0]
            ?.trim();
    }

    return req.ip;
};

export const createAuditLog = async (
    input: CreateAuditLogInput,
) => {
    return prisma.auditLog.create({
        data: {
            actorId: input.actorId,
            actorRole: input.actorRole,

            action: input.action,

            entityType:
                input.entityType,

            entityId:
                input.entityId,

            description:
                input.description,

            method:
                input.req?.method,

            path:
                input.req?.originalUrl,

            ipAddress:
                getRequestIp(input.req),

            userAgent:
                input.req?.get("user-agent"),

            metadata:
                input.metadata,
        },
    });
};

export const createAuditLogSafely = async (
    input: CreateAuditLogInput,
) => {
    try {
        return await createAuditLog(input);
    } catch (error) {
        console.error(
            "Audit log creation error:",
            error,
        );

        return null;
    }
};