import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    createZone,
    deleteZone,
    getZoneById,
    getZones,
    updateZone,
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

router.patch(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    updateZone,
);

router.delete(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    deleteZone,
);

export default router;