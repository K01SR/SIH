# Demonstration Walkthrough (SIH 26262)

Two formats:
- **Quick tour (90 seconds)** — hit the strongest differentiators only.
- **Full walkthrough (~5 minutes)** — every capability, timed.

Pre-seeded data is grouped so each capability is visible immediately. Demo accounts all use
password `password123`.

---

## 0. Setup

**Primary (fast start, hot reload):**
```bash
npm run install:all && npm run db:setup && npm run dev
```
Open **http://localhost:5173**.

**Alternative (production-style, one command):**
```bash
cp .env.example .env         # set a strong JWT_SECRET
docker compose up -d --build # client on :8080, API on :4000
```
Open **http://localhost:8080**.

| Role | Email |
|---|---|
| Admin / Configurator | `admin@aicte.gov.in` |
| Competent Authority | `ca@aicte.gov.in` |
| Bureau Officer | `bo.north@aicte.gov.in` |
| Regional Officer | `ro.west@aicte.gov.in` |
| EVC Member | `evc1@aicte.gov.in` |
| Institution | `college@ltce.edu` |

> Tip: on the login page, click a **demo account** chip to auto-fill credentials.

---

## Quick Tour (90 seconds) ★ differentiators only

1. **Rules as data (25s)** — Login `admin@aicte.gov.in` → **Rules Configuration → SLA
   Timelines** → change `Scrutiny` 15 → 10 → **Save & Activate**. Show the **Version
   History** panel. *No redeploy.*
2. **Human-oversight gate (20s)** — Login `ca@aicte.gov.in` → open an application →
   **Approve (Statutory)** → try to confirm with no reason (blocked) → add a reason → confirm.
3. **EVC conflict detection (20s)** — Login `ro.west@aicte.gov.in` → **EVC Scheduling** →
   **Schedule EVC** → pick **Prof. M. Gupta** (already booked the same day) → conflict shown →
   pick another day → success.
4. **Real-time + predictive pendency (25s)** — **Dashboard**: ageing, region-wise pendency,
   **Predictive Pendency** panel; point at the **Live** badge as an alert toast appears.

That's the pitch in 90 seconds. The full walkthrough below covers everything.

---

## Full Walkthrough (~5 minutes)

### 1. Login & RBAC (30s)
- Sign in as **Regional Officer** (`ro.west@aicte.gov.in`). The sidebar shows only permitted
  modules.
- Sign out; sign in as **Admin** (`admin@aicte.gov.in`) — **Rules Configuration** appears.

### 2. Configurability — "Rules as Data" (45s) ★
- Go to **Rules Configuration**.
- Select **SLA Timelines**; edit `Scrutiny` from 15 → 10 days in the JSON editor.
- Click **Save & Activate**. Show the new version in **Version History** and that it is now
  active. No redeploy occurred.

### 3. End-to-End Workflow + Auto-routing (60s)
- As **Institution** (`college@ltce.edu`), open **Applications → New Application**.
- Choose route *Scrutiny + EVC* and submit. It auto-routes to the **Scrutiny** stage.
- Open the application: the **workflow stepper** shows the current stage.

### 4. Stage advancement & Return-with-reason (45s)
- As **Regional Officer**, open the application and click **Pass Scrutiny / Advance Stage**.
  The stage advances (Scrutiny → EVC) per the routing matrix.
- Demonstrate **Return for Deficiencies** — a reason is mandatory and is recorded in the
  timeline.

### 5. Human-Oversight Gate (45s) ★
- As **Competent Authority** (`ca@aicte.gov.in`), attempt **Approve (Statutory)**.
- The confirmation modal explains this is a statutory action; a reason is mandatory.
- Approving without a reason is rejected by the server. Provide a reason to proceed.

### 6. Dashboards & Pendency (45s)
- Open **Dashboard**: ageing buckets, stage distribution, region-wise pendency (pending vs.
  breached) and the **Predictive Pendency** breach-risk panel.

### 7. EVC Scheduling & Conflict Detection (45s) ★
- Go to **EVC Scheduling**. A queued EVC is visible.
- Click **Schedule EVC**, pick **Prof. M. Gupta** (already booked the same day on another EVC).
- The system reports a **scheduling conflict**. Choose a different day to succeed.

### 8. Undertakings & Compliance (45s)
- Go to **Undertakings**. An overdue undertaking shows as **Escalated**.
- As Institution, submit evidence; as Regional Officer, verify it.

### 9. Document & Lease Validity (30s)
- Go to **Documents & Leases**. A lease deed is **Expiring Soon** and a fire-safety certificate
  is **Expired** with escalation. Submit/verify a renewal to clear it.

### 10. Alerts, Escalation, Audit & Reports (45s)
- **Alerts & Escalation**: severity-coloured alerts and the escalation log. As Admin, click
  **Run Escalation Sweep** to trigger a fresh evaluation.
- **Audit Trail**: every action with actor, role and details.
- **Reports**: region-wise performance, overdue cases and compliance breakdown.

### 11. Bonus — Capacity Simulation (20s)
- As Bureau Officer/Admin, open **Simulation**: pick a region, add N officers, **Run
  Simulation** → projected breach-rate reduction. Great for the "manual follow-up reduction"
  evaluation criterion.

---

## Wow moments to call out

| Moment | Why it lands |
|---|---|
| Live SLA change, no redeploy | Configurability / rules-as-data |
| Human-oversight modal blocks approval without reason | Regulatory safeguard |
| EVC double-book conflict caught | Planning intelligence |
| Real-time alert toast + Live badge | Timeliness / real-time ops |
| Predictive pendency panel | Proactive, not reactive |
| One-click PDF case file | Practical, tangible output |
| Capacity simulation | Data-driven decision support |

---

## Troubleshooting the demo

- **Blank page / API errors:** ensure the backend is on :4000 (`npm run dev` starts both).
- **EVC conflict step:** confirm the seeded same-day booking exists for **Prof. M. Gupta**;
  if the seed date has passed, schedule any other member on a day they already hold.
- **Real-time alert not appearing:** check the header shows **Live** (green); if offline, the
  socket reconnects within a few seconds.
- **Docker demo:** first start seeds demo data (`SEED_ON_START=true`); wait for the health
  check to pass before opening the site.
