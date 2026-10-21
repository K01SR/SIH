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
    // Advance to the decision stage, where a statutory decision is due.
    await prisma.application.update({
      where: { id: app.id },
      data: { currentStage: 'DECISION', status: 'PENDING_DECISION' },
    });
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

  it('rejects a statutory decision taken outside the decision stage', async () => {
    const { app, officer } = await makeApp();
    await expect(
      WorkflowEngine.transition({
        applicationId: app.id,
        actionType: ActionType.APPROVE,
        actorId: officer.id,
        actorRole: 'COMPETENT_AUTHORITY',
        reason: 'Attempted early approval',
      })
    ).rejects.toThrow(/not permitted/i);
  });

  it('does not allow a closed application to be actioned again', async () => {
    const { app, officer } = await makeApp();
    await prisma.application.update({
      where: { id: app.id },
      data: { currentStage: 'COMPLETED', status: 'APPROVED' },
    });
    await expect(
      WorkflowEngine.transition({
        applicationId: app.id,
        actionType: ActionType.RETURN,
        actorId: officer.id,
        actorRole: 'REGIONAL_OFFICER',
        reason: 'Should be rejected',
      })
    ).rejects.toThrow(/already/i);
  });

  it('advances from the EVC stage to the decision stage once the EVC is complete', async () => {
    const { app, officer } = await makeApp('SCRUTINY_EVC');
    // The EVC has concluded; the file now sits at the EVC stage awaiting progression.
    await prisma.application.update({
      where: { id: app.id },
      data: { currentStage: 'EVC', status: 'EVC_COMPLETED' },
    });
    const result = await WorkflowEngine.transition({
      applicationId: app.id,
      actionType: ActionType.AUTO_ADVANCE,
      actorId: officer.id,
      actorRole: 'BUREAU_OFFICER',
    });
    expect(result.toStage).toBe('DECISION');
  });

  it('rejects progression out of the EVC stage for actions that belong to scrutiny', async () => {
    const { app, officer } = await makeApp('SCRUTINY_EVC');
    await prisma.application.update({
      where: { id: app.id },
      data: { currentStage: 'EVC', status: 'EVC_COMPLETED' },
    });
    await expect(
      WorkflowEngine.transition({
        applicationId: app.id,
        actionType: ActionType.SCRUTINY_PASS,
        actorId: officer.id,
        actorRole: 'REGIONAL_OFFICER',
      })
    ).rejects.toThrow(/not permitted/i);
  });

  it('does not let a committee member take the statutory decision', async () => {
    const { app } = await makeApp();
    const member = await createUser({ email: 'sac@test.gov', role: 'COMMITTEE_MEMBER' });
    await prisma.application.update({
      where: { id: app.id },
      data: { currentStage: 'DECISION', status: 'PENDING_DECISION' },
    });
    await expect(
      WorkflowEngine.transition({
        applicationId: app.id,
        actionType: ActionType.APPROVE,
        actorId: member.id,
        actorRole: 'COMMITTEE_MEMBER',
        reason: 'Attempting to self-approve',
      })
    ).rejects.toThrow(/not authorised/i);
  });

  it('does not let an EVC member take the statutory decision', async () => {
    const { app } = await makeApp();
    const member = await createUser({ email: 'evc@test.gov', role: 'EVC_MEMBER' });
    await prisma.application.update({
      where: { id: app.id },
      data: { currentStage: 'DECISION', status: 'PENDING_DECISION' },
    });
    await expect(
      WorkflowEngine.transition({
        applicationId: app.id,
        actionType: ActionType.REJECT,
        actorId: member.id,
        actorRole: 'EVC_MEMBER',
        reason: 'Attempting to self-reject',
      })
    ).rejects.toThrow(/not authorised/i);
  });

  it('lets a committee member propose a recommendation without deciding the case', async () => {
    const { app } = await makeApp();
    const member = await createUser({ email: 'sac2@test.gov', role: 'COMMITTEE_MEMBER' });
    await prisma.application.update({
      where: { id: app.id },
      data: { currentStage: 'DECISION', status: 'PENDING_DECISION' },
    });
    const result = await WorkflowEngine.transition({
      applicationId: app.id,
      actionType: ActionType.PROPOSE_DECISION,
      actorId: member.id,
      actorRole: 'COMMITTEE_MEMBER',
      reason: 'Panel recommendation: approve with conditions',
    });
    expect(result.requiresHumanConfirmation).toBe(true);
    expect(result.toStatus).not.toBe('APPROVED');
    const updated = await prisma.application.findUnique({ where: { id: app.id } });
    expect(updated?.status).toBe('PENDING_DECISION');
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
