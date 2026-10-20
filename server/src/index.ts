import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from './config/env';
import routes from './routes';
import { notFound, errorHandler } from './middleware/error';
import { startEscalationScheduler } from './scheduler';
import { setRealtimeEmitter } from './services/notification.service';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: env.clientUrl, credentials: true },
});

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.set('io', io);

setRealtimeEmitter(io);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[socket] client disconnected: ${socket.id}`));
});

server.listen(env.port, () => {
  console.log(`[server] AICTE Workflow API listening on http://localhost:${env.port}`);
  startEscalationScheduler();
});

export { app, server, io };
