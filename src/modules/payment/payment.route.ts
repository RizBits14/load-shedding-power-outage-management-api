import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    createCheckoutSession,
    getMyPayments,
    getPayments,
    paymentCancelCallback,
    paymentSuccessCallback,
} from "./payment.controller.js";

const router = Router();

router.get(
    "/success",
    paymentSuccessCallback,
);

router.get(
    "/cancel",
    paymentCancelCallback,
);

router.post(
    "/checkout",
    authenticate,
    authorize("CUSTOMER"),
    createCheckoutSession,
);

router.get(
    "/my",
    authenticate,
    authorize("CUSTOMER"),
    getMyPayments,
);

router.get(
    "/",
    authenticate,
    authorize("ADMIN"),
    getPayments,
);

export default router;