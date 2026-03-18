import { useState, useEffect, useMemo } from 'react';
import { Website } from '../types';
import api from '../lib/api';
import { Plus, Trash2, Edit2, Play, Pause, Globe, AlertCircle, Activity } from 'lucide-react';
import WebsiteModal from '../components/websites/WebsiteModal';
import { useLocation } from 'react-router-dom';

export default function Websites() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search')?.toLowerCase() || '';

  const filteredWebsites = useMemo(() => {
    return websites.filter(site => 
      site.name.toLowerCase().includes(searchQuery) || 
      site.url.toLowerCase().includes(searchQuery)
    );
  }, [websites, searchQuery]);

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/websites');
      setWebsites(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch websites:', err);
      setError('Failed to load websites. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  const handleAddClick = () => {
    setEditingWebsite(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (website: Website) => {
    setEditingWebsite(website);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this website? All monitoring history will be lost.')) {
      return;
    }

    try {
      await api.delete(`/websites/${id}`);
      setWebsites(websites.filter(w => w.id !== id));
    } catch (err) {
      console.error('Failed to delete website:', err);
      alert('Failed to delete website');
    }
  };

  const toggleStatus = async (website: Website) => {
    const newStatus = website.status === 'active' ? 'paused' : 'active';
    try {
      const { data } = await api.put(`/websites/${website.id}`, { status: newStatus });
      setWebsites(websites.map(w => w.id === website.id ? data : w));
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingWebsite(null);
  };

  const handleSave = (savedWebsite: Website) => {
    if (editingWebsite) {
      setWebsites(websites.map(w => w.id === savedWebsite.id ? savedWebsite : w));
    } else {
      setWebsites([savedWebsite, ...websites]);
    }
    handleModalClose();
  };

  if (loading && websites.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Websites</h1>
          <p className="mt-1 text-sm text-gray-500">
            A list of all the websites you are currently monitoring.
          </p>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Website
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 text-red-600 shrink-0 mt-0.5" />
          <span className="text-sm font-medium text-red-800">{error}</span>
        </div>
      )}

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        {websites.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name & URL</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Interval</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Alert Contacts</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredWebsites.length > 0 ? (
                  filteredWebsites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
                          <Globe className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="font-bold text-sm text-gray-900 flex items-center">
                            {site.name}
                            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600 font-mono border border-gray-200">
                              {site.method || 'GET'}
                            </span>
                            {site.tags && site.tags.length > 0 && (
                              <div className="ml-2 flex gap-1">
                                {site.tags.map(tag => (
                                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-gray-500 flex items-center mt-0.5 text-xs">
                            <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline">
                              {site.url}
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="font-medium text-gray-900">Every {site.check_interval} mins</div>
                      <div className="text-xs text-gray-500 mt-0.5">{site.is_owned ? 'Owned Site' : 'External Site'}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                        site.status === 'active' 
                          ? 'bg-green-50 text-green-700 border-green-100' 
                          : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                      }`}>
                        {site.status === 'active' ? 'Monitoring' : 'Paused'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-medium">
                      <div className="text-gray-900">{site.alert_email || 'No email set'}</div>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(site)}
                          className={`p-2 rounded-lg transition-colors ${
                            site.status === 'active' 
                              ? 'text-yellow-600 hover:bg-yellow-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={site.status === 'active' ? "Pause monitoring" : "Resume monitoring"}
                        >
                          {site.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => window.location.href = `/websites/${site.id}`}
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View details"
                        >
                          <Activity className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(site)}
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit website"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(site.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete website"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No websites found matching "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
               <Globe className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No websites</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">Get started by adding a website to monitor. We'll check uptime, SSL status, and response times.</p>
            <div className="mt-8">
              <button
                onClick={handleAddClick}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Website
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <WebsiteModal 
          website={editingWebsite} 
          onClose={handleModalClose} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
}
