import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import { TennisRoom } from './rooms/TennisRoom';
import { SERVER_PORT } from '../../shared/constants';

async function bootstrap(): Promise<void> {
  const app = express();

  // CORS — allow all origins in dev; restrict in production
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  }));

  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Colyseus monitor (admin panel at /colyseus)
  app.use('/colyseus', monitor());

  // Create HTTP server
  const httpServer = createServer(app);

  // Create Colyseus server
  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer,
    }),
  });

  // Register rooms
  gameServer.define('tennis_room', TennisRoom);

  // Listen
  const port = parseInt(process.env.PORT || String(SERVER_PORT), 10);
  await gameServer.listen(port);

  console.log('\nTennis Stars Server running!');
  console.log(`   Port:    ${port}`);
  console.log(`   Monitor: http://localhost:${port}/colyseus`);
  console.log(`   Health:  http://localhost:${port}/health\n`);
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
