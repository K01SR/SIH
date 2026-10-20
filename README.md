# AICTE Approval Workflow Automation, Compliance Monitoring & Alert Management System

**SIH 2026 — Problem Statement 26262 (AICTE, Regulation Bureau, Smart Automation)**

An integrated, secure and configurable digital platform for end-to-end automation and
monitoring of AICTE approval-related workflows: application routing, scrutiny stages,
EVC scheduling, pendency monitoring, time-bound undertakings, institutional compliance
and validity of prescribed documents — with real-time dashboards, automated
notifications, deadline reminders, escalation and a complete digital audit trail.

---

## 1. Quick Start

Requirements: **Node.js 20+**. No database server required (SQLite).

```bash
# from repository root
npm run install:all      # install server + client dependencies
npm run db:setup         # create SQLite schema and seed demo data
npm run dev              # start backend (:4000) and frontend (:5173)
```

Open **http://localhost:5173** and sign in using any demo account below
(password: `password123`).

| Role | Email |
|---|---|
| Admin / Configurator | `admin@aicte.gov.in` |
| Competent Authority | `ca@aicte.gov.in` |
| Bureau Officer | `bo.north@aicte.gov.in` |
| Regional Officer | `ro.west@aicte.gov.in` |
| EVC Member | `evc1@aicte.gov.in` |
| Institution | `college@ltce.edu` |

---

## 2. Architecture

```
client/  React 18+ / Vite / TypeScript / Tailwind — role-based SPA
server/  Node.js / Express / TypeScript / Prisma — REST API + Socket.IO + cron scheduler
         └─ engines: workflow, rules, escalation
shared/  (reserved for shared contracts)
docs/    feature mapping and demo script
```

- **Rules Engine** — APH routing matrix, SLA timelines, escalation matrix, notification
  rules and ageing thresholds stored as **versioned JSON** in `RuleConfig`. Fully editable
  at runtime from the UI with no redeploy.
- **Workflow Engine** — resolves the prescribed stage sequence per route, auto-advances
  stages, and enforces the **human-oversight gate** on statutory actions.
- **Escalation Engine** — periodic cron sweep evaluating SLA breaches, EVC delays,
  overdue undertakings and document expiry, raising alerts and escalations.
- **Audit service** — immutable record of every action (actor, role, entity, details, IP).
- **Real-time** — Socket.IO broadcasts alerts/notifications to connected clients.

---

## 3. Core Capabilities

| Area | Highlights |
|---|---|
| Workflow automation | Configurable routing (Only Scrutiny / Scrutiny+EVC / EVC+SAC-SHC / Only EVC / combos), auto-advance, return-with-mandatory-reason, standardized communications |
| Dashboards & pendency | Role-based dashboards, ageing buckets, region-wise pendency, workload distribution, SLA breach tracking, predictive breach forecast |
| EVC scheduling | Auto-queueing, calendar scheduling, member availability, **conflict detection**, reminders and delay escalation |
| Undertakings & compliance | Digital record of conditions/evidence/due dates, online submission, verification, reminders and escalation |
| Document & lease validity | Expiry tracking with advance alerts (30/15/7 day), renewal submission and verification, overdue escalation |
| Notifications & reporting | Configurable notification rules, automatic escalation, bulk notifications (IN_APP/EMAIL/SMS), consolidated reports, complete audit trail |
| Platform | RBAC (7 roles), secure uploads, confidentiality, integration-ready API layer, simulation mode for capacity planning |

See `docs/FEATURES.md` for the full feature-to-requirement mapping and
`docs/DEMO.md` for the suggested demonstration walkthrough.

---

## 4. Technology

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Recharts, React Router, Socket.IO client, jsPDF
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, Socket.IO, node-cron, JWT, Zod
- **Database:** SQLite (zero-setup). The Prisma schema is provider-portable to PostgreSQL.

---

## 5. Verification

```bash
npm run typecheck    # server + client type checks
npm run build        # production build of the client
npm --prefix server test   # backend test suite (vitest)
```

The backend test suite covers the workflow engine, escalation engine and the REST
API (auth, RBAC, validation, routing, EVC conflict detection) — 17 tests.

---

## 7. Deployment (Docker)

Run the full stack (client served by nginx on :8080, API on :4000) with one command:

```bash
cp .env.example .env         # set a strong JWT_SECRET
docker compose up -d --build # or: make docker-up
```

The server container applies the schema and seeds demo data on first start
(`SEED_ON_START=true`). Data and uploaded files persist in named volumes.
Visit http://localhost:8080.

Build images only: `make docker-build`. Stop: `make docker-down`.

---

## 8. Security & Operations

- **Transport/headers**: Helmet, CORS allow-list, gzip compression.
- **Rate limiting**: global API limiter + stricter limiter on authentication.
- **Validation**: every mutating endpoint validates input with Zod and returns
  structured `422` errors.
- **Auditability**: actions are recorded with actor, role, IP and user-agent;
  the audit trail is append-only.
- **Observability**: structured request logging, readiness probe
  (`GET /api/health` reports DB status and uptime), container health checks.
- **Real-time**: Socket.IO pushes alerts/notifications to per-user rooms.

---

## 9. Regulatory Safeguard

The platform operates in accordance with AICTE regulations and the Approval Process
Handbook. Automated alerts, recommendations and workflow actions **support** the approval
process; they do not replace statutory scrutiny, verification, inspections or decisions
reserved for the competent authority. Every statutory action requires an explicit,
recorded confirmation with reason, captured in the audit trail.
