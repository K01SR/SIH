import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import '../tests/setup';
import { prisma } from '../src/config/prisma';
import { EscalationEngine } from '../src/engines/escalation.engine';
import { resetDb, createInstitution, createUser } from '../tests/helpers';

const DAY = 24 * 60 * 60 * 1000;

describe('Escalation Engine', () => {
  beforeAll(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await resetDb();
  });

  it('flags SLA-breached applications and creates escalations', async () => {
    const inst = await createInstitution();
    const officer = await createUser({ email: 'ro@test.gov', role: 'REGIONAL_OFFICER', region: 'WEST' });
    await prisma.application.create({
      data: {
        applicationNumber: 'AICTE/2026-27/BREACH',
        institutionId: inst.id,
        academicYear: '2026-27',
        programType: 'ENGINEERING',
        status: 'UNDER_SCRUTINY',
        currentStage: 'SCRUTINY',
        assignedRegion: 'WEST',
        assignedOfficerId: officer.id,
        slaDueAt: new Date(Date.now() - 5 * DAY),
      },
    });
    const summary = await EscalationEngine.sweep();
    expect(summary.slaBreached).toBeGreaterThanOrEqual(1);
    const breached = await prisma.application.findFirst({ where: { isBreached: true } });
    expect(breached).toBeTruthy();
    const escalations = await prisma.escalation.findMany();
    expect(escalations.length).toBeGreaterThanOrEqual(1);
  });

  it('escalates overdue undertakings', async () => {
    const inst = await createInstitution();
    const app = await prisma.application.create({
      data: {
        applicationNumber: 'AICTE/2026-27/UND',
        institutionId: inst.id,
        academicYear: '2026-27',
        programType: 'ENGINEERING',
        status: 'APPROVED_WITH_UNDERTAKING',
        currentStage: 'COMPLETED',
        assignedRegion: 'WEST',
      },
    });
    await prisma.undertaking.create({
      data: {
        applicationId: app.id,
        title: 'Provide additional faculty',
        description: 'Recruit faculty',
        conditions: '{}',
        dueDate: new Date(Date.now() - 3 * DAY),
        status: 'PENDING',
      },
    });
    const summary = await EscalationEngine.sweep();
    expect(summary.undertakingsOverdue).toBeGreaterThanOrEqual(1);
    const u = await prisma.undertaking.findFirst();
    expect(u?.status).toBe('ESCALATED');
  });

  it('escalates expired documents', async () => {
    const inst = await createInstitution();
    await prisma.document.create({
      data: {
        institutionId: inst.id,
        type: 'FIRE_SAFETY',
        title: 'Fire Safety Certificate',
        filePath: '',
        validUntil: new Date(Date.now() - 2 * DAY),
        status: 'VALID',
      },
    });
    const summary = await EscalationEngine.sweep();
    expect(summary.documentsExpired).toBeGreaterThanOrEqual(1);
    const doc = await prisma.document.findFirst();
    expect(doc?.status).toBe('EXPIRED');
  });

  it('marks documents expiring within 30 days as EXPIRING_SOON', async () => {
    const inst = await createInstitution();
    await prisma.document.create({
      data: {
        institutionId: inst.id,
        type: 'LEASE_DEED',
        title: 'Lease Deed',
        filePath: '',
        validUntil: new Date(Date.now() + 10 * DAY),
        status: 'VALID',
      },
    });
    const summary = await EscalationEngine.sweep();
    expect(summary.documentsExpiring).toBeGreaterThanOrEqual(1);
    const doc = await prisma.document.findFirst();
    expect(doc?.status).toBe('EXPIRING_SOON');
  });
});
