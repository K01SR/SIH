import { prisma } from '../config/prisma';
import { ActionType, ApplicationStatus, Stage } from '../types/domain';
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
  fromStage: string;
  toStage: string;
  fromStatus: string;
  toStatus: string;
  requiresHumanConfirmation: boolean;
}

// Actions that alter the statutory outcome are gated behind a human-oversight
// confirmation, per the PS regulatory safeguard.
const HUMAN_OVERSIGHT_ACTIONS: ActionType[] = [
  ActionType.APPROVE,
  ActionType.REJECT,
  ActionType.PROPOSE_DECISION,
];

/** Statuses from which no further workflow action is permitted. */
const TERMINAL_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.APPROVED,
  ApplicationStatus.APPROVED_WITH_UNDERTAKING,
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
];

/**
 * Which stages each action may be applied from. An action offered outside its
 * stage is rejected rather than silently re-deciding an unrelated case.
 */
const ACTION_STAGE_GUARDS: Partial<Record<ActionType, Stage[]>> = {
  [ActionType.SCRUTINY_PASS]: [Stage.SUBMISSION, Stage.SCRUTINY, Stage.RESCRUTINY],
  [ActionType.RETURN]: [Stage.SUBMISSION, Stage.SCRUTINY, Stage.RESCRUTINY, Stage.EVC, Stage.SAC_SHC, Stage.DECISION],
  [ActionType.ROUTE_TO_EVC]: [Stage.SUBMISSION, Stage.SCRUTINY, Stage.RESCRUTINY],
  [ActionType.AUTO_ADVANCE]: [Stage.EVC, Stage.SAC_SHC],
  [ActionType.APPROVE]: [Stage.DECISION],
  [ActionType.REJECT]: [Stage.DECISION],
  [ActionType.PROPOSE_DECISION]: [Stage.DECISION],
};

/**
 * Which roles may perform each action. The route layer only checks that the
 * caller holds *some* workflow role; this matrix enforces the actual
 * authority, so a committee member can propose a decision but never take the
 * statutory one.
 */
const ACTION_ROLE_GUARDS: Partial<Record<ActionType, string[]>> = {
  [ActionType.SUBMIT]: ['INSTITUTION'],
  [ActionType.RESUBMIT]: ['INSTITUTION'],
  [ActionType.WITHDRAW]: ['INSTITUTION'],
  [ActionType.SCRUTINY_PASS]: ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'],
  [ActionType.SCRUTINY_FAIL]: ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'],
  [ActionType.RETURN]: ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'],
  [ActionType.ROUTE_TO_EVC]: ['REGIONAL_OFFICER', 'BUREAU_OFFICER'],
  [ActionType.ROUTE_TO_SAC_SHC]: ['REGIONAL_OFFICER', 'BUREAU_OFFICER'],
  [ActionType.AUTO_ADVANCE]: ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'],
  [ActionType.EVC_SCHEDULE]: ['BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'],
  [ActionType.EVC_COMPLETE]: ['EVC_MEMBER', 'COMMITTEE_MEMBER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'],
  [ActionType.SAC_SHC_COMPLETE]: ['COMMITTEE_MEMBER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'],
  [ActionType.PROPOSE_DECISION]: ['COMMITTEE_MEMBER', 'EVC_MEMBER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'],
  [ActionType.APPROVE]: ['COMPETENT_AUTHORITY', 'BUREAU_OFFICER'],
  [ActionType.REJECT]: ['COMPETENT_AUTHORITY', 'BUREAU_OFFICER'],
  [ActionType.ESCALATE]: ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'],
};

/**
 * Raised when the actor's role does not authorise the requested action.
 * Distinct from a stage mismatch so the API can answer 403 rather than 400.
 */
export class WorkflowAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowAuthorizationError';
  }
}

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

    // A closed case cannot be re-decided.
    if (TERMINAL_STATUSES.includes(app.status as ApplicationStatus)) {
      throw new Error(
        `This application is already ${app.status.toLowerCase().replace(/_/g, ' ')} and cannot be actioned further`
      );
    }

    // An action may only be applied from the stage it belongs to.
    const allowedStages = ACTION_STAGE_GUARDS[input.actionType];
    if (allowedStages && !allowedStages.includes(app.currentStage as Stage)) {
      throw new Error(
        `Action ${input.actionType} is not permitted at the ${app.currentStage.toLowerCase().replace(/_/g, ' ')} stage`
      );
    }

    // The caller must hold the authority for the specific action. Holding a
    // workflow role is not by itself sufficient to take a statutory decision.
    const allowedRoles = ACTION_ROLE_GUARDS[input.actionType];
    if (allowedRoles && (!input.actorRole || !allowedRoles.includes(input.actorRole))) {
      throw new WorkflowAuthorizationError(
        `Your role is not authorised to perform ${input.actionType.replace(/_/g, ' ').toLowerCase()}`
      );
    }

    const fromStage = app.currentStage;
    const fromStatus = app.status;
    const requiresHumanConfirmation = HUMAN_OVERSIGHT_ACTIONS.includes(input.actionType);

    let toStage: string = fromStage;
    let toStatus: string = fromStatus;
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
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
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
        // The institution that must act on the deficiency is the recipient.
        recipientRole: 'INSTITUTION',
        institutionId: app.institutionId,
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
