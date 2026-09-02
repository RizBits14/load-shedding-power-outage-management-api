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
import incidentRouter from "./modules/incident/incident.route.js";
import assignmentRouter from "./modules/assignment/assignment.route.js";
import billRouter from "./modules/bill/bill.route.js";
import paymentRouter from "./modules/payment/payment.route.js";
import paymentWebhookRouter from "./modules/payment/payment-webhook.route.js";
import analyticsRouter from "./modules/analytics/analytics.route.js";
import notificationRouter from "./modules/notification/notification.route.js";
import auditRouter from "./modules/audit/audit.route.js";
import googleAuthRouter from "./modules/auth/google-auth.route.js";
import { apiRateLimiter, authRateLimiter, corsMiddleware, securityHeaders } from "./middlewares/security.middleware.js";
import { globalErrorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

const app = express();
app.set("trust proxy", 1);

app.use(
    "/api/v1/payments/webhook",
    express.raw({
        type: "application/json",
    }),
    paymentWebhookRouter,
);

app.use(securityHeaders);

app.use(corsMiddleware);

app.use(
    express.json({
        limit: "1mb",
    }),
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb",
    }),
);

app.use(
    "/api/v1",
    apiRateLimiter,
);

app.use(express.json());

app.use(
    "/api/v1/auth",
    authRateLimiter,
    authRouter,
);

app.use(
    "/api/v1/auth",
    authRateLimiter,
    googleAuthRouter,
);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/zones", zoneRouter);
app.use("/api/v1/substations", substationRouter);
app.use("/api/v1/feeders", feederRouter);
app.use("/api/v1/areas", areaRouter);
app.use("/api/v1/customers", customerRouter);
app.use("/api/v1/schedules", scheduleRouter);
app.use("/api/v1/outage-reports", outageReportRouter);
app.use("/api/v1/incidents", incidentRouter);
app.use("/api/v1/assignments", assignmentRouter);
app.use("/api/v1/bills", billRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/analytics", analyticsRouter);

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

app.use(
    "/api/v1/notifications",
    notificationRouter,
);

app.use(
    "/api/v1/audit-logs",
    auditRouter,
);

app.use(notFoundHandler);

app.use(globalErrorHandler);

export default app;