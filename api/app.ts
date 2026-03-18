import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { metricsMiddleware } from './middleware/metrics.js';
import { wafMiddleware } from './middleware/waf.js';
import { sessionSecurityMiddleware } from './middleware/sessionSecurity.js';
import { enhancedWAFMiddleware } from './middleware/enhancedWAF.js';
import authRoutes from './routes/auth.js';
import websiteRoutes from './routes/websites.js';
import monitoringRoutes from './routes/monitoring.js';
import alertRoutes from './routes/alerts.js';
import securityRoutes from './routes/security.js';
import infrastructureRoutes from './routes/infrastructure.js';
import emergencyRoutes from './routes/emergency.js';
import apiSecurityRoutes from './routes/apiSecurity.js';
import aiSecurityRoutes from './routes/aiSecurity.js';
import githubRoutes from './routes/github.js';

// Load environment variables
dotenv.config();

const app = express();

// Production Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.github.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Standard Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-fortress-token']
}));
app.use(express.json({ limit: '1mb' })); // Prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(metricsMiddleware);
app.use(enhancedWAFMiddleware); // Enhanced WAF Protection with Fortress Mode
app.use(sessionSecurityMiddleware); // Session Security Middleware

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/infrastructure', infrastructureRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/api-security', apiSecurityRoutes);
app.use('/api/ai-security', aiSecurityRoutes);
app.use('/api/github', githubRoutes);

import { supabase } from './utils/supabase.js';

// Enhanced Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok',
    checks: {
      api: { status: 'up' },
      database: { status: 'unknown', latency_ms: 0 },
      security: { status: 'unknown' }
    }
  };

  const dbStart = Date.now();
  try {
    // Check Supabase connection
    const { error } = await supabase.from('websites').select('id').limit(1);
    
    health.checks.database.latency_ms = Date.now() - dbStart;
    
    if (error) {
      throw error;
    }
    
    health.checks.database.status = 'up';
    health.checks.security.status = 'active';
  } catch (error: any) {
    health.status = 'degraded';
    health.checks.database.status = 'down';
    health.checks.security.status = 'error';
    console.error('Health check failed:', error.message);
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;