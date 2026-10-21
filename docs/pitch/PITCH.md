# AICTE Approval Workflow Automation, Compliance Monitoring & Alert Management System

**SIH 2026 — Problem Statement 26262 · AICTE, Regulation Bureau (Smart Automation)**

> One integrated, configurable and auditable digital platform that automates the end-to-end
> AICTE approval pipeline — from application routing and scrutiny to EVC scheduling,
> pending-case monitoring, time-bound undertakings, document/lease validity and
> deadline-driven escalation — while keeping every statutory decision under human control.

---

## 1. The Problem

AICTE processes approval applications across **Regions, several workflow routes and multiple
committees** under the Approval Process Handbook (APH). In practice this relies heavily on:

- **Manual follow-ups** by phone and email to move files between stages.
- **Scattered spreadsheets** for pendency, undertakings and document expiry — no single view.
- **No reliable SLA tracking**, so breaches are discovered late (or not at all).
- **Missed statutory deadlines** for EVC scheduling and time-bound compliance.
- **Weak or incomplete audit trails**, making accountability difficult to establish.
- **Rule changes that require code changes and redeployment**, slowing policy updates.

The result: pendency grows, officers are overloaded, institutions face uncertainty, and the
Bureau lacks real-time visibility to act.

---

## 2. Our Solution — Three Engines, One Platform

| Engine | What it does |
|---|---|
| **Rules Engine** | APH routing matrix, SLA timelines, escalation matrix, notification rules and ageing thresholds are stored as **versioned JSON** and editable at runtime — *rules as data, not code*. No redeploy to change policy. |
| **Workflow Engine** | Resolves the prescribed stage sequence per route, **auto-advances** stages, standardizes communications, and enforces a **human-oversight gate** on statutory actions. |
| **Escalation Engine** | A scheduled sweep evaluates SLA breaches, EVC delays, overdue undertakings and document expiry, then **raises alerts and escalations** automatically to the right role. |

Around these: role-based dashboards with ageing and predictive pendency, EVC scheduling with
conflict detection, undertaking & document lifecycle management, configurable notifications
(IN_APP / EMAIL / SMS), consolidated reports, real-time alerts over websockets, and an
**append-only audit trail**.

---

## 3. How It Maps to PS 26262

| Requirement area | Delivered |
|---|---|
| Approval workflow automation across APH routes | Configurable routing (Only Scrutiny / Scrutiny+EVC / EVC+SAC-SHC / Only EVC / combos), auto-advance, return-with-mandatory-reason |
| Pendency monitoring & dashboards | Role-based dashboards, ageing buckets, region-wise pendency, workload distribution, SLA breach tracking |
| EVC scheduling & alerts | Auto-queueing, calendar scheduling, member availability, **conflict detection**, reminders, delay escalation |
| Time-bound undertakings | Digital record of conditions/evidence/due dates, online submission, verification, reminders, escalation |
| Document & lease validity | Expiry tracking with 30/15/7-day advance alerts, renewal submission & verification, overdue escalation |
| Notifications & escalation | Configurable notification rules, automatic escalation, bulk notifications, consolidated reports |
| Audit trail | Immutable record of every action (actor, role, entity, details, IP, user-agent) |
| Configurable / integration-ready | Rules as versioned data; secure RBAC API layer ready for integration |

A full feature-to-requirement mapping is in [`../FEATURES.md`](../FEATURES.md).

---

## 4. Why We Win — Against the Evaluation Criteria

| Evaluation criterion | Our differentiator |
|---|---|
| **Workflow accuracy** | Stage sequence is derived from a versioned routing matrix; auto-advance removes manual routing errors. |
| **Alert timeliness** | Scheduled escalation sweep + **real-time Socket.IO alerts** push to the responsible role the moment a breach/expiry is detected. |
| **Pendency visibility** | Ageing analysis, region-wise pending-vs-breached charts and stage distribution on a single dashboard. |
| **Reduction in manual follow-up** | Automated advancement, reminders and escalations replace phone/email chasing. |
| **Deadline reliability** | Every application carries an SLA-due timestamp; a **predictive pendency** panel forecasts breaches before they happen. |
| **Audit completeness** | Append-only audit trail with actor, role, entity, reason, IP and user-agent for every action. |
| **Regulatory conformity** | **Human-oversight gate** requires an explicit, recorded reason for every statutory decision. |

---

## 5. Differentiating Features (beyond the PS)

1. **Rules as data** — change SLA timelines / routing / escalation live from the UI, with version history and one-click activation.
2. **Human-oversight gate** — statutory actions require explicit confirmation and a mandatory recorded reason.
3. **Predictive pendency** — forecasts which applications are at risk of breaching SLA in the next 30 days.
4. **EVC conflict detection** — prevents double-booking a committee member on the same day.
5. **Capacity simulation** — "add N officers to a region → projected breach-rate reduction" what-if modelling.
6. **Bulk notification engine** — channel abstraction (IN_APP / EMAIL / SMS) with role/user targeting.
7. **Case-file PDF export** — one-click, offline-ready case summary with full workflow history.
8. **Real-time operations** — live alert badge, toasts and dashboards over websockets.
9. **Institution self-service portal** — institutions submit applications, evidence and renewals directly.

---

## 6. Impact We Can Demonstrate

- **100% of applications** carry a tracked SLA deadline — zero untracked cases.
- **Real-time** deadline alerts and escalations instead of periodic manual review.
- **Zero-redeploy** policy changes (rules edited live, versioned and activated).
- **Full accountability**: every statutory action is human-confirmed and reason-recorded.
- **Single source of truth** replacing spreadsheets across regions, stages and committees.

---

## 7. Technology & Architecture (summary)

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Recharts, Socket.IO client, jsPDF.
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, Socket.IO, node-cron, JWT, Zod.
- **Database:** SQLite out-of-the-box (zero-setup); Prisma schema is provider-portable to PostgreSQL for production scale.
- **Security:** RBAC (7 roles), Helmet, CORS allow-list, rate limiting, Zod validation, structured errors, secure file storage, append-only audit.
- **Ops:** Docker & docker-compose one-command deploy, readiness health check, CI (typecheck + tests + build).

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for diagrams and [`SLIDES.md`](SLIDES.md) for the pitch deck.

---

## 8. Regulatory Safeguard

The platform operates **in accordance with AICTE regulations and the APH**. Automated alerts,
recommendations and workflow actions *support* the approval process; they do **not** replace
statutory scrutiny, verification, inspections or decisions reserved for the competent
authority. Every statutory action requires an explicit, recorded confirmation with reason,
captured immutably in the audit trail.
