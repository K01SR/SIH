import { prisma } from '../config/prisma';
import { RuleType } from '@prisma/client';
import {
  APH_ROUTING_MATRIX,
  SLA_TIMELINES,
  ESCALATION_MATRIX,
  NOTIFICATION_RULES,
  AGEING_THRESHOLDS,
} from '../config/defaultRules';

export interface RoutingMatrix {
  routes: Record<string, string[]>;
  defaultRoute: string;
}

export interface SlaTimelines {
  stages: Record<string, number>;
  totalProcessingDays: number;
}

export interface EscalationRule {
  id: string;
  trigger: string;
  threshold: number;
  toRole: string;
  severity: string;
}

export interface EscalationMatrix {
  rules: EscalationRule[];
}

/**
 * Rules Engine - resolves active rule configs from DB, falling back to
 * built-in defaults. All workflow logic reads from here so that rules can be
 * changed without redeploying code.
 */
export class RulesEngine {
  static defaults: Record<RuleType, unknown> = {
    APH_ROUTING_MATRIX,
    SLA_TIMELINES,
    ESCALATION_MATRIX,
    NOTIFICATION_RULES,
    AGEING_THRESHOLDS,
  };

  static async getActive<T>(type: RuleType): Promise<T> {
    const active = await prisma.ruleConfig.findFirst({
      where: { type, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (active) return active.config as T;
    return this.defaults[type] as T;
  }

  static async getRoutingMatrix(): Promise<RoutingMatrix> {
    return this.getActive<RoutingMatrix>(RuleType.APH_ROUTING_MATRIX);
  }

  static async getSlaTimelines(): Promise<SlaTimelines> {
    return this.getActive<SlaTimelines>(RuleType.SLA_TIMELINES);
  }

  static async getEscalationMatrix(): Promise<EscalationMatrix> {
    return this.getActive<EscalationMatrix>(RuleType.ESCALATION_MATRIX);
  }

  static async getAgeingThresholds() {
    return this.getActive<typeof AGEING_THRESHOLDS>(RuleType.AGEING_THRESHOLDS);
  }

  /** Resolve the prescribed stage sequence for a route. */
  static async resolveRoute(routeType: string): Promise<string[]> {
    const matrix = await this.getRoutingMatrix();
    return matrix.routes[routeType] || matrix.routes[matrix.defaultRoute] || ['SCRUTINY', 'DECISION'];
  }

  /** Compute the SLA due date for a stage starting now. */
  static async computeSlaDue(stage: string, from: Date = new Date()): Promise<Date> {
    const sla = await this.getSlaTimelines();
    const days = sla.stages[stage] ?? sla.totalProcessingDays;
    return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  }

  static async getStageTimeline(stage: string): Promise<number> {
    const sla = await this.getSlaTimelines();
    return sla.stages[stage] ?? sla.totalProcessingDays;
  }
}
