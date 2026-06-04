/**
 * Redis-backed rate limiter
 * Uses INCR + EXPIRE pattern — state is shared across all instances
 */

import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 100;

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const windowSec = Math.ceil(windowMs / 1000);
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const keyGenerator =
    options.keyGenerator ??
    ((req: Request) => req.ip || req.socket.remoteAddress || 'unknown');

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Fall back gracefully if Redis is not connected
    if (!redisClient.isOpen) {
      next();
      return;
    }

    const key = `rate:${keyGenerator(req)}`;

    try {
      const count = await redisClient.incr(key);

      // Set expiry only on the first request in the window
      if (count === 1) {
        await redisClient.expire(key, windowSec);
      }

      const ttl = await redisClient.ttl(key);
      const resetAt = Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : windowSec);
      const remaining = Math.max(0, maxRequests - count);

      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(resetAt));

      if (count > maxRequests) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        });
        return;
      }
    } catch {
      // Redis error — fail open (don't block requests)
      next();
      return;
    }

    next();
  };
}

export const defaultRateLimiter = createRateLimiter();
