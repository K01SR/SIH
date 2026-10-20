import { prisma } from '../config/prisma';
import { ActionType, ApplicationStatus, Stage } from '@prisma/client';
import { RulesEngine } from './rules.engine';
import { recordAudit } from '../services/audit.service';
import { createAlert, notify } from '../services/notification.service';

export interface TransitionInput {
  applicationId: string;
  actionType: ActionType;
  actorId?: string | null;
  actorRole?: string | null;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  applicationId: string;
  fromStage: Stage;
  toStage: Stage;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  requiresHumanConfirmation: boolean;
}

// Actions that alter the statutory outcome are gated behind a human-oversight
// confirmation, per the PS regulatory safeguard.
const HUMAN_OVERSIGHT_ACTIONS: ActionType[] = [
  ActionType.APPROVE,
  ActionType.REJECT,
  ActionType.PROPOSE_DECISION,
];

/**
 * Workflow Engine - drives application state transitions, applies the
 * configured routing matrix, advances stages automatically and enforces the
 * human-oversight gate.
 */
export class WorkflowEngine {
  /** Determine the next prescribed stage for an application. */
  static async nextStage(applicationId: string): Promise<Stage | null> {
    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) return null;
    const route = await RulesEngine.resolveRoute(app.routeType);
    const idx = route.indexOf(app.currentStage);
    if (idx === -1) return route[0] ? (route[0] as Stage) : null;
    const next = route[idx + 1];
    return next ? (next as Stage) : null;
  }

  private static statusForStage(stage: Stage): ApplicationStatus {
    switch (stage) {
      case Stage.SUBMISSION:
        return ApplicationStatus.SUBMITTED;
      case Stage.SCRUTINY:
        return ApplicationStatus.UNDER_SCRUTINY;
      case Stage.RESCRUTINY:
        return ApplicationStatus.UNDER_SCRUTINY;
      case Stage.EVC:
        return ApplicationStatus.EVC_QUEUED;
      case Stage.SAC_SHC:
        return ApplicationStatus.UNDER_SAC_SHC;
      case Stage.DECISION:
        return ApplicationStatus.PENDING_DECISION;
      case Stage.COMPLETED:
        return ApplicationStatus.APPROVED;
      default:
        return ApplicationStatus.SUBMITTED;
    }
  }

  /** Execute a workflow action and persist the resulting transition. */
  static async transition(input: TransitionInput): Promise<TransitionResult> {
    const app = await prisma.application.findUnique({ where: { id: input.applicationId } });
    if (!app) throw new Error('Application not found');

    const fromStage = app.currentStage;
    const fromStatus = app.status;
    const requiresHumanConfirmation = HUMAN_OVERSIGHT_ACTIONS.includes(input.actionType);

    let toStage: Stage = fromStage;
    let toStatus: ApplicationStatus = fromStatus;
    let slaDueAt = app.slaDueAt;

    switch (input.actionType) {
      case ActionType.RETURN:
        toStage = Stage.SCRUTINY;
        toStatus = ApplicationStatus.RETURNED_TO_INSTITUTION;
        break;
      case ActionType.APPROVE:
        toStage = Stage.COMPLETED;
        toStatus = ApplicationStatus.APPROVED;
        break;
      case ActionType.REJECT:
        toStage = Stage.COMPLETED;
        toStatus = ApplicationStatus.REJECTED;
        break;
      case ActionType.WITHDRAW:
        toStage = Stage.COMPLETED;
        toStatus = ApplicationStatus.WITHDRAWN;
        break;
      case ActionType.ROUTE_TO_EVC:
        toStage = Stage.EVC;
        toStatus = ApplicationStatus.EVC_QUEUED;
        break;
      default: {
        // Auto-advance to the next prescribed stage
        const next = await this.nextStage(input.applicationId);
        if (next) {
          toStage = next;
          toStatus = this.statusForStage(next);
          slaDueAt = await RulesEngine.computeSlaDue(next);
        }
      }
    }

    const updated = await prisma.application.update({
      where: { id: app.id },
      data: {
        currentStage: toStage,
        status: toStatus,
        slaDueAt: slaDueAt ?? undefined,
        decisionAt: toStage === Stage.COMPLETED ? new Date() : app.decisionAt,
        isHumanVerified: requiresHumanConfirmation ? true : app.isHumanVerified,
        remarks: input.reason ?? app.remarks,
      },
    });

    await prisma.workflowAction.create({
      data: {
        applicationId: app.id,
        actorId: input.actorId ?? null,
        actionType: input.actionType,
        fromStage,
        toStage,
        fromStatus,
        toStatus,
        reason: input.reason,
        metadata: (input.metadata ?? undefined) as never,
        isAutomated: !input.actorId,
      },
    });

    await recordAudit({
      userId: input.actorId ?? null,
      userRole: (input.actorRole as never) ?? null,
      action: `WORKFLOW_${input.actionType}`,
      entityType: 'Application',
      entityId: app.id,
      details: { fromStage, toStage, fromStatus, toStatus, reason: input.reason },
    });

    if (input.actionType === ActionType.RETURN) {
      await createAlert({
        type: 'GENERAL',
        severity: 'WARNING',
        title: 'Application returned for deficiencies',
        message: `Application ${app.applicationNumber} has been returned: ${input.reason ?? 'see remarks'}`,
        applicationId: app.id,
        entityType: 'Application',
        entityId: app.id,
      });
      await notify({
        userId: app.assignedOfficerId ?? null,
        subject: `Application ${app.applicationNumber} returned`,
        body: input.reason ?? 'Returned for deficiencies',
      });
    }

    return {
      applicationId: updated.id,
      fromStage,
      toStage,
      fromStatus,
      toStatus,
      requiresHumanConfirmation,
    };
  }

  /** Queue an application for EVC scheduling once preliminary stages complete. */
  static async queueForEvc(applicationId: string) {
    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new Error('Application not found');
    const dueAt = await RulesEngine.computeSlaDue(Stage.EVC);
    return prisma.evcSchedule.upsert({
      where: { id: `${applicationId}-evc` },
      update: { status: 'QUEUED' },
      create: {
        id: `${applicationId}-evc`,
        applicationId,
        status: 'QUEUED',
        dueAt,
      },
    });
  }
}
