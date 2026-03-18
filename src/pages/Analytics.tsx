import { useState, useEffect } from 'react';
import { Website, AnalyticsData } from '../types';
import api from '../lib/api';
import { Activity, Clock, AlertTriangle, Calendar, BarChart2 } from 'lucide-react';
import { LineChart } from '@toast-ui/react-chart';
import '@toast-ui/chart/dist/toastui-chart.min.css';

export default function Analytics() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>('all');
  const [period, setPeriod] = useState<string>('7d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        const { data } = await api.get('/websites');
        setWebsites(data);
      } catch (err) {
        console.error('Failed to fetch websites:', err);
      }
    };
    fetchWebsites();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedWebsite !== 'all') params.append('website_id', selectedWebsite);
        params.append('period', period);
        
        const { data } = await api.get(`/monitoring/analytics?${params.toString()}`);
        setData(data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedWebsite, period]);

  const lineChartData = {
    categories: data?.response_time_trend.map(d => new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) || [],
    series: [
      {
        name: 'Response Time (ms)',
        data: data?.response_time_trend.map(d => d.avg_response_time) || [],
      },
    ],
  };

  const lineChartOptions = {
    chart: { width: 'auto', height: 400 },
    xAxis: { title: 'Time' },
    yAxis: { title: 'Milliseconds' },
    tooltip: { formatter: (value: number) => `${value}ms` },
    theme: {
      series: {
        colors: ['#3B82F6'],
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Detailed performance and uptime analytics for your monitored websites.
          </p>
        </div>
        
        <div className="flex gap-4">
          <select
            value={selectedWebsite}
            onChange={(e) => setSelectedWebsite(e.target.value)}
            className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 pl-3 pr-10 border bg-white text-gray-700"
          >
            <option value="all">All Websites</option>
            {websites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
          
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 pl-3 pr-10 border bg-white text-gray-700"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 mt-8 bg-white shadow-sm border border-gray-100 rounded-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Uptime Percentage</dt>
                  <dd className="text-2xl font-bold text-gray-900">{data.uptime_percentage}%</dd>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 rounded-xl">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Response Time</dt>
                  <dd className="text-2xl font-bold text-gray-900">{data.average_response_time}ms</dd>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-red-50 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Outages</dt>
                  <dd className="text-2xl font-bold text-gray-900">{data.total_outages}</dd>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-50 rounded-xl">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Downtime Minutes</dt>
                  <dd className="text-2xl font-bold text-gray-900">{data.total_downtime_minutes}m</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <BarChart2 className="w-5 h-5 mr-2 text-gray-400" />
                  Response Time Trend
               </h3>
            </div>
            <div className="w-full overflow-hidden">
              {data.response_time_trend.length > 0 ? (
                <LineChart data={lineChartData} options={lineChartOptions} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Not enough data for this period
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-12 text-center text-gray-500">
          Failed to load analytics data
        </div>
      )}
    </div>
  );
}
