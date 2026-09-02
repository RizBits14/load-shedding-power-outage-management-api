import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    createSchedule,
    getPublicSchedules,
    getScheduleById,
    updateScheduleStatus,
} from "./schedule.controller.js";
const router = Router();

router.get("/", getPublicSchedules);

router.get("/:id", getScheduleById);

router.post(
    "/",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    createSchedule,
);

router.patch(
    "/:id/status",
    authenticate,
    authorize("ADMIN", "OPERATOR"),
    updateScheduleStatus,
);

export default router;