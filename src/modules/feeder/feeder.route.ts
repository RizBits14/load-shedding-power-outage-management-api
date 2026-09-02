import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    createFeeder,
    deleteFeeder,
    getFeederById,
    getFeeders,
    updateFeeder,
} from "./feeder.controller.js";

const router = Router();

router.get("/", getFeeders);

router.get("/:id", getFeederById);

router.post(
    "/",
    authenticate,
    authorize("ADMIN"),
    createFeeder,
);

router.patch(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    updateFeeder,
);

router.delete(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    deleteFeeder,
);

export default router;