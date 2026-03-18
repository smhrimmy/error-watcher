import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { supabase } from '../utils/supabase.js';

export const auditLog = (actionType: string, targetType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Intercept the response to log after it finishes
    const originalSend = res.json;
    
    res.json = function(body) {
      res.json = originalSend;
      
      // Log asynchronously so we don't block the response
      if (req.user && res.statusCode >= 200 && res.statusCode < 300) {
        let targetId = null;
        if (req.params.id) targetId = req.params.id;
        else if (body && body.id) targetId = body.id;
        
        const metadata = {
          method: req.method,
          path: req.originalUrl,
          query: req.query,
          // Avoid logging sensitive body data in a real app, but for this MVP we log basic keys
          bodyKeys: req.body ? Object.keys(req.body) : []
        };

        supabase.from('audit_logs').insert([{
          actor_user_id: req.user.id,
          action_type: actionType,
          target_type: targetType,
          target_id: targetId,
          metadata: metadata,
          ip: req.ip || req.socket.remoteAddress,
          user_agent: req.get('user-agent')
        }]).then(({ error }) => {
          if (error) console.error('Failed to write audit log:', error);
        });
      }
      
      return res.json(body);
    };
    
    next();
  };
};