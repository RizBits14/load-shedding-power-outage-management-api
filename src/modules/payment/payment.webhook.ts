import type {
    Request,
    Response,
} from "express";

import type Stripe from "stripe";

import { prisma } from "../../lib/prisma.js";
import { getStripe } from "../../lib/stripe.js";

import { createNotificationSafely } from "../notification/notification.service.js";

import { createAuditLogSafely } from "../audit/audit.service.js";

const getPaymentIntentId = (
    paymentIntent:
        | string
        | Stripe.PaymentIntent
        | null,
) => {
    if (!paymentIntent) {
        return undefined;
    }

    if (
        typeof paymentIntent === "string"
    ) {
        return paymentIntent;
    }

    return paymentIntent.id;
};

export const stripeWebhook = async (
    req: Request,
    res: Response,
) => {
    const signature =
        req.headers["stripe-signature"];

    if (typeof signature !== "string") {
        return res
            .status(400)
            .send("Missing Stripe signature");
    }

    const webhookSecret =
        process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        return res.status(500).send(
            "STRIPE_WEBHOOK_SECRET is not configured",
        );
    }

    const stripe = getStripe();

    let event: Stripe.Event;

    try {
        event =
            stripe.webhooks.constructEvent(
                req.body,
                signature,
                webhookSecret,
            );
    } catch (error) {
        console.error(
            "Stripe webhook signature verification failed:",
            error,
        );

        return res.status(400).send(
            "Invalid Stripe webhook signature",
        );
    }

    try {
        const processedEvent =
            await prisma.stripeWebhookEvent.findUnique({
                where: {
                    stripeEventId: event.id,
                },
            });

        if (processedEvent) {
            return res.status(200).json({
                received: true,
                duplicate: true,
            });
        }

        if (
            event.type ===
            "checkout.session.completed" ||
            event.type ===
            "checkout.session.async_payment_succeeded"
        ) {
            const session =
                event.data
                    .object as Stripe.Checkout.Session;

            if (
                session.payment_status === "paid"
            ) {
                const payment =
                    await prisma.payment.findFirst({
                        where: {
                            stripeSessionId:
                                session.id,
                        },
                    });

                if (payment) {
                    const paidAt = new Date();

                    await prisma.$transaction(
                        async (tx) => {
                            await tx.stripeWebhookEvent.create({
                                data: {
                                    stripeEventId:
                                        event.id,

                                    type:
                                        event.type,
                                },
                            });

                            await tx.payment.update({
                                where: {
                                    id: payment.id,
                                },

                                data: {
                                    status:
                                        "SUCCEEDED",

                                    paidAt,

                                    stripePaymentIntentId:
                                        getPaymentIntentId(
                                            session.payment_intent,
                                        ),
                                },
                            });

                            await tx.electricityBill.updateMany({
                                where: {
                                    id:
                                        payment.billId,

                                    status:
                                        "UNPAID",
                                },

                                data: {
                                    status: "PAID",
                                    paidAt,
                                },
                            });
                        },
                    );

                    await createNotificationSafely({
                        recipientId:
                            payment.customerId,

                        type: "PAYMENT",

                        title:
                            "Payment successful",

                        message:
                            "Your electricity bill payment was completed successfully.",

                        entityType: "BILL",
                        entityId:
                            payment.billId,

                        dedupeKey:
                            `payment-success-${payment.id}`,
                    });

                    await createAuditLogSafely({
                        req,

                        action:
                            "PAYMENT_SUCCEEDED",

                        entityType:
                            "PAYMENT",

                        entityId:
                            payment.id,

                        description:
                            `Stripe payment ${payment.id} completed successfully.`,

                        metadata: {
                            customerId:
                                payment.customerId,

                            billId:
                                payment.billId,

                            stripeSessionId:
                                session.id,

                            stripeEventId:
                                event.id,
                        },
                    });

                    return res.status(200).json({
                        received: true,
                    });
                }
            }
        }

        if (
            event.type ===
            "checkout.session.async_payment_failed"
        ) {
            const session =
                event.data
                    .object as Stripe.Checkout.Session;

            await prisma.$transaction(
                async (tx) => {
                    await tx.stripeWebhookEvent.create({
                        data: {
                            stripeEventId:
                                event.id,

                            type:
                                event.type,
                        },
                    });

                    await tx.payment.updateMany({
                        where: {
                            stripeSessionId:
                                session.id,

                            status:
                                "PENDING",
                        },

                        data: {
                            status: "FAILED",
                            failedAt: new Date(),
                        },
                    });
                },
            );

            return res.status(200).json({
                received: true,
            });
        }

        if (
            event.type ===
            "checkout.session.expired"
        ) {
            const session =
                event.data
                    .object as Stripe.Checkout.Session;

            await prisma.$transaction(
                async (tx) => {
                    await tx.stripeWebhookEvent.create({
                        data: {
                            stripeEventId:
                                event.id,

                            type:
                                event.type,
                        },
                    });

                    await tx.payment.updateMany({
                        where: {
                            stripeSessionId:
                                session.id,

                            status:
                                "PENDING",
                        },

                        data: {
                            status:
                                "CANCELLED",

                            cancelledAt:
                                new Date(),
                        },
                    });
                },
            );

            return res.status(200).json({
                received: true,
            });
        }

        await prisma.stripeWebhookEvent.create({
            data: {
                stripeEventId: event.id,
                type: event.type,
            },
        });

        return res.status(200).json({
            received: true,
        });
    } catch (error) {
        console.error(
            "Stripe webhook processing error:",
            error,
        );

        return res.status(500).json({
            received: false,
        });
    }
};