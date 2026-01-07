/**
 * Login Rate Limiter for Admin Security
 * Ported from antigravity2api-nodejs
 * 
 * Features:
 * - IP-based tracking
 * - Configurable max attempts
 * - Automatic blocking with cooldown
 * - Attempt window tracking
 */

import type { Request } from 'express';

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil: number | null;
}

interface RateLimitCheck {
  allowed: boolean;
  message?: string;
  remainingSeconds?: number;
  remainingAttempts?: number;
}

interface RateLimiterConfig {
  maxAttempts?: number;
  blockDurationMs?: number;
  attemptWindowMs?: number;
}

const DEFAULT_CONFIG: Required<RateLimiterConfig> = {
  maxAttempts: 5,
  blockDurationMs: 5 * 60 * 1000, // 5 minutes
  attemptWindowMs: 15 * 60 * 1000, // 15 minutes
};

class LoginRateLimiter {
  private attempts: Map<string, LoginAttempt> = new Map();
  private config: Required<RateLimiterConfig>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimiterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Start periodic cleanup of old entries
   */
  private startCleanup(): void {
    // Clean up every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
    this.cleanupInterval.unref?.();
  }

  /**
   * Stop the rate limiter
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.attempts.clear();
  }

  /**
   * Clean up old attempt records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [ip, attempt] of this.attempts) {
      // Remove entries that are past both the window and block period
      const expiry = Math.max(
        attempt.lastAttempt + this.config.attemptWindowMs,
        attempt.blockedUntil || 0
      );
      if (now > expiry) {
        this.attempts.delete(ip);
      }
    }
  }

  /**
   * Get client IP from request
   */
  getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim() || 'unknown';
    }
    return (
      req.headers['x-real-ip'] as string ||
      req.connection?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  /**
   * Check if a login attempt is allowed
   */
  check(ip: string): RateLimitCheck {
    const now = Date.now();
    const attempt = this.attempts.get(ip);

    if (!attempt) {
      return { 
        allowed: true,
        remainingAttempts: this.config.maxAttempts
      };
    }

    // Check if blocked
    if (attempt.blockedUntil && now < attempt.blockedUntil) {
      const remainingSeconds = Math.ceil((attempt.blockedUntil - now) / 1000);
      return {
        allowed: false,
        message: `Too many login attempts. Please try again in ${remainingSeconds} seconds.`,
        remainingSeconds,
      };
    }

    // Clear old attempt if outside window
    if (now - attempt.lastAttempt > this.config.attemptWindowMs) {
      this.attempts.delete(ip);
      return { 
        allowed: true,
        remainingAttempts: this.config.maxAttempts
      };
    }

    return { 
      allowed: true,
      remainingAttempts: Math.max(0, this.config.maxAttempts - attempt.count)
    };
  }

  /**
   * Record a login attempt
   * @param ip - Client IP address
   * @param success - Whether the login was successful
   */
  record(ip: string, success: boolean): void {
    const now = Date.now();

    if (success) {
      // Successful login clears the record
      this.attempts.delete(ip);
      return;
    }

    // Failed login
    const attempt = this.attempts.get(ip) || {
      count: 0,
      lastAttempt: now,
      blockedUntil: null,
    };

    attempt.count++;
    attempt.lastAttempt = now;

    // Block if max attempts exceeded
    if (attempt.count >= this.config.maxAttempts) {
      attempt.blockedUntil = now + this.config.blockDurationMs;
      console.log(`[LoginRateLimiter] IP ${ip} blocked for ${this.config.blockDurationMs / 1000}s`);
    }

    this.attempts.set(ip, attempt);
  }

  /**
   * Get current stats
   */
  getStats(): {
    trackedIPs: number;
    blockedIPs: number;
    config: Required<RateLimiterConfig>;
  } {
    const now = Date.now();
    let blockedCount = 0;
    
    for (const attempt of this.attempts.values()) {
      if (attempt.blockedUntil && now < attempt.blockedUntil) {
        blockedCount++;
      }
    }

    return {
      trackedIPs: this.attempts.size,
      blockedIPs: blockedCount,
      config: { ...this.config },
    };
  }

  /**
   * Manually unblock an IP
   */
  unblock(ip: string): boolean {
    const attempt = this.attempts.get(ip);
    if (attempt && attempt.blockedUntil) {
      this.attempts.delete(ip);
      console.log(`[LoginRateLimiter] IP ${ip} unblocked manually`);
      return true;
    }
    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(config: RateLimiterConfig): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
let rateLimiterInstance: LoginRateLimiter | null = null;

export function getLoginRateLimiter(config?: RateLimiterConfig): LoginRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new LoginRateLimiter(config);
  }
  return rateLimiterInstance;
}

export { LoginRateLimiter };
export type { RateLimitCheck, RateLimiterConfig };
