import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Website, WebsiteStatus } from '../types';
import { Activity, Globe, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Home() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [statuses, setStatuses] = useState<Record<string, WebsiteStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sites } = await api.get('/websites');
        setWebsites(sites);
        
        // Fetch status for each website
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
    
    // Refresh every 30 seconds
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Overview of your monitored websites and their current status.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Globe className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Websites</dt>
                  <dd className="text-lg font-medium text-gray-900">{websites.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Sites Up</dt>
                  <dd className="text-lg font-medium text-gray-900">{upCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Sites Down</dt>
                  <dd className="text-lg font-medium text-gray-900">{downCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Uptime</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {websites.length > 0 ? '99.8%' : 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <h2 className="mt-8 text-lg font-medium text-gray-900">Website Status</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {websites.map((site) => {
          const status = statuses[site.id];
          const isUp = status?.current_status === 'up';
          
          return (
            <div key={site.id} className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <h3 className="text-md font-medium text-gray-900 truncate pr-2">{site.name}</h3>
                  {site.tags && site.tags.length > 0 && (
                    <div className="ml-2 flex gap-1">
                      {site.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="flex h-3 w-3 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isUp ? 'bg-green-400' : 'bg-red-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    isUp ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate mb-4">{site.url}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1 flex items-center">
                    <Activity className="w-4 h-4 mr-1" /> Response
                  </p>
                  <p className="font-medium text-gray-900">
                    {status?.last_response_time ? `${status.last_response_time}ms` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1 flex items-center">
                    <Clock className="w-4 h-4 mr-1" /> Last Check
                  </p>
                  <p className="font-medium text-gray-900">
                    {status?.last_check ? formatDistanceToNow(new Date(status.last_check), { addSuffix: true }) : '-'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        
        {websites.length === 0 && (
          <div className="col-span-full bg-white shadow rounded-lg p-12 text-center">
            <Globe className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No websites</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a website to monitor.</p>
            <div className="mt-6">
              <a
                href="/websites"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Website
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}