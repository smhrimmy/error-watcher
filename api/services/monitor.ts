import axios from 'axios';
import axiosRetry from 'axios-retry';
import CircuitBreaker from 'opossum';
import { supabase } from '../utils/supabase.js';

import { GithubService } from './githubService.js';

interface Website {
  id: string;
  url: string;
  user_id: string;
  check_interval: number;
  response_time_threshold: number;
  method?: string;
  headers?: any;
  timeout_ms?: number;
  github_repo?: string;
  github_branch?: string;
  auto_rollback_enabled?: boolean;
  create_issues_on_alert?: boolean;
}

export class MonitoringService {
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  private breakers: Map<string, CircuitBreaker> = new Map();
  private httpClient = axios.create();

  constructor() {
    axiosRetry(this.httpClient, { 
      retries: 3, 
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
      }
    });
  }

  async start() {
    console.log('Starting monitoring service...');
    await this.syncWebsites();
    
    // Periodically check for new or updated websites
    setInterval(() => this.syncWebsites(), 60000); // Check every minute
  }

  private async syncWebsites() {
    const start = Date.now();
    try {
      const { data: websites, error } = await supabase
        .from('websites')
        .select('id, url, user_id, check_interval, response_time_threshold, status, method, headers, timeout_ms, failure_threshold, recovery_threshold_minutes, github_repo, github_branch, auto_rollback_enabled, create_issues_on_alert')
        .eq('status', 'active');

      if (error) {
        console.error('Failed to fetch websites for monitoring:', error);
        return;
      }

      const currentSiteIds = new Set(websites.map((w: any) => w.id));

      // Stop monitoring deleted or paused sites
      for (const [id, interval] of this.activeIntervals.entries()) {
        if (!currentSiteIds.has(id)) {
          clearInterval(interval);
          this.activeIntervals.delete(id);
          console.log(`Stopped monitoring website ${id}`);
        }
      }

      // Start or update monitoring for active sites
      for (const site of websites) {
        if (!this.activeIntervals.has(site.id)) {
          this.startMonitoring(site);
        }
      }
      
      // Record scheduler metrics
      const duration = Date.now() - start;
      await supabase.from('platform_health_metrics').insert([
        { metric_name: 'scheduler_execution_time', value: duration },
        { metric_name: 'worker_queue_size', value: this.activeIntervals.size }
      ]);

    } catch (error) {
      console.error('Error in syncWebsites:', error);
    }
  }

  private startMonitoring(site: Website) {
    console.log(`Started monitoring website ${site.id} (${site.url}) every ${site.check_interval} minutes`);
    
    // Initial check
    this.checkWebsite(site);
    
    // Schedule subsequent checks
    const intervalMs = site.check_interval * 60 * 1000;
    const interval = setInterval(() => this.checkWebsite(site), intervalMs);
    
    this.activeIntervals.set(site.id, interval);
  }

  private async checkWebsite(site: Website) {
    const startTime = Date.now();
    let statusCode = 0;
    let checkStatus: 'success' | 'failed' | 'timeout' = 'failed';
    let errorMessage = '';

    // Get or create circuit breaker for this site
    let breaker = this.breakers.get(site.id);
    if (!breaker) {
      breaker = new CircuitBreaker(async (s: Website) => {
        return this.httpClient({
          url: s.url,
          method: s.method || 'GET',
          headers: {
            'User-Agent': 'MonitorBot/1.0',
            ...(s.headers || {})
          },
          timeout: s.timeout_ms || 10000,
          validateStatus: () => true
        });
      }, {
        timeout: (site.timeout_ms || 10000) + 5000, // Breaker timeout slightly longer than request timeout
        errorThresholdPercentage: 50,
        resetTimeout: 60000 // Retry after 1 minute if open
      });
      
      // Circuit Breaker Event Logging
      breaker.on('open', () => console.warn(`[CircuitBreaker] OPEN for ${site.url} - Dependencies failing`));
      breaker.on('close', () => console.info(`[CircuitBreaker] CLOSED for ${site.url} - Dependencies recovered`));
      breaker.on('halfOpen', () => console.info(`[CircuitBreaker] HALF-OPEN for ${site.url} - Testing dependency`));

      this.breakers.set(site.id, breaker);
    }

    try {
      const response: any = await breaker.fire(site);
      
      statusCode = response.status;
      
      if (statusCode >= 200 && statusCode < 400) {
        checkStatus = 'success';
      } else {
        checkStatus = 'failed';
        errorMessage = `HTTP Error: ${statusCode}`;
      }
    } catch (error: any) {
      if (breaker.opened) {
        checkStatus = 'failed';
        errorMessage = 'Circuit Breaker Open (Too many failures)';
      } else if (error.code === 'ECONNABORTED') {
        checkStatus = 'timeout';
        errorMessage = `Request timed out after ${site.timeout_ms || 10000}ms`;
      } else {
        checkStatus = 'failed';
        errorMessage = error.message || 'Unknown error occurred';
      }
    }

    // Record failed check metric
    if (checkStatus !== 'success') {
      supabase.from('platform_health_metrics').insert({
        metric_name: 'failed_monitoring_checks',
        value: 1,
        tags: { website_id: site.id, error_type: checkStatus }
      }).then(({ error }) => {
        if (error) console.error('Failed to record failed check metric:', error);
      });
    }

    const responseTime = Date.now() - startTime;

    // Log the result to Supabase
    try {
      await supabase.from('monitoring_logs').insert([{
        website_id: site.id,
        owner_id: site.user_id || (site as any).owner_id, // ensure we have owner_id for the log
        status_code: statusCode,
        response_time_ms: responseTime,
        request_duration_ms: responseTime, // Same for now
        check_status: checkStatus,
        error_type: checkStatus === 'timeout' ? 'TIMEOUT' : (checkStatus === 'failed' ? 'HTTP_ERROR' : null),
        error_message: errorMessage ? errorMessage : null,
        region: process.env.AWS_REGION || 'local',
        checker_node_id: 'node-1'
      }]);
      
      // Advanced Alerting Logic
      // 1. Fetch current open alert for this site
      const { data: openAlert } = await supabase
        .from('alerts')
        .select('*')
        .eq('website_id', site.id)
        .eq('alert_state', 'open')
        .single();

      if (checkStatus !== 'success' || responseTime > site.response_time_threshold) {
        // Evaluate Downtime/Slow Response
        
        // Count recent consecutive failures
        const { data: recentLogs } = await supabase
          .from('monitoring_logs')
          .select('check_status, response_time_ms')
          .eq('website_id', site.id)
          .order('timestamp', { ascending: false })
          .limit(10); // get last 10 to check threshold

        let consecutiveFailures = 0;
        if (recentLogs) {
           for (const log of recentLogs) {
             if (log.check_status !== 'success' || (log.response_time_ms && log.response_time_ms > site.response_time_threshold)) {
               consecutiveFailures++;
             } else {
               break;
             }
           }
        }

        // TODO: Need site.failure_threshold from DB. It wasn't in the select.
        // For MVP, we will assume 2 as default if not fetched.
        const failureThreshold = (site as any).failure_threshold || 2;

        if (consecutiveFailures >= failureThreshold && !openAlert) {
           console.warn(`[Alert] Triggering downtime alert for ${site.url}`);
           const alertType = checkStatus !== 'success' ? 'downtime' : 'slow';
           
           await supabase.from('alerts').insert([{
             website_id: site.id,
             alert_type: alertType,
             alert_state: 'open',
             failure_count: consecutiveFailures,
             metadata: { response_time: responseTime, error: errorMessage }
           }]);

           // GitHub Integrations
           const ownerId = site.user_id || (site as any).owner_id;
           if (site.github_repo) {
             // 1. Auto-Create Issue
             if (site.create_issues_on_alert) {
               try {
                 const title = `🚨 Monitor Alert: ${site.url} is ${alertType === 'downtime' ? 'DOWN' : 'SLOW'}`;
                 const body = `**Alert Details:**\n- **URL:** ${site.url}\n- **Error:** ${errorMessage || 'N/A'}\n- **Response Time:** ${responseTime}ms\n\n_Automated issue created by Error Watcher._`;
                 await GithubService.createIssue(ownerId, site.id, title, body);
                 console.log(`[GitHub] Created issue for ${site.url}`);
               } catch (err) {
                 console.error(`[GitHub] Failed to create issue for ${site.url}:`, err);
               }
             }

             // 2. Auto-Rollback
             if (site.auto_rollback_enabled && alertType === 'downtime') {
               try {
                 // Fetch the previous commit to rollback to
                 const commits = await GithubService.getRecentCommits(ownerId, site.id, 2);
                 if (commits && commits.length > 1) {
                   const previousCommit = commits[1].sha; // Rollback to the commit before the latest one
                   await GithubService.triggerRollback(ownerId, site.id, previousCommit);
                   console.log(`[GitHub] Triggered auto-rollback to ${previousCommit} for ${site.url}`);
                   
                   // Log the action
                   await supabase.from('audit_logs').insert([{
                     actor_user_id: ownerId,
                     action_type: 'auto_rollback',
                     target_type: 'website',
                     target_id: site.id,
                     metadata: { target_commit: previousCommit, reason: 'downtime_alert' }
                   }]);
                 }
               } catch (err) {
                 console.error(`[GitHub] Failed to trigger auto-rollback for ${site.url}:`, err);
               }
             }
           }
        } else if (openAlert) {
           // Update failure count
           await supabase.from('alerts')
             .update({ failure_count: consecutiveFailures })
             .eq('id', openAlert.id);
        }

      } else if (checkStatus === 'success' && openAlert && openAlert.alert_type === 'downtime') {
        // Evaluate Recovery
        const triggeredTime = new Date(openAlert.triggered_timestamp).getTime();
        const downtimeMinutes = (Date.now() - triggeredTime) / 60000;
        
        const recoveryThreshold = (site as any).recovery_threshold_minutes || 10;

        // Note: Real recovery usually requires N consecutive successful checks.
        // For now, if we are up, we resolve it.
        console.info(`[Alert] Site ${site.url} recovered after ${downtimeMinutes.toFixed(1)}m`);
        
        await supabase.from('alerts')
          .update({ 
            alert_state: 'resolved', 
            resolved_timestamp: new Date().toISOString() 
          })
          .eq('id', openAlert.id);
          
        await supabase.from('alerts').insert([{
             website_id: site.id,
             alert_type: 'recovery',
             alert_state: 'resolved', // Recovery alerts are resolved immediately
             metadata: { downtime_minutes: downtimeMinutes }
        }]);
      }
      
    } catch (dbError) {
      console.error('Failed to save monitoring log or process alerts:', dbError);
    }
  }
}

// Singleton instance
export const monitorService = new MonitoringService();