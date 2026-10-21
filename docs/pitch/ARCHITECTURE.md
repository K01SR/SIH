# Architecture — SIH 26262

This document describes the system architecture, the core request flows and the domain model
of the AICTE Approval Workflow Automation platform.

---

## 1. System Overview

```mermaid
flowchart LR
  subgraph Client["Client (React + Vite + TS)"]
    UI["Role-based SPA<br/>React Router · Tailwind"]
    RT["RealtimeContext<br/>Socket.IO client"]
    PDF["jsPDF<br/>case-file export"]
  end

  subgraph Server["Server (Node + Express + TS)"]
    API["REST API<br/>/api/*"]
    WS["Socket.IO"]
    CRON["node-cron<br/>escalation sweep"]
    subgraph Engines
      RE["Rules Engine"]
      WE["Workflow Engine"]
      EE["Escalation Engine"]
    end
    subgraph Services
      AS["Audit Service"]
      NS["Notification Service"]
      APS["Application Service"]
    end
    MW["Middleware<br/>auth · RBAC · validate · rateLimit · error"]
  end

  DB[("SQLite / PostgreSQL<br/>Prisma ORM")]
  FS["Upload storage<br/>/uploads"]

  UI -->|HTTPS /api| API
  RT <-->|WebSocket| WS
  API --> MW
  MW --> APS
  APS --> WE
  APS --> RE
  EE --> RE
  APS --> NS
  APS --> AS
  CRON --> EE
  WE --> DB
  RE --> DB
  EE --> DB
  AS --> DB
  NS --> DB
  API --> FS
  WS -.push alerts.-> RT
```

---

## 2. Request Lifecycle

```mermaid
sequenceDiagram
  participant U as User (browser)
  participant M as Middleware
  participant C as Controller
  participant S as Service
  participant E as Engine
  participant D as Database
  participant A as Audit

  U->>M: HTTP request + JWT
  M->>M: authenticate · authorize(role) · validate(Zod) · rate-limit
  M->>C: validated request
  C->>S: call service
  S->>E: apply rules / workflow logic
  E->>D: read/write domain entities
  S->>A: record audit entry (actor, IP, reason)
  S-->>C: result
  C-->>U: JSON { success, message, data }
```

---

## 3. Workflow Transition (with Human-Oversight Gate)

```mermaid
sequenceDiagram
  participant O as Officer/CA
  participant API as API
  participant WE as Workflow Engine
  participant RE as Rules Engine
  participant A as Audit
  participant DB as Database
  participant WS as Socket.IO

  O->>API: POST /applications/:id/transition {actionType, reason}
  API->>WE: transition(actionType)
  WE->>WE: is it a statutory/oversight action?
  alt Human-oversight action
    WE->>WE: require explicit reason (mandatory)
    API-->>O: 422 if reason missing
  end
  WE->>RE: resolve next stage (<from, actionType>)
  RE-->>WE: next stage (or terminal)
  WE->>DB: update currentStage + write WorkflowAction
  WE->>A: append audit entry (actor, role, reason, IP)
  WE->>WS: broadcast stage change
  WS-->>O: realtime update
  API-->>O: success + updated application
```

---

## 4. Escalation Sweep (scheduled)

```mermaid
sequenceDiagram
  participant CRON as node-cron
  participant EE as Escalation Engine
  participant RE as Rules Engine
  participant DB as Database
  participant NS as Notification Service
  participant WS as Socket.IO

  CRON->>EE: run sweep (interval)
  EE->>RE: load escalation matrix + SLA timelines
  EE->>DB: query SLA breaches, EVC delays,<br/>overdue undertakings, expiring documents
  EE->>DB: create Alert + Escalation records
  EE->>NS: notify(role/user, severity)
  NS->>DB: persist notification (IN_APP/EMAIL/SMS)
  NS->>WS: push to per-user rooms
  WS-->>NS: delivered
```

---

## 5. Domain Model (overview)

```mermaid
erDiagram
  User ||--o{ Application : "assignedOfficer"
  User }o--|| Institution : "belongs to"
  Institution ||--o{ Application : "submits"
  Application ||--o{ WorkflowAction : "history"
  Application ||--o{ EvcSchedule : "requires"
  Application ||--o{ Undertaking : "conditions"
  Institution ||--o{ Undertaking : "responsible"
  Institution ||--o{ Document : "holds"
  User ||--o{ Alert : "receives"
  Alert ||--o| Escalation : "may raise"
  User ||--o{ AuditLog : "acts in"
  RuleConfig ||--o{ RuleVersion : "versioned as"

  User {
    string id
    string email
    string role
    string region
  }
  Application {
    string applicationNumber
    string routeType
    string currentStage
    string status
    datetime slaDueAt
    bool isBreached
  }
  WorkflowAction {
    string actionType
    string fromStage
    string toStage
    string reason
    bool isAutomated
  }
  EvcSchedule {
    string status
    datetime scheduledAt
    string venue
  }
  Undertaking {
    string status
    datetime dueDate
    string evidencePath
  }
  Document {
    string docType
    datetime validUntil
    string status
  }
  RuleConfig {
    string type
    json content
    bool isActive
  }
```

---

## 6. Roles & Access (RBAC)

| Role | Typical access |
|---|---|
| **ADMIN / Configurator** | Rules configuration, audit trail, escalation sweep, bulk notifications |
| **COMPETENT AUTHORITY (CA)** | Statutory approvals/rejections (human-oversight gate), reports |
| **BUREAU OFFICER** | Applications oversight, EVC, reports, simulation, audit |
| **REGIONAL OFFICER** | Region-scoped applications, scrutiny, EVC, reports |
| **EVC MEMBER** | EVC scheduling & committee duties |
| **COMMITTEE MEMBER** | SAC/SHC committee views |
| **INSTITUTION** | Self-service: submit applications, evidence, renewals |

Access is enforced on the server (`authorize` middleware) — the UI only reflects it.

---

## 7. Data & Deployment Notes

- **Database:** SQLite for zero-setup demos; the Prisma schema uses provider-portable types
  (String enums) so switching `provider` to PostgreSQL is a configuration change, not a rewrite.
- **Migrations:** schema applied via `prisma db push` (demo) / portable to `prisma migrate`.
- **File storage:** local disk under `/uploads`, served statically; replaceable with S3/Blob.
- **Scaling:** stateless API (JWT) behind a load balancer; Socket.IO rooms for real-time;
  relational DB scales to PostgreSQL; scheduler runs in-process (externalize for multi-instance).
- **Observability:** structured request logging, readiness probe (`GET /api/health`), health checks.
