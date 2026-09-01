import express from "express";
import { prisma } from "./lib/prisma.js";
import authRouter from "./modules/auth/auth.route.js";

const app = express();

app.use(express.json());

app.use("/api/v1/auth", authRouter);

app.get("/api/v1/health", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
        success: true,
        message: "PowerSync API is running",
        data: {
            status: "healthy",
            database: "connected",
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