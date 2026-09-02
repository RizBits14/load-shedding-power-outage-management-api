import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    createOutageReport,
    getMyOutageReportById,
    getMyOutageReports,
    getOutageReportById,
    getOutageReports,
    reviewOutageReport,
} from "./outage-report.controller.js";

const router = Router();

router.post(
    "/",
    authenticate,
    authorize("CUSTOMER"),
    createOutageReport,
);

router.get(
    "/my",
    authenticate,
    authorize("CUSTOMER"),
    getMyOutageReports,
);

router.get(
    "/my/:id",
    authenticate,
    authorize("CUSTOMER"),
    getMyOutageReportById,
);

router.get(
    "/",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getOutageReports,
);

router.get(
    "/:id",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getOutageReportById,
);

router.patch(
    "/:id/review",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    reviewOutageReport,
);

export default router;