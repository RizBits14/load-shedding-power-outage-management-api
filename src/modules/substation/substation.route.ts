import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    createSubstation,
    getSubstationById,
    getSubstations,
    deleteSubstation,
    updateSubstation,
} from "./substation.controller.js";

const router = Router();

router.get("/", getSubstations);

router.get("/:id", getSubstationById);

router.post(
    "/",
    authenticate,
    authorize("ADMIN"),
    createSubstation,
);

router.patch(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    updateSubstation,
);

router.delete(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    deleteSubstation,
);

export default router;