import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    createCustomerProfile,
    getMyCustomerProfile,
    updateMyCustomerProfile,
} from "./customer.controller.js";

const router = Router();

router.post(
    "/profile",
    authenticate,
    authorize("CUSTOMER"),
    createCustomerProfile,
);

router.get(
    "/profile",
    authenticate,
    authorize("CUSTOMER"),
    getMyCustomerProfile,
);

router.patch(
    "/profile",
    authenticate,
    authorize("CUSTOMER"),
    updateMyCustomerProfile,
);

export default router;