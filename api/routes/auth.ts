/**
 * Authentication API routes with integrated session protection
 * Handle user registration, login, token management, and session security
 */
import { Router, type Request, type Response } from 'express';
import { supabase } from '../utils/supabase.js';
import { sessionProtection } from '../services/sessionProtection.js';
import crypto from 'crypto';

const router = Router();

/**
 * User Registration with Session Protection
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, userData = {} } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Generate device fingerprint for new user
    const deviceFingerprint = await sessionProtection.generateDeviceFingerprint(req);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...userData,
          deviceFingerprint: JSON.stringify(deviceFingerprint),
          registrationTime: new Date().toISOString(),
          registrationIP: req.ip
        }
      }
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    if (data.user) {
      // Create initial session record with device fingerprint
      const fingerprintHash = crypto.createHash('sha256').update(JSON.stringify(deviceFingerprint)).digest('hex');
      
      await supabase.from('user_sessions').insert({
        user_id: data.user.id,
        session_id: data.session?.access_token || crypto.randomUUID(),
        device_fingerprint: fingerprintHash,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || 'unknown',
        login_time: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true,
        risk_level: 'low'
      });

      // Log security event for new user registration
      await supabase.from('security_events').insert({
        user_id: data.user.id,
        event_type: 'new_user_registration',
        severity: 'low',
        description: 'New user registered with device fingerprint',
        metadata: {
          email,
          deviceFingerprint: deviceFingerprint.platform,
          ip: req.ip
        }
      });
    }

    res.json({ 
      success: true, 
      user: data.user, 
      session: data.session,
      message: 'Registration successful. Please check your email for verification.'
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

/**
 * User Login with Session Security Validation
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, deviceFingerprint } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // First, attempt to get user by email to check for suspicious activity
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, user_data')
      .eq('email', email)
      .single();

    // Check for recent failed login attempts
    const { data: recentEvents } = await supabase
      .from('security_events')
      .select('*')
      .eq('event_type', 'failed_login')
      .eq('metadata->>email', email)
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentEvents && recentEvents.length >= 3) {
      // Too many failed attempts - temporary block
      await supabase.from('security_events').insert({
        user_id: existingUser?.id || 'unknown',
        event_type: 'login_blocked',
        severity: 'medium',
        description: 'Login blocked due to multiple failed attempts',
        metadata: {
          email,
          failedAttempts: recentEvents.length,
          ip: req.ip
        }
      });

      res.status(429).json({ 
        error: 'Too many failed login attempts. Please try again in 15 minutes.' 
      });
      return;
    }

    // Attempt login with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Log failed login attempt
      await supabase.from('security_events').insert({
        user_id: existingUser?.id || 'unknown',
        event_type: 'failed_login',
        severity: 'low',
        description: 'Failed login attempt',
        metadata: {
          email,
          error: error.message,
          ip: req.ip
        }
      });

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (data.user && data.session) {
      // Generate device fingerprint for session
      const generatedFingerprint = await sessionProtection.generateDeviceFingerprint(req);
      
      // Validate session security
      const validation = await sessionProtection.validateSession(req, data.user.id);
      
      if (!validation.valid) {
        // Log security violation
        await supabase.from('security_events').insert({
          user_id: data.user.id,
          event_type: 'suspicious_login',
          severity: validation.riskLevel,
          description: validation.reason || 'Suspicious login detected',
          metadata: {
            email,
            riskLevel: validation.riskLevel,
            reason: validation.reason,
            ip: req.ip,
            userAgent: req.headers['user-agent']
          }
        });

        if (validation.riskLevel === 'critical') {
          // Critical security issue - block login
          await supabase.auth.signOut();
          res.status(403).json({ 
            error: 'Login blocked due to security concerns. Please contact support.' 
          });
          return;
        }
      }

      // Create session record with device fingerprint
      const fingerprintHash = crypto.createHash('sha256').update(JSON.stringify(generatedFingerprint)).digest('hex');
      
      await supabase.from('user_sessions').insert({
        user_id: data.user.id,
        session_id: data.session.access_token,
        device_fingerprint: fingerprintHash,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || 'unknown',
        login_time: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true,
        risk_level: validation.riskLevel
      });

      // Log successful login
      await supabase.from('security_events').insert({
        user_id: data.user.id,
        event_type: 'successful_login',
        severity: 'low',
        description: 'User logged in successfully',
        metadata: {
          email,
          riskLevel: validation.riskLevel,
          deviceFingerprint: generatedFingerprint.platform,
          ip: req.ip
        }
      });

      res.json({ 
        success: true, 
        user: data.user, 
        session: data.session,
        securityValidation: validation,
        message: 'Login successful'
      });
    } else {
      res.status(500).json({ error: 'Login failed' });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

/**
 * Session Security Validation
 * POST /api/auth/validate-session
 */
router.post('/validate-session', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'No authorization token provided' });
      return;
    }

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { deviceFingerprint, userAgent } = req.body;
    
    // Validate session security
    const validation = await sessionProtection.validateSession(req, user.id);
    
    if (!validation.valid) {
      // Log security validation failure
      await supabase.from('security_events').insert({
        user_id: user.id,
        event_type: 'session_validation_failed',
        severity: validation.riskLevel,
        description: validation.reason || 'Session validation failed',
        metadata: {
          riskLevel: validation.riskLevel,
          reason: validation.reason,
          ip: req.ip,
          userAgent: userAgent || req.headers['user-agent']
        }
      });

      if (validation.riskLevel === 'critical') {
        // Terminate session for critical security issues
        await supabase.auth.signOut();
      }
    }

    res.json({
      valid: validation.valid,
      riskLevel: validation.riskLevel,
      reason: validation.reason,
      userId: user.id
    });
  } catch (error: any) {
    console.error('Session validation error:', error);
    res.status(500).json({ error: error.message || 'Session validation failed' });
  }
});

/**
 * Login Security Check (Called after successful login)
 * POST /api/auth/login-security
 */
router.post('/login-security', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { deviceFingerprint, userAgent, loginTime } = req.body;
    
    if (!token) {
      res.status(401).json({ error: 'No authorization token provided' });
      return;
    }

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Additional login security checks
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Check for unusual login patterns
    const { data: recentLogins } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_type', 'successful_login')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false });

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const riskFactors = [];

    if (recentLogins && recentLogins.length > 0) {
      const lastLogin = recentLogins[0];
      
      // Check if IP has changed since last login
      if (lastLogin.metadata?.ip !== clientIP) {
        riskFactors.push('IP address changed since last login');
        riskLevel = 'medium';
      }

      // Check if login is from unusual time/location
      const loginHour = new Date(loginTime).getHours();
      if (loginHour < 6 || loginHour > 23) { // Unusual hours
        riskFactors.push('Login during unusual hours');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      // Check for rapid location changes (impossible travel)
      if (recentLogins.length >= 2) {
        const timeDiff = new Date(loginTime).getTime() - new Date(lastLogin.created_at).getTime();
        if (timeDiff < 60 * 60 * 1000) { // Less than 1 hour
          riskFactors.push('Rapid login attempts');
          riskLevel = 'high';
        }
      }
    }

    // Update session risk level
    await supabase
      .from('user_sessions')
      .update({ 
        risk_level: riskLevel,
        last_activity: new Date().toISOString()
      })
      .eq('session_id', token);

    if (riskFactors.length > 0) {
      // Log suspicious login pattern
      await supabase.from('security_events').insert({
        user_id: user.id,
        event_type: 'suspicious_login_pattern',
        severity: riskLevel,
        description: 'Suspicious login pattern detected',
        metadata: {
          riskFactors,
          riskLevel,
          deviceFingerprint: deviceFingerprint?.platform || 'unknown',
          ip: clientIP,
          userAgent: userAgent || req.headers['user-agent']
        }
      });
    }

    res.json({
      success: true,
      riskLevel,
      riskFactors,
      userId: user.id
    });
  } catch (error: any) {
    console.error('Login security check error:', error);
    res.status(500).json({ error: error.message || 'Login security check failed' });
  }
});

/**
 * User Logout with Session Cleanup
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { userId, reason = 'user_logout' } = req.body;
    
    if (token) {
      // Verify token and get user
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (user) {
        // Log session termination
        await supabase.from('security_events').insert({
          user_id: user.id,
          event_type: 'session_terminated',
          severity: 'low',
          description: 'User logged out',
          metadata: {
            reason,
            ip: req.ip,
            userAgent: req.headers['user-agent']
          }
        });

        // Deactivate session
        await supabase
          .from('user_sessions')
          .update({ 
            is_active: false,
            last_activity: new Date().toISOString()
          })
          .eq('session_id', token);
      }
    }

    // Sign out from Supabase
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      res.status(500).json({ error: signOutError.message });
      return;
    }

    res.json({ 
      success: true, 
      message: 'Logout successful' 
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message || 'Logout failed' });
  }
});

export default router;