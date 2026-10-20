import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';

interface AuditParams {
  userId?: string | null;
  userRole?: Role | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Records an immutable audit entry. Audit failures must never break the
 * primary request flow, so errors are logged and swallowed.
 */
export async function recordAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        userRole: params.userRole ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        details: (params.details ?? undefined) as never,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error('[audit] failed to record entry', err);
  }
}
