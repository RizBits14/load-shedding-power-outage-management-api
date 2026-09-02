import { Router } from "express";

import { stripeWebhook } from "./payment.webhook.js";

const router = Router();

router.post("/", stripeWebhook);

export default router;