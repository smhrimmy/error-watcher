import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { Website, WebsiteStatus } from '../types';
import { ArrowLeft, Activity, AlertCircle, Shield, History, Settings, ShieldAlert, Github } from 'lucide-react';
import EmergencyPanel from '../components/emergency/EmergencyPanel';
import GithubPanel from '../components/github/GithubPanel';

export default function SiteDetail() {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<Website | null>(null);
  const [status, setStatus] = useState<WebsiteStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchSiteData = async () => {
    try {
      const [siteRes, statusRes] = await Promise.all([
        api.get(`/websites`), 
        api.get(`/websites/${id}/status`)
      ]);
      
      const foundSite = siteRes.data.find((w: Website) => w.id === id);
      setSite(foundSite || null);
      setStatus(statusRes.data);
    } catch (err) {
      console.error('Failed to fetch site details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchSiteData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Website not found</h2>
        <Link to="/websites" className="mt-4 text-blue-600 hover:underline">Back to websites</Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'logs', name: 'Logs', icon: History },
    { id: 'alerts', name: 'Alerts', icon: AlertCircle },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'github', name: 'GitHub', icon: Github },
    { id: 'emergency', name: 'Emergency', icon: ShieldAlert },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link to="/websites" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Websites
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              {site.name}
              <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                status?.current_status === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {status?.current_status === 'up' ? 'Online' : 'Offline'}
              </span>
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {site.url}
            </p>
          </div>
          <div className="flex gap-2">
             {site.tags?.map(tag => (
                <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {tag}
                </span>
             ))}
          </div>
        </div>
        <div className="border-t border-gray-200">
          <div className="sm:hidden">
            <select
              id="tabs"
              name="tabs"
              className="block w-full focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>{tab.name}</option>
              ))}
            </select>
          </div>
          <div className="hidden sm:block">
            <nav className="flex divide-x divide-gray-200" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-4 text-sm font-medium text-center hover:bg-gray-50 focus:z-10
                      ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}
                    `}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                      <span>{tab.name}</span>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`
                        absolute inset-x-0 bottom-0 h-0.5
                        ${activeTab === tab.id ? 'bg-blue-500' : 'bg-transparent'}
                      `}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
             <div className="bg-white overflow-hidden shadow rounded-lg p-5">
               <dt className="text-sm font-medium text-gray-500 truncate">Last Response Time</dt>
               <dd className="mt-1 text-3xl font-semibold text-gray-900">{status?.last_response_time || 0}ms</dd>
             </div>
             <div className="bg-white overflow-hidden shadow rounded-lg p-5">
               <dt className="text-sm font-medium text-gray-500 truncate">24h Uptime</dt>
               <dd className="mt-1 text-3xl font-semibold text-gray-900">{status?.uptime_24h || 100}%</dd>
             </div>
             <div className="bg-white overflow-hidden shadow rounded-lg p-5">
               <dt className="text-sm font-medium text-gray-500 truncate">Check Interval</dt>
               <dd className="mt-1 text-3xl font-semibold text-gray-900">{site.check_interval}m</dd>
             </div>
          </div>
        )}
        
        {activeTab === 'logs' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Checks</h4>
            <p className="text-gray-500 text-sm">Logs for this specific site will appear here.</p>
            {/* Can reuse EventLogs component logic here or embed it */}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Security Information</h4>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded p-4">
                 <h5 className="font-medium text-gray-900">SSL/TLS Status</h5>
                 <p className="text-sm text-gray-500 mt-1">Monitoring SSL certificates is a premium feature.</p>
              </div>
              <div className="border border-gray-200 rounded p-4">
                 <h5 className="font-medium text-gray-900">Security Headers</h5>
                 <p className="text-sm text-gray-500 mt-1">HSTS, CSP, and X-Frame-Options analysis.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'github' && (
          <GithubPanel website={site} />
        )}

        {activeTab === 'emergency' && (
          <EmergencyPanel 
            websiteId={site.id} 
            maintenanceMode={!!site.maintenance_mode} 
            onUpdate={fetchSiteData} 
          />
        )}

        {activeTab === 'settings' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Site Configuration</h4>
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(site, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}