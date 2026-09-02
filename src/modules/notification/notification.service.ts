import { prisma } from "../../lib/prisma.js";

type NotificationTypeValue =
    | "OUTAGE_REPORT"
    | "INCIDENT"
    | "ASSIGNMENT"
    | "BILL"
    | "PAYMENT"
    | "SYSTEM";

type CreateNotificationInput = {
    recipientId: string;
    type: NotificationTypeValue;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    dedupeKey?: string;
};

export const createNotification = async (
    data: CreateNotificationInput,
) => {
    if (data.dedupeKey) {
        return prisma.notification.upsert({
            where: {
                dedupeKey: data.dedupeKey,
            },

            update: {},

            create: data,
        });
    }

    return prisma.notification.create({
        data,
    });
};

/*
  Notifications should not cause the main business operation
  to fail.

  For example:
  payment should still succeed even if creating a notification
  encounters an unexpected error.
*/
export const createNotificationSafely = async (
    data: CreateNotificationInput,
) => {
    try {
        return await createNotification(data);
    } catch (error) {
        console.error(
            "Notification creation error:",
            error,
        );

        return null;
    }
};

export const notifyIncidentCustomersSafely = async ({
    incidentId,
    title,
    message,
}: {
    incidentId: string;
    title: string;
    message: string;
}) => {
    try {
        const reports =
            await prisma.outageReport.findMany({
                where: {
                    incidentId,
                },

                select: {
                    customerId: true,
                },
            });

        const customerIds = [
            ...new Set(
                reports.map(
                    (report) => report.customerId,
                ),
            ),
        ];

        if (customerIds.length === 0) {
            return;
        }

        await prisma.notification.createMany({
            data: customerIds.map(
                (customerId) => ({
                    recipientId: customerId,
                    type: "INCIDENT" as const,
                    title,
                    message,

                    entityType: "INCIDENT",
                    entityId: incidentId,

                    dedupeKey:
                        `incident-restored-${incidentId}-${customerId}`,
                }),
            ),

            skipDuplicates: true,
        });
    } catch (error) {
        console.error(
            "Incident customer notification error:",
            error,
        );
    }
};