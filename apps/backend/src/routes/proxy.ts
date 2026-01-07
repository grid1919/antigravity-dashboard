import { Router, Request, Response, NextFunction } from 'express';
import { ApiProxyService, Account, TokenProvider, ClaudeRequest, OpenAIRequest, ApiError, ProxyLogger, ProxyRequestLog, RateLimitNotifier } from '../services/apiProxy/index.js';
import { getFileLogger } from '../services/fileLogger';
import { getMonitor } from '../monitor';
import { requireAuth } from '../utils/authMiddleware';

// Separate routers for API endpoints and management endpoints
const apiRouter = Router();  // /v1/* routes - use proxy API key auth
const managementRouter = Router();  // /api/proxy/* routes - use dashboard auth
const fileLogger = getFileLogger();

let proxyService: ApiProxyService | null = null;
let tokenProviderImpl: TokenProvider | null = null;

export interface ProxyRouterConfig {
  apiKey?: string;
  enabled?: boolean;
  systemInstruction?: string;
  defaultModel?: string;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export function initializeProxyRoutes(
  getAccessToken: (refreshToken: string) => Promise<string | null>,
  getAccounts: () => Account[],
  getActiveAccount: () => Account | null,
  rotateAccount: () => Account | null,
  config: ProxyRouterConfig = {},
  logger?: ProxyLogger,
  rateLimitNotifier?: RateLimitNotifier
): Router {
  tokenProviderImpl = {
    getAccessToken,
    getAccounts,
    getActiveAccount,
    rotateAccount,
  };

  const generateAnthropicStyleKey = () => {
    const randomPart = require('crypto').randomBytes(32).toString('base64url');
    return `sk-ant-api03-${randomPart}`;
  };

  proxyService = new ApiProxyService(tokenProviderImpl, {
    apiKey: config.apiKey || process.env.PROXY_API_KEY || generateAnthropicStyleKey(),
    enabled: config.enabled ?? true,
    systemInstruction: config.systemInstruction,
    defaultModel: config.defaultModel,
  }, logger, rateLimitNotifier);

  console.log('[ApiProxy] Initialized with API key:', proxyService.getConfig().apiKey.slice(0, 8) + '...');

  return apiRouter;
}

managementRouter.use(requireAuth);

managementRouter.get('/api/proxy/status', (req: Request, res: Response) => {
  if (!proxyService) {
    res.json({ enabled: false, initialized: false });
    return;
  }

  const config = proxyService.getConfig();
  res.json({
    enabled: config.enabled,
    initialized: true,
    defaultModel: config.defaultModel,
    rotationStrategy: config.rotationStrategy,
  });
});

managementRouter.get('/api/proxy/stats', (req: Request, res: Response) => {
  if (!proxyService) {
    res.json({ error: 'Proxy service not initialized' });
    return;
  }

  res.json(proxyService.getStats());
});

managementRouter.get('/api/proxy/config', (req: Request, res: Response) => {
  if (!proxyService) {
    res.json({ error: 'Proxy service not initialized' });
    return;
  }

  const config = proxyService.getConfig();
  res.json({
    enabled: config.enabled,
    defaultModel: config.defaultModel,
    rotationStrategy: config.rotationStrategy,
    requestCountPerToken: config.requestCountPerToken,
    timeout: config.timeout,
  });
});

managementRouter.post('/api/proxy/config', (req: Request, res: Response) => {
  if (!proxyService) {
    res.status(503).json({ error: 'Proxy service not initialized' });
    return;
  }

  const updates = req.body;
  proxyService.updateConfig(updates);
  res.json({ success: true, config: proxyService.getConfig() });
});

managementRouter.get('/api/proxy/api-key', (req: Request, res: Response) => {
  if (!proxyService) {
    res.status(503).json({ error: 'Proxy service not initialized' });
    return;
  }

  res.json({ apiKey: proxyService.getConfig().apiKey });
});

managementRouter.post('/api/proxy/regenerate-api-key', (req: Request, res: Response) => {
  if (!proxyService) {
    res.status(503).json({ error: 'Proxy service not initialized' });
    return;
  }

  const newKey = require('crypto').randomUUID();
  proxyService.updateConfig({ apiKey: newKey });
  res.json({ apiKey: newKey });
});

managementRouter.get('/api/proxy/logs', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const monitor = getMonitor();
    const calls = monitor.getProxyCalls(limit);
    res.json({ success: true, data: calls });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    res.status(500).json({ success: false, error: message });
  }
});

managementRouter.get('/api/proxy/db-stats', (req: Request, res: Response) => {
  try {
    const monitor = getMonitor();
    const stats = monitor.getProxyStats();
    res.json({ success: true, data: stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    res.status(500).json({ success: false, error: message });
  }
});

export { apiRouter as proxyApiRouter, managementRouter as proxyManagementRouter };
