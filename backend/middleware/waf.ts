import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase.js';

// Basic WAF Rules for Prototype
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/i,
  /('.+--)|(--)|(\/\*)/i,
];

const XSS_PATTERNS = [
  /<script>/i,
  /javascript:/i,
  /onerror=/i,
  /onload=/i,
];

// Memory store for basic rate limiting / auto-containment
const ipThreatCount = new Map<string, { count: number, resetAt: number }>();
const AUTO_BLOCK_THRESHOLD = 3;
const TIME_WINDOW_MS = 60000; // 1 minute

export const wafMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const payload = JSON.stringify(req.body) + JSON.stringify(req.query) + JSON.stringify(req.params);
  let blocked = false;
  let threatType = '';
  let ruleTriggered = '';

  // Check SQL Injection
  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(payload)) {
      blocked = true;
      threatType = 'sqli';
      ruleTriggered = pattern.source;
      break;
    }
  }

  // Check XSS
  if (!blocked) {
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(payload)) {
        blocked = true;
        threatType = 'xss';
        ruleTriggered = pattern.source;
        break;
      }
    }
  }

  if (blocked) {
    const ip = req.ip || 'unknown';
    console.warn(`[WAF] Blocked ${threatType} attempt from ${ip}`);
    
    // Autonomous Containment Logic
    const now = Date.now();
    let tracker = ipThreatCount.get(ip) || { count: 0, resetAt: now + TIME_WINDOW_MS };
    
    if (now > tracker.resetAt) {
      tracker = { count: 1, resetAt: now + TIME_WINDOW_MS };
    } else {
      tracker.count += 1;
    }
    ipThreatCount.set(ip, tracker);

    let actionTaken = 'blocked';

    if (tracker.count >= AUTO_BLOCK_THRESHOLD) {
       actionTaken = 'auto_contained';
       console.error(`[CONTAINMENT] IP ${ip} exceeded threat threshold. Auto-blocking.`);
       
       // Fire and forget insert to blocked_ips
       supabase.from('blocked_ips').insert({
         ip_address: ip,
         reason: `Autonomous Containment: Triggered WAF ${tracker.count} times in 60s`,
         actor_user_id: null // System action
       }).then(({error}) => {
           if (error && !error.message.includes('duplicate')) {
               console.error('Failed to auto-block IP:', error);
           }
       });
    }

    // Log Threat asynchronously
    supabase.from('threat_events').insert({
      source_ip: ip,
      event_type: threatType,
      severity: actionTaken === 'auto_contained' ? 'critical' : 'high',
      description: `WAF Blocked request matching rule: ${ruleTriggered}`,
      request_path: req.path,
      user_agent: req.headers['user-agent'],
      action_taken: actionTaken,
      metadata: { body: req.body, query: req.query }
    }).then(({ error }) => {
        if (error) console.error('Failed to log threat:', error);
    });

    return res.status(403).json({
      error: 'Request Blocked by WAF',
      incident_id: Date.now(),
      message: actionTaken === 'auto_contained' ? 'IP permanently blocked due to repeated violations.' : 'Malicious pattern detected.'
    });
  }

  next();
};
