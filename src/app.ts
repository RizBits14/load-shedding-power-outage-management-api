import express from "express";

const app = express();

app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "PowerSync API is running",
        data: {
            status: "healthy",
        },
    });
});

app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

export default app;