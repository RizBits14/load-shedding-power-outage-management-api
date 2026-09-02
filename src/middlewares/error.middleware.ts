import type {
    ErrorRequestHandler,
    RequestHandler,
} from "express";

export const notFoundHandler: RequestHandler = (
    req,
    res,
) => {
    return res.status(404).json({
        success: false,
        message: "API endpoint not found",

        path: req.originalUrl,
        method: req.method,
    });
};

export const globalErrorHandler: ErrorRequestHandler =
    (
        error,
        _req,
        res,
        _next,
    ) => {
        console.error(
            "Unhandled application error:",
            error,
        );

        if (
            error instanceof Error &&
            error.message ===
            "Origin is not allowed by CORS"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Request origin is not allowed",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Internal server error",
        });
    };