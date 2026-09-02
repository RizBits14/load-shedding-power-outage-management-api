import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    createIncidentFromReport,
    getIncidentById,
    getIncidents,
} from "./incident.controller.js";

const router = Router();

router.get(
    "/",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getIncidents,
);

router.get(
    "/:id",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getIncidentById,
);

router.post(
    "/cluster/:reportId",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    createIncidentFromReport,
);

router.get(
    "/",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getIncidents,
);

router.get(
    "/:id",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getIncidentById,
);

export default router;