import { prisma } from '../config/prisma';
import type { Prisma } from '@prisma/client';

export interface AlertScopeUser {
  id: string;
  role: string;
  region?: string | null;
  institutionId?: string | null;
}

/**
 * Builds the visibility predicate for a single user.
 *
 * An alert is visible when it is addressed to that user directly, to the
 * user's role, or to nobody in particular (a broadcast). Role-addressed
 * alerts are further narrowed to the user's own region or institution so that
 * an institution never sees another institution's compliance alerts.
 */
export function alertVisibilityFilter(user: AlertScopeUser): Prisma.AlertWhereInput {
  const global: Prisma.AlertWhereInput = { recipientId: null, recipientRole: null };

  if (user.role === 'INSTITUTION') {
    const ownInstitution: Prisma.AlertWhereInput = {
      recipientRole: 'INSTITUTION',
      OR: [
        { institutionId: user.institutionId ?? '__none__' },
        { application: { is: { institutionId: user.institutionId ?? '__none__' } } },
        { application: null, institutionId: null },
      ],
    };
    return {
      OR: [{ recipientId: user.id }, ownInstitution, global],
    };
  }

  if (user.role === 'REGIONAL_OFFICER') {
    const ownRegion: Prisma.AlertWhereInput = {
      recipientRole: user.role,
      OR: [{ application: { is: { assignedRegion: user.region ?? '__none__' } } }, { application: null }],
    };
    return {
      OR: [{ recipientId: user.id }, ownRegion, global],
    };
  }

  return {
    OR: [{ recipientId: user.id }, { recipientRole: user.role }, global],
  };
}

/**
 * Resolves the set of users that should receive an alert over the realtime
 * channel. This deliberately mirrors {@link alertVisibilityFilter} so a user
 * is never notified live about an alert they cannot then find in their list.
 */
export async function resolveAlertRecipientIds(alert: {
  recipientId?: string | null;
  recipientRole?: string | null;
  applicationId?: string | null;
  institutionId?: string | null;
}): Promise<string[]> {
  if (alert.recipientId) return [alert.recipientId];

  if (!alert.recipientRole) {
    // A broadcast alert reaches every user.
    const users = await prisma.user.findMany({ select: { id: true } });
    return users.map((u) => u.id);
  }

  let institutionId = alert.institutionId ?? null;
  let region: string | null = null;

  if (!institutionId && alert.applicationId) {
    const application = await prisma.application.findUnique({
      where: { id: alert.applicationId },
      select: { assignedRegion: true, institutionId: true },
    });
    institutionId = application?.institutionId ?? null;
    region = application?.assignedRegion ?? null;
  }

  const users = await prisma.user.findMany({
    where: {
      role: alert.recipientRole,
      isActive: true,
      ...(alert.recipientRole === 'INSTITUTION' && institutionId ? { institutionId } : {}),
      ...(alert.recipientRole === 'REGIONAL_OFFICER' && region ? { region } : {}),
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}
