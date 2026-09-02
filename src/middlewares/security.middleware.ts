import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const getAllowedOrigins = () => {
    const frontendUrl =
        process.env.FRONTEND_URL?.trim();

    const origins = new Set<string>();

    if (frontendUrl) {
        origins.add(frontendUrl);
    }

    if (
        process.env.NODE_ENV !== "production"
    ) {
        origins.add("http://localhost:5173");
        origins.add("http://127.0.0.1:5173");
    }

    return origins;
};

export const securityHeaders = helmet({
    crossOriginResourcePolicy: {
        policy: "cross-origin",
    },
});

export const corsMiddleware = cors({
    origin(origin, callback) {

        if (!origin) {
            return callback(null, true);
        }

        const allowedOrigins =
            getAllowedOrigins();

        if (allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(
            new Error(
                "Origin is not allowed by CORS",
            ),
        );
    },

    credentials: true,

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
    ],
});

export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    limit:
        process.env.NODE_ENV === "production"
            ? 300
            : 1000,

    standardHeaders: "draft-7",
    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Too many requests. Please try again later.",
    },
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    limit:
        process.env.NODE_ENV === "production"
            ? 30
            : 200,

    standardHeaders: "draft-7",
    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Too many authentication attempts. Please try again later.",
    },
});