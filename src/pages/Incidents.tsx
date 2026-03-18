import { useState, useEffect } from 'react';
import { AlertOctagon, CheckCircle, Clock, AlertTriangle, Download } from 'lucide-react';
import api from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function Incidents() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const { data } = await api.get('/alerts/history');
        // Filter out only downtime/critical alerts to show as incidents
        const filtered = data.filter((a: any) => a.alert_type === 'downtime');
        setIncidents(filtered);
      } catch (err) {
        console.error('Failed to fetch incidents:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchIncidents();
  }, []);

  const activeIncidents = incidents.filter(i => ((i as any).alert_state || i.status) !== 'resolved');
  const pastIncidents = incidents.filter(i => ((i as any).alert_state || i.status) === 'resolved');

  const handleExportCSV = () => {
    if (incidents.length === 0) return;

    const headers = ['Incident ID', 'Website', 'URL', 'Status', 'Triggered', 'Resolved'];
    const csvData = incidents.map(incident => [
      incident.id,
      incident.website?.name || 'Unknown',
      incident.website?.url || 'Unknown',
      (incident as any).alert_state || incident.status,
      new Date(incident.triggered_timestamp).toLocaleString(),
      incident.resolved_timestamp ? new Date(incident.resolved_timestamp).toLocaleString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `incidents-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track alerts, outages, and resolution timelines.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={incidents.length === 0}
          className="inline-flex items-center justify-center rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-gray-400" />
            Active Incidents
          </h3>
          {activeIncidents.length === 0 ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 shadow-sm">
              <span className="w-2 h-2 mr-1.5 bg-green-500 rounded-full animate-pulse"></span>
              All Systems Operational
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 shadow-sm">
              <span className="w-2 h-2 mr-1.5 bg-red-500 rounded-full animate-pulse"></span>
              {activeIncidents.length} Active Incident(s)
            </span>
          )}
        </div>
        
        {activeIncidents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-green-50/50">
               <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No active incidents</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
               Everything is running smoothly. We'll notify you if any critical issues arise.
            </p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-gray-100">
            {activeIncidents.map(incident => (
              <li key={incident.id} className="hover:bg-gray-50 transition-colors">
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                       <div className="p-2 bg-red-50 rounded-lg mr-3">
                          <AlertOctagon className="h-5 w-5 text-red-500" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-gray-900">
                             Downtime - {incident.website?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                             {incident.website?.url || 'Unknown'}
                          </p>
                       </div>
                    </div>
                    <div className="flex-shrink-0 flex">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 sm:flex sm:justify-between items-center pl-12">
                    <div className="sm:flex gap-6">
                      <p className="flex items-center text-xs text-gray-500 font-medium">
                        <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        Triggered: {formatDistanceToNow(new Date(incident.triggered_timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">Past Incidents</h3>
        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
          <ul role="list" className="divide-y divide-gray-100">
            {pastIncidents.length > 0 ? pastIncidents.map(incident => (
              <li key={incident.id} className="hover:bg-gray-50 transition-colors">
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                       <div className="p-2 bg-green-50 rounded-lg mr-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-gray-900">
                             Resolved - {incident.website?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                             {incident.website?.url || 'Unknown'}
                          </p>
                       </div>
                    </div>
                    <div className="flex-shrink-0 flex">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                        Resolved
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 sm:flex sm:justify-between items-center pl-12">
                    <div className="sm:flex gap-6">
                      <p className="flex items-center text-xs text-gray-500 font-medium">
                        <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        Duration: {
                          incident.resolved_timestamp 
                          ? formatDistanceToNow(new Date(incident.triggered_timestamp)) 
                          : 'Unknown'
                        }
                      </p>
                      <p className="flex items-center text-xs text-gray-500 font-medium mt-2 sm:mt-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mr-2"></span>
                        {incident.resolved_timestamp ? new Date(incident.resolved_timestamp).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            )) : (
              <li className="p-8 text-center text-gray-500 text-sm">
                No past incidents found.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
