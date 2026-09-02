import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma.js";

const DEMO_PASSWORD = "PowerSync@123";

const now = new Date();

const addHours = (
    date: Date,
    hours: number,
) => {
    return new Date(
        date.getTime() +
        hours * 60 * 60 * 1000,
    );
};

const addDays = (
    date: Date,
    days: number,
) => {
    return new Date(
        date.getTime() +
        days * 24 * 60 * 60 * 1000,
    );
};

const getBillingPeriod = (
    monthOffset = 0,
) => {
    const date = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() +
            monthOffset,
            1,
        ),
    );

    return {
        billingMonth:
            date.getUTCMonth() + 1,

        billingYear:
            date.getUTCFullYear(),
    };
};

const resetDatabase = async () => {
    console.log(
        "Clearing existing PowerSync data...",
    );

    /*
      Delete child records first so foreign-key
      relationships are respected.
  
      This clears DATA only.
      Prisma migrations/schema remain untouched.
    */
    await prisma.$transaction([
        prisma.stripeWebhookEvent.deleteMany(),

        prisma.payment.deleteMany(),

        prisma.notification.deleteMany(),

        prisma.auditLog.deleteMany(),

        prisma.incidentAssignment.deleteMany(),

        prisma.outageReport.deleteMany(),

        prisma.outageIncident.deleteMany(),

        prisma.outageSchedule.deleteMany(),

        prisma.electricityBill.deleteMany(),

        prisma.customerProfile.deleteMany(),

        prisma.area.deleteMany(),

        prisma.feeder.deleteMany(),

        prisma.substation.deleteMany(),

        prisma.zone.deleteMany(),

        prisma.user.deleteMany(),
    ]);

    console.log(
        "Existing data cleared.",
    );
};

const seedUsers = async () => {
    const passwordHash =
        await bcrypt.hash(
            DEMO_PASSWORD,
            12,
        );

    const admin =
        await prisma.user.create({
            data: {
                name: "PowerSync Admin",

                email:
                    "admin@powersync.com",

                password:
                    passwordHash,

                role: "ADMIN",

                status: "ACTIVE",
            },
        });

    const operator1 =
        await prisma.user.create({
            data: {
                name: "Farhan Ahmed",

                email:
                    "operator1@powersync.com",

                password:
                    passwordHash,

                role: "OPERATOR",

                status: "ACTIVE",
            },
        });

    const operator2 =
        await prisma.user.create({
            data: {
                name: "Nusrat Jahan",

                email:
                    "operator2@powersync.com",

                password:
                    passwordHash,

                role: "OPERATOR",

                status: "ACTIVE",
            },
        });

    const customer1 =
        await prisma.user.create({
            data: {
                name: "Rahim Uddin",

                email:
                    "customer1@powersync.com",

                password:
                    passwordHash,

                role: "CUSTOMER",

                status: "ACTIVE",
            },
        });

    const customer2 =
        await prisma.user.create({
            data: {
                name: "Tasnim Akter",

                email:
                    "customer2@powersync.com",

                password:
                    passwordHash,

                role: "CUSTOMER",

                status: "ACTIVE",
            },
        });

    const customer3 =
        await prisma.user.create({
            data: {
                name: "Sabbir Hossain",

                email:
                    "customer3@powersync.com",

                password:
                    passwordHash,

                role: "CUSTOMER",

                status: "ACTIVE",
            },
        });

    return {
        admin,
        operator1,
        operator2,
        customer1,
        customer2,
        customer3,
    };
};

const seedInfrastructure =
    async () => {
        const dhakaNorth =
            await prisma.zone.create({
                data: {
                    name:
                        "Dhaka North Zone",

                    code:
                        "DHK-NORTH",

                    description:
                        "Northern PowerSync demonstration service zone.",
                },
            });

        const dhakaSouth =
            await prisma.zone.create({
                data: {
                    name:
                        "Dhaka South Zone",

                    code:
                        "DHK-SOUTH",

                    description:
                        "Southern PowerSync demonstration service zone.",
                },
            });

        const uttaraSubstation =
            await prisma.substation.create({
                data: {
                    name:
                        "Uttara Grid Substation",

                    code:
                        "UTT-SS-01",

                    description:
                        "Primary demonstration substation serving Uttara areas.",

                    status:
                        "ACTIVE",

                    zoneId:
                        dhakaNorth.id,
                },
            });

        const dhanmondiSubstation =
            await prisma.substation.create({
                data: {
                    name:
                        "Dhanmondi Grid Substation",

                    code:
                        "DHN-SS-01",

                    description:
                        "Demonstration substation serving central Dhaka areas.",

                    status:
                        "ACTIVE",

                    zoneId:
                        dhakaSouth.id,
                },
            });

        const uttaraFeeder1 =
            await prisma.feeder.create({
                data: {
                    name:
                        "Uttara Feeder 01",

                    code:
                        "UTT-F01",

                    description:
                        "Primary feeder for Uttara Sector 7.",

                    capacityMw:
                        18.5,

                    status:
                        "ACTIVE",

                    substationId:
                        uttaraSubstation.id,
                },
            });

        const uttaraFeeder2 =
            await prisma.feeder.create({
                data: {
                    name:
                        "Uttara Feeder 02",

                    code:
                        "UTT-F02",

                    description:
                        "Primary feeder for Uttara Sector 10.",

                    capacityMw:
                        16.75,

                    status:
                        "ACTIVE",

                    substationId:
                        uttaraSubstation.id,
                },
            });

        const dhanmondiFeeder =
            await prisma.feeder.create({
                data: {
                    name:
                        "Dhanmondi Feeder 01",

                    code:
                        "DHN-F01",

                    description:
                        "Central demonstration feeder.",

                    capacityMw:
                        22,

                    status:
                        "ACTIVE",

                    substationId:
                        dhanmondiSubstation.id,
                },
            });

        const uttara7 =
            await prisma.area.create({
                data: {
                    name:
                        "Uttara Sector 7",

                    code:
                        "UTT-S07",

                    description:
                        "Residential and commercial demonstration area.",

                    priority:
                        "NORMAL",

                    latitude:
                        23.8721,

                    longitude:
                        90.3981,

                    feederId:
                        uttaraFeeder1.id,
                },
            });

        const uttara10 =
            await prisma.area.create({
                data: {
                    name:
                        "Uttara Sector 10",

                    code:
                        "UTT-S10",

                    description:
                        "High-priority demonstration service area.",

                    priority:
                        "HIGH",

                    latitude:
                        23.8708,

                    longitude:
                        90.3912,

                    feederId:
                        uttaraFeeder2.id,
                },
            });

        const dhanmondi =
            await prisma.area.create({
                data: {
                    name:
                        "Dhanmondi",

                    code:
                        "DHK-DHN",

                    description:
                        "Urban demonstration area with mixed customer demand.",

                    priority:
                        "CRITICAL",

                    latitude:
                        23.7461,

                    longitude:
                        90.3742,

                    feederId:
                        dhanmondiFeeder.id,
                },
            });

        const mohammadpur =
            await prisma.area.create({
                data: {
                    name:
                        "Mohammadpur",

                    code:
                        "DHK-MDP",

                    description:
                        "Residential demonstration area.",

                    priority:
                        "NORMAL",

                    latitude:
                        23.7658,

                    longitude:
                        90.3584,

                    feederId:
                        dhanmondiFeeder.id,
                },
            });

        return {
            dhakaNorth,
            dhakaSouth,

            uttaraSubstation,
            dhanmondiSubstation,

            uttaraFeeder1,
            uttaraFeeder2,
            dhanmondiFeeder,

            uttara7,
            uttara10,
            dhanmondi,
            mohammadpur,
        };
    };

const seedCustomerProfiles = async (
    users: Awaited<
        ReturnType<typeof seedUsers>
    >,

    infrastructure: Awaited<
        ReturnType<
            typeof seedInfrastructure
        >
    >,
) => {
    await prisma.customerProfile.create({
        data: {
            userId:
                users.customer1.id,

            areaId:
                infrastructure.uttara10.id,

            phone:
                "01710000001",

            address:
                "Road 12, Uttara Sector 10, Dhaka",
        },
    });

    await prisma.customerProfile.create({
        data: {
            userId:
                users.customer2.id,

            areaId:
                infrastructure.uttara10.id,

            phone:
                "01710000002",

            address:
                "Road 8, Uttara Sector 10, Dhaka",
        },
    });

    await prisma.customerProfile.create({
        data: {
            userId:
                users.customer3.id,

            areaId:
                infrastructure.dhanmondi.id,

            phone:
                "01710000003",

            address:
                "Road 15, Dhanmondi, Dhaka",
        },
    });
};

const seedSchedules = async (
    users: Awaited<
        ReturnType<typeof seedUsers>
    >,

    infrastructure: Awaited<
        ReturnType<
            typeof seedInfrastructure
        >
    >,
) => {
    await prisma.outageSchedule.create({
        data: {
            title:
                "Uttara Planned Load Management",

            reason:
                "Scheduled feeder maintenance and load balancing.",

            startTime:
                addHours(now, 24),

            endTime:
                addHours(now, 27),

            status:
                "PUBLISHED",

            areaId:
                infrastructure.uttara7.id,

            createdById:
                users.admin.id,
        },
    });

    await prisma.outageSchedule.create({
        data: {
            title:
                "Dhanmondi Planned Maintenance",

            reason:
                "Transformer maintenance activity.",

            startTime:
                addHours(now, -1),

            endTime:
                addHours(now, 2),

            status:
                "ACTIVE",

            areaId:
                infrastructure.dhanmondi.id,

            createdById:
                users.admin.id,
        },
    });

    await prisma.outageSchedule.create({
        data: {
            title:
                "Uttara Historical Maintenance",

            reason:
                "Completed feeder inspection.",

            startTime:
                addHours(now, -72),

            endTime:
                addHours(now, -69),

            status:
                "COMPLETED",

            areaId:
                infrastructure.uttara10.id,

            createdById:
                users.admin.id,
        },
    });
};

const seedIncidentsAndReports =
    async (
        users: Awaited<
            ReturnType<typeof seedUsers>
        >,

        infrastructure: Awaited<
            ReturnType<
                typeof seedInfrastructure
            >
        >,
    ) => {
        /*
          Incident 1:
          OPEN + multiple customer reports.
          Useful for priority queue demonstration.
        */
        const openIncident =
            await prisma.outageIncident.create({
                data: {
                    incidentCode:
                        "PS-DEMO-OPEN-001",

                    title:
                        "Unexpected outage in Uttara Sector 10",

                    summary:
                        "Multiple verified customer reports indicate a probable local outage.",

                    status:
                        "OPEN",

                    severity:
                        "HIGH",

                    priorityScore:
                        72,

                    areaId:
                        infrastructure.uttara10.id,

                    createdById:
                        users.admin.id,

                    startedAt:
                        addHours(now, -2),
                },
            });

        const openReport1 =
            await prisma.outageReport.create({
                data: {
                    issueType:
                        "TOTAL_OUTAGE",

                    description:
                        "Complete loss of electricity supply.",

                    status:
                        "LINKED",

                    customerId:
                        users.customer1.id,

                    areaId:
                        infrastructure.uttara10.id,

                    reviewedById:
                        users.admin.id,

                    reviewedAt:
                        addHours(now, -2.1),

                    reviewNote:
                        "Verified through multiple customer reports.",

                    incidentId:
                        openIncident.id,

                    reportedAt:
                        addHours(now, -2.4),
                },
            });

        const openReport2 =
            await prisma.outageReport.create({
                data: {
                    issueType:
                        "TOTAL_OUTAGE",

                    description:
                        "Power unavailable throughout nearby buildings.",

                    status:
                        "LINKED",

                    customerId:
                        users.customer2.id,

                    areaId:
                        infrastructure.uttara10.id,

                    reviewedById:
                        users.admin.id,

                    reviewedAt:
                        addHours(now, -2),

                    reviewNote:
                        "Verified and linked to the same probable outage.",

                    incidentId:
                        openIncident.id,

                    reportedAt:
                        addHours(now, -2.25),
                },
            });

        /*
          Incident 2:
          Currently assigned to Operator 1.
        */
        const assignedIncident =
            await prisma.outageIncident.create({
                data: {
                    incidentCode:
                        "PS-DEMO-ASG-001",

                    title:
                        "Voltage instability in Dhanmondi",

                    summary:
                        "Field inspection required due to persistent voltage fluctuations.",

                    status:
                        "ASSIGNED",

                    severity:
                        "CRITICAL",

                    priorityScore:
                        88,

                    areaId:
                        infrastructure.dhanmondi.id,

                    createdById:
                        users.admin.id,

                    startedAt:
                        addHours(now, -4),
                },
            });

        await prisma.outageReport.create({
            data: {
                issueType:
                    "VOLTAGE_FLUCTUATION",

                description:
                    "Severe voltage fluctuation affecting appliances.",

                status:
                    "LINKED",

                customerId:
                    users.customer3.id,

                areaId:
                    infrastructure.dhanmondi.id,

                reviewedById:
                    users.admin.id,

                reviewedAt:
                    addHours(now, -3.8),

                reviewNote:
                    "Critical-area complaint verified.",

                incidentId:
                    assignedIncident.id,

                reportedAt:
                    addHours(now, -4),
            },
        });

        const assignedAssignment =
            await prisma.incidentAssignment.create({
                data: {
                    incidentId:
                        assignedIncident.id,

                    operatorId:
                        users.operator1.id,

                    assignedById:
                        users.admin.id,

                    status:
                        "ASSIGNED",

                    note:
                        "Inspect feeder voltage and transformer condition.",

                    assignedAt:
                        addHours(now, -3),
                },
            });

        /*
          Incident 3:
          IN_PROGRESS with accepted assignment.
        */
        const inProgressIncident =
            await prisma.outageIncident.create({
                data: {
                    incidentCode:
                        "PS-DEMO-WIP-001",

                    title:
                        "Partial outage in Uttara Sector 7",

                    summary:
                        "Field team is currently investigating the affected distribution section.",

                    status:
                        "IN_PROGRESS",

                    severity:
                        "MEDIUM",

                    priorityScore:
                        54,

                    areaId:
                        infrastructure.uttara7.id,

                    createdById:
                        users.admin.id,

                    startedAt:
                        addHours(now, -6),
                },
            });

        const inProgressAssignment =
            await prisma.incidentAssignment.create({
                data: {
                    incidentId:
                        inProgressIncident.id,

                    operatorId:
                        users.operator2.id,

                    assignedById:
                        users.admin.id,

                    status:
                        "ACCEPTED",

                    note:
                        "Investigate distribution line interruption.",

                    assignedAt:
                        addHours(now, -5),

                    acceptedAt:
                        addHours(now, -4.75),

                    workStartedAt:
                        addHours(now, -4.5),
                },
            });

        /*
          Incident 4:
          Historical CLOSED incident for reliability
          and restoration analytics.
        */
        const closedIncident =
            await prisma.outageIncident.create({
                data: {
                    incidentCode:
                        "PS-DEMO-CLS-001",

                    title:
                        "Historical outage in Uttara Sector 10",

                    summary:
                        "Historical outage successfully restored and closed.",

                    status:
                        "CLOSED",

                    severity:
                        "HIGH",

                    priorityScore:
                        68,

                    areaId:
                        infrastructure.uttara10.id,

                    createdById:
                        users.admin.id,

                    startedAt:
                        addHours(now, -120),

                    restoredAt:
                        addHours(now, -116),

                    closedAt:
                        addHours(now, -115),
                },
            });

        await prisma.incidentAssignment.create({
            data: {
                incidentId:
                    closedIncident.id,

                operatorId:
                    users.operator1.id,

                assignedById:
                    users.admin.id,

                status:
                    "COMPLETED",

                note:
                    "Historical restoration completed successfully.",

                assignedAt:
                    addHours(now, -119.5),

                acceptedAt:
                    addHours(now, -119),

                workStartedAt:
                    addHours(now, -118.5),

                completedAt:
                    addHours(now, -116),
            },
        });

        /*
          One PENDING report for review demonstration.
        */
        const pendingReport =
            await prisma.outageReport.create({
                data: {
                    issueType:
                        "PARTIAL_OUTAGE",

                    description:
                        "Several nearby connections appear to be without electricity.",

                    status:
                        "PENDING",

                    customerId:
                        users.customer3.id,

                    areaId:
                        infrastructure.dhanmondi.id,

                    reportedAt:
                        addHours(now, -0.5),
                },
            });

        /*
          One VERIFIED and unlinked report.
          Useful for Smart Clustering demonstration.
        */
        const verifiedReport =
            await prisma.outageReport.create({
                data: {
                    issueType:
                        "TOTAL_OUTAGE",

                    description:
                        "Verified outage waiting for incident clustering.",

                    status:
                        "VERIFIED",

                    customerId:
                        users.customer1.id,

                    areaId:
                        infrastructure.uttara10.id,

                    reviewedById:
                        users.admin.id,

                    reviewedAt:
                        addHours(now, -0.25),

                    reviewNote:
                        "Verified for smart clustering demonstration.",

                    reportedAt:
                        addHours(now, -0.4),
                },
            });

        return {
            openIncident,
            assignedIncident,
            inProgressIncident,
            closedIncident,

            openReport1,
            openReport2,

            pendingReport,
            verifiedReport,

            assignedAssignment,
            inProgressAssignment,
        };
    };

const seedBills = async (
    users: Awaited<
        ReturnType<typeof seedUsers>
    >,
) => {
    const currentPeriod =
        getBillingPeriod(0);

    const previousPeriod =
        getBillingPeriod(-1);

    const customer1Bill =
        await prisma.electricityBill.create({
            data: {
                billNumber:
                    `PSB-${currentPeriod.billingYear}-${String(
                        currentPeriod.billingMonth,
                    ).padStart(
                        2,
                        "0",
                    )}-DEMO01`,

                customerId:
                    users.customer1.id,

                createdById:
                    users.admin.id,

                billingMonth:
                    currentPeriod.billingMonth,

                billingYear:
                    currentPeriod.billingYear,

                unitsConsumed:
                    245.7,

                energyCharge:
                    1850.5,

                serviceCharge:
                    150,

                taxAmount:
                    100,

                totalAmount:
                    2100.5,

                currency:
                    "BDT",

                status:
                    "UNPAID",

                dueDate:
                    addDays(now, 14),
            },
        });

    const customer2Bill =
        await prisma.electricityBill.create({
            data: {
                billNumber:
                    `PSB-${currentPeriod.billingYear}-${String(
                        currentPeriod.billingMonth,
                    ).padStart(
                        2,
                        "0",
                    )}-DEMO02`,

                customerId:
                    users.customer2.id,

                createdById:
                    users.admin.id,

                billingMonth:
                    currentPeriod.billingMonth,

                billingYear:
                    currentPeriod.billingYear,

                unitsConsumed:
                    198.4,

                energyCharge:
                    1495,

                serviceCharge:
                    150,

                taxAmount:
                    80,

                totalAmount:
                    1725,

                currency:
                    "BDT",

                status:
                    "UNPAID",

                dueDate:
                    addDays(now, 14),
            },
        });

    const cancelledBill =
        await prisma.electricityBill.create({
            data: {
                billNumber:
                    `PSB-${previousPeriod.billingYear}-${String(
                        previousPeriod.billingMonth,
                    ).padStart(
                        2,
                        "0",
                    )}-DEMO03`,

                customerId:
                    users.customer3.id,

                createdById:
                    users.admin.id,

                billingMonth:
                    previousPeriod.billingMonth,

                billingYear:
                    previousPeriod.billingYear,

                unitsConsumed:
                    210,

                energyCharge:
                    1600,

                serviceCharge:
                    150,

                taxAmount:
                    90,

                totalAmount:
                    1840,

                currency:
                    "BDT",

                status:
                    "CANCELLED",

                dueDate:
                    addDays(now, 5),

                cancelledAt:
                    addHours(now, -24),

                cancellationReason:
                    "Demo bill cancelled due to corrected meter information.",
            },
        });

    return {
        customer1Bill,
        customer2Bill,
        cancelledBill,
    };
};

const seedNotifications = async (
    users: Awaited<
        ReturnType<typeof seedUsers>
    >,

    incidents: Awaited<
        ReturnType<
            typeof seedIncidentsAndReports
        >
    >,

    bills: Awaited<
        ReturnType<typeof seedBills>
    >,
) => {
    await prisma.notification.createMany({
        data: [
            {
                recipientId:
                    users.customer1.id,

                type:
                    "BILL",

                title:
                    "New electricity bill",

                message:
                    `Bill ${bills.customer1Bill.billNumber} is ready for payment.`,

                entityType:
                    "BILL",

                entityId:
                    bills.customer1Bill.id,

                dedupeKey:
                    `seed-bill-${bills.customer1Bill.id}`,
            },

            {
                recipientId:
                    users.customer2.id,

                type:
                    "BILL",

                title:
                    "New electricity bill",

                message:
                    `Bill ${bills.customer2Bill.billNumber} is ready for payment.`,

                entityType:
                    "BILL",

                entityId:
                    bills.customer2Bill.id,

                dedupeKey:
                    `seed-bill-${bills.customer2Bill.id}`,
            },

            {
                recipientId:
                    users.operator1.id,

                type:
                    "ASSIGNMENT",

                title:
                    "New incident assignment",

                message:
                    `You have been assigned to ${incidents.assignedIncident.incidentCode}.`,

                entityType:
                    "INCIDENT",

                entityId:
                    incidents.assignedIncident.id,

                dedupeKey:
                    `seed-assignment-${incidents.assignedAssignment.id}`,
            },

            {
                recipientId:
                    users.customer1.id,

                type:
                    "SYSTEM",

                title:
                    "Welcome to PowerSync",

                message:
                    "Your PowerSync demonstration account is ready.",

                entityType:
                    "SYSTEM",

                dedupeKey:
                    `seed-welcome-${users.customer1.id}`,
            },

            {
                recipientId:
                    users.customer2.id,

                type:
                    "SYSTEM",

                title:
                    "Welcome to PowerSync",

                message:
                    "Your PowerSync demonstration account is ready.",

                entityType:
                    "SYSTEM",

                dedupeKey:
                    `seed-welcome-${users.customer2.id}`,
            },

            {
                recipientId:
                    users.customer3.id,

                type:
                    "SYSTEM",

                title:
                    "Welcome to PowerSync",

                message:
                    "Your PowerSync demonstration account is ready.",

                entityType:
                    "SYSTEM",

                dedupeKey:
                    `seed-welcome-${users.customer3.id}`,
            },
        ],
    });
};

const seedAuditHistory = async (
    users: Awaited<
        ReturnType<typeof seedUsers>
    >,
) => {
    /*
      These records are deliberately labelled DEMO.
      We are not pretending that they came from
      live API actions.
    */
    await prisma.auditLog.createMany({
        data: [
            {
                actorId:
                    users.admin.id,

                actorRole:
                    "ADMIN",

                action:
                    "DEMO_DATA_INITIALIZED",

                entityType:
                    "SYSTEM",

                description:
                    "PowerSync professional demonstration dataset was initialized.",

                method:
                    "SEED",

                path:
                    "prisma/seed.ts",

                metadata: {
                    demo:
                        true,
                },
            },

            {
                actorId:
                    users.admin.id,

                actorRole:
                    "ADMIN",

                action:
                    "DEMO_INCIDENT_HISTORY_LOADED",

                entityType:
                    "INCIDENT",

                description:
                    "Synthetic incident history was loaded for dashboard and reliability demonstrations.",

                method:
                    "SEED",

                path:
                    "prisma/seed.ts",

                metadata: {
                    demo:
                        true,
                },
            },

            {
                actorId:
                    users.admin.id,

                actorRole:
                    "ADMIN",

                action:
                    "DEMO_BILLING_HISTORY_LOADED",

                entityType:
                    "BILL",

                description:
                    "Synthetic billing records were loaded for PowerSync demonstration purposes.",

                method:
                    "SEED",

                path:
                    "prisma/seed.ts",

                metadata: {
                    demo:
                        true,
                },
            },
        ],
    });
};

const main = async () => {
    console.log(
        "Starting PowerSync final seed...",
    );

    await resetDatabase();

    const users =
        await seedUsers();

    const infrastructure =
        await seedInfrastructure();

    await seedCustomerProfiles(
        users,
        infrastructure,
    );

    await seedSchedules(
        users,
        infrastructure,
    );

    const incidents =
        await seedIncidentsAndReports(
            users,
            infrastructure,
        );

    const bills =
        await seedBills(users);

    await seedNotifications(
        users,
        incidents,
        bills,
    );

    await seedAuditHistory(
        users,
    );

    console.log("");
    console.log(
        "PowerSync seed completed successfully.",
    );

    console.log("");
    console.log(
        "========================================",
    );

    console.log(
        "POWERSYNC DEMO CREDENTIALS",
    );

    console.log(
        "========================================",
    );

    console.log(
        `ADMIN     : admin@powersync.com / ${DEMO_PASSWORD}`,
    );

    console.log(
        `OPERATOR 1: operator1@powersync.com / ${DEMO_PASSWORD}`,
    );

    console.log(
        `OPERATOR 2: operator2@powersync.com / ${DEMO_PASSWORD}`,
    );

    console.log(
        `CUSTOMER 1: customer1@powersync.com / ${DEMO_PASSWORD}`,
    );

    console.log(
        `CUSTOMER 2: customer2@powersync.com / ${DEMO_PASSWORD}`,
    );

    console.log(
        `CUSTOMER 3: customer3@powersync.com / ${DEMO_PASSWORD}`,
    );

    console.log(
        "========================================",
    );

    console.log("");
    console.log(
        "Stripe Payment records: 0",
    );

    console.log(
        "This is intentional.",
    );

    console.log(
        "Create a genuine Stripe payment during final end-to-end testing.",
    );
};

main()
    .catch((error) => {
        console.error(
            "PowerSync seed failed:",
            error,
        );

        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });