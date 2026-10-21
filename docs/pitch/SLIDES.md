# Pitch Deck Outline — SIH 26262

> 11-slide deck. Each slide lists a **title**, **on-slide bullets** (keep to ≤6, short) and
> **speaker notes**. Paste into PowerPoint / Google Slides / Canva. Deck should take ~5 minutes
> to present alongside a ~5-minute live demo (see [`../DEMO.md`](../DEMO.md)).

---

## Slide 1 — Title

**AICTE Approval Workflow Automation, Compliance Monitoring & Alert Management System**

- SIH 2026 · Problem Statement 26262 — AICTE, Regulation Bureau (Smart Automation)
- Team name · Institution · Members

**Notes:** One line on what the product is: one configurable, auditable platform for the
entire AICTE approval lifecycle.

---

## Slide 2 — The Problem

**Approval processing is manual, fragmented and unmonitored**

- Files move by phone/email chase; no single source of truth
- Pendency tracked in spreadsheets → discovered late
- SLA breaches and missed deadlines go unseen
- EVC scheduling and time-bound compliance slip
- Incomplete audit trails; weak accountability
- Policy/rule changes require code changes and redeploys

**Notes:** Anchor on the pain the Bureau and institutions feel daily. Keep it relatable.

---

## Slide 3 — Our Solution

**Three engines, one platform**

- **Rules Engine** — APH routing, SLA, escalation & notification rules as *versioned data*
- **Workflow Engine** — auto-advances stages per route + **human-oversight gate**
- **Escalation Engine** — scheduled sweep raises alerts/escalations automatically

Plus: dashboards & predictive pendency, EVC scheduling with conflict detection,
undertaking/document lifecycle, bulk notifications, real-time alerts, audit trail.

**Notes:** Emphasise "rules as data" — policy changes without redeploys.

---

## Slide 4 — Architecture

**Secure, layered, integration-ready**

- React SPA ↔ REST API (Express) ↔ Prisma ↔ SQLite/PostgreSQL
- Socket.IO for real-time; node-cron for scheduled escalation
- RBAC (7 roles), Helmet, rate limiting, Zod validation, append-only audit
- Docker one-command deploy + CI

**Notes:** Point to [`ARCHITECTURE.md`](ARCHITECTURE.md). Mention provider-portable DB for scale.

---

## Slide 5 — End-to-End Workflow (Live Demo cue)

**From submission to statutory decision**

- Institution submits → auto-routed to Scrutiny per route matrix
- Officer advances stages; **return requires a mandatory reason**
- Statutory Approve/Reject gated by explicit confirmation + recorded reason
- Every action lands in the timeline and audit trail

**Notes:** Corresponds to demo steps 3–5. Let the UI carry the story here.

---

## Slide 6 — Pendency & Real-Time Monitoring

**See everything, act immediately**

- Ageing buckets, stage distribution, region-wise pending-vs-breached
- **Predictive pendency** — forecast breaches in the next 30 days
- Real-time alert badge + toasts over websockets

**Notes:** Corresponds to demo step 6. Highlight the predictive panel as a differentiator.

---

## Slide 7 — EVC Scheduling & Conflict Detection

**Committee time, protected**

- Auto-queue, calendar scheduling, member availability
- **Conflict detection** prevents double-booking a member on the same day
- Reminders and delay escalation

**Notes:** Corresponds to demo step 7. This is a concrete, easy-to-see differentiator.

---

## Slide 8 — Compliance: Undertakings, Documents & Escalation

**Deadlines that don't get missed**

- Time-bound undertakings: conditions, evidence, due dates, verification
- Document/lease validity with 30/15/7-day advance alerts
- Overdue items escalated automatically to the right role

**Notes:** Corresponds to demo steps 8–9.

---

## Slide 9 — Differentiators

**Beyond the problem statement**

1. Rules as data (live, versioned, no redeploy)
2. Human-oversight gate for statutory actions
3. Predictive pendency
4. EVC conflict detection
5. Capacity simulation (what-if officer planning)
6. Bulk notification engine (IN_APP/EMAIL/SMS)
7. Case-file PDF export
8. Real-time operations
9. Institution self-service portal

**Notes:** Pick the top 3 for the room; keep the rest on the slide.

---

## Slide 10 — Impact & Scalability

**Measurable outcomes**

- 100% applications SLA-tracked; zero untracked cases
- Real-time vs. periodic review for breaches/expiries
- One source of truth replacing regional spreadsheets
- Full accountability: every statutory action human-confirmed
- Scales: provider-portable DB, stateless API, containerized deploy

**Notes:** Be honest — these are outcomes the prototype demonstrates, not production telemetry.

---

## Slide 11 — Roadmap & Close

**Where it goes next**

- PostgreSQL + migrations for production; externalize scheduler for multi-instance
- S3/Blob storage, SSO/integration APIs with existing AICTE systems
- Regional-language UI, accessibility pass, load testing
- Regulatory safeguard: supports, never replaces, competent-authority decisions

**Thank you — questions.**

**Notes:** Reiterate the safeguard and invite questions. Hand over the demo link / repo.
