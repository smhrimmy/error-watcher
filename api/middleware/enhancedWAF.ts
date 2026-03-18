import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase.js';
import crypto from 'crypto';

// Enhanced WAF Rules with Anti-Bot Protection
const WAF_RULES = {
  sql_injection: [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|declare|cast|convert)\b.*\b(from|where|and|or|order by|group by)\b)/i,
    /(\b(or|and)\b.*=.*\b(or|and)\b)/i,
    /('.*or.*'.*=.*')/i,
    /(".*or.*".*=.*")/i,
    /(\bwaitfor\s+delay\b)/i,
    /(\bshutdown\b)/i
  ],
  xss: [
    /(<script[^>]*>.*?\u003c\/script>)/i,
    /(javascript:)/i,
    /(on\w+\s*=)/i,
    /(<iframe[^>]*>)/i,
    /(<object[^>]*>)/i,
    /(<embed[^>]*>)/i,
    /(eval\s*\()/i,
    /(expression\s*\()/i
  ],
  command_injection: [
    /([;&|`])/,
    /(\$\()/,
    /(\${)/,
    /(>\s*\/dev\/null)/i,
    /(curl\s+.*http)/i,
    /(wget\s+.*http)/i
  ],
  directory_traversal: [
    /(\.\.\/)/,
    /(%2e%2e%2f)/i,
    /(\.\.\\)/,
    /(%2e%2e%5c)/i
  ],
  file_inclusion: [
    /(file:\/\/)/i,
    /(php:\/\/filter)/i,
    /(data:\/\/text)/i,
    /(expect:\/\/)/i
  ],
  bot_detection: [
    /(bot|crawler|spider|scraper)/i,
    /(curl|wget|libwww)/i,
    /(python|java|ruby|go|rust)/i,
    /(headless)/i,
    /(phantomjs|selenium|puppeteer)/i,
    /(facebookexternalhit|twitterbot|linkedinbot)/i
  ],
  rate_limit_bypass: [
    /(X-Forwarded-For.*,.*,)/i,
    /(X-Real-IP.*,.*,)/i,
    /(CF-Connecting-IP.*,.*,)/i,
    /(X-Original-URL)/i,
    /(X-Rewrite-URL)/i
  ]
};

// Bot detection heuristics
interface BotSignals {
  userAgent: number;
  headers: number;
  timing: number;
  behavior: number;
  total: number;
}

export class AdvancedWAF {
  private requestCounts = new Map<string, { count: number; resetAt: number }>();
  private botSignals = new Map<string, BotSignals>();
  private readonly RATE_LIMIT = {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    burstLimit: 20
  };

  async analyzeRequest(req: Request): Promise<{
    blocked: boolean;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    botScore: number;
    rules: string[];
  }> {
    const clientId = this.getClientIdentifier(req);
    const results: {
      blocked: boolean;
      reason: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      botScore: number;
      rules: string[];
    } = {
      blocked: false,
      reason: '',
      severity: 'low',
      botScore: 0,
      rules: []
    };

    // Check rate limiting
    const rateLimitResult = this.checkRateLimit(clientId);
    if (rateLimitResult.blocked) {
      results.blocked = true;
      results.reason = rateLimitResult.reason;
      results.severity = 'medium';
      results.rules.push('rate_limit_exceeded');
      return results;
    }

    // Analyze payload for attacks
    const payload = this.extractPayload(req);
    const attackAnalysis = this.analyzeAttacks(payload);
    
    if (attackAnalysis.detected) {
      results.blocked = true;
      results.reason = attackAnalysis.reason;
      results.severity = attackAnalysis.severity;
      results.rules.push(...attackAnalysis.rules);
      return results;
    }

    // Bot detection
    const botAnalysis = this.analyzeBotBehavior(req);
    results.botScore = botAnalysis.score;
    
    if (botAnalysis.isBot) {
      results.blocked = true;
      results.reason = botAnalysis.reason;
      results.severity = 'high';
      results.rules.push(...botAnalysis.rules);
      return results;
    }

    return results;
  }

  private getClientIdentifier(req: Request): string {
    // Create a fingerprint from multiple headers
    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const accept = req.headers['accept'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    const fingerprint = `${ip}:${userAgent}:${accept}:${acceptLanguage}:${acceptEncoding}`;
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  private extractPayload(req: Request): string {
    return [
      JSON.stringify(req.body),
      JSON.stringify(req.query),
      JSON.stringify(req.params),
      req.headers['user-agent'] || '',
      req.headers['referer'] || '',
      req.headers['origin'] || ''
    ].join(' ');
  }

  private checkRateLimit(clientId: string): { blocked: boolean; reason: string } {
    const now = Date.now();
    const tracker = this.requestCounts.get(clientId) || { count: 0, resetAt: now + this.RATE_LIMIT.windowMs };

    if (now > tracker.resetAt) {
      tracker.count = 1;
      tracker.resetAt = now + this.RATE_LIMIT.windowMs;
    } else {
      tracker.count++;
    }

    this.requestCounts.set(clientId, tracker);

    if (tracker.count > this.RATE_LIMIT.maxRequests) {
      return { blocked: true, reason: `Rate limit exceeded: ${tracker.count} requests in 1 minute` };
    }

    // Check for burst attacks
    if (tracker.count > this.RATE_LIMIT.burstLimit && tracker.count < this.RATE_LIMIT.maxRequests * 0.3) {
      return { blocked: true, reason: 'Suspicious request burst detected' };
    }

    return { blocked: false, reason: '' };
  }

  private analyzeAttacks(payload: string): {
    detected: boolean;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    rules: string[];
  } {
    const detectedRules: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check each attack category
    for (const [category, patterns] of Object.entries(WAF_RULES)) {
      for (const pattern of patterns) {
        if (pattern.test(payload)) {
          detectedRules.push(`${category}_${patterns.indexOf(pattern)}`);
          
          // Update severity based on attack type
          if (category === 'sql_injection' || category === 'command_injection') {
            severity = 'critical';
          } else if (category === 'xss' && severity !== 'critical') {
            severity = 'high';
          } else if (severity === 'low') {
            severity = 'medium';
          }
        }
      }
    }

    if (detectedRules.length > 0) {
      return {
        detected: true,
        reason: `Malicious patterns detected: ${detectedRules.join(', ')}`,
        severity,
        rules: detectedRules
      };
    }

    return { detected: false, reason: '', severity: 'low', rules: [] };
  }

  private analyzeBotBehavior(req: Request): {
    isBot: boolean;
    score: number;
    reason: string;
    rules: string[];
  } {
    const signals: BotSignals = {
      userAgent: 0,
      headers: 0,
      timing: 0,
      behavior: 0,
      total: 0
    };

    const rules: string[] = [];

    // User Agent Analysis
    const userAgent = req.headers['user-agent'] as string;
    if (userAgent) {
      if (WAF_RULES.bot_detection.some(pattern => pattern.test(userAgent))) {
        signals.userAgent = 40;
        rules.push('bot_user_agent');
      }
      
      // Check for missing browser headers
      if (!req.headers['accept-language']) {
        signals.headers += 15;
        rules.push('missing_accept_language');
      }
      
      if (!req.headers['accept-encoding']) {
        signals.headers += 15;
        rules.push('missing_accept_encoding');
      }
    }

    // Header Analysis
    const suspiciousHeaders = [
      'X-Forwarded-For',
      'X-Real-IP',
      'CF-Connecting-IP'
    ];

    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor && typeof forwardedFor === 'string' && forwardedFor.split(',').length > 3) {
      signals.headers += 20;
      rules.push('multiple_proxies');
    }

    // Rate Analysis (would need timing data from middleware)
    const clientId = this.getClientIdentifier(req);
    const existingSignals = this.botSignals.get(clientId);
    if (existingSignals) {
      signals.behavior = existingSignals.behavior;
    }

    // Calculate total score
    signals.total = signals.userAgent + signals.headers + signals.timing + signals.behavior;

    return {
      isBot: signals.total >= 50,
      score: signals.total,
      reason: signals.total >= 50 ? 'Multiple bot indicators detected' : 'Normal traffic pattern',
      rules
    };
  }
}

export const advancedWAF = new AdvancedWAF();

// Enhanced WAF Middleware
export const enhancedWAFMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const analysis = await advancedWAF.analyzeRequest(req);
  
  if (analysis.blocked) {
    console.warn(`[Enhanced WAF] Blocked ${analysis.reason} from ${req.ip}`);
    
    // Log to threat events
    await supabase.from('threat_events').insert({
      source_ip: req.ip,
      event_type: 'waf_block',
      severity: analysis.severity,
      description: analysis.reason,
      request_path: req.path,
      user_agent: req.headers['user-agent'],
      action_taken: 'blocked',
      metadata: { 
        rules: analysis.rules,
        bot_score: analysis.botScore,
        headers: req.headers 
      }
    });

    return res.status(403).json({
      error: 'Request Blocked by Security System',
      incident_id: Date.now(),
      message: analysis.reason,
      severity: analysis.severity
    });
  }

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};