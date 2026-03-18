import { useState, useEffect } from 'react';
import api from '../lib/api';
import { BellRing, CheckCircle, AlertTriangle, Clock, Bell, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  website_id: string;
  alert_type: string;
  delivery_method: string;
  triggered_timestamp: string;
  resolved_timestamp: string | null;
  failure_count: number;
  status: 'open' | 'resolved' | 'escalated';
  website: {
    id: string;
    name: string;
    url: string;
  };
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data } = await api.get('/alerts/history');
        setAlerts(data);
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlerts();
  }, []);

  const handleExportCSV = () => {
    if (alerts.length === 0) return;

    const headers = ['Website Name', 'URL', 'Alert Type', 'Status', 'Triggered', 'Resolved'];
    const csvData = alerts.map(alert => [
      alert.website?.name || 'Unknown',
      alert.website?.url || 'Unknown',
      alert.alert_type,
      (alert as any).alert_state || alert.status,
      new Date(alert.triggered_timestamp).toLocaleString(),
      alert.resolved_timestamp ? new Date(alert.resolved_timestamp).toLocaleString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alerts-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert History</h1>
          <p className="mt-1 text-sm text-gray-500">
            A complete history of all alerts generated for your monitored websites.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={alerts.length === 0 || loading}
          className="inline-flex items-center justify-center rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center">
           <Bell className="w-5 h-5 mr-2 text-gray-400" />
           <h3 className="text-lg font-bold text-gray-900">Recent Alerts</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : alerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Website</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">State</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Triggered</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs mr-3">
                           {alert.website?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900">{alert.website?.name || 'Unknown'}</div>
                          <div className="text-gray-500 text-xs font-mono">{alert.website?.url || 'Unknown'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        {alert.alert_type === 'downtime' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                        ) : alert.alert_type === 'recovery' ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500 mr-2" />
                        )}
                        <span className="capitalize font-medium text-gray-700">{alert.alert_type.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize border ${
                        ((alert as any).alert_state || alert.status) === 'resolved' 
                          ? 'bg-green-50 text-green-700 border-green-100' 
                          : ((alert as any).alert_state || alert.status) === 'open' 
                            ? 'bg-red-50 text-red-700 border-red-100' 
                            : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                      }`}>
                        {(alert as any).alert_state || alert.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-medium">
                      {formatDistanceToNow(new Date(alert.triggered_timestamp), { addSuffix: true })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-medium">
                      {alert.resolved_timestamp ? 
                        formatDistanceToNow(new Date(alert.resolved_timestamp), { addSuffix: true }) : 
                        '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
               <BellRing className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No alerts yet</h3>
            <p className="mt-1 text-sm text-gray-500">Your monitored websites have been stable. Good job!</p>
          </div>
        )}
      </div>
    </div>
  );
}
