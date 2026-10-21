# Demo Video Script — SIH 26262 (~2 minutes)

> Narration script with exact on-screen actions and timings. Total ≈ 2:00.
> Record at 1080p, browser zoom 100%, sidebar visible. Pre-run
> `npm run install:all && npm run db:setup && npm run dev` and open http://localhost:5173.
> See [`../DEMO.md`](../DEMO.md) for the longer 5-minute live walkthrough.

**Accounts (password `password123` for all):**
`admin@aicte.gov.in`, `ca@aicte.gov.in`, `ro.west@aicte.gov.in`, `college@ltce.edu`,
`evc1@aicte.gov.in`.

---

### 0:00–0:12 — Hook
**Screen:** Title card or login page (blue gradient).
**Narration:** "AICTE's approval process spans regions, routes and committees — and today
it runs on manual follow-ups and spreadsheets. We built one configurable, auditable platform
to automate the whole pipeline."

### 0:12–0:22 — Login & RBAC
**Action:** Click **Regional Officer** demo account → Sign in. Point at the sidebar.
**Narration:** "Role-based access — each officer sees only what they need. We're signed in as
a Regional Officer."

### 0:22–0:40 — Rules as Data ★
**Action:** Go to **Rules Configuration → SLA Timelines**. Edit `Scrutiny` 15 → 10 in the
JSON editor. Click **Save & Activate**. Show the **Version History** panel.
**Narration:** "Policy lives as versioned data, not code. We changed the scrutiny SLA live —
no redeploy. The previous version stays in history."

### 0:40–1:00 — End-to-end workflow ★
**Action:** Log out → sign in as **Institution** (`college@ltce.edu`). **Applications → New
Application**, choose *Scrutiny + EVC*, submit. Open it — the stepper shows the stage.
Reopen as **Regional Officer**; click **Pass Scrutiny / Advance Stage**; then **Return for
Deficiencies** and show the mandatory-reason field.
**Narration:** "A new application auto-routes by the routing matrix. Stages advance
automatically — and any return requires a recorded reason."

### 1:00–1:15 — Human-oversight gate ★
**Action:** Sign in as **Competent Authority** (`ca@aicte.gov.in`). Open the application →
**Approve (Statutory)** → show the confirmation modal; try to confirm without a reason (blocked),
then add one and confirm.
**Narration:** "Statutory decisions are never fully automatic. Approval is gated by explicit
confirmation and a mandatory reason, captured in the audit trail."

### 1:15–1:30 — Dashboards, pendency & real-time
**Action:** Open **Dashboard** — ageing chart, region-wise pendency, **Predictive Pendency**
panel. Trigger an alert and point at the **Live** badge / toast.
**Narration:** "Dashboards show pendency in real time, forecast breaches before they happen,
and push alerts to the responsible role instantly."

### 1:30–1:45 — EVC conflict detection ★
**Action:** Go to **EVC Scheduling** → **Schedule EVC** → pick **Prof. M. Gupta** (already
booked that day) → show the conflict warning → choose another day → success.
**Narration:** "EVC scheduling prevents double-booking a committee member — the conflict is
caught before it happens."

### 1:45–1:55 — Compliance & audit
**Action:** **Undertakings** (overdue → Escalated), **Documents & Leases** (Expired / Expiring
Soon), then **Audit Trail** (every action logged).
**Narration:** "Undertakings and document validity are tracked with automatic escalation, and
every action is recorded in an immutable audit trail."

### 1:55–2:00 — Close
**Screen:** Dashboard or title card.
**Narration:** "One integrated, configurable and auditable platform for AICTE approvals —
supporting, never replacing, the competent authority. Thank you."

---

### Production tips
- Record the **★ differentiators** first — they're the strongest moments.
- Rehearse the EVC conflict step; confirm the seeded double-booking date is present.
- Keep the cursor movement deliberate; pause briefly on each result.
- Add captions for accessibility; keep background music low or off.
