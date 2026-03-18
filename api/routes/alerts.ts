import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';

const router = express.Router();

// Get alert history
router.get('/history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { website_id, status, limit = 50 } = req.query;

    let query = supabase
      .from('alerts')
      .select('*, websites!inner(id, name, url, user_id)')
      .eq('websites.user_id', req.user.id)
      .order('triggered_timestamp', { ascending: false })
      .limit(Number(limit));

    if (website_id) query = query.eq('website_id', website_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) throw error;

    const alerts = data.map((alert: any) => {
      const { websites, ...rest } = alert;
      return { ...rest, website: websites };
    });

    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;