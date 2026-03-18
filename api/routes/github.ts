import { Router, type Request, type Response } from 'express';
import { supabase } from '../utils/supabase.js';
import { GithubService } from '../services/githubService.js';

const router = Router();

// Middleware to get user from token
const requireAuth = async (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  (req as any).user = user;
  next();
};

/**
 * GET /api/github/websites/:id/commits
 * Get recent commits for a website's linked repository
 */
router.get('/websites/:id/commits', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const websiteId = req.params.id;
    
    const commits = await GithubService.getRecentCommits(userId, websiteId);
    res.json({ commits });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/github/websites/:id/rollback
 * Trigger a rollback to a specific commit
 */
router.post('/websites/:id/rollback', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const websiteId = req.params.id;
    const { commitSha } = req.body;

    if (!commitSha) {
      res.status(400).json({ error: 'commitSha is required' });
      return;
    }

    const result = await GithubService.triggerRollback(userId, websiteId, commitSha);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;