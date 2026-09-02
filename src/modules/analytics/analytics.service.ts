import { prisma } from "../../lib/prisma.js";

type Severity =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

type ReliabilityRisk =
    | "RELIABLE"
    | "WATCH"
    | "HIGH_RISK"
    | "CRITICAL";

const severityWeights: Record<Severity, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
};

const getRiskLevel = (
    score: number,
): ReliabilityRisk => {
    if (score >= 85) {
        return "RELIABLE";
    }

    if (score >= 70) {
        return "WATCH";
    }

    if (score >= 50) {
        return "HIGH_RISK";
    }

    return "CRITICAL";
};

const getSinceDate = (days: number) => {
    const date = new Date();

    date.setDate(date.getDate() - days);

    return date;
};

export const calculateAverageRestorationMinutes = (
    incidents: {
        startedAt: Date;
        restoredAt: Date | null;
    }[],
) => {
    const restoredIncidents = incidents.filter(
        (
            incident,
        ): incident is {
            startedAt: Date;
            restoredAt: Date;
        } => incident.restoredAt !== null,
    );

    if (restoredIncidents.length === 0) {
        return 0;
    }

    const totalMinutes = restoredIncidents.reduce(
        (sum, incident) => {
            const duration =
                incident.restoredAt.getTime() -
                incident.startedAt.getTime();

            return sum + Math.max(0, duration / 60000);
        },
        0,
    );

    return Math.round(
        totalMinutes / restoredIncidents.length,
    );
};

export const getAreaReliabilityData = async (
    days: number,
) => {
    const since = getSinceDate(days);

    const areas = await prisma.area.findMany({
        where: {
            deletedAt: null,
        },

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

            incidents: {
                where: {
                    deletedAt: null,

                    startedAt: {
                        gte: since,
                    },
                },

                select: {
                    id: true,
                    status: true,
                    severity: true,
                    startedAt: true,
                    restoredAt: true,
                },
            },
        },

        orderBy: {
            name: "asc",
        },
    });

    return areas.map((area) => {
        const totalIncidents = area.incidents.length;

        const activeIncidents = area.incidents.filter(
            (incident) =>
                [
                    "OPEN",
                    "ASSIGNED",
                    "IN_PROGRESS",
                ].includes(incident.status),
        ).length;

        const restoredIncidents =
            area.incidents.filter(
                (incident) => incident.restoredAt !== null,
            ).length;

        const averageRestorationMinutes =
            calculateAverageRestorationMinutes(
                area.incidents,
            );

        const averageSeverity =
            totalIncidents === 0
                ? 0
                : area.incidents.reduce(
                    (total, incident) =>
                        total +
                        severityWeights[
                        incident.severity as Severity
                        ],
                    0,
                ) / totalIncidents;

        /*
          Explainable reliability formula:
    
          Start at 100.
    
          Frequency penalty:
          More incidents reduce reliability.
          Maximum penalty = 30.
    
          Duration penalty:
          Longer restoration time reduces reliability.
          Maximum penalty = 30.
    
          Severity penalty:
          More severe incidents reduce reliability.
          Maximum penalty = 20.
    
          Active incident penalty:
          Current unresolved incidents reduce reliability.
          Maximum penalty = 20.
        */

        const frequencyPenalty = Math.min(
            totalIncidents * 5,
            30,
        );

        const durationPenalty = Math.min(
            averageRestorationMinutes / 6,
            30,
        );

        const severityPenalty = Math.min(
            averageSeverity * 5,
            20,
        );

        const activePenalty = Math.min(
            activeIncidents * 10,
            20,
        );

        const reliabilityScore = Math.max(
            0,
            Math.round(
                100 -
                frequencyPenalty -
                durationPenalty -
                severityPenalty -
                activePenalty,
            ),
        );

        return {
            area: {
                id: area.id,
                name: area.name,
                code: area.code,
                priority: area.priority,
            },

            feeder: area.feeder,

            metrics: {
                totalIncidents,
                activeIncidents,
                restoredIncidents,
                averageRestorationMinutes,
            },

            reliabilityScore,

            riskLevel: getRiskLevel(
                reliabilityScore,
            ),
        };
    });
};

export const buildIncidentTrend = async (
    days: number,
) => {
    const since = getSinceDate(days);

    const incidents =
        await prisma.outageIncident.findMany({
            where: {
                deletedAt: null,

                OR: [
                    {
                        startedAt: {
                            gte: since,
                        },
                    },
                    {
                        restoredAt: {
                            gte: since,
                        },
                    },
                    {
                        closedAt: {
                            gte: since,
                        },
                    },
                ],
            },

            select: {
                startedAt: true,
                restoredAt: true,
                closedAt: true,
            },
        });

    const trend = new Map<
        string,
        {
            date: string;
            opened: number;
            restored: number;
            closed: number;
        }
    >();

    for (let index = days - 1; index >= 0; index--) {
        const date = new Date();

        date.setUTCHours(0, 0, 0, 0);
        date.setUTCDate(date.getUTCDate() - index);

        const key = date.toISOString().slice(0, 10);

        trend.set(key, {
            date: key,
            opened: 0,
            restored: 0,
            closed: 0,
        });
    }

    for (const incident of incidents) {
        const openedKey =
            incident.startedAt
                .toISOString()
                .slice(0, 10);

        const openedEntry = trend.get(openedKey);

        if (openedEntry) {
            openedEntry.opened += 1;
        }

        if (incident.restoredAt) {
            const restoredKey =
                incident.restoredAt
                    .toISOString()
                    .slice(0, 10);

            const restoredEntry =
                trend.get(restoredKey);

            if (restoredEntry) {
                restoredEntry.restored += 1;
            }
        }

        if (incident.closedAt) {
            const closedKey =
                incident.closedAt
                    .toISOString()
                    .slice(0, 10);

            const closedEntry =
                trend.get(closedKey);

            if (closedEntry) {
                closedEntry.closed += 1;
            }
        }
    }

    return Array.from(trend.values());
};

export const getReliabilityRiskLevel =
    getRiskLevel;

export const getAnalyticsSinceDate =
    getSinceDate;