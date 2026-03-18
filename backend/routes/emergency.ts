import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { GithubService } from '../services/githubService.js';

const router = express.Router();

// Toggle Maintenance Mode
router.post('/maintenance/:websiteId', requireAuth, async (req: any, res: any) => {
  try {
    const { websiteId } = req.params;
    const { enabled } = req.body; // true/false

    // Verify ownership and get details
    const { data: website, error: checkError } = await supabase
      .from('websites')
      .select('id, user_id, github_repo, maintenance_webhook_url, maintenance_webhook_secret')
      .eq('id', websiteId)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !website) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const results = [];

    // 1. Trigger GitHub Dispatch
    if (website.github_repo) {
      const ghResult = await GithubService.triggerMaintenanceMode(req.user.id, websiteId, enabled);
      results.push({ type: 'github', success: ghResult });
    }

    // 2. Call Maintenance Webhook
    if (website.maintenance_webhook_url) {
      try {
        const response = await fetch(website.maintenance_webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Maintenance-Secret': website.maintenance_webhook_secret || '',
          },
          body: JSON.stringify({ maintenance: enabled, timestamp: new Date().toISOString() }),
        });
        results.push({ type: 'webhook', success: response.ok, status: response.status });
      } catch (err: any) {
        console.error('Webhook failed:', err);
        results.push({ type: 'webhook', success: false, error: err.message });
      }
    }

    // 3. Update DB
    const { error } = await supabase
      .from('websites')
      .update({ maintenance_mode: enabled })
      .eq('id', websiteId);

    if (error) throw error;

    // Log this action
    await supabase.from('audit_logs').insert([{
        actor_user_id: req.user.id,
        action_type: 'EMERGENCY_MAINTENANCE',
        target_type: 'website',
        target_id: websiteId,
        metadata: { enabled, results }
    }]);

    res.json({ 
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      details: results
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Block IP
router.post('/block-ip', requireAuth, async (req: any, res: any) => {
  try {
    const { ip_address, reason } = req.body;

    if (!ip_address) return res.status(400).json({ error: 'IP address required' });

    const { data, error } = await supabase
      .from('blocked_ips')
      .insert([{
        user_id: req.user.id,
        ip_address,
        reason
      }])
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert([{
        actor_user_id: req.user.id,
        action_type: 'EMERGENCY_BLOCK_IP',
        target_type: 'ip',
        target_id: data.id,
        metadata: { ip_address, reason }
    }]);

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Blocked IPs
router.get('/blocked-ips', requireAuth, async (req: any, res: any) => {
    try {
        const { data, error } = await supabase
            .from('blocked_ips')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Unblock IP
router.delete('/block-ip/:id', requireAuth, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('blocked_ips')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
        
        if (error) throw error;
        res.json({ message: 'IP Unblocked' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Restart Server (Queue Command)
router.post('/restart-server/:agentId', requireAuth, async (req: any, res: any) => {
  try {
    const { agentId } = req.params;

    // Verify ownership
    const { data: agent, error: checkError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !agent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('agent_commands')
      .insert([{
        agent_id: agentId,
        command: 'restart',
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert([{
        actor_user_id: req.user.id,
        action_type: 'EMERGENCY_RESTART_SERVER',
        target_type: 'agent',
        target_id: agentId,
        metadata: { command_id: data.id }
    }]);

    res.json({ message: 'Restart command queued', commandId: data.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
