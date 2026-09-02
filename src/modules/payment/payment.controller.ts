import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import { getStripe } from "../../lib/stripe.js";

import {
    createCheckoutSchema,
    paymentQuerySchema,
} from "./payment.validation.js";

const toMinorUnits = (amount: number) => {
    return Math.round(amount * 100);
};

export const createCheckoutSession = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = createCheckoutSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const customerId = res.locals.user.id;
        const { billId } = result.data;

        const bill = await prisma.electricityBill.findFirst({
            where: {
                id: billId,
                customerId,
            },
        });

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Electricity bill not found",
            });
        }

        if (bill.status !== "UNPAID") {
            return res.status(400).json({
                success: false,
                message: "Only unpaid bills can be paid",
            });
        }

        const existingPayment = await prisma.payment.findFirst({
            where: {
                billId,
                customerId,
                status: "PENDING",
                stripeSessionId: {
                    not: null,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const stripe = getStripe();

        if (existingPayment?.stripeSessionId) {
            try {
                const existingSession =
                    await stripe.checkout.sessions.retrieve(
                        existingPayment.stripeSessionId,
                    );

                if (
                    existingSession.status === "open" &&
                    existingSession.url
                ) {
                    return res.status(200).json({
                        success: true,
                        message: "Existing payment session retrieved",
                        data: {
                            paymentId: existingPayment.id,
                            sessionId: existingSession.id,
                            checkoutUrl: existingSession.url,
                        },
                    });
                }
            } catch (error) {
                console.error(
                    "Retrieve existing Stripe session error:",
                    error,
                );
            }
        }

        const amount = Number(bill.totalAmount);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Bill amount is invalid",
            });
        }

        const backendUrl = process.env.BACKEND_URL;

        if (!backendUrl) {
            throw new Error("BACKEND_URL is not defined");
        }

        const payment = await prisma.payment.create({
            data: {
                billId,
                customerId,
                amount,
                currency: bill.currency,
            },
        });

        try {
            const session =
                await stripe.checkout.sessions.create({
                    mode: "payment",

                    customer_email: res.locals.user.email,

                    line_items: [
                        {
                            quantity: 1,

                            price_data: {
                                currency: bill.currency.toLowerCase(),

                                unit_amount: toMinorUnits(amount),

                                product_data: {
                                    name: `PowerSync Electricity Bill ${bill.billNumber}`,
                                    description:
                                        `Billing period ${bill.billingMonth}/${bill.billingYear}`,
                                },
                            },
                        },
                    ],

                    metadata: {
                        paymentId: payment.id,
                        billId: bill.id,
                        customerId,
                    },

                    success_url:
                        `${backendUrl}/api/v1/payments/success?session_id={CHECKOUT_SESSION_ID}`,

                    cancel_url:
                        `${backendUrl}/api/v1/payments/cancel?session_id={CHECKOUT_SESSION_ID}`,
                });

            await prisma.payment.update({
                where: {
                    id: payment.id,
                },
                data: {
                    stripeSessionId: session.id,
                },
            });

            return res.status(201).json({
                success: true,
                message:
                    "Stripe Checkout session created successfully",
                data: {
                    paymentId: payment.id,
                    sessionId: session.id,
                    checkoutUrl: session.url,
                    amount,
                    currency: bill.currency,
                },
            });
        } catch (stripeError) {
            await prisma.payment.update({
                where: {
                    id: payment.id,
                },
                data: {
                    status: "FAILED",
                    failedAt: new Date(),
                },
            });

            throw stripeError;
        }
    } catch (error) {
        console.error("Create Stripe checkout error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create payment session",
        });
    }
};

export const paymentSuccessCallback = async (
    req: Request,
    res: Response,
) => {
    try {
        const sessionId =
            typeof req.query.session_id === "string"
                ? req.query.session_id
                : undefined;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Stripe session ID is required",
            });
        }

        const stripe = getStripe();

        const session =
            await stripe.checkout.sessions.retrieve(sessionId);

        const payment = await prisma.payment.findFirst({
            where: {
                stripeSessionId: sessionId,
            },
            include: {
                bill: {
                    select: {
                        id: true,
                        billNumber: true,
                        status: true,
                        totalAmount: true,
                        billingMonth: true,
                        billingYear: true,
                    },
                },
            },
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                "Stripe returned the customer to PowerSync successfully",
            data: {
                stripePaymentStatus: session.payment_status,
                payment,
            },
        });
    } catch (error) {
        console.error(
            "Stripe success callback error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Unable to verify payment session",
        });
    }
};

export const paymentCancelCallback = async (
    req: Request,
    res: Response,
) => {
    try {
        const sessionId =
            typeof req.query.session_id === "string"
                ? req.query.session_id
                : undefined;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Stripe session ID is required",
            });
        }

        const payment = await prisma.payment.findFirst({
            where: {
                stripeSessionId: sessionId,
            },
            select: {
                id: true,
                status: true,
                amount: true,
                currency: true,
                billId: true,
                stripeSessionId: true,
            },
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Stripe Checkout was cancelled",
            data: payment,
        });
    } catch (error) {
        console.error(
            "Stripe cancel callback error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Unable to process cancelled checkout",
        });
    }
};

export const getMyPayments = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = paymentQuerySchema.safeParse(req.query);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: result.error.flatten(),
            });
        }

        const {
            page,
            limit,
            status,
            billId,
        } = result.data;

        const customerId = res.locals.user.id;

        const where = {
            customerId,
            ...(status && {
                status,
            }),
            ...(billId && {
                billId,
            }),
        };

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    bill: {
                        select: {
                            id: true,
                            billNumber: true,
                            status: true,
                            billingMonth: true,
                            billingYear: true,
                            totalAmount: true,
                            currency: true,
                            dueDate: true,
                            paidAt: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                skip: (page - 1) * limit,
                take: limit,
            }),

            prisma.payment.count({
                where,
            }),
        ]);

        return res.status(200).json({
            success: true,
            message:
                "Your payments retrieved successfully",
            data: payments,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error(
            "Get customer payments error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getPayments = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = paymentQuerySchema.safeParse(req.query);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: result.error.flatten(),
            });
        }

        const {
            page,
            limit,
            status,
            billId,
        } = result.data;

        const where = {
            ...(status && {
                status,
            }),
            ...(billId && {
                billId,
            }),
        };

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },

                    bill: {
                        select: {
                            id: true,
                            billNumber: true,
                            status: true,
                            billingMonth: true,
                            billingYear: true,
                            totalAmount: true,
                            currency: true,
                            dueDate: true,
                            paidAt: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                skip: (page - 1) * limit,
                take: limit,
            }),

            prisma.payment.count({
                where,
            }),
        ]);

        return res.status(200).json({
            success: true,
            message: "Payments retrieved successfully",
            data: payments,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get payments error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};