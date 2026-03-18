import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  Eye, 
  AlertTriangle, 
  Lock, 
  Menu,
  CheckCircle2,
  FileText,
  Ban
} from 'lucide-react';
import { Card } from '../components/ui/Card';

interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: string;
  severity: string;
  source_ip: string;
  description: string;
  action_taken: string;
}

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  created_at: string;
  risk_score: number;
}

interface SecurityMetrics {
  total_threats: number;
  blocked_ips: number;
  active_alerts: number;
  risk_score: number;
}

export default function SecurityCenter() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    total_threats: 0,
    blocked_ips: 0,
    active_alerts: 0,
    risk_score: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'blocked' | 'analytics'>('analytics');

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      // Fetch security events
      const eventsResponse = await fetch('/api/security/events');
      const eventsData = await eventsResponse.json();
      
      // Fetch blocked IPs
      const blockedResponse = await fetch('/api/security/blocked-ips');
      const blockedData = await blockedResponse.json();
      
      // Fetch metrics
      const metricsResponse = await fetch('/api/security/metrics');
      const metricsData = await metricsResponse.json();
      
      setSecurityEvents(eventsData.events || []);
      setBlockedIPs(blockedData.ips || []);
      setMetrics(metricsData.metrics || {
        total_threats: 0,
        blocked_ips: 0,
        active_alerts: 0,
        risk_score: 0
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-500">Loading security data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded-lg shadow-sm">
             <Shield className="w-6 h-6 text-gray-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Security Command Center</h1>
          <div className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold flex items-center shadow-sm border border-red-100">
            + Fortress Mode Active
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            Last updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
          <button className="p-2 rounded-lg hover:bg-white transition-colors text-gray-400">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <p className="text-gray-500 text-sm font-medium">Total Threats</p>
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-500">{metrics.total_threats}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <p className="text-gray-500 text-sm font-medium">Blocked IPs</p>
            <Lock className="w-6 h-6 text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-orange-400">{metrics.blocked_ips}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <p className="text-gray-500 text-sm font-medium">Active Alerts</p>
            <Eye className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-yellow-500">{metrics.active_alerts}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <p className="text-gray-500 text-sm font-medium">Risk Score</p>
            <Activity className="w-6 h-6 text-green-500" />
          </div>
          <div className="flex items-baseline">
             <p className="text-3xl font-bold text-green-500">{metrics.risk_score}</p>
             <span className="text-gray-400 text-lg ml-1">/100</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'events'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Security Events
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'blocked'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Blocked IPs
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'analytics'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Security Analytics</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Threat Detection Methods */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Threat Detection Methods</h3>
              <div className="space-y-4">
                {[
                  { name: 'WAF Protection', status: 'Active' },
                  { name: 'DevTools Detection', status: 'Active' },
                  { name: 'Headless Browser Detection', status: 'Active' },
                  { name: 'Rate Limiting', status: 'Active' }
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">{item.name}</span>
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-100">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Protection Status */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Protection Status</h3>
              <div className="space-y-4">
                {[
                  { name: 'Fortress Mode', status: 'Enabled' },
                  { name: 'Auto-Containment', status: 'Enabled' },
                  { name: 'Session Protection', status: 'Enabled' },
                  { name: 'IP Intelligence', status: 'Enabled' }
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">{item.name}</span>
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-100">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
             <h3 className="text-lg font-bold text-gray-900">Security Events Log</h3>
             <span className="text-sm text-gray-500">{securityEvents.length} events recorded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Severity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Event Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Source IP</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {securityEvents.length > 0 ? securityEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        event.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-100' :
                        event.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        event.severity === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                        'bg-green-50 text-green-700 border-green-100'
                      }`}>
                        {event.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                      {event.event_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      {event.source_ip || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                      {event.description}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                      No security events recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'blocked' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
             <h3 className="text-lg font-bold text-gray-900">Blocked IP Addresses</h3>
             <span className="text-sm text-gray-500">{blockedIPs.length} IPs blocked</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">IP Address</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Blocked At</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Risk Score</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {blockedIPs.length > 0 ? blockedIPs.map((ip) => (
                  <tr key={ip.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-red-600 font-medium">
                      {ip.ip_address}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {ip.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ip.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        ip.risk_score > 80 ? 'bg-red-50 text-red-700 border-red-100' :
                        ip.risk_score > 50 ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        'bg-yellow-50 text-yellow-700 border-yellow-100'
                      }`}>
                        {ip.risk_score}/100
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors">
                        Unblock
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                      No IP addresses are currently blocked.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
