import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    createZone,
    getZoneById,
    getZones,
} from "./zone.controller.js";

const router = Router();

router.get("/", getZones);

router.get("/:id", getZoneById);

router.post(
    "/",
    authenticate,
    authorize("ADMIN"),
    createZone,
);

export default router;