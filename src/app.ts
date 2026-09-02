import express from "express";
import { prisma } from "./lib/prisma.js";
import authRouter from "./modules/auth/auth.route.js";
import adminRouter from "./modules/admin/admin.route.js";
import zoneRouter from "./modules/zone/zone.route.js";
import substationRouter from "./modules/substation/substation.route.js";
import feederRouter from "./modules/feeder/feeder.route.js";
import areaRouter from "./modules/area/area.route.js";
import customerRouter from "./modules/customer/customer.route.js";
import scheduleRouter from "./modules/schedule/schedule.route.js";
import outageReportRouter from "./modules/outage-report/outage-report.route.js";

const app = express();

app.use(express.json());

app.use("/api/v1/auth", authRouter);

app.use("/api/v1/admin", adminRouter);

app.use("/api/v1/zones", zoneRouter);

app.use("/api/v1/substations", substationRouter);

app.use("/api/v1/feeders", feederRouter);

app.use("/api/v1/areas", areaRouter);

app.use("/api/v1/customers", customerRouter);

app.use("/api/v1/schedules", scheduleRouter);

app.use("/api/v1/outage-reports", outageReportRouter);

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