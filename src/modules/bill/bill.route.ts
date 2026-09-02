import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    cancelBill,
    createBill,
    getBillById,
    getBills,
    getMyBillById,
    getMyBills,
    updateBill,
} from "./bill.controller.js";

const router = Router();

router.get(
    "/my",
    authenticate,
    authorize("CUSTOMER"),
    getMyBills,
);

router.get(
    "/my/:id",
    authenticate,
    authorize("CUSTOMER"),
    getMyBillById,
);

router.get(
    "/",
    authenticate,
    authorize("ADMIN"),
    getBills,
);

router.post(
    "/",
    authenticate,
    authorize("ADMIN"),
    createBill,
);

router.get(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    getBillById,
);

router.patch(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    updateBill,
);

router.patch(
    "/:id/cancel",
    authenticate,
    authorize("ADMIN"),
    cancelBill,
);

export default router;