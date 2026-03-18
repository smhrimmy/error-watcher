import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { supabase } from '../utils/supabase.js';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '1h';

// Rate limiting configuration
const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Apply rate limiting to all routes
const generalRateLimit = createRateLimit(15 * 60 * 1000, 100, 'Too many requests from this IP, please try again later.');
const authRateLimit = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts, please try again later.');
const apiRateLimit = createRateLimit(60 * 1000, 50, 'API rate limit exceeded, please try again later.');

router.use(generalRateLimit);

// Request signature verification middleware
function verifyRequestSignature(req: express.Request, res: express.Response, next: express.NextFunction) {
  const signature = req.headers['x-request-signature'] as string;
  const timestamp = req.headers['x-request-timestamp'] as string;
  const nonce = req.headers['x-request-nonce'] as string;
  
  if (!signature || !timestamp || !nonce) {
    return res.status(401).json({ error: 'Missing required security headers' });
  }
  
  // Check timestamp to prevent replay attacks (5 minute window)
  const currentTime = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp);
  if (Math.abs(currentTime - requestTime) > 300) {
    return res.status(401).json({ error: 'Request timestamp too old' });
  }
  
  // Check nonce to prevent replay attacks
  // In a real implementation, you'd store used nonces in Redis or similar
  if (req.app.locals.usedNonces && req.app.locals.usedNonces.has(nonce)) {
    return res.status(401).json({ error: 'Nonce already used' });
  }
  
  // Verify signature
  const message = `${req.method}:${req.path}:${timestamp}:${nonce}:${JSON.stringify(req.body)}`;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(message)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid request signature' });
  }
  
  // Store nonce as used
  if (!req.app.locals.usedNonces) {
    req.app.locals.usedNonces = new Set();
  }
  req.app.locals.usedNonces.add(nonce);
  
  // Clean up old nonces (keep last 1000)
  if (req.app.locals.usedNonces.size > 1000) {
    const noncesToDelete = Array.from(req.app.locals.usedNonces).slice(0, 100);
    noncesToDelete.forEach((n: string) => req.app.locals.usedNonces.delete(n));
  }
  
  next();
}

// CSRF protection middleware
function csrfProtection(req: express.Request, res: express.Response, next: express.NextFunction) {
  const csrfToken = req.headers['x-csrf-token'] as string;
  const sessionToken = req.headers['authorization'] ? 
    jwt.decode(req.headers['authorization'].replace('Bearer ', '')) as any : null;
  
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (!csrfToken || !sessionToken || csrfToken !== sessionToken.csrfToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }
  
  next();
}

// Generate CSRF token
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Enhanced login with security features
router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password, fingerprint } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Log login attempt
    await supabase.from('audit_logs').insert({
      action: 'login_attempt',
      actor_user_id: null,
      target_user_id: null,
      metadata: {
        email: email,
        ip: ip,
        fingerprint: fingerprint,
        user_agent: req.headers['user-agent']
      }
    });
    
    // Check for suspicious patterns
    const { data: recentAttempts } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'login_attempt')
      .eq('metadata->>ip', ip)
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // Last 15 minutes
    
    if (recentAttempts && recentAttempts.length >= 5) {
      // Auto-block IP after 5 failed attempts in 15 minutes
      await supabase.from('blocked_ips').insert({
        ip_address: ip,
        reason: 'Multiple failed login attempts',
        risk_score: 8
      });
      
      return res.status(429).json({
        error: 'Too many login attempts. IP temporarily blocked.'
      });
    }
    
    // Authenticate user (simplified - in real app, verify password)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate tokens
    const csrfToken = generateCSRFToken();
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        csrfToken: csrfToken,
        fingerprint: fingerprint
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Log successful login
    await supabase.from('audit_logs').insert({
      action: 'login_success',
      actor_user_id: user.id,
      target_user_id: user.id,
      metadata: {
        ip: ip,
        fingerprint: fingerprint,
        user_agent: req.headers['user-agent']
      }
    });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      csrfToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Protected route example with all security features
router.get('/protected', apiRateLimit, csrfProtection, verifyRequestSignature, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if fingerprint matches (prevents token theft)
    const clientFingerprint = req.headers['x-fingerprint'] as string;
    if (clientFingerprint !== decoded.fingerprint) {
      return res.status(401).json({ error: 'Token fingerprint mismatch' });
    }
    
    res.json({
      message: 'Access granted to protected resource',
      user: {
        id: decoded.userId,
        email: decoded.email
      }
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Protected route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Security headers middleware
router.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  next();
});

export default router;