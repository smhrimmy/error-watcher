import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Website, WebsiteStatus } from '../types';
import { Activity, Globe, CheckCircle2, XCircle, AlertTriangle, Shield, Server, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import PlatformHealth from '../components/dashboard/PlatformHealth';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function Dashboard() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [statuses, setStatuses] = useState<Record<string, WebsiteStatus>>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sitesRes, alertsRes] = await Promise.all([
          api.get('/websites'),
          api.get('/alerts/history')
        ]);
        
        const sites = sitesRes.data;
        setWebsites(sites);
        setAlerts(alertsRes.data.slice(0, 5)); // Get latest 5 alerts
        
        const statusData: Record<string, WebsiteStatus> = {};
        await Promise.all(
          sites.map(async (site: Website) => {
            try {
              const { data } = await api.get(`/websites/${site.id}/status`);
              statusData[site.id] = data;
            } catch {
              console.error(`Failed to fetch status for ${site.id}`);
            }
          })
        );
        setStatuses(statusData);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const upCount = Object.values(statuses).filter(s => s.current_status === 'up').length;
  const downCount = Object.values(statuses).filter(s => s.current_status === 'down').length;
  const healthScore = websites.length > 0 ? Math.round((upCount / websites.length) * 100) : 100;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Command Center</h1>
          <p className="mt-1 text-sm text-text-muted">Global system health and operational status.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <div className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium shadow-neu text-success bg-surface">
            <span className="w-2 h-2 mr-2 bg-success rounded-full shadow-[0_0_10px_rgba(46,204,113,0.6)]"></span>
            System Operational
          </div>
        </div>
      </div>

      {/* Global Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Health Score Card */}
        <Card className="transition-all hover:scale-[1.02] duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-muted">Global Health</h3>
            <div className={`p-2 rounded-full shadow-neu-icon ${healthScore >= 90 ? 'text-success' : 'text-warning'}`}>
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-text-main">{healthScore}%</span>
          </div>
        </Card>

        {/* Active Incidents Card */}
        <Card className="transition-all hover:scale-[1.02] duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-muted">Incidents</h3>
            <div className={`p-2 rounded-full shadow-neu-icon ${downCount > 0 ? 'text-danger' : 'text-text-muted'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-text-main">{downCount}</span>
          </div>
        </Card>

        {/* Security Status Card */}
        <Card className="transition-all hover:scale-[1.02] duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-muted">WAF Status</h3>
            <div className="p-2 rounded-full shadow-neu-icon text-primary">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-text-main text-success">Active</span>
          </div>
        </Card>

        {/* Infrastructure Card */}
        <Card className="transition-all hover:scale-[1.02] duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-muted">Global Nodes</h3>
            <div className="p-2 rounded-full shadow-neu-icon text-purple-500">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-text-main">Healthy</span>
          </div>
        </Card>

        {/* Threat Intel Card */}
        <Card className="transition-all hover:scale-[1.02] duration-300 border-t-2 border-danger">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-muted">Threats Blocked</h3>
            <div className="p-2 rounded-full shadow-neu-icon text-danger">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-text-main">0</span>
            <span className="ml-2 text-xs text-text-muted">/24h</span>
          </div>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="mb-8">
        <PlatformHealth />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Monitored Targets List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-main">Monitored Targets</h2>
            <Link to="/websites" className="px-4 py-2 text-sm font-medium text-primary rounded-xl shadow-neu hover:text-primary active:shadow-neu-pressed transition-all">View all</Link>
          </div>
          
          <div className="bg-surface shadow-neu rounded-2xl overflow-hidden p-2">
            <ul className="space-y-3">
              {websites.map((site) => {
                const status = statuses[site.id];
                const isUp = status?.current_status === 'up';
                
                return (
                  <li key={site.id} className="p-4 rounded-xl hover:shadow-neu-pressed transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-neu ${isUp ? 'text-success' : 'text-danger'}`}>
                          {isUp ? <Globe className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div className="ml-4 min-w-0">
                          <h3 className="text-sm font-bold text-text-main truncate">{site.name}</h3>
                          <p className="text-xs text-text-muted truncate">{site.url}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="hidden sm:block text-right">
                          <p className="text-xs text-text-muted">Response</p>
                          <p className="text-sm font-medium text-text-main">{status?.last_response_time || 0}ms</p>
                        </div>
                        <div className="hidden sm:block text-right">
                          <p className="text-xs text-text-muted">Uptime</p>
                          <p className="text-sm font-medium text-text-main">99.9%</p>
                        </div>
                        <Badge variant={isUp ? 'success' : 'danger'}>
                          {isUp ? 'Online' : 'Offline'}
                        </Badge>
                      </div>
                    </div>
                  </li>
                );
              })}
              
              {websites.length === 0 && (
                <li className="p-8 text-center text-text-muted">
                  No targets configured. <Link to="/websites" className="text-primary font-medium hover:underline">Add your first website</Link>.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Quick Actions & Recent Events */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-medium text-text-main mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/websites" className="flex flex-col items-center justify-center p-4 rounded-xl shadow-neu hover:text-primary active:shadow-neu-pressed transition-all duration-200 group">
                <Globe className="w-6 h-6 mb-2 text-text-muted group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-text-main">Add Target</span>
              </Link>
              <Link to="/security" className="flex flex-col items-center justify-center p-4 rounded-xl shadow-neu hover:text-primary active:shadow-neu-pressed transition-all duration-200 group">
                <Zap className="w-6 h-6 mb-2 text-text-muted group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-text-main">Run Scan</span>
              </Link>
              <Link to="/infrastructure" className="flex flex-col items-center justify-center p-4 rounded-xl shadow-neu hover:text-primary active:shadow-neu-pressed transition-all duration-200 group">
                <Server className="w-6 h-6 mb-2 text-text-muted group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-text-main text-center">Global Infra</span>
              </Link>
              <Link to="/security" className="flex flex-col items-center justify-center p-4 rounded-xl shadow-neu hover:text-primary active:shadow-neu-pressed transition-all duration-200 group">
                <Shield className="w-6 h-6 mb-2 text-text-muted group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-text-main text-center">Threat Intel</span>
              </Link>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-medium text-text-main mb-6">Recent Events</h3>
            <div className="flow-root">
              {alerts.length > 0 ? (
                <ul className="-mb-8">
                  {alerts.map((alert, idx) => (
                    <li key={alert.id} className="relative pb-8">
                      {idx !== alerts.length - 1 && (
                        <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-300" aria-hidden="true"></span>
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-10 w-10 rounded-full shadow-neu flex items-center justify-center bg-surface">
                            {alert.alert_type === 'recovery' ? (
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            ) : alert.alert_type === 'downtime' ? (
                              <AlertTriangle className="h-5 w-5 text-danger" />
                            ) : (
                              <Shield className="h-5 w-5 text-warning" />
                            )}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-text-main font-medium capitalize">
                              {alert.website?.name || 'Unknown Target'}: {alert.alert_type.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-text-muted">
                            <time dateTime={alert.triggered_timestamp}>
                              {formatDistanceToNow(new Date(alert.triggered_timestamp), { addSuffix: true })}
                            </time>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-text-muted">No recent events detected.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
