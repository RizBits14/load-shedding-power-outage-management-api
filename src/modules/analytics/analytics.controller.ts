import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";

import {
    analyticsWindowSchema,
    priorityQueueQuerySchema,
} from "./analytics.validation.js";

import {
    buildIncidentTrend,
    calculateAverageRestorationMinutes,
    getAnalyticsSinceDate,
    getAreaReliabilityData,
    getReliabilityRiskLevel,
} from "./analytics.service.js";

export const getOverview = async (
    req: Request,
    res: Response,
) => {
    try {
        const result =
            analyticsWindowSchema.safeParse(req.query);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: result.error.flatten(),
            });
        }

        const { days } = result.data;

        const since = getAnalyticsSinceDate(days);

        const [
            customerCount,
            operatorCount,
            zoneCount,
            substationCount,
            feederCount,
            areaCount,
            activeIncidentCount,
            pendingReportCount,
            activeScheduleCount,
            unpaidBillCount,
            unpaidTotal,
            successfulPaymentCount,
            restoredIncidents,
        ] = await Promise.all([
            prisma.user.count({
                where: {
                    role: "CUSTOMER",
                    deletedAt: null,
                },
            }),

            prisma.user.count({
                where: {
                    role: "OPERATOR",
                    deletedAt: null,
                },
            }),

            prisma.zone.count({
                where: {
                    deletedAt: null,
                },
            }),

            prisma.substation.count({
                where: {
                    deletedAt: null,
                },
            }),

            prisma.feeder.count({
                where: {
                    deletedAt: null,
                },
            }),

            prisma.area.count({
                where: {
                    deletedAt: null,
                },
            }),

            prisma.outageIncident.count({
                where: {
                    deletedAt: null,

                    status: {
                        in: [
                            "OPEN",
                            "ASSIGNED",
                            "IN_PROGRESS",
                        ],
                    },
                },
            }),

            prisma.outageReport.count({
                where: {
                    status: {
                        in: [
                            "PENDING",
                            "VERIFIED",
                        ],
                    },
                },
            }),

            prisma.outageSchedule.count({
                where: {
                    deletedAt: null,

                    status: {
                        in: [
                            "PUBLISHED",
                            "ACTIVE",
                        ],
                    },
                },
            }),

            prisma.electricityBill.count({
                where: {
                    status: "UNPAID",
                },
            }),

            prisma.electricityBill.aggregate({
                where: {
                    status: "UNPAID",
                },

                _sum: {
                    totalAmount: true,
                },
            }),

            prisma.payment.count({
                where: {
                    status: "SUCCEEDED",

                    paidAt: {
                        gte: since,
                    },
                },
            }),

            prisma.outageIncident.findMany({
                where: {
                    deletedAt: null,

                    restoredAt: {
                        gte: since,
                    },
                },

                select: {
                    startedAt: true,
                    restoredAt: true,
                },
            }),
        ]);

        const averageRestorationMinutes =
            calculateAverageRestorationMinutes(
                restoredIncidents,
            );

        return res.status(200).json({
            success: true,
            message:
                "Operational analytics overview retrieved successfully",

            data: {
                analysisWindowDays: days,

                users: {
                    customers: customerCount,
                    operators: operatorCount,
                },

                infrastructure: {
                    zones: zoneCount,
                    substations: substationCount,
                    feeders: feederCount,
                    areas: areaCount,
                },

                outageOperations: {
                    activeIncidents:
                        activeIncidentCount,

                    pendingOrVerifiedReports:
                        pendingReportCount,

                    activeSchedules:
                        activeScheduleCount,

                    averageRestorationMinutes,
                },

                billing: {
                    unpaidBills:
                        unpaidBillCount,

                    unpaidAmount: Number(
                        unpaidTotal._sum.totalAmount ?? 0,
                    ),

                    successfulPaymentsInWindow:
                        successfulPaymentCount,
                },
            },
        });
    } catch (error) {
        console.error(
            "Analytics overview error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getIncidentTrend = async (
    req: Request,
    res: Response,
) => {
    try {
        const result =
            analyticsWindowSchema.safeParse(req.query);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: result.error.flatten(),
            });
        }

        const trend = await buildIncidentTrend(
            result.data.days,
        );

        return res.status(200).json({
            success: true,
            message:
                "Incident trend retrieved successfully",

            data: {
                analysisWindowDays:
                    result.data.days,

                trend,
            },
        });
    } catch (error) {
        console.error(
            "Incident trend analytics error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getPriorityQueue = async (
    req: Request,
    res: Response,
) => {
    try {
        const result =
            priorityQueueQuerySchema.safeParse(
                req.query,
            );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: result.error.flatten(),
            });
        }

        const { limit } = result.data;

        const incidents =
            await prisma.outageIncident.findMany({
                where: {
                    deletedAt: null,

                    status: {
                        in: [
                            "OPEN",
                            "ASSIGNED",
                            "IN_PROGRESS",
                        ],
                    },
                },

                select: {
                    id: true,
                    incidentCode: true,
                    title: true,
                    status: true,
                    severity: true,
                    priorityScore: true,
                    startedAt: true,

                    area: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            priority: true,

                            feeder: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                },
                            },
                        },
                    },

                    _count: {
                        select: {
                            reports: true,
                        },
                    },
                },

                orderBy: [
                    {
                        priorityScore: "desc",
                    },
                    {
                        startedAt: "asc",
                    },
                ],

                take: limit,
            });

        const now = Date.now();

        const queue = incidents.map(
            (incident, index) => {
                const waitingMinutes = Math.max(
                    0,
                    Math.floor(
                        (now -
                            incident.startedAt.getTime()) /
                        60000,
                    ),
                );

                return {
                    rank: index + 1,

                    incidentId: incident.id,
                    incidentCode:
                        incident.incidentCode,

                    title: incident.title,
                    status: incident.status,
                    severity: incident.severity,

                    restorationPriorityScore:
                        incident.priorityScore,

                    waitingMinutes,

                    linkedReportCount:
                        incident._count.reports,

                    area: incident.area,
                };
            },
        );

        return res.status(200).json({
            success: true,
            message:
                "Restoration priority queue retrieved successfully",

            data: queue,
        });
    } catch (error) {
        console.error(
            "Priority queue analytics error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getAreaReliability = async (
    req: Request,
    res: Response,
) => {
    try {
        const result =
            analyticsWindowSchema.safeParse(req.query);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: result.error.flatten(),
            });
        }

        const data =
            await getAreaReliabilityData(
                result.data.days,
            );

        const sorted = data.sort(
            (first, second) =>
                first.reliabilityScore -
                second.reliabilityScore,
        );

        return res.status(200).json({
            success: true,
            message:
                "Area reliability indicators retrieved successfully",

            data: {
                analysisWindowDays:
                    result.data.days,

                scoring: {
                    maximumScore: 100,
                    interpretation: {
                        "85-100": "RELIABLE",
                        "70-84": "WATCH",
                        "50-69": "HIGH_RISK",
                        "0-49": "CRITICAL",
                    },
                },

                areas: sorted,
            },
        });
    } catch (error) {
        console.error(
            "Area reliability analytics error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getFeederReliability = async (
    req: Request,
    res: Response,
) => {
    try {
        const result =
            analyticsWindowSchema.safeParse(req.query);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                errors: result.error.flatten(),
            });
        }

        const areaData =
            await getAreaReliabilityData(
                result.data.days,
            );

        const feederMap = new Map<
            string,
            {
                feeder: {
                    id: string;
                    name: string;
                    code: string;
                };

                areaScores: number[];
                totalIncidents: number;
                activeIncidents: number;
                restoredIncidents: number;
                restorationMinutesWeighted: number;
            }
        >();

        for (const item of areaData) {
            let feeder =
                feederMap.get(item.feeder.id);

            if (!feeder) {
                feeder = {
                    feeder: item.feeder,
                    areaScores: [],
                    totalIncidents: 0,
                    activeIncidents: 0,
                    restoredIncidents: 0,
                    restorationMinutesWeighted: 0,
                };

                feederMap.set(
                    item.feeder.id,
                    feeder,
                );
            }

            feeder.areaScores.push(
                item.reliabilityScore,
            );

            feeder.totalIncidents +=
                item.metrics.totalIncidents;

            feeder.activeIncidents +=
                item.metrics.activeIncidents;

            feeder.restoredIncidents +=
                item.metrics.restoredIncidents;

            feeder.restorationMinutesWeighted +=
                item.metrics
                    .averageRestorationMinutes *
                item.metrics.restoredIncidents;
        }

        const feeders = Array.from(
            feederMap.values(),
        )
            .map((item) => {
                const reliabilityScore =
                    item.areaScores.length === 0
                        ? 100
                        : Math.round(
                            item.areaScores.reduce(
                                (sum, score) =>
                                    sum + score,
                                0,
                            ) /
                            item.areaScores.length,
                        );

                const averageRestorationMinutes =
                    item.restoredIncidents === 0
                        ? 0
                        : Math.round(
                            item.restorationMinutesWeighted /
                            item.restoredIncidents,
                        );

                return {
                    feeder: item.feeder,

                    metrics: {
                        areaCount:
                            item.areaScores.length,

                        totalIncidents:
                            item.totalIncidents,

                        activeIncidents:
                            item.activeIncidents,

                        restoredIncidents:
                            item.restoredIncidents,

                        averageRestorationMinutes,
                    },

                    reliabilityScore,

                    riskLevel:
                        getReliabilityRiskLevel(
                            reliabilityScore,
                        ),
                };
            })
            .sort(
                (first, second) =>
                    first.reliabilityScore -
                    second.reliabilityScore,
            );

        return res.status(200).json({
            success: true,
            message:
                "Feeder reliability indicators retrieved successfully",

            data: {
                analysisWindowDays:
                    result.data.days,

                feeders,
            },
        });
    } catch (error) {
        console.error(
            "Feeder reliability analytics error:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};