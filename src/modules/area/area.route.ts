import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    createArea,
    deleteArea,
    getAreaById,
    getAreas,
    updateArea,
} from "./area.controller.js";

const router = Router();

router.get("/", getAreas);

router.get("/:id", getAreaById);

router.post(
    "/",
    authenticate,
    authorize("ADMIN"),
    createArea,
);

router.patch(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    updateArea,
);

router.delete(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    deleteArea,
);

export default router;