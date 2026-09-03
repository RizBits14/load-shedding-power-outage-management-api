# PowerSync

PowerSync is a production-ready REST API for **load shedding and power outage management**, designed to support customers, operators, and administrators through structured outage reporting, incident management, restoration workflows, billing, payments, notifications, audit logging, and reliability analytics.

The system follows a real-world electricity distribution hierarchy:

**Zone → Substation → Feeder → Area → Customer**

---

## Live API

**API Base URL**

```text
https://powersync-api.vercel.app/api/v1
````

---

## API Documentation

Complete API documentation with authentication details, request bodies, parameters, example responses, and production-tested endpoints is available through Postman.

**Postman Documentation**

[View PowerSync API Documentation](https://documenter.getpostman.com/view/56181938/2sBYAvvW1n)

---

## Key Features

* JWT-based authentication
* Google Social Login
* Role-based access control for `CUSTOMER`, `OPERATOR`, and `ADMIN`
* Zone, Substation, Feeder, and Area management
* Customer profile and service-area management
* Load-shedding schedule management
* Customer outage reporting
* Outage report verification and rejection
* Smart outage report clustering
* Automatic incident creation
* Restoration Priority Score
* Operator assignment and reassignment
* Incident acceptance and field-work tracking
* Restoration and incident closure workflow
* Incident cancellation workflow
* Electricity bill management
* Stripe Checkout payment integration
* Signed Stripe webhook processing
* Customer notifications
* Administrative notification broadcasts
* Complete audit and activity logs
* Operational analytics and dashboards
* Area reliability indicators
* Feeder reliability indicators
* Pagination, filtering, searching, and sorting
* Soft deletion
* Centralized validation and error handling
* API rate limiting and security middleware

---

## Smart PowerSync Features

### Smart Outage Clustering

Verified outage reports from the same area and within a similar time window can be grouped into a single outage incident.

This reduces duplicate incident creation and helps operators identify larger outage events based on multiple customer reports.

### Restoration Priority Score

PowerSync calculates a priority score for outage incidents based on operational factors such as incident severity and affected-area priority.

This helps operators and administrators determine which incidents should receive attention first.

### Reliability & Risk Indicators

PowerSync analyzes outage information to generate reliability indicators for:

* Areas
* Feeders

These indicators help identify locations with recurring outage problems or higher operational risk.

---

## Outage Management Workflow

```text
Customer Reports Outage
        ↓
Operations Review
        ↓
Report Verified
        ↓
Smart Outage Clustering
        ↓
Incident Created
        ↓
Priority Score Calculated
        ↓
Operator Assigned
        ↓
Assignment Accepted
        ↓
Incident In Progress
        ↓
Power Restored
        ↓
Incident Closed
```

---

## Payment Workflow

PowerSync integrates Stripe Checkout for secure electricity bill payments.

```text
Unpaid Electricity Bill
        ↓
Stripe Checkout Session
        ↓
Customer Completes Payment
        ↓
Stripe Signed Webhook
        ↓
Payment → SUCCEEDED
        ↓
Bill → PAID
        ↓
Notification Created
        ↓
Audit Log Recorded
```

Stripe webhook events are treated as the source of truth for successful payment confirmation.

---

## User Roles

### CUSTOMER

Customers can:

* Register and login
* Login using Google
* Manage their customer profile
* View load-shedding schedules
* Submit outage reports
* Track their outage reports
* View electricity bills
* Pay bills using Stripe
* View payment history
* Receive notifications

### OPERATOR

Operators can:

* Review outage information
* Access operational outage queues
* Create clustered outage incidents
* View assigned incidents
* Accept assignments
* Start restoration work
* Mark power as restored
* Participate in outage restoration workflows

### ADMIN

Administrators can:

* Manage infrastructure data
* Manage zones, substations, feeders, and areas
* Review outage reports
* Manage incidents
* Assign and reassign operators
* Manage electricity bills
* Broadcast notifications
* View audit logs
* Access operational analytics
* Monitor area and feeder reliability

---

## Technology Stack

| Category              | Technology                  |
| --------------------- | --------------------------- |
| Runtime               | Node.js                     |
| Language              | TypeScript                  |
| Framework             | Express.js                  |
| Database              | PostgreSQL                  |
| ORM                   | Prisma                      |
| Validation            | Zod                         |
| Authentication        | JWT                         |
| Social Authentication | Google OAuth                |
| Password Security     | bcrypt                      |
| Payments              | Stripe                      |
| Security              | Helmet, CORS, Rate Limiting |
| API Testing           | Postman                     |
| Deployment            | Vercel                      |

---

## Authentication

Protected routes use JWT Bearer authentication.

```http
Authorization: Bearer <ACCESS_TOKEN>
```

PowerSync also supports Google authentication through a verified Google ID token.

---

## Environment Variables

Create a `.env` file in the project root.

```env
DATABASE_URL=
JWT_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

GOOGLE_CLIENT_ID=

BACKEND_URL=

NODE_ENV=development
PORT=5000
```

---

## API Testing

The PowerSync API has been tested using Postman against both local and deployed production environments.

Testing covers:

* Authentication
* Google Login
* Role-based access control
* Zone management
* Substation management
* Feeder management
* Area management
* Customer profiles
* Load-shedding schedules
* Outage reports
* Smart outage clustering
* Incident management
* Operator assignments
* Restoration workflows
* Electricity billing
* Stripe payments
* Notifications
* Audit logs
* Analytics
* Reliability indicators
* Validation and security scenarios

Detailed request and response examples are available in the Postman documentation.

---

## Analytics

PowerSync provides operational analytics including:

* System overview
* Outage trends
* Incident priority queue
* Area reliability analysis
* Feeder reliability analysis
* Average restoration information
* Active incident statistics
* Outage report statistics
* Billing information

These endpoints are designed to support future dashboard integration.

---

## Notifications

PowerSync automatically generates notifications for important system events including:

* Outage report updates
* Incident assignments
* Restoration updates
* Electricity bills
* Successful payments
* Administrative broadcasts

Users can:

* View notifications
* View unread notification count
* Mark individual notifications as read
* Mark all notifications as read
* Dismiss notifications

---

## Audit Logging

Important administrative and operational actions are recorded in the audit system.

Examples include:

* Google authentication
* Outage verification
* Incident creation
* Operator assignment
* Incident restoration
* Incident closure
* Bill creation and updates
* Successful Stripe payments
* Administrative notification broadcasts

This provides traceability and accountability across important PowerSync operations.

---

## Security

PowerSync includes:

* JWT authentication
* Role-based authorization
* Password hashing
* Google token verification
* Stripe webhook signature verification
* Zod request validation
* Helmet security headers
* CORS protection
* API rate limiting
* Request body limits
* Centralized error handling
* Protected administrative routes
* Soft deletion for important infrastructure records