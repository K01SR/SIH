/**
 * Default APH-aligned rule configurations.
 * These are seeded into RuleConfig and can be edited at runtime (rules as data).
 */

export const APH_ROUTING_MATRIX = {
  description: 'Maps application routeType to its prescribed processing stages',
  routes: {
    ONLY_SCRUTINY: ['SCRUTINY', 'DECISION'],
    SCRUTINY_EVC: ['SCRUTINY', 'EVC', 'DECISION'],
    EVC_SAC_SHC: ['EVC', 'SAC_SHC', 'DECISION'],
    ONLY_EVC: ['EVC', 'DECISION'],
    SCRUTINY_SAC_SHC: ['SCRUTINY', 'SAC_SHC', 'DECISION'],
    NEW_INSTITUTION: ['SCRUTINY', 'EVC', 'SAC_SHC', 'DECISION'],
  },
  defaultRoute: 'SCRUTINY_EVC',
};

export const SLA_TIMELINES = {
  description: 'Prescribed processing timelines (in days) per stage',
  stages: {
    SCRUTINY: 15,
    RESCRUTINY: 10,
    EVC: 30,
    SAC_SHC: 20,
    DECISION: 10,
  },
  totalProcessingDays: 90,
};

export const ESCALATION_MATRIX = {
  description: 'Escalation rules triggered when thresholds are crossed',
  rules: [
    {
      id: 'SLA_APPROACHING',
      trigger: 'sla_days_remaining',
      threshold: 3,
      toRole: 'REGIONAL_OFFICER',
      severity: 'WARNING',
    },
    {
      id: 'SLA_BREACH',
      trigger: 'sla_breached',
      threshold: 0,
      toRole: 'BUREAU_OFFICER',
      severity: 'CRITICAL',
    },
    {
      id: 'EVC_DELAY',
      trigger: 'evc_overdue_days',
      threshold: 5,
      toRole: 'COMPETENT_AUTHORITY',
      severity: 'CRITICAL',
    },
    {
      id: 'UNDERTAKING_OVERDUE',
      trigger: 'undertaking_overdue_days',
      threshold: 0,
      toRole: 'REGIONAL_OFFICER',
      severity: 'WARNING',
    },
    {
      id: 'DOCUMENT_EXPIRED',
      trigger: 'document_expired_days',
      threshold: 0,
      toRole: 'BUREAU_OFFICER',
      severity: 'CRITICAL',
    },
  ],
};

export const NOTIFICATION_RULES = {
  description: 'Configurable notification triggers and channels',
  rules: [
    { event: 'APPLICATION_SUBMITTED', channels: ['IN_APP', 'EMAIL'], recipient: 'INSTITUTION' },
    { event: 'SLA_APPROACHING', channels: ['IN_APP'], recipient: 'OFFICER' },
    { event: 'EVC_REMINDER', channels: ['IN_APP', 'EMAIL'], recipient: 'EVC_MEMBER' },
    { event: 'UNDERTAKING_DUE', channels: ['IN_APP', 'EMAIL', 'SMS'], recipient: 'INSTITUTION' },
    { event: 'DOCUMENT_EXPIRING', channels: ['IN_APP', 'EMAIL'], recipient: 'INSTITUTION' },
    { event: 'ESCALATION', channels: ['IN_APP'], recipient: 'AUTHORITY' },
  ],
};

export const AGEING_THRESHOLDS = {
  description: 'Ageing buckets (in days) for pendency analysis',
  buckets: [
    { label: '0-7 days', min: 0, max: 7, color: 'green' },
    { label: '8-15 days', min: 8, max: 15, color: 'yellow' },
    { label: '16-30 days', min: 16, max: 30, color: 'orange' },
    { label: '31+ days', min: 31, max: null, color: 'red' },
  ],
};
