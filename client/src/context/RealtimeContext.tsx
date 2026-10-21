import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface RealtimeContextValue {
  connected: boolean;
  lastAlert: unknown | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({ connected: false, lastAlert: null });

/**
 * Establishes a Socket.IO connection for the authenticated user and surfaces
 * live alerts/notifications as toasts. Reconnects automatically.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const { push } = useToast();
  const [connected, setConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState<unknown | null>(null);

  useEffect(() => {
    if (!user || !token) return;
    const socket: Socket = io('/', {
      path: '/socket.io',
      // The server verifies this token; it decides which room we join.
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('alert', (alert: { title?: string; severity?: string; message?: string }) => {
      setLastAlert(alert);
      window.dispatchEvent(new CustomEvent('aicte:alert', { detail: alert }));
      const prefix = alert.severity === 'CRITICAL' ? 'Critical: ' : '';
      push(`${prefix}${alert.title ?? 'New alert'}`, alert.severity === 'CRITICAL' ? 'error' : 'info');
    });
    socket.on('notification', (n: { subject?: string }) => {
      window.dispatchEvent(new CustomEvent('aicte:notification', { detail: n }));
      if (n?.subject) push(n.subject, 'info');
    });

    return () => {
      socket.disconnect();
    };
  }, [user, token, push]);

  return <RealtimeContext.Provider value={{ connected, lastAlert }}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
