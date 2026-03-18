import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabase } from '../utils/supabase.js';

interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cpuCores: number;
  memory: number;
  canvasFingerprint: string;
  webglFingerprint: string;
  audioFingerprint: string;
  fonts: string[];
  plugins: string[];
}

interface SessionSecurityEvent {
  user_id: string;
  session_id: string;
  event_type: 'suspicious_login' | 'ip_changed' | 'device_changed' | 'location_changed' | 'multiple_sessions';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: any;
}

export class SessionProtectionService {
  private static instance: SessionProtectionService;
  private deviceCache = new Map<string, DeviceFingerprint>();

  static getInstance(): SessionProtectionService {
    if (!SessionProtectionService.instance) {
      SessionProtectionService.instance = new SessionProtectionService();
    }
    return SessionProtectionService.instance;
  }

  async generateDeviceFingerprint(req: Request): Promise<DeviceFingerprint> {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const acceptLanguage = req.headers['accept-language'] || 'en-US';
    const acceptEncoding = req.headers['accept-encoding'] || 'gzip';
    
    // Generate canvas fingerprint
    const canvasFingerprint = this.generateCanvasFingerprint(userAgent);
    
    // Generate WebGL fingerprint
    const webglFingerprint = this.generateWebGLFingerprint(userAgent);
    
    // Generate audio fingerprint
    const audioFingerprint = this.generateAudioFingerprint(userAgent);

    const fingerprint: DeviceFingerprint = {
      userAgent,
      screenResolution: '1920x1080', // Would be collected from client-side JS
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: acceptLanguage.split(',')[0],
      platform: this.extractPlatform(userAgent),
      cpuCores: 8, // Would be collected from client-side JS
      memory: 16, // Would be collected from client-side JS
      canvasFingerprint,
      webglFingerprint,
      audioFingerprint,
      fonts: ['Arial', 'Helvetica', 'Times New Roman'], // Would be collected from client-side JS
      plugins: ['PDF Viewer', 'Chrome PDF Viewer'] // Would be collected from client-side JS
    };

    const fingerprintHash = crypto.createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
    this.deviceCache.set(fingerprintHash, fingerprint);
    
    return fingerprint;
  }

  private generateCanvasFingerprint(userAgent: string): string {
    // Simulate canvas fingerprinting
    const canvas = {
      width: 300,
      height: 150,
      text: 'Canvas Fingerprint',
      font: '14px Arial'
    };
    
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(canvas));
    hash.update(userAgent);
    return hash.digest('hex').substring(0, 16);
  }

  private generateWebGLFingerprint(userAgent: string): string {
    // Simulate WebGL fingerprinting
    const webglData = {
      vendor: 'Intel Inc.',
      renderer: 'Intel Iris OpenGL Engine',
      version: 'WebGL 2.0',
      shadingLanguageVersion: 'WebGL GLSL ES 3.00',
      maxTextureSize: 16384,
      maxViewportDims: [16384, 16384]
    };
    
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(webglData));
    hash.update(userAgent);
    return hash.digest('hex').substring(0, 16);
  }

  private generateAudioFingerprint(userAgent: string): string {
    // Simulate audio fingerprinting
    const audioData = {
      sampleRate: 44100,
      maxChannelCount: 2,
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 2,
      channelCountMode: 'max'
    };
    
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(audioData));
    hash.update(userAgent);
    return hash.digest('hex').substring(0, 16);
  }

  private extractPlatform(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  async validateSession(req: Request, userId: string): Promise<{valid: boolean; riskLevel: 'low' | 'medium' | 'high' | 'critical'; reason?: string}> {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const authorization = req.headers.authorization;
    
    if (!authorization) {
      return { valid: false, riskLevel: 'high', reason: 'Missing authorization header' };
    }

    // Get user's previous sessions
    const { data: previousSessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching user sessions:', error);
      return { valid: true, riskLevel: 'medium', reason: 'Unable to validate session history' };
    }

    if (!previousSessions || previousSessions.length === 0) {
      return { valid: true, riskLevel: 'low', reason: 'First session for user' };
    }

    const lastSession = previousSessions[0];
    const riskFactors = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check IP consistency
    if (lastSession.ip_address !== clientIP) {
      riskFactors.push('IP address changed');
      riskLevel = this.increaseRiskLevel(riskLevel, 'medium');
    }

    // Check device consistency
    const currentFingerprint = await this.generateDeviceFingerprint(req);
    if (lastSession.device_fingerprint !== currentFingerprint) {
      riskFactors.push('Device fingerprint changed');
      riskLevel = this.increaseRiskLevel(riskLevel, 'medium');
    }

    // Check for multiple active sessions
    const activeSessions = previousSessions.filter(s => s.status === 'active');
    if (activeSessions.length > 1) {
      riskFactors.push('Multiple active sessions detected');
      riskLevel = this.increaseRiskLevel(riskLevel, 'high');
    }

    // Check session age
    const sessionAge = Date.now() - new Date(lastSession.created_at).getTime();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
    if (sessionAge > maxSessionAge) {
      riskFactors.push('Session age exceeds maximum');
      riskLevel = this.increaseRiskLevel(riskLevel, 'high');
    }

    // Check for suspicious patterns
    if (this.isSuspiciousUserAgent(userAgent)) {
      riskFactors.push('Suspicious user agent detected');
      riskLevel = this.increaseRiskLevel(riskLevel, 'high');
    }

    if (riskLevel === 'critical') {
      await this.logSecurityEvent({
        user_id: userId,
        session_id: lastSession.id,
        event_type: 'suspicious_login',
        severity: 'critical',
        description: `Critical security risk detected: ${riskFactors.join(', ')}`,
        metadata: { riskFactors, clientIP, userAgent }
      });
    }

    return {
      valid: riskLevel !== 'critical',
      riskLevel,
      reason: riskFactors.length > 0 ? riskFactors.join('; ') : 'Session validation passed'
    };
  }

  private increaseRiskLevel(current: 'low' | 'medium' | 'high' | 'critical', newLevel: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    const newIndex = levels.indexOf(newLevel);
    return levels[Math.max(currentIndex, newIndex)] as 'low' | 'medium' | 'high' | 'critical';
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot|crawler|spider|scrapy|selenium|phantomjs|headless/i,
      /curl|wget|python|java|nodejs|go-http-client/i,
      /postman|insomnia|httpie/i,
      /\d+\.\d+\.\d+\.\d+/ // IP address in user agent
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private async logSecurityEvent(event: SessionSecurityEvent): Promise<void> {
    try {
      await supabase.from('security_events').insert({
        user_id: event.user_id,
        session_id: event.session_id,
        event_type: event.event_type,
        severity: event.severity,
        description: event.description,
        metadata: event.metadata
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  async getSessionSecurityStatus(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    suspiciousEvents: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recentEvents: any[];
  }> {
    try {
      const [sessionsRes, eventsRes] = await Promise.all([
        supabase.from('user_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase.from('security_events')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const sessions = sessionsRes.data || [];
      const events = eventsRes.data || [];

      const totalSessions = sessions.length;
      const activeSessions = sessions.filter(s => s.status === 'active').length;
      const suspiciousEvents = events.filter(e => e.severity === 'high' || e.severity === 'critical').length;

      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (suspiciousEvents > 0) riskLevel = 'medium';
      if (suspiciousEvents > 3) riskLevel = 'high';
      if (suspiciousEvents > 5) riskLevel = 'critical';

      return {
        totalSessions,
        activeSessions,
        suspiciousEvents,
        riskLevel,
        recentEvents: events
      };
    } catch (error) {
      console.error('Error getting session security status:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        suspiciousEvents: 0,
        riskLevel: 'low',
        recentEvents: []
      };
    }
  }
}

export const sessionProtection = SessionProtectionService.getInstance();