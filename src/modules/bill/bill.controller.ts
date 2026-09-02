import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import {
    billQuerySchema,
    cancelBillSchema,
    createBillSchema,
    updateBillSchema,
} from "./bill.validation.js";

import { createNotificationSafely } from "../notification/notification.service.js";

const calculateTotal = (
    energyCharge: number,
    serviceCharge: number,
    taxAmount: number,
) => {
    return Math.round(
        (energyCharge + serviceCharge + taxAmount) * 100,
    ) / 100;
};

export const createBill = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = createBillSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const {
            customerId,
            billingMonth,
            billingYear,
            unitsConsumed,
            energyCharge,
            serviceCharge,
            taxAmount,
            dueDate,
        } = result.data;

        if (dueDate <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "Bill due date must be in the future",
            });
        }

        const customer = await prisma.user.findFirst({
            where: {
                id: customerId,
                role: "CUSTOMER",
                status: "ACTIVE",
                deletedAt: null,
                customerProfile: {
                    isNot: null,
                },
            },
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Active customer profile not found",
            });
        }

        const existingBill =
            await prisma.electricityBill.findUnique({
                where: {
                    customerId_billingMonth_billingYear: {
                        customerId,
                        billingMonth,
                        billingYear,
                    },
                },
            });

        if (existingBill) {
            return res.status(409).json({
                success: false,
                message:
                    "A bill already exists for this customer and billing period",
            });
        }

        const totalAmount = calculateTotal(
            energyCharge,
            serviceCharge,
            taxAmount,
        );

        const billNumber =
            `PSB-${billingYear}-${String(billingMonth).padStart(2, "0")}-${randomUUID()
                .slice(0, 8)
                .toUpperCase()}`;

        const bill = await prisma.electricityBill.create({
            data: {
                billNumber,
                customerId,
                createdById: res.locals.user.id,

                billingMonth,
                billingYear,
                unitsConsumed,

                energyCharge,
                serviceCharge,
                taxAmount,
                totalAmount,

                dueDate,
            },

            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,

                        customerProfile: {
                            select: {
                                phone: true,
                                address: true,

                                area: {
                                    select: {
                                        id: true,
                                        name: true,
                                        code: true,
                                    },
                                },
                            },
                        },
                    },
                },

                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });

        await createNotificationSafely({
            recipientId: bill.customer.id,

            type: "BILL",

            title: "New electricity bill",

            message:
                `Bill ${bill.billNumber} has been generated. ` +
                `Amount due: ${bill.totalAmount} ${bill.currency}.`,

            entityType: "BILL",
            entityId: bill.id,

            dedupeKey:
                `bill-created-${bill.id}`,
        });

        return res.status(201).json({
            success: true,
            message: "Electricity bill created successfully",
            data: bill,
        });
    } catch (error) {
        console.error("Create bill error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getMyBills = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = billQuerySchema
            .omit({
                customerId: true,
            })
            .safeParse(req.query);

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
            billingMonth,
            billingYear,
        } = result.data;

        const customerId = res.locals.user.id;

        const where = {
            customerId,
            ...(status && { status }),
            ...(billingMonth && { billingMonth }),
            ...(billingYear && { billingYear }),
        };

        const [bills, total] = await Promise.all([
            prisma.electricityBill.findMany({
                where,

                orderBy: {
                    createdAt: "desc",
                },

                skip: (page - 1) * limit,
                take: limit,
            }),

            prisma.electricityBill.count({
                where,
            }),
        ]);

        return res.status(200).json({
            success: true,
            message: "Your electricity bills retrieved successfully",
            data: bills,

            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get customer bills error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getMyBillById = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const bill = await prisma.electricityBill.findFirst({
            where: {
                id,
                customerId: res.locals.user.id,
            },

            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,

                        customerProfile: {
                            select: {
                                area: {
                                    select: {
                                        id: true,
                                        name: true,
                                        code: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Electricity bill not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Electricity bill retrieved successfully",
            data: bill,
        });
    } catch (error) {
        console.error("Get customer bill error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getBills = async (
    req: Request,
    res: Response,
) => {
    try {
        const result = billQuerySchema.safeParse(req.query);

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
            customerId,
            billingMonth,
            billingYear,
        } = result.data;

        const where = {
            ...(status && { status }),
            ...(customerId && { customerId }),
            ...(billingMonth && { billingMonth }),
            ...(billingYear && { billingYear }),
        };

        const [bills, total] = await Promise.all([
            prisma.electricityBill.findMany({
                where,

                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,

                            customerProfile: {
                                select: {
                                    area: {
                                        select: {
                                            id: true,
                                            name: true,
                                            code: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },

                orderBy: {
                    createdAt: "desc",
                },

                skip: (page - 1) * limit,
                take: limit,
            }),

            prisma.electricityBill.count({
                where,
            }),
        ]);

        return res.status(200).json({
            success: true,
            message: "Electricity bills retrieved successfully",
            data: bills,

            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get bills error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getBillById = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const bill = await prisma.electricityBill.findUnique({
            where: {
                id,
            },

            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,

                        customerProfile: {
                            include: {
                                area: {
                                    include: {
                                        feeder: {
                                            include: {
                                                substation: {
                                                    include: {
                                                        zone: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },

                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Electricity bill not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Electricity bill retrieved successfully",
            data: bill,
        });
    } catch (error) {
        console.error("Get bill error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const updateBill = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const result = updateBillSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const bill = await prisma.electricityBill.findUnique({
            where: {
                id,
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
                message: "Only unpaid bills can be updated",
            });
        }

        if (
            result.data.dueDate &&
            result.data.dueDate <= new Date()
        ) {
            return res.status(400).json({
                success: false,
                message: "Bill due date must be in the future",
            });
        }

        const energyCharge =
            result.data.energyCharge ??
            Number(bill.energyCharge);

        const serviceCharge =
            result.data.serviceCharge ??
            Number(bill.serviceCharge);

        const taxAmount =
            result.data.taxAmount ??
            Number(bill.taxAmount);

        const totalAmount = calculateTotal(
            energyCharge,
            serviceCharge,
            taxAmount,
        );

        const updatedBill =
            await prisma.electricityBill.update({
                where: {
                    id,
                },

                data: {
                    ...result.data,
                    totalAmount,
                },
            });

        return res.status(200).json({
            success: true,
            message: "Electricity bill updated successfully",
            data: updatedBill,
        });
    } catch (error) {
        console.error("Update bill error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const cancelBill = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const result = cancelBillSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const bill = await prisma.electricityBill.findUnique({
            where: {
                id,
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
                message: "Only unpaid bills can be cancelled",
            });
        }

        const cancelledBill =
            await prisma.electricityBill.update({
                where: {
                    id,
                },

                data: {
                    status: "CANCELLED",
                    cancelledAt: new Date(),
                    cancellationReason: result.data.reason,
                },
            });

        return res.status(200).json({
            success: true,
            message: "Electricity bill cancelled successfully",
            data: cancelledBill,
        });
    } catch (error) {
        console.error("Cancel bill error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};