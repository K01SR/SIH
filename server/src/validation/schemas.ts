import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2),
  role: z.string().min(3),
  region: z.string().optional().nullable(),
  institutionId: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
});

export const createApplicationSchema = z.object({
  academicYear: z.string().min(4),
  programType: z.string().min(2),
  routeType: z.string().optional(),
  institutionId: z.string().optional(),
});

export const transitionSchema = z.object({
  actionType: z.string().min(2),
  reason: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const scheduleEvcSchema = z.object({
  scheduledDate: z.string().min(4),
  venue: z.string().min(1),
  meetingLink: z.string().optional().nullable(),
  memberIds: z.array(z.string()).optional().default([]),
  notes: z.string().max(2000).optional().nullable(),
});

export const queueEvcSchema = z.object({ applicationId: z.string().min(1) });

export const undertakingCreateSchema = z.object({
  applicationId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  conditions: z.union([z.record(z.unknown()), z.string()]).optional().nullable(),
  dueDate: z.string().min(4),
});

export const undertakingSubmitSchema = z.object({
  evidencePath: z.string().optional().nullable(),
  remarks: z.string().max(2000).optional().nullable(),
});

export const undertakingVerifySchema = z.object({
  decision: z.enum(['COMPLIANT', 'NON_COMPLIANT']),
  remarks: z.string().max(2000).optional().nullable(),
});

export const documentCreateSchema = z.object({
  institutionId: z.string().optional(),
  applicationId: z.string().optional().nullable(),
  type: z.string().min(2),
  title: z.string().min(2),
  filePath: z.string().optional().nullable(),
  issuedDate: z.string().optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().min(4),
});

export const documentRenewalSchema = z.object({
  filePath: z.string().optional().nullable(),
  renewedUntil: z.string().min(4),
});

export const documentRenewalVerifySchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  remarks: z.string().max(2000).optional().nullable(),
});

export const ruleCreateSchema = z.object({
  type: z.string().min(2),
  name: z.string().optional().nullable(),
  config: z.union([z.record(z.unknown()), z.string()]),
  description: z.string().optional().nullable(),
  activate: z.boolean().optional(),
});
