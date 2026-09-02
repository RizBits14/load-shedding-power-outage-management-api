import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    assignOperator,
    cancelIncident,
    closeIncident,
    getIncidentAssignmentHistory,
    restoreIncident,
    startIncidentWork,
} from "../assignment/assignment.controller.js";

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
    "/:incidentId/assignments",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getIncidentAssignmentHistory,
);

router.post(
    "/:incidentId/assignments",
    authenticate,
    authorize("ADMIN"),
    assignOperator,
);

router.patch(
    "/:incidentId/start",
    authenticate,
    authorize("OPERATOR"),
    startIncidentWork,
);

router.patch(
    "/:incidentId/restore",
    authenticate,
    authorize("OPERATOR"),
    restoreIncident,
);

router.patch(
    "/:incidentId/close",
    authenticate,
    authorize("ADMIN"),
    closeIncident,
);

router.patch(
    "/:incidentId/cancel",
    authenticate,
    authorize("ADMIN"),
    cancelIncident,
);

router.post(
    "/cluster/:reportId",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    createIncidentFromReport,
);

router.get(
    "/:id",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    getIncidentById,
);

export default router;