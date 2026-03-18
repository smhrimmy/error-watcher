import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Lock, AlertOctagon } from 'lucide-react';
import api from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  finding_type: string;
  description: string;
  status: 'open' | 'resolved' | 'ignored';
  detected_at: string;
  website: {
    name: string;
  };
}

export default function SecurityCenter() {
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFindings();
  }, []);

  const fetchFindings = async () => {
    try {
      const { data } = await api.get('/security/findings');
      setFindings(data);
    } catch (err) {
      console.error('Failed to fetch security findings:', err);
    } finally {
      setLoading(false);
    }
  };

  const criticalCount = findings.filter(f => f.severity === 'critical' && f.status === 'open').length;
  const highCount = findings.filter(f => f.severity === 'high' && f.status === 'open').length;
  const mediumCount = findings.filter(f => f.severity === 'medium' && f.status === 'open').length;

  // Mock security score logic
  const calculateScore = () => {
    if (criticalCount > 0) return 'F';
    if (highCount > 0) return 'C';
    if (mediumCount > 0) return 'B';
    return 'A+';
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Security Center</h1>
          <p className="mt-2 text-sm text-gray-700">
            Vulnerability scanning, SSL monitoring, and threat detection.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <div className="flex items-center">
            <Shield className={`h-6 w-6 ${criticalCount > 0 ? 'text-red-500' : 'text-green-500'}`} />
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Security Score</dt>
                <dd className="text-lg font-medium text-gray-900">{calculateScore()}</dd>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <div className="flex items-center">
            <AlertOctagon className="h-6 w-6 text-red-500" />
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Critical Issues</dt>
                <dd className="text-lg font-medium text-gray-900">{criticalCount}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">High Severity</dt>
                <dd className="text-lg font-medium text-gray-900">{highCount}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <div className="flex items-center">
            <Lock className="h-6 w-6 text-blue-500" />
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">SSL Status</dt>
                <dd className="text-lg font-medium text-gray-900">Monitoring Active</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Security Findings</h3>
          <span className="text-sm text-gray-500">Last updated: Just now</span>
        </div>
        
        {loading ? (
           <div className="p-8 text-center">
             <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
           </div>
        ) : findings.length === 0 ? (
          <div className="text-center text-gray-500 py-12 border-t border-gray-200">
            <Shield className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No vulnerabilities detected</h3>
            <p className="mt-1 text-sm text-gray-500">Great job! Your systems appear to be secure.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {findings.map((finding) => (
              <li key={finding.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-2 w-2 rounded-full mr-4 ${
                      finding.severity === 'critical' ? 'bg-red-600' :
                      finding.severity === 'high' ? 'bg-orange-500' :
                      finding.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <p className="text-sm font-medium text-blue-600 truncate">{finding.finding_type}</p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      finding.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      finding.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {finding.severity.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      {finding.description}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>
                      Detected {formatDistanceToNow(new Date(finding.detected_at), { addSuffix: true })} on {finding.website.name}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
