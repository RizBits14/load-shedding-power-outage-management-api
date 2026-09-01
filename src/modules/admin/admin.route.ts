import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { getAllUsers } from "./admin.controller.js";

const router = Router();

router.get(
    "/users",
    authenticate,
    authorize("ADMIN"),
    getAllUsers,
);

export default router;