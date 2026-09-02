import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    acceptAssignment,
    getMyAssignments,
} from "./assignment.controller.js";

const router = Router();

router.get(
    "/my",
    authenticate,
    authorize("OPERATOR"),
    getMyAssignments,
);

router.patch(
    "/:id/accept",
    authenticate,
    authorize("OPERATOR"),
    acceptAssignment,
);

export default router;