/**
 * Shared domain constants.
 * Since SQLite does not support native enums, these string unions act as the
 * single source of truth for validated values across the application.
 */

export const Role = {
  INSTITUTION: 'INSTITUTION',
  REGIONAL_OFFICER: 'REGIONAL_OFFICER',
  BUREAU_OFFICER: 'BUREAU_OFFICER',
  EVC_MEMBER: 'EVC_MEMBER',
  COMMITTEE_MEMBER: 'COMMITTEE_MEMBER',
  COMPETENT_AUTHORITY: 'COMPETENT_AUTHORITY',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Region = {
  NORTH: 'NORTH',
  SOUTH: 'SOUTH',
  EAST: 'EAST',
  WEST: 'WEST',
  CENTRAL: 'CENTRAL',
  NORTH_EAST: 'NORTH_EAST',
} as const;
export type Region = (typeof Region)[keyof typeof Region];

export const InstitutionType = {
  ENGINEERING: 'ENGINEERING',
  MANAGEMENT: 'MANAGEMENT',
  PHARMACY: 'PHARMACY',
  ARCHITECTURE: 'ARCHITECTURE',
  HOTEL_MANAGEMENT: 'HOTEL_MANAGEMENT',
  POLYTECHNIC: 'POLYTECHNIC',
  UNIVERSITY: 'UNIVERSITY',
  OTHER: 'OTHER',
} as const;
export type InstitutionType = (typeof InstitutionType)[keyof typeof InstitutionType];

export const ApplicationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_SCRUTINY: 'UNDER_SCRUTINY',
  RETURNED_TO_INSTITUTION: 'RETURNED_TO_INSTITUTION',
  EVC_QUEUED: 'EVC_QUEUED',
  EVC_SCHEDULED: 'EVC_SCHEDULED',
  EVC_COMPLETED: 'EVC_COMPLETED',
  UNDER_SAC_SHC: 'UNDER_SAC_SHC',
  PENDING_DECISION: 'PENDING_DECISION',
  APPROVED: 'APPROVED',
  APPROVED_WITH_UNDERTAKING: 'APPROVED_WITH_UNDERTAKING',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const Stage = {
  SUBMISSION: 'SUBMISSION',
  SCRUTINY: 'SCRUTINY',
  RESCRUTINY: 'RESCRUTINY',
  EVC: 'EVC',
  SAC_SHC: 'SAC_SHC',
  DECISION: 'DECISION',
  COMPLETED: 'COMPLETED',
} as const;
export type Stage = (typeof Stage)[keyof typeof Stage];

export const ActionType = {
  SUBMIT: 'SUBMIT',
  SCRUTINY_PASS: 'SCRUTINY_PASS',
  SCRUTINY_FAIL: 'SCRUTINY_FAIL',
  RETURN: 'RETURN',
  RESUBMIT: 'RESUBMIT',
  ROUTE_TO_EVC: 'ROUTE_TO_EVC',
  EVC_SCHEDULE: 'EVC_SCHEDULE',
  EVC_COMPLETE: 'EVC_COMPLETE',
  ROUTE_TO_SAC_SHC: 'ROUTE_TO_SAC_SHC',
  SAC_SHC_COMPLETE: 'SAC_SHC_COMPLETE',
  PROPOSE_DECISION: 'PROPOSE_DECISION',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  WITHDRAW: 'WITHDRAW',
  ESCALATE: 'ESCALATE',
  AUTO_ADVANCE: 'AUTO_ADVANCE',
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export const EvcStatus = {
  QUEUED: 'QUEUED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DELAYED: 'DELAYED',
} as const;
export type EvcStatus = (typeof EvcStatus)[keyof typeof EvcStatus];

export const UndertakingStatus = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  UNDER_VERIFICATION: 'UNDER_VERIFICATION',
  COMPLIANT: 'COMPLIANT',
  NON_COMPLIANT: 'NON_COMPLIANT',
  ESCALATED: 'ESCALATED',
} as const;
export type UndertakingStatus = (typeof UndertakingStatus)[keyof typeof UndertakingStatus];

export const DocumentType = {
  LEASE_DEED: 'LEASE_DEED',
  BUILDING_APPROVAL: 'BUILDING_APPROVAL',
  FIRE_SAFETY: 'FIRE_SAFETY',
  LAND_USE: 'LAND_USE',
  AFFILIATION: 'AFFILIATION',
  ACCREDITATION: 'ACCREDITATION',
  OTHER: 'OTHER',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const DocumentStatus = {
  VALID: 'VALID',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
  RENEWAL_SUBMITTED: 'RENEWAL_SUBMITTED',
  RENEWAL_VERIFIED: 'RENEWAL_VERIFIED',
  RENEWAL_REJECTED: 'RENEWAL_REJECTED',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

export const AlertType = {
  SLA_APPROACHING: 'SLA_APPROACHING',
  SLA_BREACHED: 'SLA_BREACHED',
  EVC_REMINDER: 'EVC_REMINDER',
  EVC_DELAYED: 'EVC_DELAYED',
  UNDERTAKING_DUE: 'UNDERTAKING_DUE',
  UNDERTAKING_OVERDUE: 'UNDERTAKING_OVERDUE',
  DOCUMENT_EXPIRING: 'DOCUMENT_EXPIRING',
  DOCUMENT_EXPIRED: 'DOCUMENT_EXPIRED',
  ESCALATION: 'ESCALATION',
  GENERAL: 'GENERAL',
} as const;
export type AlertType = (typeof AlertType)[keyof typeof AlertType];

export const NotificationChannel = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationStatus = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  FAILED: 'FAILED',
  READ: 'READ',
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const RuleType = {
  APH_ROUTING_MATRIX: 'APH_ROUTING_MATRIX',
  SLA_TIMELINES: 'SLA_TIMELINES',
  ESCALATION_MATRIX: 'ESCALATION_MATRIX',
  NOTIFICATION_RULES: 'NOTIFICATION_RULES',
  AGEING_THRESHOLDS: 'AGEING_THRESHOLDS',
} as const;
export type RuleType = (typeof RuleType)[keyof typeof RuleType];
