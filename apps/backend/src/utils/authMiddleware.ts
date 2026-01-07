import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET;

export function isAuthEnabled(): boolean {
  return !!DASHBOARD_SECRET && DASHBOARD_SECRET.length > 0;
}

export function getBindHost(): string {
  return isAuthEnabled() ? '0.0.0.0' : '127.0.0.1';
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function validateToken(token: string | undefined): boolean {
  if (!isAuthEnabled()) {
    return true;
  }
  if (!token || !DASHBOARD_SECRET) {
    return false;
  }
  return timingSafeCompare(token, DASHBOARD_SECRET);
}

function extractTokenFromHeader(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
  }
  return undefined;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthEnabled()) {
    next();
    return;
  }

  const token = extractTokenFromHeader(req);
  
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Provide token via Authorization: Bearer <token> header'
    });
    return;
  }

  if (!validateToken(token)) {
    res.status(403).json({
      success: false,
      error: 'Invalid authentication token'
    });
    return;
  }

  next();
}

export function validateWebSocketAuth(url: string | undefined): boolean {
  if (!isAuthEnabled()) {
    return true;
  }

  if (!url) {
    return false;
  }

  try {
    const urlObj = new URL(url, 'http://localhost');
    const token = urlObj.searchParams.get('token');
    return validateToken(token || undefined);
  } catch {
    return false;
  }
}
