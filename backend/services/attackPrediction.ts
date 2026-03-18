import { supabase } from '../utils/supabase.js';

export class AttackPredictionEngine {
  private patterns: Map<string, number> = new Map();
  private thresholds = {
    low: 0.3,
    medium: 0.6,
    high: 0.8
  };

  async analyzePatterns(): Promise<{
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    predictions: string[];
    confidence: number;
    recommendations: string[];
  }> {
    try {
      // Get recent threat data
      const { data: threats } = await supabase
        .from('threat_events')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .order('timestamp', { ascending: false });

      const { data: metrics } = await supabase
        .from('platform_health_metrics')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 3600000).toISOString())
        .order('timestamp', { ascending: false });

      if (!threats || threats.length === 0) {
        return {
          riskLevel: 'low',
          predictions: ['No active threats detected'],
          confidence: 0.95,
          recommendations: ['Continue normal monitoring']
        };
      }

      // Analyze attack patterns
      const analysis = this.analyzeAttackPatterns(threats);
      const trendAnalysis = this.analyzeTrends(threats, metrics || []);
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(analysis, trendAnalysis);
      
      // Generate predictions
      const predictions = this.generatePredictions(analysis, trendAnalysis);
      const recommendations = this.generateRecommendations(riskScore, analysis);

      return {
        riskLevel: this.getRiskLevel(riskScore),
        predictions,
        confidence: Math.min(riskScore * 1.2, 0.95),
        recommendations
      };

    } catch (error) {
      console.error('Attack prediction failed:', error);
      return {
        riskLevel: 'medium',
        predictions: ['Prediction system temporarily unavailable'],
        confidence: 0.5,
        recommendations: ['Manual security review recommended']
      };
    }
  }

  private analyzeAttackPatterns(threats: any[]) {
    const patterns = {
      ddos: threats.filter(t => t.event_type === 'ddos').length,
      brute_force: threats.filter(t => t.event_type === 'brute_force').length,
      xss: threats.filter(t => t.event_type === 'xss').length,
      sqli: threats.filter(t => t.event_type === 'sqli').length,
      total: threats.length,
      unique_ips: new Set(threats.map(t => t.source_ip)).size,
      auto_contained: threats.filter(t => t.action_taken === 'auto_contained').length,
      time_distribution: this.analyzeTimeDistribution(threats)
    };

    return patterns;
  }

  private analyzeTimeDistribution(threats: any[]) {
    const now = Date.now();
    const timeWindows = {
      last_5m: threats.filter(t => now - new Date(t.timestamp).getTime() <= 300000).length,
      last_15m: threats.filter(t => now - new Date(t.timestamp).getTime() <= 900000).length,
      last_30m: threats.filter(t => now - new Date(t.timestamp).getTime() <= 1800000).length,
      last_60m: threats.length
    };

    return {
      acceleration: timeWindows.last_5m > (timeWindows.last_15m - timeWindows.last_5m) / 2,
      sustained: timeWindows.last_30m > timeWindows.last_60m * 0.7,
      spike: timeWindows.last_5m > timeWindows.last_15m * 0.3
    };
  }

  private analyzeTrends(threats: any[], metrics: any[]) {
    const failed_checks = metrics.filter(m => m.metric_name === 'failed_monitoring_checks');
    const api_latency = metrics.filter(m => m.metric_name === 'api_latency');
    
    return {
      infrastructure_stress: failed_checks.length > 5,
      performance_degradation: api_latency.some(m => m.value > 1000), // > 1s latency
      threat_velocity: this.calculateThreatVelocity(threats)
    };
  }

  private calculateThreatVelocity(threats: any[]) {
    if (threats.length < 2) return 0;
    
    const times = threats.map(t => new Date(t.timestamp).getTime()).sort((a, b) => a - b);
    const intervals = [];
    
    for (let i = 1; i < times.length; i++) {
      intervals.push(times[i] - times[i-1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.max(0, 1 - (avgInterval / 60000)); // Normalize to 0-1, 1 minute baseline
  }

  private calculateRiskScore(patterns: any, trends: any): number {
    let score = 0;
    
    // Base threat volume (0-0.4)
    score += Math.min(patterns.total / 50, 0.4);
    
    // Attack diversity (0-0.2)
    const attackTypes = ['ddos', 'brute_force', 'xss', 'sqli'];
    const diversity = attackTypes.filter(type => patterns[type] > 0).length / attackTypes.length;
    score += diversity * 0.2;
    
    // Auto-containment ratio (0-0.2)
    score += Math.min(patterns.auto_contained / patterns.total, 0.2);
    
    // Infrastructure stress (0-0.2)
    if (trends.infrastructure_stress) score += 0.1;
    if (trends.performance_degradation) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private generatePredictions(analysis: any, trends: any): string[] {
    const predictions = [];
    
    if (analysis.total > 20) {
      predictions.push('High probability of coordinated attack campaign');
    }
    
    if (analysis.auto_contained > analysis.total * 0.3) {
      predictions.push('Automated threat actors detected - expect persistence');
    }
    
    if (trends.time_distribution.acceleration) {
      predictions.push('Attack frequency accelerating - prepare for escalation');
    }
    
    if (analysis.unique_ips > analysis.total * 0.8) {
      predictions.push('Distributed attack sources suggest botnet activity');
    }
    
    if (trends.infrastructure_stress && analysis.total > 10) {
      predictions.push('Infrastructure under stress - potential service disruption risk');
    }
    
    if (predictions.length === 0) {
      predictions.push('Standard threat activity - within normal parameters');
    }
    
    return predictions;
  }

  private generateRecommendations(riskScore: number, analysis: any): string[] {
    const recommendations = [];
    
    if (riskScore > 0.7) {
      recommendations.push('Activate emergency response protocols');
      recommendations.push('Consider temporary rate limiting on all endpoints');
      recommendations.push('Notify security team immediately');
    } else if (riskScore > 0.4) {
      recommendations.push('Increase monitoring frequency');
      recommendations.push('Review and tighten WAF rules');
      recommendations.push('Enable enhanced logging');
    } else {
      recommendations.push('Continue normal security monitoring');
      recommendations.push('Review threat patterns for early warning signs');
    }
    
    if (analysis.total > 30) {
      recommendations.push('Consider engaging external security services');
    }
    
    return recommendations;
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= this.thresholds.high) return 'critical';
    if (score >= this.thresholds.medium) return 'high';
    if (score >= this.thresholds.low) return 'medium';
    return 'low';
  }

  async recordPrediction(prediction: any, accuracy?: boolean) {
    // Store prediction for ML model training (future enhancement)
    try {
      await supabase.from('security_predictions').insert({
        prediction_data: prediction,
        accuracy_score: accuracy,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to record prediction:', error);
    }
  }
}

export const attackPredictionEngine = new AttackPredictionEngine();