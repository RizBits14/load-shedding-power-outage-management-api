import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    getAreaReliability,
    getFeederReliability,
    getIncidentTrend,
    getOverview,
    getPriorityQueue,
} from "./analytics.controller.js";

const router = Router();

router.get(
    "/overview",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getOverview,
);

router.get(
    "/incidents/trend",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getIncidentTrend,
);

router.get(
    "/priority-queue",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getPriorityQueue,
);

router.get(
    "/reliability/areas",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getAreaReliability,
);

router.get(
    "/reliability/feeders",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getFeederReliability,
);

export default router;