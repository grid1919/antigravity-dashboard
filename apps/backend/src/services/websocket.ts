import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import type { WSMessage, WSMessageType, LocalAccount, AccountDiff, DashboardStats } from '../types';
import { isAuthEnabled, validateWebSocketAuth } from '../utils/authMiddleware';

interface ClientInfo {
  ws: WebSocket;
  subscriptions: Set<WSMessageType>;
  lastPing: number;
  isAlive: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private messageQueue: WSMessage[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sequenceNumber = 0;

  private readonly BATCH_INTERVAL = 100;
  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly CLIENT_TIMEOUT = 60000;

  initialize(server: Server, path: string = '/ws'): void {
    const verifyClient = (info: { origin: string; req: IncomingMessage; secure: boolean }, callback: (result: boolean, code?: number, message?: string) => void) => {
      if (!isAuthEnabled()) {
        callback(true);
        return;
      }
      
      const isValid = validateWebSocketAuth(info.req.url);
      if (isValid) {
        callback(true);
      } else {
        callback(false, 401, 'Authentication required');
      }
    };

    this.wss = new WebSocketServer({ server, path, verifyClient });

    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });

    this.startHeartbeat();
    console.log(`[WebSocketManager] Initialized on path: ${path}`);
  }

  private handleConnection(ws: WebSocket): void {
    const clientInfo: ClientInfo = {
      ws,
      subscriptions: new Set(['initial', 'accounts_update', 'rate_limit_change', 'stats_update', 'heartbeat']),
      lastPing: Date.now(),
      isAlive: true
    };

    this.clients.set(ws, clientInfo);
    console.log(`[WebSocketManager] Client connected. Total: ${this.clients.size}`);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(ws, message);
      } catch (e) {
        console.error('[WebSocketManager] Invalid message from client:', e);
      }
    });

    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.isAlive = true;
        client.lastPing = Date.now();
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`[WebSocketManager] Client disconnected. Total: ${this.clients.size}`);
    });

    ws.on('error', (error) => {
      console.error('[WebSocketManager] Client error:', error);
      this.clients.delete(ws);
    });
  }

  private handleClientMessage(ws: WebSocket, message: any): void {
    if (message.type === 'subscribe' && Array.isArray(message.events)) {
      const client = this.clients.get(ws);
      if (client) {
        message.events.forEach((event: WSMessageType) => {
          client.subscriptions.add(event);
        });
      }
    } else if (message.type === 'unsubscribe' && Array.isArray(message.events)) {
      const client = this.clients.get(ws);
      if (client) {
        message.events.forEach((event: WSMessageType) => {
          client.subscriptions.delete(event);
        });
      }
    } else if (message.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, ws) => {
        if (!client.isAlive) {
          console.log('[WebSocketManager] Terminating inactive client');
          ws.terminate();
          this.clients.delete(ws);
          return;
        }

        if (now - client.lastPing > this.CLIENT_TIMEOUT) {
          console.log('[WebSocketManager] Client timeout, terminating');
          ws.terminate();
          this.clients.delete(ws);
          return;
        }

        client.isAlive = false;
        ws.ping();
      });

      this.broadcast({ type: 'heartbeat', data: { timestamp: now }, timestamp: now });
    }, this.HEARTBEAT_INTERVAL);
  }

  private queueMessage(message: WSMessage): void {
    this.messageQueue.push(message);
    
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushQueue(), this.BATCH_INTERVAL);
    }
  }

  private flushQueue(): void {
    if (this.messageQueue.length === 0) {
      this.batchTimer = null;
      return;
    }

    if (this.messageQueue.length === 1) {
      this.broadcastImmediate(this.messageQueue[0]);
    } else {
      const batchMessage: WSMessage = {
        type: 'stats_update',
        data: { batch: this.messageQueue },
        timestamp: Date.now(),
        seq: this.sequenceNumber++
      };
      this.broadcastImmediate(batchMessage);
    }

    this.messageQueue = [];
    this.batchTimer = null;
  }

  private broadcastImmediate(message: WSMessage): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((client, ws) => {
      if (ws.readyState === WebSocket.OPEN && client.subscriptions.has(message.type)) {
        try {
          ws.send(messageStr);
        } catch (e) {
          console.error('[WebSocketManager] Send error:', e);
        }
      }
    });
  }

  broadcast(message: WSMessage): void {
    message.timestamp = message.timestamp || Date.now();
    message.seq = this.sequenceNumber++;
    this.queueMessage(message);
  }

  broadcastNow(message: WSMessage): void {
    message.timestamp = message.timestamp || Date.now();
    message.seq = this.sequenceNumber++;
    this.broadcastImmediate(message);
  }

  sendInitialState(ws: WebSocket, accounts: LocalAccount[], stats: DashboardStats): void {
    const message: WSMessage = {
      type: 'initial',
      data: { accounts, stats },
      timestamp: Date.now(),
      seq: this.sequenceNumber++
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcastAccountsUpdate(diffs: AccountDiff[]): void {
    this.broadcast({
      type: 'accounts_update',
      data: { diffs },
      timestamp: Date.now()
    });
  }

  broadcastRateLimitChange(email: string, family: 'claude' | 'gemini', cleared: boolean): void {
    this.broadcastNow({
      type: 'rate_limit_change',
      data: { email, family, cleared, timestamp: Date.now() },
      timestamp: Date.now()
    });
  }

  broadcastStatsUpdate(stats: DashboardStats): void {
    this.broadcast({
      type: 'stats_update',
      data: stats,
      timestamp: Date.now()
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    if (this.wss) {
      this.wss.close();
    }
    this.clients.clear();
  }
}

let wsManagerInstance: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManagerInstance) {
    wsManagerInstance = new WebSocketManager();
  }
  return wsManagerInstance;
}
