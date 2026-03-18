import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase.js';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Override end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - start;
    const path = req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Record metric asynchronously (fire and forget)
    // Only record for API routes to avoid noise
    if (path.startsWith('/api')) {
      recordMetric('api_latency', duration, {
        path,
        method,
        status: statusCode
      }).catch(console.error);
    }

    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

async function recordMetric(name: string, value: number, tags: Record<string, any> = {}) {
  try {
    const { error } = await supabase
      .from('platform_health_metrics')
      .insert({
        metric_name: name,
        value,
        tags
      });

    if (error) {
      console.error('Failed to record metric:', error);
    }
  } catch (err) {
    console.error('Error recording metric:', err);
  }
}
