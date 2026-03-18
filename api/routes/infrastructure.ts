import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = express.Router();

// --- Middleware for Agent Authentication ---
const requireAgentAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const agentId = req.headers['x-agent-id'] as string;
  const apiKey = req.headers['x-agent-key'] as string;

  if (!agentId || !apiKey) {
    return res.status(401).json({ error: 'Missing agent credentials' });
  }

  try {
    // 1. Get the agent's stored hash
    const { data: agent, error } = await supabase
      .from('agents')
      .select('api_key_hash, status')
      .eq('id', agentId)
      .single();

    if (error || !agent) {
      return res.status(401).json({ error: 'Invalid agent ID' });
    }

    // 2. Verify the key
    const isValid = await bcrypt.compare(apiKey, agent.api_key_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // 3. Attach agent to request
    (req as any).agent = { id: agentId, status: agent.status };
    next();
  } catch (err: any) {
    console.error('Agent Auth Error:', err);
    res.status(500).json({ error: 'Internal server error during auth' });
  }
};

// --- User Facing Endpoints ---

// Get all agents (for user dashboard)
router.get('/agents', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    
    let query = supabase
      .from('agents')
      .select('*')
      .eq('user_id', req.user.id)
      .order('last_heartbeat', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new agent (generates API key)
router.post('/agents', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { hostname, os_info, version } = req.body;
    
    // Generate a secure API key (e.g., ag_...)
    const rawKey = 'ag_' + crypto.randomBytes(24).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawKey, salt);

    const { data, error } = await supabase
      .from('agents')
      .insert([{
        user_id: req.user.id,
        hostname: hostname || 'New Agent',
        ip_address: req.ip, // Initial IP
        os_info: os_info || {},
        version: version || '1.0.0',
        status: 'offline', // Starts offline until first heartbeat
        api_key_hash: hash
      }])
      .select()
      .single();

    if (error) throw error;

    // Return the raw key ONLY once
    res.status(201).json({ ...data, apiKey: rawKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get metrics for an agent (for user dashboard)
router.get('/agents/:id/metrics', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    // Verify ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (agentError || !agent) {
      return res.status(403).json({ error: 'Access denied or agent not found' });
    }

    const { data, error } = await supabase
      .from('system_metrics')
      .select('*')
      .eq('agent_id', id)
      .order('timestamp', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get platform health metrics (for admin dashboard)
router.get('/platform-health', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { range = '1h' } = req.query;
    
    // Calculate start time based on range
    const now = new Date();
    let startTime = new Date(now.getTime() - 60 * 60 * 1000); // Default 1h
    if (range === '24h') startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const { data: metrics, error } = await supabase
      .from('platform_health_metrics')
      .select('*')
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Aggregate metrics
    const aggregated = {
      api_latency: [] as any[],
      scheduler_execution: [] as any[],
      queue_size: [] as any[],
      failed_checks_count: 0
    };

    metrics?.forEach(m => {
      if (m.metric_name === 'api_latency') {
        aggregated.api_latency.push({ time: m.timestamp, value: m.value });
      } else if (m.metric_name === 'scheduler_execution_time') {
        aggregated.scheduler_execution.push({ time: m.timestamp, value: m.value });
      } else if (m.metric_name === 'worker_queue_size') {
        aggregated.queue_size.push({ time: m.timestamp, value: m.value });
      } else if (m.metric_name === 'failed_monitoring_checks') {
        aggregated.failed_checks_count += m.value;
      }
    });

    res.json(aggregated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an agent
router.delete('/agents/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        
        const { error } = await supabase
            .from('agents')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ message: 'Agent deleted' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Agent Facing Endpoints ---

// Heartbeat
router.post('/heartbeat', requireAgentAuth, async (req: any, res) => {
  try {
    const { hostname, ip_address, os_info, version } = req.body;
    const agentId = req.agent.id;

    const updates: any = {
      last_heartbeat: new Date(),
      status: 'online'
    };

    if (hostname) updates.hostname = hostname;
    if (ip_address) updates.ip_address = ip_address;
    if (os_info) updates.os_info = os_info;
    if (version) updates.version = version;

    const { error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', agentId);

    if (error) throw error;

    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit Metrics
router.post('/metrics', requireAgentAuth, async (req: any, res) => {
  try {
    const { cpu_usage, memory_usage, disk_usage, network_rx_bytes, network_tx_bytes } = req.body;
    const agentId = req.agent.id;

    const { error } = await supabase
      .from('system_metrics')
      .insert([{
        agent_id: agentId,
        cpu_usage,
        memory_usage,
        disk_usage,
        network_rx_bytes,
        network_tx_bytes
      }]);

    if (error) throw error;

    // Also update heartbeat implicitly
    await supabase
        .from('agents')
        .update({ last_heartbeat: new Date(), status: 'online' })
        .eq('id', agentId);

    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit FIM Events
router.post('/fim/events', requireAgentAuth, async (req: any, res) => {
  try {
    const { events } = req.body;
    const agentId = req.agent.id;

    if (!events || !Array.isArray(events)) {
        return res.status(400).json({ error: 'Invalid events format' });
    }

    const records = events.map((event: any) => ({
        agent_id: agentId,
        file_path: event.file_path,
        event_type: event.event_type,
        previous_hash: event.previous_hash,
        new_hash: event.new_hash,
        severity: 'high'
    }));

    if (records.length > 0) {
        const { error } = await supabase.from('fim_logs').insert(records);
        if (error) throw error;
        
        // Also log to threat intelligence if it's a modification of a critical file
        const threatRecords = records.map((r: any) => ({
            source_ip: req.ip,
            event_type: 'fim_alert',
            severity: 'critical',
            description: `File integrity violation: ${r.file_path} was ${r.event_type}`,
            metadata: r
        }));
        await supabase.from('threat_events').insert(threatRecords);
    }

    res.json({ status: 'ok', processed: records.length });
  } catch (err: any) {
    console.error('FIM submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
