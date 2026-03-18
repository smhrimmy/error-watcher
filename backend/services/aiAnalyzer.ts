import { supabase } from '../utils/supabase.js';

export class RootCauseAnalyzer {
  private openai: any;

  constructor() {
    // Dynamic import to avoid crash if env var is missing during build
    if (process.env.OPENAI_API_KEY) {
      import('openai').then(module => {
        this.openai = new module.default({ apiKey: process.env.OPENAI_API_KEY });
      }).catch(console.error);
    }
  }

  async analyzeIncident(websiteId: string, errorType: string, timestamp: Date): Promise<string> {
    if (!this.openai) {
      return "AI Root Cause Analysis is currently disabled (Missing API Key).";
    }

    try {
      // Gather context
      const [logsRes, metricsRes, threatRes] = await Promise.all([
        supabase.from('monitoring_logs')
          .select('*')
          .eq('website_id', websiteId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('platform_health_metrics')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(5),
        supabase.from('threat_events')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(5)
      ]);

      const prompt = `
        You are a Principal SRE and Cybersecurity expert investigating an incident.
        
        Incident Context:
        - Target: Website ID ${websiteId}
        - Error Type: ${errorType}
        - Time: ${timestamp.toISOString()}

        Recent Monitoring Logs:
        ${JSON.stringify(logsRes.data)}

        Recent Platform Metrics:
        ${JSON.stringify(metricsRes.data)}

        Recent Threat Events (WAF/FIM):
        ${JSON.stringify(threatRes.data)}

        Analyze the data and provide a concise, actionable summary in this exact format:
        Possible cause:
        [1 sentence explanation]

        Recommended actions:
        - [Action 1]
        - [Action 2]
        - [Action 3]
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 250
      });

      return response.choices[0]?.message?.content || "Analysis failed to generate.";

    } catch (error) {
      console.error('AI Analysis failed:', error);
      return "Error running AI Root Cause Analysis.";
    }
  }
}

export const rootCauseAnalyzer = new RootCauseAnalyzer();
