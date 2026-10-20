# Demonstration Walkthrough (SIH 26262)

Total time: ~5 minutes. Pre-seeded data is grouped to make each capability visible.

## 0. Setup
```bash
npm run install:all && npm run db:setup && npm run dev
```
Open http://localhost:5173.

## 1. Login & RBAC (30s)
- Sign in as **Regional Officer** (`ro.west@aicte.gov.in`). Note the sidebar shows only
  permitted modules.
- Sign out; sign in as **Admin** (`admin@aicte.gov.in`) — Rules Configuration becomes visible.

## 2. Configurability — "Rules as Data" (45s) ★ differentiator
- Go to **Rules Configuration**.
- Select **SLA Timelines**; edit `Scrutiny` from 15 → 10 days in the JSON editor.
- Click **Save & Activate**. Show the new version in the **Version History** panel and that
  it is now active. No redeploy occurred.

## 3. End-to-End Workflow + Auto-routing (60s)
- As **Institution** (`college@ltce.edu`), open **Applications** → **New Application**.
- Choose route *Scrutiny + EVC* and submit. The application auto-routes to the **Scrutiny** stage.
- Open the application: the **workflow stepper** shows the current stage.

## 4. Stage advancement & Return-with-reason (45s)
- As **Regional Officer**, open the application and click **Pass Scrutiny / Advance Stage**.
  The stage advances (Scrutiny → EVC) per the configured routing matrix.
- Demonstrate **Return for Deficiencies** — a reason is mandatory and is recorded in the timeline.

## 5. Human-Oversight Gate (45s) ★ regulatory safeguard
- As **Competent Authority** (`ca@aicte.gov.in`), attempt **Approve (Statutory)**.
- The confirmation modal explains this is a statutory action; a reason is mandatory.
- Trying to approve without a reason is rejected by the server. Provide a reason to proceed.

## 6. Dashboards & Pendency (45s)
- Open **Dashboard**: ageing buckets, stage distribution, region-wise pendency (pending vs
  breached) and the **Predictive Pendency** breach-risk panel.

## 7. EVC Scheduling & Conflict Detection (45s)
- Go to **EVC Scheduling**. A queued EVC is visible.
- Click **Schedule EVC**, pick **Prof. M. Gupta** (already booked the same day on another EVC).
- The system reports a **scheduling conflict**. Choose a different day to succeed.

## 8. Undertakings & Compliance (45s)
- Go to **Undertakings**. An overdue undertaking shows as **Escalated**.
- As Institution, submit evidence; as Regional Officer, verify it.

## 9. Document & Lease Validity (30s)
- Go to **Documents & Leases**. A lease deed is **Expiring Soon** and a fire-safety certificate
  is **Expired** with escalation. Submit/verify a renewal to clear it.

## 10. Alerts, Escalation, Audit & Reports (45s)
- **Alerts & Escalation**: severity-coloured alerts and the escalation log. As Admin, click
  **Run Escalation Sweep** to trigger a fresh evaluation.
- **Audit Trail**: every action with actor, role and details.
- **Reports**: region-wise performance, overdue cases and compliance breakdown.
