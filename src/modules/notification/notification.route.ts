import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

import {
    broadcastNotification,
    dismissNotification,
    getMyNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from "./notification.controller.js";

const router = Router();

router.post(
    "/broadcast",
    authenticate,
    authorize("ADMIN"),
    broadcastNotification,
);

router.get(
    "/my/unread-count",
    authenticate,
    authorize(
        "CUSTOMER",
        "OPERATOR",
        "ADMIN",
    ),
    getUnreadNotificationCount,
);

router.patch(
    "/my/read-all",
    authenticate,
    authorize(
        "CUSTOMER",
        "OPERATOR",
        "ADMIN",
    ),
    markAllNotificationsAsRead,
);

router.get(
    "/my",
    authenticate,
    authorize(
        "CUSTOMER",
        "OPERATOR",
        "ADMIN",
    ),
    getMyNotifications,
);

router.patch(
    "/:id/read",
    authenticate,
    authorize(
        "CUSTOMER",
        "OPERATOR",
        "ADMIN",
    ),
    markNotificationAsRead,
);

router.delete(
    "/:id",
    authenticate,
    authorize(
        "CUSTOMER",
        "OPERATOR",
        "ADMIN",
    ),
    dismissNotification,
);

export default router;