import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";

import {
    createNotificationSafely,
    notifyIncidentCustomersSafely,
} from "../notification/notification.service.js";

import { createAuditLogSafely } from "../audit/audit.service.js";

import {
    assignOperatorSchema,
    assignmentQuerySchema,
    cancelIncidentSchema,
} from "./assignment.validation.js";

export const assignOperator = async (
    req: Request<{ incidentId: string }>,
    res: Response,
) => {
    try {
        const { incidentId } = req.params;

        const result = assignOperatorSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const { operatorId, note } = result.data;

        const incident = await prisma.outageIncident.findFirst({
            where: {
                id: incidentId,
                deletedAt: null,
            },
        });

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Outage incident not found",
            });
        }

        if (!["OPEN", "ASSIGNED"].includes(incident.status)) {
            return res.status(400).json({
                success: false,
                message:
                    "Operator can only be assigned before incident work has started",
            });
        }

        const operator = await prisma.user.findFirst({
            where: {
                id: operatorId,
                role: "OPERATOR",
                status: "ACTIVE",
                deletedAt: null,
            },
        });

        if (!operator) {
            return res.status(404).json({
                success: false,
                message: "Active operator not found",
            });
        }

        const activeAssignment =
            await prisma.incidentAssignment.findFirst({
                where: {
                    incidentId,
                    status: {
                        in: ["ASSIGNED", "ACCEPTED"],
                    },
                },
                orderBy: {
                    assignedAt: "desc",
                },
            });

        if (
            activeAssignment &&
            activeAssignment.operatorId === operatorId
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "This operator is already assigned to the incident",
            });
        }

        const assignment = await prisma.$transaction(
            async (tx) => {
                if (activeAssignment) {
                    await tx.incidentAssignment.update({
                        where: {
                            id: activeAssignment.id,
                        },
                        data: {
                            status: "REASSIGNED",
                            reassignedAt: new Date(),
                        },
                    });
                }

                const createdAssignment =
                    await tx.incidentAssignment.create({
                        data: {
                            incidentId,
                            operatorId,
                            assignedById: res.locals.user.id,
                            note,
                        },
                    });

                await tx.outageIncident.update({
                    where: {
                        id: incidentId,
                    },
                    data: {
                        status: "ASSIGNED",
                    },
                });

                return tx.incidentAssignment.findUnique({
                    where: {
                        id: createdAssignment.id,
                    },

                    include: {
                        operator: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                            },
                        },

                        assignedBy: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                            },
                        },

                        incident: {
                            select: {
                                id: true,
                                incidentCode: true,
                                title: true,
                                status: true,
                                severity: true,
                                priorityScore: true,
                            },
                        },
                    },
                });
            },
        );

        /*
          Step 9:
          Notify the newly assigned operator only after
          the assignment transaction succeeds.
        */
        if (assignment) {
            await createNotificationSafely({
                recipientId: assignment.operator.id,

                type: "ASSIGNMENT",

                title: "New incident assignment",

                message:
                    `You have been assigned to ${assignment.incident.incidentCode}: ` +
                    `${assignment.incident.title}.`,

                entityType: "INCIDENT",
                entityId: assignment.incident.id,

                dedupeKey:
                    `assignment-created-${assignment.id}`,
            });
        }

        if (assignment) {
            await createAuditLogSafely({
                req,

                actorId:
                    res.locals.user.id,

                actorRole:
                    res.locals.user.role,

                action:
                    activeAssignment
                        ? "INCIDENT_REASSIGNED"
                        : "INCIDENT_ASSIGNED",

                entityType:
                    "INCIDENT",

                entityId:
                    assignment.incident.id,

                description:
                    activeAssignment
                        ? `Incident ${assignment.incident.incidentCode} was reassigned.`
                        : `Operator was assigned to incident ${assignment.incident.incidentCode}.`,

                metadata: {
                    assignmentId:
                        assignment.id,

                    operatorId:
                        assignment.operator.id,

                    previousAssignmentId:
                        activeAssignment?.id ?? null,
                },
            });
        }

        return res.status(201).json({
            success: true,

            message: activeAssignment
                ? "Incident reassigned successfully"
                : "Operator assigned successfully",

            data: assignment,
        });
    } catch (error) {
        console.error("Assign operator error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getMyAssignments = async (
    req: Request,
    res: Response,
) => {
    try {
        const result =
            assignmentQuerySchema.safeParse(req.query);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: result.error.flatten(),
            });
        }

        const { page, limit, status } = result.data;

        const operatorId = res.locals.user.id;

        const where = {
            operatorId,

            ...(status && {
                status,
            }),
        };

        const [assignments, total] =
            await Promise.all([
                prisma.incidentAssignment.findMany({
                    where,

                    include: {
                        incident: {
                            include: {
                                area: {
                                    select: {
                                        id: true,
                                        name: true,
                                        code: true,
                                        priority: true,
                                    },
                                },
                            },
                        },

                        assignedBy: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                            },
                        },
                    },

                    orderBy: {
                        assignedAt: "desc",
                    },

                    skip: (page - 1) * limit,
                    take: limit,
                }),

                prisma.incidentAssignment.count({
                    where,
                }),
            ]);

        return res.status(200).json({
            success: true,
            message:
                "Your assignments retrieved successfully",

            data: assignments,

            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error(
            "Get operator assignments error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getIncidentAssignmentHistory =
    async (
        req: Request<{ incidentId: string }>,
        res: Response,
    ) => {
        try {
            const { incidentId } = req.params;

            const incident =
                await prisma.outageIncident.findFirst({
                    where: {
                        id: incidentId,
                        deletedAt: null,
                    },
                });

            if (!incident) {
                return res.status(404).json({
                    success: false,
                    message: "Outage incident not found",
                });
            }

            const assignments =
                await prisma.incidentAssignment.findMany({
                    where: {
                        incidentId,
                    },

                    include: {
                        operator: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },

                        assignedBy: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                            },
                        },
                    },

                    orderBy: {
                        assignedAt: "desc",
                    },
                });

            return res.status(200).json({
                success: true,
                message:
                    "Incident assignment history retrieved successfully",
                data: assignments,
            });
        } catch (error) {
            console.error(
                "Get assignment history error:",
                error,
            );

            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    };

export const acceptAssignment = async (
    req: Request<{ id: string }>,
    res: Response,
) => {
    try {
        const { id } = req.params;

        const assignment =
            await prisma.incidentAssignment.findUnique({
                where: {
                    id,
                },

                include: {
                    incident: true,
                },
            });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found",
            });
        }

        if (
            assignment.operatorId !==
            res.locals.user.id
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "This assignment does not belong to you",
            });
        }

        if (assignment.status !== "ASSIGNED") {
            return res.status(400).json({
                success: false,
                message:
                    "Only newly assigned work can be accepted",
            });
        }

        if (
            assignment.incident.status !==
            "ASSIGNED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Incident is not available for acceptance",
            });
        }

        const updatedAssignment =
            await prisma.incidentAssignment.update({
                where: {
                    id,
                },

                data: {
                    status: "ACCEPTED",
                    acceptedAt: new Date(),
                },
            });

        return res.status(200).json({
            success: true,
            message:
                "Assignment accepted successfully",
            data: updatedAssignment,
        });
    } catch (error) {
        console.error(
            "Accept assignment error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const startIncidentWork = async (
    req: Request<{ incidentId: string }>,
    res: Response,
) => {
    try {
        const { incidentId } = req.params;

        const incident =
            await prisma.outageIncident.findFirst({
                where: {
                    id: incidentId,
                    deletedAt: null,
                },
            });

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Outage incident not found",
            });
        }

        if (incident.status !== "ASSIGNED") {
            return res.status(400).json({
                success: false,
                message:
                    "Only assigned incidents can be started",
            });
        }

        const assignment =
            await prisma.incidentAssignment.findFirst({
                where: {
                    incidentId,
                    operatorId: res.locals.user.id,
                    status: "ACCEPTED",
                },

                orderBy: {
                    assignedAt: "desc",
                },
            });

        if (!assignment) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have an accepted assignment for this incident",
            });
        }

        const started = await prisma.$transaction(
            async (tx) => {
                await tx.incidentAssignment.update({
                    where: {
                        id: assignment.id,
                    },

                    data: {
                        workStartedAt: new Date(),
                    },
                });

                return tx.outageIncident.update({
                    where: {
                        id: incidentId,
                    },

                    data: {
                        status: "IN_PROGRESS",
                    },
                });
            },
        );

        return res.status(200).json({
            success: true,
            message:
                "Incident work started successfully",
            data: started,
        });
    } catch (error) {
        console.error(
            "Start incident error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const restoreIncident = async (
    req: Request<{ incidentId: string }>,
    res: Response,
) => {
    try {
        const { incidentId } = req.params;

        const incident =
            await prisma.outageIncident.findFirst({
                where: {
                    id: incidentId,
                    deletedAt: null,
                },
            });

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Outage incident not found",
            });
        }

        if (incident.status !== "IN_PROGRESS") {
            return res.status(400).json({
                success: false,
                message:
                    "Only incidents in progress can be restored",
            });
        }

        const assignment =
            await prisma.incidentAssignment.findFirst({
                where: {
                    incidentId,
                    operatorId: res.locals.user.id,
                    status: "ACCEPTED",

                    workStartedAt: {
                        not: null,
                    },
                },

                orderBy: {
                    assignedAt: "desc",
                },
            });

        if (!assignment) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not the active operator for this incident",
            });
        }

        const restoredAt = new Date();

        const restoredIncident =
            await prisma.$transaction(
                async (tx) => {
                    await tx.incidentAssignment.update({
                        where: {
                            id: assignment.id,
                        },

                        data: {
                            status: "COMPLETED",
                            completedAt: restoredAt,
                        },
                    });

                    return tx.outageIncident.update({
                        where: {
                            id: incidentId,
                        },

                        data: {
                            status: "RESTORED",
                            restoredAt,
                        },
                    });
                },
            );

        await notifyIncidentCustomersSafely({
            incidentId,

            title: "Power restored",

            message:
                `Power restoration has been recorded for incident ` +
                `${restoredIncident.incidentCode}.`,
        });

        await createAuditLogSafely({
            req,

            actorId:
                res.locals.user.id,

            actorRole:
                res.locals.user.role,

            action:
                "INCIDENT_RESTORED",

            entityType:
                "INCIDENT",

            entityId:
                restoredIncident.id,

            description:
                `Power restoration was recorded for incident ${restoredIncident.incidentCode}.`,

            metadata: {
                restoredAt:
                    restoredAt.toISOString(),
            },
        });

        return res.status(200).json({
            success: true,
            message:
                "Power restoration recorded successfully",
            data: restoredIncident,
        });
    } catch (error) {
        console.error(
            "Restore incident error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const closeIncident = async (
    req: Request<{ incidentId: string }>,
    res: Response,
) => {
    try {
        const { incidentId } = req.params;

        const incident =
            await prisma.outageIncident.findFirst({
                where: {
                    id: incidentId,
                    deletedAt: null,
                },
            });

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Outage incident not found",
            });
        }

        if (incident.status !== "RESTORED") {
            return res.status(400).json({
                success: false,
                message:
                    "Only restored incidents can be closed",
            });
        }

        const closedIncident =
            await prisma.outageIncident.update({
                where: {
                    id: incidentId,
                },

                data: {
                    status: "CLOSED",
                    closedAt: new Date(),
                },
            });

        await createAuditLogSafely({
            req,

            actorId:
                res.locals.user.id,

            actorRole:
                res.locals.user.role,

            action:
                "INCIDENT_CLOSED",

            entityType:
                "INCIDENT",

            entityId:
                closedIncident.id,

            description:
                `Incident ${closedIncident.incidentCode} was closed.`,
        });

        return res.status(200).json({
            success: true,
            message: "Incident closed successfully",
            data: closedIncident,
        });
    } catch (error) {
        console.error(
            "Close incident error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const cancelIncident = async (
    req: Request<{ incidentId: string }>,
    res: Response,
) => {
    try {
        const { incidentId } = req.params;

        const result =
            cancelIncidentSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const incident =
            await prisma.outageIncident.findFirst({
                where: {
                    id: incidentId,
                    deletedAt: null,
                },
            });

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Outage incident not found",
            });
        }

        if (
            !["OPEN", "ASSIGNED"].includes(
                incident.status,
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Only open or assigned incidents can be cancelled",
            });
        }

        const cancelledAt = new Date();

        const cancelledIncident =
            await prisma.$transaction(
                async (tx) => {
                    await tx.incidentAssignment.updateMany({
                        where: {
                            incidentId,

                            status: {
                                in: [
                                    "ASSIGNED",
                                    "ACCEPTED",
                                ],
                            },
                        },

                        data: {
                            status: "CANCELLED",
                            cancelledAt,
                        },
                    });

                    return tx.outageIncident.update({
                        where: {
                            id: incidentId,
                        },

                        data: {
                            status: "CANCELLED",
                            cancelledAt,

                            cancellationReason:
                                result.data.reason,
                        },
                    });
                },
            );

        await createAuditLogSafely({
            req,

            actorId:
                res.locals.user.id,

            actorRole:
                res.locals.user.role,

            action:
                "INCIDENT_CANCELLED",

            entityType:
                "INCIDENT",

            entityId:
                cancelledIncident.id,

            description:
                `Incident ${cancelledIncident.incidentCode} was cancelled.`,

            metadata: {
                reason:
                    result.data.reason,
            },
        });

        return res.status(200).json({
            success: true,
            message:
                "Incident cancelled successfully",
            data: cancelledIncident,
        });
    } catch (error) {
        console.error(
            "Cancel incident error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};