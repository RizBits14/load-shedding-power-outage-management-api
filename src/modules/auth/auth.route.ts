import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";

import {
    getMe,
    loginUser,
    registerUser,
} from "./auth.controller.js";

const router = Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/me", authenticate, getMe);

export default router;