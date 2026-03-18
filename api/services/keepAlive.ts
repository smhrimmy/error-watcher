import { supabase } from '../utils/supabase.js';

export class KeepAliveService {
  private static interval: NodeJS.Timeout | null = null;
  private static readonly PING_INTERVAL = 1000 * 60 * 60; // 1 hour

  static start() {
    if (this.interval) return;
    
    console.log('[KeepAlive] Service started');
    // Initial ping
    this.ping();
    
    this.interval = setInterval(() => {
      this.ping();
    }, this.PING_INTERVAL);
  }

  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private static async ping() {
    try {
      const start = Date.now();
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
        
      if (error) throw error;
      
      const duration = Date.now() - start;
      console.log(`[KeepAlive] Supabase ping successful (${duration}ms). Active profiles: ${count}`);
    } catch (err: any) {
      console.error('[KeepAlive] Supabase ping failed:', err.message);
    }
  }
}
