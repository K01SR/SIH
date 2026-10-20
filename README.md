# AICTE Approval Workflow Automation System (SIH 26262)

An integrated, secure and configurable digital platform for end-to-end automation and monitoring of AICTE approval-related workflows.

## Project Overview
This system automates approval-related workflows, monitors institutional compliance, tracks document validity, manages EVC scheduling, and provides real-time dashboards with automated notifications and escalation.

## Tech Stack
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Node.js + Express.js + TypeScript
- Database: PostgreSQL + Prisma ORM
- Workflow Engine: XState
- Real-time: Socket.IO
- File Storage: Local (with abstraction for S3)

## Features
- End-to-end approval workflow automation with configurable rules
- Role-based dashboards and real-time pendency monitoring
- EVC scheduling with conflict detection
- Time-bound undertakings and institutional compliance tracking
- Lease & document validity monitoring
- Automated notifications, escalation, and reporting
- Complete digital audit trail
- Human oversight gate for regulatory decisions
- Rules engine (APH routing, SLA timelines, escalation rules) - rules as data
