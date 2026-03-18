import { useState, useEffect } from 'react';
import { Server, Cpu, HardDrive, Network, Plus, Terminal } from 'lucide-react';
import api from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Agent {
  id: string;
  hostname: string;
  ip_address: string;
  os_info: any;
  status: 'online' | 'offline' | 'maintenance';
  last_heartbeat: string;
  version: string;
}

export default function Infrastructure() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [newAgent, setNewAgent] = useState<{ id: string; apiKey: string } | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data } = await api.get('/infrastructure/agents');
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async () => {
    try {
      const { data } = await api.post('/infrastructure/agents', {
        hostname: 'New Server (Pending)',
        os_info: { type: 'Linux' },
        version: '1.0.0'
      });
      setNewAgent(data);
      setShowInstallModal(true);
      fetchAgents();
    } catch (err) {
      console.error('Failed to create agent:', err);
      alert('Failed to generate agent key');
    }
  };

  const onlineCount = agents.filter(a => a.status === 'online').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Infrastructure</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor server health, resource usage, and agent status.
          </p>
        </div>
        <button
          type="button"
          onClick={createAgent}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Agent
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Server className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Servers</dt>
                <dd className="text-2xl font-bold text-gray-900">{agents.length}</dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Cpu className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Online Agents</dt>
                <dd className="text-2xl font-bold text-gray-900">{onlineCount}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-xl">
              <Network className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Network Status</dt>
                <dd className="text-2xl font-bold text-gray-900 text-green-600">Normal</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Connected Servers</h3>
        </div>
        
        {loading ? (
           <div className="p-8 text-center">
             <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
           </div>
        ) : agents.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Server className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">No infrastructure agents connected</h3>
            <p className="mt-1 text-sm text-gray-500">Install the agent on your servers to see metrics here.</p>
            <button
              onClick={createAgent}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700"
            >
              Get Installation Command
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {agents.map((agent) => (
              <li key={agent.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-3 w-3 rounded-full mr-4 ${
                      agent.status === 'online' ? 'bg-green-500 ring-4 ring-green-100' : 'bg-gray-300'
                    }`} />
                    <div>
                      <p className="text-sm font-bold text-gray-900 truncate">{agent.hostname}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{agent.ip_address || 'Unknown IP'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        agent.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Last Seen</p>
                      <p className="text-sm font-medium text-gray-900">
                        {agent.last_heartbeat ? formatDistanceToNow(new Date(agent.last_heartbeat), { addSuffix: true }) : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Install Agent Modal */}
      {showInstallModal && newAgent && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowInstallModal(false)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <Terminal className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-bold text-gray-900">Install Agent</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Run this command on your server to install and register the monitoring agent.
                    </p>
                    <div className="mt-4 bg-gray-900 rounded-xl p-4 text-left overflow-x-auto border border-gray-800">
                      <code className="text-sm text-green-400 whitespace-pre-wrap break-all font-mono">
                        {`# 1. Download the agent script
curl -o agent.js ${window.location.origin}/scripts/agent.js

# 2. Run the agent
export AGENT_ID="${newAgent.id}"
export AGENT_KEY="${newAgent.apiKey}"
export API_URL="${window.location.origin.replace('3001', '3002')}/api/infrastructure"
node agent.js`}
                      </code>
                    </div>
                    <p className="mt-3 text-xs text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                      ⚠️ Save these credentials! The API key will not be shown again.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex justify-center w-full rounded-xl border border-transparent shadow-sm px-4 py-3 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors"
                  onClick={() => setShowInstallModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
