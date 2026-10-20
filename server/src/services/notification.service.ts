import { prisma } from '../config/prisma';
import { NotificationChannel, NotificationStatus } from '../types/domain';

let emitter: { emit: (event: string, payload: unknown) => void } | null = null;

/** Register a real-time emitter (Socket.IO) for broadcast events. */
export function setRealtimeEmitter(io: { emit: (event: string, payload: unknown) => void }) {
  emitter = io;
}

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

  if (channel !== NotificationChannel.IN_APP) {
    console.log(`[notification:${channel}] to=${params.userId} subject="${params.subject}"`);
  }

  const record = await prisma.notification.create({
    data: {
      userId: params.userId ?? null,
      channel,
      status: NotificationStatus.SENT,
      subject: params.subject,
      body: params.body,
      templateId: params.templateId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      sentAt: new Date(),
    },
  });

  emitter?.emit('notification', record);
  return record;
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
  const alert = await prisma.alert.create({
    data: {
      type: params.type,
      severity: params.severity ?? 'INFO',
      title: params.title,
      message: params.message,
      applicationId: params.applicationId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      recipientRole: params.recipientRole ?? null,
      recipientId: params.recipientId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });

  emitter?.emit('alert', alert);
  return alert;
}
