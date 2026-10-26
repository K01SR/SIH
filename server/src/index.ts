import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server as SocketServer } from 'socket.io';
import { env } from './config/env';
import routes from './routes';
import { notFound, errorHandler } from './middleware/error';
import { verifyToken } from './middleware/auth';
import { requestLogger } from './middleware/requestLogger';
import { apiLimiter } from './middleware/rateLimit';
import { startEscalationScheduler } from './scheduler';
import { setRealtimeEmitter } from './services/notification.service';
import { prisma } from './config/prisma';
import { uploadRoot } from './middleware/upload';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: env.clientUrl, credentials: true },
});

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.set('io', io);
setRealtimeEmitter(io);

// Attach authenticated socket rooms so users only receive relevant events.
// The identity is derived from a verified token, never from a client-supplied
// id, so a socket cannot claim another user's alerts.
io.use((socket, next) => {
  const handshake = socket.handshake.auth as { token?: string } | undefined;
  const token = handshake?.token ?? (socket.handshake.headers.authorization as string | undefined)?.replace(/^Bearer /, '');
  const payload = verifyToken(token);
  if (!payload) return next(new Error('Unauthorized'));
  socket.data.userId = payload.id;
  socket.data.role = payload.role;
  next();
});

app.use('/api', apiLimiter, routes);

// Serve uploaded documents statically for download/preview.
app.use('/uploads', express.static(uploadRoot, { maxAge: '1h', index: false }));

// Single-container deployment: serve the built client from the same origin so
// /api, /uploads and /socket.io all work without a reverse proxy.
const clientDist = path.resolve(process.env.CLIENT_DIST || path.join(process.cwd(), 'client-dist'));
if (fs.existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      index: false,
      maxAge: env.isProduction ? '1y' : 0,
      immutable: env.isProduction,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    })
  );

  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io')
    ) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

io.on('connection', (socket) => {
  const userId = socket.data.userId as string | undefined;
  if (userId) socket.join(`user:${userId}`);
  console.log(`[socket] connected: ${socket.id}${userId ? ` (user ${userId})` : ''}`);
  socket.on('disconnect', () => console.log(`[socket] disconnected: ${socket.id}`));
});

export async function start() {
  try {
    await prisma.$connect();
  } catch (err) {
    console.error('[server] database connection failed', err);
  }
  return server.listen(env.port, () => {
    console.log(`[server] AICTE Workflow API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    if (env.enableScheduler) startEscalationScheduler();
  });
}

// Auto-start only when executed as the entrypoint (not when imported by tests).
if (require.main === module) {
  void start();
}

export { app, server, io };
