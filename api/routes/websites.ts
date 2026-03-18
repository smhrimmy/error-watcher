import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { supabase } from '../utils/supabase.js';

const router = express.Router();

// Get all websites for the current user
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new website
router.post('/', requireAuth, auditLog('CREATE', 'website'), async (req: AuthRequest, res) => {
  try {
    const { 
      name, url, method, tags, check_interval, timeout_ms, 
      is_owned, alert_email, alert_sms, response_time_threshold, 
      failure_threshold, recovery_threshold_minutes 
    } = req.body;
    
    const { data, error } = await supabase
      .from('websites')
      .insert([{
        user_id: req.user.id,
        name,
        url,
        method: method || 'GET',
        tags: tags || [],
        check_interval,
        timeout_ms: timeout_ms || 10000,
        is_owned,
        alert_email: alert_email || null, // Convert empty string to null
        alert_sms: alert_sms || null, // Convert empty string to null
        response_time_threshold: response_time_threshold || 5000,
        failure_threshold: failure_threshold || 2,
        recovery_threshold_minutes: recovery_threshold_minutes || 10
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    res.status(201).json(data);
  } catch (err: any) {
    console.error('Create website error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a website
router.put('/:id', requireAuth, auditLog('UPDATE', 'website'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Clean up empty strings
    if (updateData.alert_email === '') updateData.alert_email = null;
    if (updateData.alert_sms === '') updateData.alert_sms = null;

    // Check if website belongs to user
    const { data: existingSite, error: checkError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
      
    if (checkError || !existingSite) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const { data, error } = await supabase
      .from('websites')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a website
router.delete('/:id', requireAuth, auditLog('DELETE', 'website'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check if website belongs to user
    const { data: existingSite, error: checkError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
      
    if (checkError || !existingSite) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const { error } = await supabase
      .from('websites')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get website status and quick stats
router.get('/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Get latest log
    const { data: latestLog, error: logError } = await supabase
      .from('monitoring_logs')
      .select('*')
      .eq('website_id', id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
      
    if (logError && logError.code !== 'PGRST116') { // PGRST116 is no rows returned
      throw logError;
    }
    
    // Calculate real uptime for different periods
    const calculateUptime = async (days: number) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data: logs, error } = await supabase
        .from('monitoring_logs')
        .select('check_status')
        .eq('website_id', id)
        .gte('timestamp', startDate.toISOString());
        
      if (error) {
        console.error(`Error calculating uptime for ${days} days:`, error);
        return 0;
      }
      
      if (!logs || logs.length === 0) return 100; // No data = 100% uptime assumption or 0 depending on policy. Let's say 100 for now as "no downtime recorded"
      
      const upCount = logs.filter(l => l.check_status === 'success').length;
      return Number(((upCount / logs.length) * 100).toFixed(2));
    };

    const [uptime24h, uptime7d, uptime30d] = await Promise.all([
      calculateUptime(1),
      calculateUptime(7),
      calculateUptime(30)
    ]);
    
    const status = {
      website_id: id,
      current_status: latestLog?.check_status === 'success' ? 'up' : 'down',
      last_check: latestLog?.timestamp || null,
      last_response_time: latestLog?.response_time_ms || 0,
      last_status_code: latestLog?.status_code || 0,
      uptime_24h: uptime24h,
      uptime_7d: uptime7d,
      uptime_30d: uptime30d
    };
    
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;