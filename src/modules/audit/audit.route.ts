import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    getAuditLogById,
    getAuditLogs,
    getAuditSummary,
} from "./audit.controller.js";

const router = Router();

router.get(
    "/summary",
    authenticate,
    authorize("ADMIN"),
    getAuditSummary,
);

router.get(
    "/",
    authenticate,
    authorize("ADMIN"),
    getAuditLogs,
);

router.get(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    getAuditLogById,
);

export default router;