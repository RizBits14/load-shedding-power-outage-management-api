import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    createSubstation,
    getSubstationById,
    getSubstations,
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

export default router;