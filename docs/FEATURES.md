# Feature-to-Requirement Mapping (SIH 26262)

Legend: **✅** implemented · **🟡** partially / simplified for prototype

## A. Approval Workflow Automation
| # | Requirement | Status | Where |
|---|---|---|---|
| 1 | Auto-route through APH stages (Only Scrutiny / Scrutiny+EVC / EVC+SAC-SHC / Only EVC / combos) | ✅ | `RulesEngine.resolveRoute`, `APH_ROUTING_MATRIX` |
| 2 | Auto-advance to next stage on completion | ✅ | `WorkflowEngine.transition` (auto-advance default branch) |
| 3 | Return/revert for deficiencies with mandatory recorded reason | ✅ | `WorkflowEngine.transition` (RETURN), controller validation |
| 4 | Automated standardized communications + electronic case summaries | ✅ | `sendCommunication`, case-file PDF export in `ApplicationDetailPage` |

## B. Dashboard & Pendency Monitoring
| # | Requirement | Status | Where |
|---|---|---|---|
| 5 | Consolidated real-time dashboard (status × region × stage × institution × officer) | ✅ | `ApplicationService.list/dashboardSummary`, `DashboardPage` |
| 6 | Ageing, prescribed-timeline tracking, workload distribution, bottleneck view | ✅ | `ageingAnalysis`, `workloadDistribution`, `regionPendency` |
| 7 | Alerts for approaching/exceeding timelines | ✅ | `EscalationEngine` (SLA_APPROACHING / SLA_BREACHED) |
| 8 | Role-based dashboards (RO / BO / Committee / Competent authority) | ✅ | `DashboardPage`, role-aware `Layout` |
| 9 | Complete digital audit trail | ✅ | `AuditLog`, `recordAudit`, `AuditPage` |

## C. EVC Scheduling & Alerts
| # | Requirement | Status | Where |
|---|---|---|---|
| 10 | Identify applications requiring EVC → queue after preliminary processing | ✅ | `WorkflowEngine.queueForEvc`, `routeToEvc` |
| 11 | Track EVC scheduling & completion timelines (esp. new institutions) | ✅ | `EvcSchedule` (`dueAt`, `completedDate`, `isBreached`) |
| 12 | Reminders for due/approaching EVCs + escalation of delayed | ✅ | `EscalationEngine` (EVC_DELAYED) |

## D. Time-Bound Undertakings & Compliance
| # | Requirement | Status | Where |
|---|---|---|---|
| 13 | Digital record: conditions + supporting evidence + due dates | ✅ | `Undertaking`, `undertaking.controller` |
| 14 | Notify institutions of upcoming deadlines + online document submission | ✅ | `notify`, `submitUndertaking`, `UndertakingsPage` |
| 15 | Track verification by officials; reminders + escalation if unfulfilled | ✅ | `verifyUndertaking`, `EscalationEngine` (UNDERTAKING_OVERDUE) |

## E. Lease & Document Validity Monitoring
| # | Requirement | Status | Where |
|---|---|---|---|
| 16 | Track validity/expiry of lease + prescribed documents | ✅ | `Document`, `document.controller` |
| 17 | Advance expiry alerts + notify institutions to renew | ✅ | `EscalationEngine` (DOCUMENT_EXPIRING: 30/15/7-day) |
| 18 | Monitor submission & verification of renewed documents | ✅ | `submitRenewal`, `verifyRenewal` |
| 19 | Overdue alerts + escalation for expired/non-submitted | ✅ | `EscalationEngine` (DOCUMENT_EXPIRED) |

## F. Notifications, Escalation & Reporting
| # | Requirement | Status | Where |
|---|---|---|---|
| 20 | Configurable notification rules (pending, deadlines, EVC, compliance, expiry) | ✅ | `NOTIFICATION_RULES`, `notification.service` |
| 21 | Automatic escalation per prescribed timelines & workflow rules | ✅ | `ESCALATION_MATRIX`, `EscalationEngine` |
| 22 | Consolidated reports (pendency, EVC, compliance, validity, overdue, region performance) | ✅ | `report.controller`, `ReportsPage` |
| 23 | Audit trail of alerts, submissions, verification, escalations, closure | ✅ | `AuditLog` + `Alert` + `Escalation` |

## G. Platform Requirements
| # | Requirement | Status | Where |
|---|---|---|---|
| 24 | Configurable rules/timelines aligned to APH (rules as data, not code) | ✅ | `RuleConfig` versioned JSON + `RulesPage` |
| 25 | RBAC + secure document storage + confidentiality + integration-ready API | ✅ | `authorize` middleware, multer file storage (`/uploads`), REST API + rate limiting |

## Evaluation-Criteria Differentiators
| # | Capability | Status | Where |
|---|---|---|---|
| 26 | Metrics panel (workflow accuracy, alert timeliness, pendency visibility, manual-follow-up reduction) | ✅ | `dashboardSummary`, `ReportsPage` |
| 27 | Configurable rules engine — versioned JSON, editable without redeploy | ✅ | `RulesPage` + `RuleConfig` |
| 28 | Committee calendar/scheduler for EVC — availability, slot booking, conflict detection | ✅ | `scheduleEvc` (UTC-day conflict detection), `/evc/calendar`, `EvcPage` |
| 29 | Predictive pendency — forecast breaches this month | ✅ | `ApplicationService.predictivePendency`, dashboard panel |
| 30 | Institution self-service portal | ✅ | Institution role: applications, undertakings, documents, uploads |
| 31 | Bulk notification engine — channel abstraction (IN_APP/EMAIL/SMS adapters) | ✅ | `notifyBulk` (+ `channelAdapters`), Alerts page modal |
| 32 | Case-file PDF generation | ✅ | `ApplicationDetailPage` (lazy-loaded jsPDF) |
| 33 | Simulation mode ("add officer → projected pendency change") | ✅ | `/applications/analytics/simulate`, `SimulationPage` |
| 34 | Human-oversight gate — propose/confirm, CA confirmation required | ✅ | `WorkflowEngine` HUMAN_OVERSIGHT_ACTIONS, confirmation modal |

## Production & Quality
| Area | Status | Where |
|---|---|---|
| API hardening (helmet, CORS, compression, rate limiting, request logging) | ✅ | `src/index.ts`, `middleware/rateLimit.ts`, `middleware/requestLogger.ts` |
| Input validation (Zod schemas, structured 422 errors) | ✅ | `middleware/validate.ts`, `validation/schemas.ts` |
| Centralized typed error handling | ✅ | `utils/AppError.ts`, `middleware/error.ts` |
| Readiness health check (DB ping, uptime) | ✅ | `GET /api/health` |
| Real-time alerts over Socket.IO (per-user rooms) | ✅ | `index.ts`, `RealtimeContext`, `RealtimeProvider` |
| Automated test suite (engines + API integration) | ✅ | `server/tests/*` (vitest + supertest) |
| Containerization + orchestration | ✅ | `server/Dockerfile`, `client/Dockerfile`, `docker-compose.yml` |
| CI (typecheck, tests, build on push/PR) | ✅ | `.github/workflows/ci.yml` |
| Client code-splitting + error boundary | ✅ | `App.tsx` (lazy routes), `components/ErrorBoundary.tsx` |
