export type Role =
  | 'INSTITUTION'
  | 'REGIONAL_OFFICER'
  | 'BUREAU_OFFICER'
  | 'EVC_MEMBER'
  | 'COMMITTEE_MEMBER'
  | 'COMPETENT_AUTHORITY'
  | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  region?: string | null;
  institutionId?: string | null;
  designation?: string | null;
  institution?: Institution | null;
}

export interface Institution {
  id: string;
  name: string;
  aisheCode: string;
  type: string;
  region: string;
  state: string;
  isNewInstitution: boolean;
}

export interface Application {
  id: string;
  applicationNumber: string;
  institutionId: string;
  academicYear: string;
  programType: string;
  status: string;
  currentStage: string;
  routeType: string;
  assignedOfficerId?: string | null;
  assignedRegion: string;
  submittedAt?: string | null;
  decisionAt?: string | null;
  slaDueAt?: string | null;
  isBreached: boolean;
  isHumanVerified: boolean;
  remarks?: string | null;
  createdAt: string;
  institution?: Institution;
  assignedOfficer?: { id: string; fullName: string; role: string } | null;
  actions?: WorkflowAction[];
  undertakings?: Undertaking[];
  evcSchedules?: EvcSchedule[];
  documents?: DocumentRecord[];
  alerts?: Alert[];
}

export interface WorkflowAction {
  id: string;
  actionType: string;
  fromStage?: string | null;
  toStage?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  isAutomated: boolean;
  createdAt: string;
  actor?: { fullName: string; role: string } | null;
}

export interface EvcSchedule {
  id: string;
  applicationId: string;
  status: string;
  scheduledDate?: string | null;
  completedDate?: string | null;
  venue?: string | null;
  dueAt?: string | null;
  isBreached: boolean;
  notes?: string | null;
  application?: Application;
  members?: EvcMember[];
}

export interface EvcMember {
  id: string;
  userId: string;
  role?: string | null;
  isAvailable: boolean;
  user?: { id: string; fullName: string; role: string; region?: string | null };
}

export interface Undertaking {
  id: string;
  applicationId: string;
  title: string;
  description: string;
  conditions: string;
  dueDate: string;
  status: string;
  submittedAt?: string | null;
  verifiedAt?: string | null;
  evidencePath?: string | null;
  verificationRemarks?: string | null;
  escalated: boolean;
  application?: Application;
}

export interface DocumentRecord {
  id: string;
  institutionId: string;
  applicationId?: string | null;
  type: string;
  title: string;
  filePath: string;
  issuedDate?: string | null;
  validUntil?: string | null;
  status: string;
  renewedUntil?: string | null;
  expiryAlertSent: boolean;
  escalated: boolean;
  verificationRemarks?: string | null;
  institution?: Institution;
  daysToExpiry?: number;
}

export interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  applicationId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  recipientRole?: string | null;
  isRead: boolean;
  isEscalated: boolean;
  createdAt: string;
  application?: { applicationNumber: string } | null;
}

export interface Escalation {
  id: string;
  entityType: string;
  entityId: string;
  reason: string;
  fromRole?: string | null;
  toRole: string;
  level: number;
  resolved: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  userRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { fullName: string; role: string } | null;
}

export interface RuleConfig {
  id: string;
  type: string;
  version: number;
  name: string;
  description?: string | null;
  config: string;
  isActive: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface DashboardSummary {
  summary: { total: number; pending: number; breached: number; approved: number; rejected: number };
  ageing: {
    total: number;
    buckets: { label: string; color: string; count: number }[];
    byStage: Record<string, number>;
  };
}
