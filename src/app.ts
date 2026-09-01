import express from "express";

const app = express();

app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "PowerSync API is running",
    });
});

export default app;