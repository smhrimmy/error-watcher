/**
 * Security API routes for handling security events, threat monitoring, and session management
 */
import { Router, type Request, type Response } from 'express';
import { supabase } from '../utils/supabase.js';
import { sessionProtection } from '../services/sessionProtection.js';
import crypto from 'crypto';

const router = Router();

/**
 * Process Frontend Security Events
 * POST /api/security/events
 */
router.post('/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventType, severity, description, metadata, userId } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Validate required fields
    if (!eventType || !severity) {
      res.status(400).json({ error: 'eventType and severity are required' });
      return;
    }

    // Create security event
    const eventData = {
      user_id: userId || 'anonymous',
      event_type: eventType,
      severity,
      description: description || `Security event: ${eventType}`,
      metadata: {
        ...metadata,
        ip: clientIP,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }
    };

    const { error } = await supabase.from('security_events').insert(eventData);
    
    if (error) {
      console.error('Error saving security event:', error);
      res.status(500).json({ error: 'Failed to save security event' });
      return;
    }

    // Handle automatic responses based on event type and severity
    await handleSecurityEvent(eventData);

    res.json({ 
      success: true, 
      message: 'Security event processed successfully' 
    });
  } catch (error: any) {
    console.error('Security event processing error:', error);
    res.status(500).json({ error: error.message || 'Security event processing failed' });
  }
});

/**
 * Get Security Events
 * GET /api/security/events
 */
router.get('/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 50, severity, userId, startDate, endDate } = req.query;
    
    let query = supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching security events:', error);
      res.status(500).json({ error: 'Failed to fetch security events' });
      return;
    }

    res.json({ 
      success: true, 
      events: data || [],
      count: data?.length || 0
    });
  } catch (error: any) {
    console.error('Security events fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch security events' });
  }
});

/**
 * Block IP Address
 * POST /api/security/block-ip
 */
router.post('/block-ip', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ipAddress, reason, duration = 3600000 } = req.body; // Default 1 hour
    const adminId = req.headers['x-admin-id'] as string;
    
    if (!ipAddress) {
      res.status(400).json({ error: 'IP address is required' });
      return;
    }

    const blockedUntil = new Date(Date.now() + duration);
    
    const { error } = await supabase.from('blocked_ips').insert({
      ip_address: ipAddress,
      reason: reason || 'Security violation',
      blocked_until: blockedUntil.toISOString(),
      is_active: true,
      blocked_by: adminId || 'system'
    });

    if (error) {
      console.error('Error blocking IP:', error);
      res.status(500).json({ error: 'Failed to block IP address' });
      return;
    }

    // Log IP blocking event
    await supabase.from('security_events').insert({
      user_id: 'system',
      event_type: 'ip_blocked',
      severity: 'medium',
      description: `IP address ${ipAddress} blocked`,
      metadata: {
        ipAddress,
        reason,
        duration,
        blockedBy: adminId || 'system'
      }
    });

    res.json({ 
      success: true, 
      message: `IP address ${ipAddress} blocked until ${blockedUntil.toISOString()}` 
    });
  } catch (error: any) {
    console.error('IP blocking error:', error);
    res.status(500).json({ error: error.message || 'IP blocking failed' });
  }
});

/**
 * Unblock IP Address
 * POST /api/security/unblock-ip
 */
router.post('/unblock-ip', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ipAddress } = req.body;
    const adminId = req.headers['x-admin-id'] as string;
    
    if (!ipAddress) {
      res.status(400).json({ error: 'IP address is required' });
      return;
    }

    const { error } = await supabase
      .from('blocked_ips')
      .update({ 
        is_active: false,
        unblocked_at: new Date().toISOString(),
        unblocked_by: adminId || 'system'
      })
      .eq('ip_address', ipAddress)
      .eq('is_active', true);

    if (error) {
      console.error('Error unblocking IP:', error);
      res.status(500).json({ error: 'Failed to unblock IP address' });
      return;
    }

    // Log IP unblocking event
    await supabase.from('security_events').insert({
      user_id: 'system',
      event_type: 'ip_unblocked',
      severity: 'low',
      description: `IP address ${ipAddress} unblocked`,
      metadata: {
        ipAddress,
        unblockedBy: adminId || 'system'
      }
    });

    res.json({ 
      success: true, 
      message: `IP address ${ipAddress} unblocked successfully` 
    });
  } catch (error: any) {
    console.error('IP unblocking error:', error);
    res.status(500).json({ error: error.message || 'IP unblocking failed' });
  }
});

/**
 * Get Blocked IPs
 * GET /api/security/blocked-ips
 */
router.get('/blocked-ips', async (req: Request, res: Response): Promise<void> => {
  try {
    const { active = true } = req.query;
    
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('*')
      .eq('is_active', active === 'true')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blocked IPs:', error);
      res.status(500).json({ error: 'Failed to fetch blocked IPs' });
      return;
    }

    res.json({ 
      success: true, 
      blockedIPs: data || [],
      count: data?.length || 0
    });
  } catch (error: any) {
    console.error('Blocked IPs fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch blocked IPs' });
  }
});

/**
 * Get Security Statistics
 * GET /api/security/stats
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeRange = '24h' } = req.query;
    
    let startDate: Date;
    switch (timeRange) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Get security events statistics
    const { data: eventsData, error: eventsError } = await supabase
      .from('security_events')
      .select('severity, event_type, created_at')
      .gte('created_at', startDate.toISOString());

    if (eventsError) {
      console.error('Error fetching security events:', eventsError);
      res.status(500).json({ error: 'Failed to fetch security statistics' });
      return;
    }

    // Get blocked IPs statistics
    const { data: blockedIPsData, error: blockedIPsError } = await supabase
      .from('blocked_ips')
      .select('created_at, is_active')
      .gte('created_at', startDate.toISOString());

    if (blockedIPsError) {
      console.error('Error fetching blocked IPs:', blockedIPsError);
      res.status(500).json({ error: 'Failed to fetch blocked IPs statistics' });
      return;
    }

    // Calculate statistics
    const events = eventsData || [];
    const blockedIPs = blockedIPsData || [];

    const stats = {
      totalEvents: events.length,
      eventsBySeverity: {
        low: events.filter(e => e.severity === 'low').length,
        medium: events.filter(e => e.severity === 'medium').length,
        high: events.filter(e => e.severity === 'high').length,
        critical: events.filter(e => e.severity === 'critical').length
      },
      eventsByType: events.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      blockedIPs: {
        total: blockedIPs.length,
        active: blockedIPs.filter(ip => ip.is_active).length,
        expired: blockedIPs.filter(ip => !ip.is_active).length
      },
      timeRange: timeRange,
      generatedAt: new Date().toISOString()
    };

    res.json({ 
      success: true, 
      stats 
    });
  } catch (error: any) {
    console.error('Security stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch security statistics' });
  }
});

/**
 * Handle Session Termination
 * POST /api/security/session-end
 */
router.post('/session-end', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, reason = 'user_logout' } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Log session termination
    await supabase.from('security_events').insert({
      user_id: userId,
      event_type: 'session_terminated',
      severity: 'low',
      description: 'Session terminated',
      metadata: {
        reason,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        token: token ? 'present' : 'absent'
      }
    });

    // Deactivate all active sessions for the user
    if (token) {
      await supabase
        .from('user_sessions')
        .update({ 
          is_active: false,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', token);
    }

    res.json({ 
      success: true, 
      message: 'Session termination logged successfully' 
    });
  } catch (error: any) {
    console.error('Session end error:', error);
    res.status(500).json({ error: error.message || 'Session termination failed' });
  }
});

/**
 * Handle Security Event - Helper Function
 */
async function handleSecurityEvent(eventData: any): Promise<void> {
  try {
    const { event_type, severity, user_id, metadata } = eventData;
    
    // Auto-block IPs for critical events
    if (severity === 'critical' && metadata?.ip) {
      const recentCriticalEvents = await supabase
        .from('security_events')
        .select('*')
        .eq('ip_address', metadata.ip)
        .eq('severity', 'critical')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('created_at', { ascending: false });

      if (recentCriticalEvents.data && recentCriticalEvents.data.length >= 3) {
        // Auto-block IP after 3 critical events in 1 hour
        await supabase.from('blocked_ips').insert({
          ip_address: metadata.ip,
          reason: 'Auto-blocked due to multiple critical security events',
          blocked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          is_active: true,
          blocked_by: 'system'
        });

        // Log auto-blocking event
        await supabase.from('security_events').insert({
          user_id: 'system',
          event_type: 'ip_auto_blocked',
          severity: 'medium',
          description: `IP ${metadata.ip} auto-blocked due to critical events`,
          metadata: {
            ip: metadata.ip,
            eventCount: recentCriticalEvents.data.length,
            reason: 'Multiple critical security events'
          }
        });
      }
    }

    // Handle suspicious activity patterns
    if (event_type === 'suspicious_activity' && severity === 'high') {
      // Check for patterns in user behavior
      const userEvents = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', user_id)
        .eq('event_type', 'suspicious_activity')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .order('created_at', { ascending: false });

      if (userEvents.data && userEvents.data.length >= 5) {
        // User showing pattern of suspicious activity
        await supabase.from('security_events').insert({
          user_id: user_id,
          event_type: 'user_flagged_suspicious',
          severity: 'high',
          description: 'User flagged due to pattern of suspicious activity',
          metadata: {
            eventCount: userEvents.data.length,
            timeWindow: '30 minutes',
            pattern: 'repeated_suspicious_activity'
          }
        });
      }
    }
  } catch (error) {
    console.error('Error handling security event:', error);
  }
}

export default router;