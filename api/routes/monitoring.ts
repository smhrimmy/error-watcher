import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';

const router = express.Router();

// Get monitoring logs
router.get('/logs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { website_id, start_date, end_date, status, limit = 100 } = req.query;

    let query = supabase
      .from('monitoring_logs')
      .select('*, websites!inner(id, user_id)')
      .eq('websites.user_id', req.user.id)
      .order('timestamp', { ascending: false })
      .limit(Number(limit));

    if (website_id) {
      query = query.eq('website_id', website_id);
    }
    if (start_date) {
      query = query.gte('timestamp', start_date);
    }
    if (end_date) {
      query = query.lte('timestamp', end_date);
    }
    if (status) {
      // Map up/down to success/failed
      const checkStatus = status === 'up' ? 'success' : 'failed';
      query = query.eq('check_status', checkStatus);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Clean up the response to remove the joined table data
    const logs = data.map((log: any) => {
      const { websites, ...rest } = log;
      return rest;
    });

    res.json({
      logs,
      total: count || logs.length,
      page: 1
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get analytics data
router.get('/analytics', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { website_id, period = '7d' } = req.query;
    
    // Determine time range
    const now = new Date();
    let startDate = new Date();
    if (period === '24h') startDate.setHours(now.getHours() - 24);
    else if (period === '7d') startDate.setDate(now.getDate() - 7);
    else if (period === '30d') startDate.setDate(now.getDate() - 30);
    else startDate.setDate(now.getDate() - 7); // Default 7d
    
    // First verify user has access to this website if provided
    if (website_id && website_id !== 'all') {
      const { data: site, error: siteError } = await supabase
        .from('websites')
        .select('id')
        .eq('id', website_id)
        .eq('user_id', req.user.id)
        .single();
        
      if (siteError || !site) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Fetch logs for the period
    let logsQuery = supabase
      .from('monitoring_logs')
      .select('timestamp, check_status, response_time_ms, website_id')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', now.toISOString());
      
    if (website_id && website_id !== 'all') {
      logsQuery = logsQuery.eq('website_id', website_id);
    } else {
      // If 'all', ensure we only get logs for user's websites
      const { data: userSites } = await supabase.from('websites').select('id').eq('user_id', req.user.id);
      const siteIds = userSites?.map(s => s.id) || [];
      if (siteIds.length > 0) {
        logsQuery = logsQuery.in('website_id', siteIds);
      } else {
        // User has no websites
        return res.json({
          period, website_id: website_id || 'all', uptime_percentage: 100, average_response_time: 0,
          total_outages: 0, total_downtime_minutes: 0, peak_outage_hours: [], response_time_trend: []
        });
      }
    }
    
    const { data: logs, error: logsError } = await logsQuery;
    
    if (logsError) throw logsError;
    
    if (!logs || logs.length === 0) {
      return res.json({
        period, website_id: website_id || 'all', uptime_percentage: 100, average_response_time: 0,
        total_outages: 0, total_downtime_minutes: 0, peak_outage_hours: [], response_time_trend: []
      });
    }

    // Calculate metrics
    let successCount = 0;
    let totalResponseTime = 0;
    let outageCount = 0;
    let currentOutageStart = null;
    let downtimeMs = 0;
    const peakHoursMap: Record<number, number> = {};
    
    // Bucket for trends (group by hour for 24h/7d, by day for 30d)
    const trendBuckets: Record<string, { sum: number, count: number }> = {};

    logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    logs.forEach(log => {
      const isSuccess = log.check_status === 'success';
      const logTime = new Date(log.timestamp);
      
      if (isSuccess) {
        successCount++;
        totalResponseTime += (log.response_time_ms || 0);
        
        if (currentOutageStart) {
          downtimeMs += (logTime.getTime() - currentOutageStart.getTime());
          currentOutageStart = null;
        }
      } else {
        if (!currentOutageStart) {
          outageCount++;
          currentOutageStart = logTime;
        }
        
        const hour = logTime.getHours();
        peakHoursMap[hour] = (peakHoursMap[hour] || 0) + 1;
      }
      
      // Bucket for trend
      let bucketKey;
      if (period === '30d') {
        bucketKey = logTime.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        bucketKey = `${logTime.toISOString().split('T')[0]}T${logTime.getHours().toString().padStart(2, '0')}:00:00Z`; // Hourly
      }
      
      if (!trendBuckets[bucketKey]) trendBuckets[bucketKey] = { sum: 0, count: 0 };
      if (isSuccess) {
        trendBuckets[bucketKey].sum += (log.response_time_ms || 0);
        trendBuckets[bucketKey].count++;
      }
    });

    if (currentOutageStart) {
      downtimeMs += (now.getTime() - currentOutageStart.getTime());
    }

    const uptimePct = logs.length > 0 ? (successCount / logs.length) * 100 : 100;
    const avgResponse = successCount > 0 ? Math.round(totalResponseTime / successCount) : 0;
    
    // Sort peak hours
    const peak_outage_hours = Object.entries(peakHoursMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => parseInt(entry[0]));

    const response_time_trend = Object.entries(trendBuckets).map(([timestamp, data]) => ({
      timestamp,
      avg_response_time: data.count > 0 ? Math.round(data.sum / data.count) : 0
    })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({
      period,
      website_id: website_id || 'all',
      uptime_percentage: parseFloat(uptimePct.toFixed(2)),
      average_response_time: avgResponse,
      total_outages: outageCount,
      total_downtime_minutes: Math.round(downtimeMs / 60000),
      peak_outage_hours,
      response_time_trend
    });
  } catch (err: any) {
    console.error('Analytics Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;