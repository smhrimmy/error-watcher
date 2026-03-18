import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Activity, Clock, AlertOctagon, Database } from 'lucide-react';
import { Card } from '../ui/Card';

interface PlatformMetrics {
  api_latency: { time: string; value: number }[];
  scheduler_execution: { time: string; value: number }[];
  queue_size: { time: string; value: number }[];
  failed_checks_count: number;
}

export default function PlatformHealth() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data } = await api.get('/infrastructure/platform-health?range=1h');
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch platform metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="animate-pulse h-48 bg-surface rounded-2xl shadow-neu"></div>;
  }

  const avgLatency = metrics?.api_latency.length 
    ? Math.round(metrics.api_latency.reduce((acc, curr) => acc + curr.value, 0) / metrics.api_latency.length) 
    : 0;

  const lastQueueSize = metrics?.queue_size.length 
    ? metrics.queue_size[metrics.queue_size.length - 1].value 
    : 0;

  const avgSchedulerTime = metrics?.scheduler_execution.length
    ? Math.round(metrics.scheduler_execution.reduce((acc, curr) => acc + curr.value, 0) / metrics.scheduler_execution.length)
    : 0;

  return (
    <Card>
      <h3 className="text-lg font-bold text-text-main mb-6 flex items-center">
        <Activity className="w-5 h-5 mr-2 text-primary" />
        Platform Self-Monitoring
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* API Latency */}
        <div className="p-4 rounded-xl shadow-neu-pressed bg-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted">Avg API Latency</span>
            <Database className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-text-main">{avgLatency}</span>
            <span className="text-xs text-text-muted ml-1">ms</span>
          </div>
          <div className="w-full bg-surface shadow-neu rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full ${avgLatency > 500 ? 'bg-danger' : 'bg-success'}`} 
              style={{ width: `${Math.min((avgLatency / 1000) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Scheduler Execution */}
        <div className="p-4 rounded-xl shadow-neu-pressed bg-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted">Scheduler Time</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-text-main">{avgSchedulerTime}</span>
            <span className="text-xs text-text-muted ml-1">ms</span>
          </div>
           <div className="w-full bg-surface shadow-neu rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="h-full rounded-full bg-purple-500"
              style={{ width: `${Math.min((avgSchedulerTime / 5000) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Monitoring Queue */}
        <div className="p-4 rounded-xl shadow-neu-pressed bg-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted">Active Monitors</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-text-main">{lastQueueSize}</span>
            <span className="text-xs text-text-muted ml-1">tasks</span>
          </div>
        </div>

        {/* Failed Checks */}
        <div className="p-4 rounded-xl shadow-neu-pressed bg-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted">Failed Checks (1h)</span>
            <AlertOctagon className="w-4 h-4 text-danger" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-text-main">{metrics?.failed_checks_count || 0}</span>
            <span className="text-xs text-text-muted ml-1">errors</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
