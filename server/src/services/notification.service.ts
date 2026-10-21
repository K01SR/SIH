import { prisma } from '../config/prisma';
import { NotificationChannel, NotificationStatus } from '../types/domain';
import { resolveAlertRecipientIds } from './alert-scope.service';

export interface RealtimeEmitter {
  emit: (event: string, payload: unknown) => void;
  to: (room: string) => { emit: (event: string, payload: unknown) => void };
}

let emitter: RealtimeEmitter | null = null;

/** Register a real-time emitter (Socket.IO) for broadcast events. */
export function setRealtimeEmitter(io: RealtimeEmitter) {
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
 * Channel adapters. IN_APP writes a persisted notification (broadcast over
 * Socket.IO). EMAIL/SMS use a logging adapter suitable for the prototype;
 * swap the adapter body for a real provider integration without touching
 * callers — the NotificationChannel contract is unchanged.
 */
const channelAdapters: Record<string, (params: NotifyParams) => Promise<void>> = {
  IN_APP: async () => {},
  EMAIL: async (params) => {
    console.log(`[email-adapter] to=${params.userId ?? 'broadcast'} subject="${params.subject}"`);
  },
  SMS: async (params) => {
    console.log(`[sms-adapter] to=${params.userId ?? 'broadcast'} body="${params.body}"`);
  },
};

/**
 * Channel-abstracted notification dispatcher.
 */
export async function notify(params: NotifyParams) {
  const channel = params.channel ?? NotificationChannel.IN_APP;

  const adapter = channelAdapters[channel] ?? channelAdapters.IN_APP;
  await adapter(params);

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

  // A notification addressed to one user is delivered to that user's room;
  // a broadcast is delivered to everyone.
  if (record.userId) {
    emitter?.to(`user:${record.userId}`).emit('notification', record);
  } else {
    emitter?.emit('notification', record);
  }
  return record;
}

/**
 * Bulk notification dispatcher. Resolves recipients from a role and/or an
 * explicit list of user ids, then dispatches on the requested channel.
 */
export async function notifyBulk(params: {
  userIds?: string[];
  roles?: string[];
  subject: string;
  body: string;
  channel?: NotificationChannel;
  metadata?: unknown;
}) {
  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        params.userIds?.length ? { id: { in: params.userIds } } : undefined,
        params.roles?.length ? { role: { in: params.roles } } : undefined,
      ].filter(Boolean) as object[],
    },
    select: { id: true },
  });

  const results = [];
  for (const r of recipients) {
    results.push(
      await notify({
        userId: r.id,
        subject: params.subject,
        body: params.body,
        channel: params.channel,
        metadata: params.metadata,
      })
    );
  }
  return { recipientCount: recipients.length, notifications: results.length };
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
  institutionId?: string | null;
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
      institutionId: params.institutionId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });

  // Deliver live only to the users who are entitled to see this alert.
  const recipientIds = await resolveAlertRecipientIds(alert);
  for (const id of recipientIds) {
    emitter?.to(`user:${id}`).emit('alert', alert);
  }
  return alert;
}
