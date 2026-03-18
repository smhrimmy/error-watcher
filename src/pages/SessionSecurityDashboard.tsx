import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../lib/api';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: string;
  metadata: any;
}

interface UserSession {
  id: string;
  device_fingerprint: string;
  ip_address: string;
  user_agent: string;
  status: 'active' | 'revoked' | 'expired';
  created_at: string;
  last_activity: string;
  location_data: {
    country?: string;
    city?: string;
    region?: string;
  };
}

interface SecurityStatus {
  totalSessions: number;
  activeSessions: number;
  suspiciousEvents: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recentEvents: SecurityEvent[];
}

export default function SessionSecurityDashboard() {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      const [statusRes, sessionsRes] = await Promise.all([
        api.get('/security/session-status'),
        api.get('/security/sessions')
      ]);

      setSecurityStatus(statusRes.data);
      setSessions(sessionsRes.data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/security/sessions/${sessionId}`);
      fetchSecurityData();
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile')) return Smartphone;
    if (userAgent.includes('Tablet')) return Tablet;
    return Monitor;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="transition-all hover:scale-[1.02] duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-muted">Total Sessions</h3>
            <div className="p-2 rounded-full shadow-neu-icon text-blue-500">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-text-main">{securityStatus?.totalSessions || 0}</span>
          </div>
        </Card>

        <Card className="transition-all hover:scale-[1.02] duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-muted">Active Sessions</h3>
            <div className="p-2 rounded-full shadow-neu-icon text-green-500">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-text-main">{securityStatus?.activeSessions || 0}</span>
          </div>
        </Card>

        <Card className="transition-all hover:scale-[1.02] duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-muted">Suspicious Events</h3>
            <div className="p-2 rounded-full shadow-neu-icon text-orange-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-text-main">{securityStatus?.suspiciousEvents || 0}</span>
          </div>
        </Card>

        <Card className="transition-all hover:scale-[1.02] duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-muted">Risk Level</h3>
            <div className="p-2 rounded-full shadow-neu-icon text-purple-500">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline">
            <span className={`text-3xl font-bold ${getRiskColor(securityStatus?.riskLevel || 'low')}`}>
              {securityStatus?.riskLevel || 'low'}
            </span>
          </div>
        </Card>
      </div>

      {/* Recent Security Events */}
      <Card>
        <h3 className="text-lg font-bold text-text-main mb-6">Recent Security Events</h3>
        <div className="space-y-4">
          {securityStatus?.recentEvents?.length === 0 ? (
            <p className="text-text-muted text-center py-8">No recent security events</p>
          ) : (
            securityStatus?.recentEvents?.map((event) => (
              <div key={event.id} className="p-4 rounded-xl shadow-neu-pressed bg-surface flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full shadow-neu-icon ${
                    event.severity === 'critical' ? 'text-red-500' :
                    event.severity === 'high' ? 'text-orange-500' :
                    event.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {event.severity === 'critical' ? <XCircle className="w-5 h-5" /> :
                     event.severity === 'high' ? <AlertTriangle className="w-5 h-5" /> :
                     event.severity === 'medium' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-text-main">{event.description}</p>
                    <p className="text-sm text-text-muted">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                  {event.severity}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Active Sessions */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-text-main">Active Sessions</h3>
          <Button onClick={fetchSecurityData} variant="secondary" size="sm">
            Refresh
          </Button>
        </div>
        
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-text-muted text-center py-8">No active sessions</p>
          ) : (
            sessions.map((session) => {
              const DeviceIcon = getDeviceIcon(session.user_agent);
              const isCurrentSession = session.id === sessions[0]?.id; // Assuming first is current
              
              return (
                <div key={session.id} className={`p-4 rounded-xl shadow-neu-pressed bg-surface ${
                  isCurrentSession ? 'ring-2 ring-primary' : ''
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-full shadow-neu-icon bg-surface">
                        <DeviceIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-text-main">
                          {session.location_data?.city ? `${session.location_data.city}, ${session.location_data.country}` : 'Unknown Location'}
                        </p>
                        <p className="text-sm text-text-muted">IP: {session.ip_address}</p>
                        <p className="text-sm text-text-muted">Last activity: {new Date(session.last_activity).toLocaleString()}</p>
                        {isCurrentSession && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />Current Session
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => setSelectedSession(session)}
                        variant="secondary"
                        size="sm"
                      >
                        Details
                      </Button>
                      {!isCurrentSession && (
                        <Button
                          onClick={() => revokeSession(session.id)}
                          variant="danger"
                          size="sm"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setSelectedSession(null)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-surface rounded-2xl text-left overflow-hidden shadow-neu transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl leading-6 font-bold text-text-main" id="modal-title">
                    Session Details
                  </h3>
                  <button onClick={() => setSelectedSession(null)} className="text-text-muted hover:text-text-main">
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">Device Fingerprint</label>
                    <p className="text-sm text-text-main font-mono bg-surface shadow-neu-pressed p-2 rounded-lg">{selectedSession.device_fingerprint}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">User Agent</label>
                    <p className="text-sm text-text-main bg-surface shadow-neu-pressed p-2 rounded-lg">{selectedSession.user_agent}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">Created</label>
                      <p className="text-sm text-text-main">{new Date(selectedSession.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">Last Activity</label>
                      <p className="text-sm text-text-main">{new Date(selectedSession.last_activity).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">Status</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      selectedSession.status === 'active' ? 'bg-green-100 text-green-800' :
                      selectedSession.status === 'revoked' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedSession.status}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <Button
                    onClick={() => {
                      revokeSession(selectedSession.id);
                      setSelectedSession(null);
                    }}
                    variant="danger"
                    className="flex-1"
                  >
                    Revoke Session
                  </Button>
                  <Button
                    onClick={() => setSelectedSession(null)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}