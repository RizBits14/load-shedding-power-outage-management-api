import { Router } from "express";

import {
    googleLogin,
} from "./google-auth.controller.js";

const router = Router();

router.post(
    "/google",
    googleLogin,
);

export default router;