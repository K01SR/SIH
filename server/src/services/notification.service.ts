import { prisma } from '../config/prisma';
import { NotificationChannel, NotificationStatus } from '@prisma/client';

interface NotifyParams {
  userId?: string | null;
  subject: string;
  body: string;
  channel?: NotificationChannel;
  templateId?: string;
  metadata?: unknown;
}

/**
 * Channel-abstracted notification dispatcher.
 * IN_APP entries persist to the database. EMAIL/SMS use a console adapter
 * for the prototype and can be swapped for real providers later.
 */
export async function notify(params: NotifyParams) {
  const channel = params.channel ?? NotificationChannel.IN_APP;

  if (channel === NotificationChannel.IN_APP) {
    const record = await prisma.notification.create({
      data: {
        userId: params.userId ?? null,
        channel,
        status: NotificationStatus.SENT,
        subject: params.subject,
        body: params.body,
        templateId: params.templateId,
        metadata: (params.metadata ?? undefined) as never,
        sentAt: new Date(),
      },
    });
    return record;
  }

  // Console adapter for EMAIL / SMS channels (demo)
  console.log(`[notification:${channel}] to=${params.userId} subject="${params.subject}"`);
  return prisma.notification.create({
    data: {
      userId: params.userId ?? null,
      channel,
      status: NotificationStatus.SENT,
      subject: params.subject,
      body: params.body,
      templateId: params.templateId,
      metadata: (params.metadata ?? undefined) as never,
      sentAt: new Date(),
    },
  });
}

export async function createAlert(params: {
  type: string;
  severity: string;
  title: string;
  message: string;
  applicationId?: string | null;
  entityType?: string;
  entityId?: string;
  recipientRole?: string;
  recipientId?: string;
  metadata?: unknown;
}) {
  return prisma.alert.create({
    data: {
      type: params.type as never,
      severity: (params.severity as never) ?? 'INFO',
      title: params.title,
      message: params.message,
      applicationId: params.applicationId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      recipientRole: (params.recipientRole as never) ?? null,
      recipientId: params.recipientId ?? null,
      metadata: (params.metadata ?? undefined) as never,
    },
  });
}
