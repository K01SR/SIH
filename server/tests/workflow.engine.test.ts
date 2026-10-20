import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import '../tests/setup';
import { prisma } from '../src/config/prisma';
import { WorkflowEngine } from '../src/engines/workflow.engine';
import { RulesEngine } from '../src/engines/rules.engine';
import { resetDb, createInstitution, createUser } from '../tests/helpers';
import { ActionType } from '../src/types/domain';

async function makeApp(routeType = 'SCRUTINY_EVC') {
  const inst = await createInstitution();
  const officer = await createUser({ email: 'ro@test.gov', role: 'REGIONAL_OFFICER', region: 'WEST' });
  const firstStage = await RulesEngine.resolveRoute(routeType);
  const app = await prisma.application.create({
    data: {
      applicationNumber: `AICTE/2026-27/${Math.random().toString(36).slice(2, 7)}`,
      institutionId: inst.id,
      academicYear: '2026-27',
      programType: 'ENGINEERING',
      routeType,
      assignedRegion: inst.region,
      status: 'SUBMITTED',
      currentStage: firstStage[0] as never,
      submittedAt: new Date(),
      assignedOfficerId: officer.id,
    },
  });
  return { app, officer, inst };
}

describe('Workflow Engine', () => {
  beforeAll(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await resetDb();
  });

  it('resolves the prescribed route for a route type', async () => {
    const route = await RulesEngine.resolveRoute('SCRUTINY_EVC');
    expect(route).toContain('SCRUTINY');
    expect(route).toContain('EVC');
  });

  it('auto-advances from scrutiny to the next configured stage', async () => {
    const { app, officer } = await makeApp('SCRUTINY_EVC');
    const result = await WorkflowEngine.transition({
      applicationId: app.id,
      actionType: ActionType.SCRUTINY_PASS,
      actorId: officer.id,
      actorRole: 'REGIONAL_OFFICER',
    });
    expect(result.toStage).not.toBe(result.fromStage);
  });

  it('returns an application with a reason and creates an alert', async () => {
    const { app, officer } = await makeApp();
    const result = await WorkflowEngine.transition({
      applicationId: app.id,
      actionType: ActionType.RETURN,
      actorId: officer.id,
      actorRole: 'REGIONAL_OFFICER',
      reason: 'Deficient documents',
    });
    expect(result.toStatus).toBe('RETURNED_TO_INSTITUTION');
    const alerts = await prisma.alert.findMany({ where: { applicationId: app.id } });
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('marks approval as human-verified and completes the workflow', async () => {
    const { app, officer } = await makeApp();
    const result = await WorkflowEngine.transition({
      applicationId: app.id,
      actionType: ActionType.APPROVE,
      actorId: officer.id,
      actorRole: 'COMPETENT_AUTHORITY',
      reason: 'All norms satisfied',
    });
    expect(result.requiresHumanConfirmation).toBe(true);
    expect(result.toStatus).toBe('APPROVED');
    const updated = await prisma.application.findUnique({ where: { id: app.id } });
    expect(updated?.isHumanVerified).toBe(true);
    expect(updated?.decisionAt).not.toBeNull();
  });

  it('records an immutable workflow action for every transition', async () => {
    const { app, officer } = await makeApp();
    await WorkflowEngine.transition({
      applicationId: app.id,
      actionType: ActionType.RETURN,
      actorId: officer.id,
      actorRole: 'REGIONAL_OFFICER',
      reason: 'Incomplete',
    });
    const actions = await prisma.workflowAction.findMany({ where: { applicationId: app.id } });
    expect(actions.length).toBe(1);
    expect(actions[0].actionType).toBe(ActionType.RETURN);
    expect(actions[0].reason).toBe('Incomplete');
  });

  it('computes an SLA due date from configured timelines', async () => {
    const due = await RulesEngine.computeSlaDue('SCRUTINY');
    expect(due.getTime()).toBeGreaterThan(Date.now());
  });
});
