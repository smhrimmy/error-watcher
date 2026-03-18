import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase.js';
import { sessionProtection } from '../services/sessionProtection.js';

export const sessionSecurityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(); // Let auth middleware handle this
    }

    // Get user from token (simplified - in real app would verify JWT)
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return next();
    }

    // Validate session security
    const validation = await sessionProtection.validateSession(req, user.id);
    
    if (!validation.valid) {
      // Log security event
      await supabase.from('security_events').insert({
        user_id: user.id,
        event_type: 'session_validation_failed',
        severity: validation.riskLevel,
        description: validation.reason || 'Session validation failed',
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      });

      // Take action based on risk level
      switch (validation.riskLevel) {
        case 'critical':
          // Block the request entirely
          return res.status(403).json({
            error: 'Session blocked due to security risk',
            reason: validation.reason,
            incident_id: Date.now()
          });
        
        case 'high':
          // Require re-authentication
          return res.status(401).json({
            error: 'Re-authentication required',
            reason: validation.reason,
            reauth_required: true
          });
        
        case 'medium':
          // Add security warning header
          res.setHeader('X-Security-Warning', 'Suspicious session activity detected');
          break;
      }
    }

    // Add security metadata to request
    (req as any).security = {
      riskLevel: validation.riskLevel,
      sessionValid: validation.valid,
      deviceFingerprint: await sessionProtection.generateDeviceFingerprint(req)
    };

    next();
  } catch (error) {
    console.error('Session security middleware error:', error);
    next(); // Continue on error, don't block legitimate users
  }
};

export const sessionSecurityRoutes = {
  // Get session security status
  async getStatus(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const status = await sessionProtection.getSessionSecurityStatus(user.id);
      res.json(status);
    } catch (error) {
      console.error('Error getting session security status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get active sessions
  async getSessions(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { data: sessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (sessionsError) {
        throw sessionsError;
      }

      res.json({ sessions: sessions || [] });
    } catch (error) {
      console.error('Error getting sessions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Revoke session
  async revokeSession(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      const { sessionId } = req.params;
      
      if (!token || !sessionId) {
        return res.status(400).json({ error: 'Token and sessionId required' });
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Update session status
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({ status: 'revoked' })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Log security event
      await supabase.from('security_events').insert({
        user_id: user.id,
        event_type: 'session_revoked',
        severity: 'medium',
        description: 'Session manually revoked by user',
        metadata: { sessionId }
      });

      res.json({ message: 'Session revoked successfully' });
    } catch (error) {
      console.error('Error revoking session:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};