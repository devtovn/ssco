/**
 * Request metrics middleware and snapshot
 */

import { Request, Response, NextFunction } from 'express';

export interface MetricsSnapshot {
  totalRequests: number;
  totalErrors: number;
  averageResponseTimeMs: number;
  requestsByMethod: Record<string, number>;
  requestsByStatus: Record<string, number>;
  uptimeSeconds: number;
}

const startedAt = Date.now();
let totalRequests = 0;
let totalErrors = 0;
let totalResponseTimeMs = 0;
const requestsByMethod: Record<string, number> = {};
const requestsByStatus: Record<string, number> = {};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    totalRequests += 1;
    totalResponseTimeMs += durationMs;

    const method = req.method;
    requestsByMethod[method] = (requestsByMethod[method] || 0) + 1;

    const statusKey = String(res.statusCode);
    requestsByStatus[statusKey] = (requestsByStatus[statusKey] || 0) + 1;

    if (res.statusCode >= 500) {
      totalErrors += 1;
    }
  });

  next();
}

export function getMetricsSnapshot(): MetricsSnapshot {
  return {
    totalRequests,
    totalErrors,
    averageResponseTimeMs:
      totalRequests > 0 ? Math.round(totalResponseTimeMs / totalRequests) : 0,
    requestsByMethod: { ...requestsByMethod },
    requestsByStatus: { ...requestsByStatus },
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  };
}

export function metricsHandler(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    data: getMetricsSnapshot(),
  });
}
