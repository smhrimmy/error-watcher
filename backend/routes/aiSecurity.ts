import { Request, Response, Router } from 'express';
import { supabase } from '../utils/supabase.js';
import { attackPredictionEngine } from '../services/attackPrediction.js';

const router = Router();

export const getAttackPredictions = async (req: Request, res: Response) => {
  try {
    const predictions = await attackPredictionEngine.analyzePatterns();
    
    // Record this prediction for future ML training
    await attackPredictionEngine.recordPrediction(predictions);
    
    res.json({
      predictions: predictions.predictions,
      risk_level: predictions.riskLevel,
      confidence: predictions.confidence,
      recommendations: predictions.recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to generate attack predictions:', error);
    res.status(500).json({ 
      error: 'Failed to generate predictions',
      risk_level: 'unknown',
      predictions: ['Prediction system temporarily unavailable'],
      recommendations: ['Manual security review recommended']
    });
  }
};

export const getSecurityAnalytics = async (req: Request, res: Response) => {
  try {
    const { timeframe = '24h' } = req.query;
    const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 24;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get threat statistics
    const { data: threats, error: threatError } = await supabase
      .from('threat_events')
      .select('*')
      .gte('timestamp', startTime);

    if (threatError) throw threatError;

    // Get blocked IPs statistics
    const { data: blockedIPs, error: blockError } = await supabase
      .from('blocked_ips')
      .select('*')
      .gte('created_at', startTime);

    if (blockError) throw blockError;

    // Get security metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('security_analytics')
      .select('*')
      .gte('timestamp', startTime);

    if (metricsError) throw metricsError;

    const analytics = {
      timeframe,
      threat_statistics: {
        total_threats: threats?.length || 0,
        by_type: {
          ddos: threats?.filter(t => t.event_type === 'ddos').length || 0,
          brute_force: threats?.filter(t => t.event_type === 'brute_force').length || 0,
          xss: threats?.filter(t => t.event_type === 'xss').length || 0,
          sqli: threats?.filter(t => t.event_type === 'sqli').length || 0
        },
        severity_distribution: {
          critical: threats?.filter(t => t.severity === 'critical').length || 0,
          high: threats?.filter(t => t.severity === 'high').length || 0,
          medium: threats?.filter(t => t.severity === 'medium').length || 0,
          low: threats?.filter(t => t.severity === 'low').length || 0
        },
        auto_contained: threats?.filter(t => t.action_taken === 'auto_contained').length || 0,
        unique_attackers: new Set(threats?.map(t => t.source_ip)).size
      },
      blocking_statistics: {
        total_blocked: blockedIPs?.length || 0,
        auto_blocked: blockedIPs?.filter(ip => ip.reason?.includes('Autonomous Containment')).length || 0,
        manual_blocks: blockedIPs?.filter(ip => !ip.reason?.includes('Autonomous Containment')).length || 0
      },
      trend_analysis: generateTrendAnalysis(threats || [], hours),
      geographic_distribution: generateGeographicDistribution(threats || []),
      timestamp: new Date().toISOString()
    };

    res.json(analytics);
  } catch (error) {
    console.error('Failed to get security analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve security analytics' });
  }
};

function generateTrendAnalysis(threats: any[], hours: number) {
  const timeWindows = Math.min(hours, 24); // Max 24 windows
  const windowSize = (hours * 60 * 60 * 1000) / timeWindows;
  
  const trends = [];
  const now = Date.now();
  
  for (let i = 0; i < timeWindows; i++) {
    const windowStart = now - (i + 1) * windowSize;
    const windowEnd = now - i * windowSize;
    
    const windowThreats = threats.filter(t => {
      const threatTime = new Date(t.timestamp).getTime();
      return threatTime >= windowStart && threatTime < windowEnd;
    });
    
    trends.push({
      timestamp: new Date(windowEnd).toISOString(),
      count: windowThreats.length,
      severity: windowThreats.length > 0 ? 
        Math.max(...windowThreats.map(t => severityToNumber(t.severity))) : 0
    });
  }
  
  return trends.reverse();
}

function generateGeographicDistribution(threats: any[]) {
  const distribution: Record<string, number> = {};
  
  threats.forEach(threat => {
    // Extract country from IP or use source_ip as key
    const location = threat.source_ip || 'unknown';
    distribution[location] = (distribution[location] || 0) + 1;
  });
  
  return Object.entries(distribution)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 locations
}

function severityToNumber(severity: string): number {
  const map = { low: 1, medium: 2, high: 3, critical: 4 };
  return map[severity as keyof typeof map] || 0;
}

router.get('/predictions', getAttackPredictions);
router.get('/analytics', getSecurityAnalytics);

export default router;