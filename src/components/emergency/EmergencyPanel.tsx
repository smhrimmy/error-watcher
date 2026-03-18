import { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Power, Trash2, AlertTriangle, X, Check, History } from 'lucide-react';
import api from '../../lib/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  created_at: string;
}

interface EmergencyPanelProps {
  websiteId: string;
  maintenanceMode: boolean;
  onUpdate: () => void;
}

interface PreviewAction {
  type: 'maintenance' | 'block_ip' | 'unblock_ip';
  data: any;
  risk: 'High' | 'Medium' | 'Low';
  impact: string;
}

export default function EmergencyPanel({ websiteId, maintenanceMode, onUpdate }: EmergencyPanelProps) {
  const [blockedIps, setBlockedIps] = useState<BlockedIP[]>([]);
  const [ipToBlock, setIpToBlock] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewAction, setPreviewAction] = useState<PreviewAction | null>(null);

  useEffect(() => {
    fetchBlockedIps();
  }, []);

  const fetchBlockedIps = async () => {
    try {
      const { data } = await api.get('/emergency/blocked-ips');
      setBlockedIps(data);
    } catch (err) {
      console.error('Failed to fetch blocked IPs', err);
    }
  };

  const initiateMaintenanceToggle = () => {
    setPreviewAction({
      type: 'maintenance',
      data: { enabled: !maintenanceMode },
      risk: 'High',
      impact: maintenanceMode 
        ? 'Traffic will resume normally. Ensure backend is ready.' 
        : 'All traffic will be blocked with a maintenance page. 100% availability impact.'
    });
  };

  const initiateBlockIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipToBlock) return;
    setPreviewAction({
      type: 'block_ip',
      data: { ip_address: ipToBlock, reason: blockReason || 'Manual block' },
      risk: 'Medium',
      impact: `Traffic from ${ipToBlock} will be rejected immediately. Checks might fail if this is a monitor node.`
    });
  };

  const initiateUnblockIp = (id: string) => {
    setPreviewAction({
      type: 'unblock_ip',
      data: { id },
      risk: 'Low',
      impact: 'Traffic from this IP will be allowed again.'
    });
  };

  const executeAction = async () => {
    if (!previewAction) return;

    setLoading(true);
    try {
      if (previewAction.type === 'maintenance') {
        await api.post(`/emergency/maintenance/${websiteId}`, previewAction.data);
        onUpdate();
      } else if (previewAction.type === 'block_ip') {
        await api.post('/emergency/block-ip', previewAction.data);
        setIpToBlock('');
        setBlockReason('');
        fetchBlockedIps();
      } else if (previewAction.type === 'unblock_ip') {
        await api.delete(`/emergency/block-ip/${previewAction.data.id}`);
        fetchBlockedIps();
      }
      setPreviewAction(null);
    } catch (err) {
      alert('Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-danger/20 shadow-neu">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-full bg-danger/10 shadow-neu-icon text-danger">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-danger">Emergency Lockdown</h3>
              <p className="mt-1 text-sm text-text-muted">
                Immediate actions to protect your infrastructure. Use with caution.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Maintenance Mode */}
        <Card className="border-t-4 border-warning">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-text-main flex items-center">
              <Power className="h-5 w-5 mr-2 text-warning" />
              Maintenance Mode
            </h4>
            <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-neu-sm ${
              maintenanceMode ? 'bg-surface text-danger' : 'bg-surface text-success'
            }`}>
              {maintenanceMode ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <p className="text-sm text-text-muted mb-6">
            Immediately display a maintenance page to all visitors. Useful during attacks or critical updates.
          </p>
          <Button
            onClick={initiateMaintenanceToggle}
            disabled={loading}
            fullWidth
            variant={maintenanceMode ? 'success' : 'danger'}
          >
            {maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
          </Button>
        </Card>

        {/* IP Blocking */}
        <Card className="border-t-4 border-text-main">
          <h4 className="text-lg font-bold text-text-main flex items-center mb-4">
            <Lock className="h-5 w-5 mr-2" />
            Block Suspicious IP
          </h4>
          <form onSubmit={initiateBlockIp} className="space-y-4">
            <Input
              label="IP Address"
              id="ip"
              value={ipToBlock}
              onChange={(e) => setIpToBlock(e.target.value)}
              placeholder="192.168.1.1"
              required
            />
            <Input
              label="Reason"
              id="reason"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="DDoS Attempt"
            />
            <Button
              type="submit"
              disabled={loading}
              fullWidth
            >
              Block IP
            </Button>
          </form>
        </Card>
      </div>

      {/* Blocked IPs List */}
      <Card noPadding className="overflow-hidden">
        <div className="px-6 py-4 border-b border-text-muted/10 mb-2">
          <h3 className="text-lg leading-6 font-bold text-text-main">Blocked IP Addresses</h3>
        </div>
        <ul className="space-y-2 p-4">
          {blockedIps.length === 0 ? (
            <li className="px-4 py-8 text-center text-text-muted text-sm">No IPs blocked</li>
          ) : (
            blockedIps.map((ip) => (
              <li key={ip.id} className="px-4 py-4 rounded-xl shadow-neu flex items-center justify-between hover:scale-[1.01] transition-transform bg-surface">
                <div>
                  <p className="text-sm font-bold text-danger">{ip.ip_address}</p>
                  <p className="text-xs text-text-muted">{ip.reason} • {new Date(ip.created_at).toLocaleDateString()}</p>
                </div>
                <Button
                  onClick={() => initiateUnblockIp(ip.id)}
                  variant="secondary"
                  size="sm"
                  className="p-2 rounded-full text-text-muted hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))
          )}
        </ul>
      </Card>

      {/* Execution Preview Modal */}
      {previewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <Card className="max-w-md w-full border border-surface">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-main flex items-center">
                <AlertTriangle className="w-6 h-6 text-warning mr-2" />
                Confirm Execution
              </h3>
              <button onClick={() => setPreviewAction(null)} className="text-text-muted hover:text-text-main">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-surface shadow-neu-pressed rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted block mb-1">Action Type</span>
                    <span className="font-bold text-text-main uppercase">{previewAction.type.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block mb-1">Risk Level</span>
                    <span className={`font-bold ${
                      previewAction.risk === 'High' ? 'text-danger' : 
                      previewAction.risk === 'Medium' ? 'text-warning' : 'text-success'
                    }`}>{previewAction.risk}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-sm font-bold text-text-main block mb-2">Estimated Impact</span>
                <p className="text-sm text-text-muted bg-surface p-3 rounded-xl shadow-neu-pressed border-l-4 border-primary">
                  {previewAction.impact}
                </p>
              </div>

              <div>
                <span className="text-sm font-bold text-text-main block mb-2">Execution Log Preview</span>
                <div className="bg-gray-900 text-green-400 p-3 rounded-xl font-mono text-xs shadow-inner">
                  <p>{`> PREPARING EXECUTION...`}</p>
                  <p>{`> VALIDATING PERMISSIONS... [OK]`}</p>
                  <p>{`> TARGET: ${previewAction.type === 'block_ip' ? previewAction.data.ip_address : 'SYSTEM_WIDE'}`}</p>
                  <p className="animate-pulse">{`> WAITING FOR CONFIRMATION...`}</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={() => setPreviewAction(null)}
                variant="secondary"
                fullWidth
              >
                Cancel
              </Button>
              <Button
                onClick={executeAction}
                disabled={loading}
                variant="primary"
                fullWidth
              >
                {loading ? 'Executing...' : 'Confirm & Execute'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
