import { useState, useEffect } from 'react';
import { Website } from '../../types';
import api from '../../lib/api';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface WebsiteModalProps {
  website: Website | null;
  onClose: () => void;
  onSave: (website: Website) => void;
}

export default function WebsiteModal({ website, onClose, onSave }: WebsiteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET' as 'GET' | 'HEAD' | 'POST',
    tags: '', // We'll store as comma separated string for the form
    check_interval: 5,
    timeout_ms: 10000,
    is_owned: true,
    alert_email: '',
    alert_sms: '',
    response_time_threshold: 5000,
    failure_threshold: 2,
    recovery_threshold_minutes: 10,
    github_repo: '',
    github_branch: 'main',
    auto_rollback_enabled: false,
    create_issues_on_alert: false,
    maintenance_webhook_url: '',
    maintenance_webhook_secret: ''
  });

  useEffect(() => {
    if (website) {
      setFormData({
        name: website.name,
        url: website.url,
        method: website.method || 'GET',
        tags: website.tags ? website.tags.join(', ') : '',
        check_interval: website.check_interval,
        timeout_ms: website.timeout_ms || 10000,
        is_owned: website.is_owned,
        alert_email: website.alert_email || '',
        alert_sms: website.alert_sms || '',
        response_time_threshold: website.response_time_threshold,
        failure_threshold: website.failure_threshold,
        recovery_threshold_minutes: website.recovery_threshold_minutes,
        github_repo: website.github_repo || '',
        github_branch: website.github_branch || 'main',
        auto_rollback_enabled: website.auto_rollback_enabled || false,
        create_issues_on_alert: website.create_issues_on_alert || false,
        maintenance_webhook_url: website.maintenance_webhook_url || '',
        maintenance_webhook_secret: website.maintenance_webhook_secret || ''
      });
    }
  }, [website]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    let parsedValue: string | number | boolean = value;
    
    if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number' || name === 'check_interval' || name === 'timeout_ms') {
      parsedValue = parseInt(value, 10);
    }
    
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic URL validation
    if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      setLoading(false);
      return;
    }

    try {
      let result;
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      if (website) {
        const { data } = await api.put(`/websites/${website.id}`, payload);
        result = data;
      } else {
        const { data } = await api.post('/websites', payload);
        result = data;
      }
      onSave(result);
      onClose();
    } catch (err) {
      const error = err as any;
      console.error('Error saving website:', error);
      setError(error?.response?.data?.error || error.message || 'An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-surface rounded-2xl text-left overflow-hidden shadow-neu transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-surface">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl leading-6 font-bold text-text-main" id="modal-title">
                    {website ? 'Edit Target' : 'New Monitor Target'}
                  </h3>
                  <button onClick={onClose} className="text-text-muted hover:text-danger transition-colors p-2 rounded-full hover:shadow-neu-pressed">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-6 p-4 bg-surface text-danger text-sm rounded-xl shadow-neu-pressed border-l-4 border-danger">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <Input
                    label="Website Name"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="My Portfolio"
                  />

                  <Input
                    label="Target URL"
                    type="url"
                    name="url"
                    id="url"
                    required
                    value={formData.url}
                    onChange={handleChange}
                    placeholder="https://example.com"
                  />

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="method" className="block text-sm font-medium text-text-muted mb-2 ml-1">HTTP Method</label>
                      <div className="relative">
                        <select
                          id="method"
                          name="method"
                          className="block w-full bg-background text-text-main border-none rounded-xl shadow-neu-pressed py-3 px-4 focus:outline-none focus:ring-0 appearance-none"
                          value={formData.method}
                          onChange={handleChange}
                        >
                          <option value="GET">GET</option>
                          <option value="HEAD">HEAD</option>
                          <option value="POST">POST</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
                          <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                      </div>
                    </div>

                    <Input
                      label="Timeout (ms)"
                      type="number"
                      name="timeout_ms"
                      id="timeout_ms"
                      min="1000"
                      step="1000"
                      required
                      value={formData.timeout_ms}
                      onChange={handleChange}
                    />
                  </div>

                  <Input
                    label="Tags (comma separated)"
                    name="tags"
                    id="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="prod, api, frontend"
                  />

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="check_interval" className="block text-sm font-medium text-text-muted mb-2 ml-1">Check Interval</label>
                      <div className="relative">
                        <select
                          id="check_interval"
                          name="check_interval"
                          className="block w-full bg-background text-text-main border-none rounded-xl shadow-neu-pressed py-3 px-4 focus:outline-none focus:ring-0 appearance-none"
                          value={formData.check_interval}
                          onChange={handleChange}
                        >
                          <option value={5}>Every 5 minutes</option>
                          <option value={30}>Every 30 minutes</option>
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
                          <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center h-full pt-8">
                      <label className="flex items-center cursor-pointer relative">
                        <input 
                          type="checkbox"
                          id="is_owned"
                          name="is_owned"
                          className="sr-only"
                          checked={formData.is_owned}
                          onChange={handleChange}
                        />
                        <div className={`w-11 h-6 rounded-full shadow-neu-pressed transition-colors ${formData.is_owned ? 'bg-primary' : 'bg-background'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.is_owned ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        <span className="ml-3 text-sm font-medium text-text-main">I own this website</span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-text-muted/20 pt-6 mt-6">
                    <h4 className="text-sm font-bold text-text-main mb-4 uppercase tracking-wider">Remote Control</h4>
                    
                    <div className="space-y-6">
                      <Input
                        label="Maintenance Mode Webhook URL"
                        type="url"
                        name="maintenance_webhook_url"
                        id="maintenance_webhook_url"
                        placeholder="https://api.your-site.com/webhooks/maintenance"
                        value={formData.maintenance_webhook_url}
                        onChange={handleChange}
                      />
                      
                      <Input
                        label="Webhook Secret"
                        type="password"
                        name="maintenance_webhook_secret"
                        id="maintenance_webhook_secret"
                        placeholder="Optional secret header value"
                        value={formData.maintenance_webhook_secret}
                        onChange={handleChange}
                      />
                      <p className="text-xs text-text-muted">
                        We'll send a POST request with <code>{`{ maintenance: true/false }`}</code> to this URL when you toggle maintenance mode.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-text-muted/20 pt-6 mt-6">
                    <h4 className="text-sm font-bold text-text-main mb-4 uppercase tracking-wider">Alert Settings</h4>
                    
                    <div className="space-y-6">
                      <Input
                        label="Alert Email (Optional)"
                        type="email"
                        name="alert_email"
                        id="alert_email"
                        value={formData.alert_email}
                        onChange={handleChange}
                      />
                      
                      <div className="grid grid-cols-2 gap-6">
                        <Input
                          label="Response Threshold (ms)"
                          type="number"
                          name="response_time_threshold"
                          id="response_time_threshold"
                          min="100"
                          step="100"
                          value={formData.response_time_threshold}
                          onChange={handleChange}
                        />
                        <Input
                          label="Failure Threshold"
                          type="number"
                          name="failure_threshold"
                          id="failure_threshold"
                          min="1"
                          max="10"
                          value={formData.failure_threshold}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-text-muted/20 pt-6 mt-6">
                    <h4 className="text-sm font-bold text-text-main mb-4 uppercase tracking-wider flex items-center">
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub Integration
                    </h4>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <Input
                          label="Repository (owner/repo)"
                          type="text"
                          name="github_repo"
                          id="github_repo"
                          placeholder="e.g. facebook/react"
                          value={formData.github_repo}
                          onChange={handleChange}
                        />
                        <Input
                          label="Target Branch"
                          type="text"
                          name="github_branch"
                          id="github_branch"
                          placeholder="main"
                          value={formData.github_branch}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="flex items-center pt-2">
                        <label className="flex items-center cursor-pointer relative mr-8">
                          <input 
                            type="checkbox"
                            name="auto_rollback_enabled"
                            className="sr-only"
                            checked={formData.auto_rollback_enabled}
                            onChange={handleChange}
                          />
                          <div className={`w-11 h-6 rounded-full shadow-neu-pressed transition-colors ${formData.auto_rollback_enabled ? 'bg-primary' : 'bg-background'}`}></div>
                          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.auto_rollback_enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                          <span className="ml-3 text-sm font-medium text-text-main">Auto-Rollback on Downtime</span>
                        </label>
                        
                        <label className="flex items-center cursor-pointer relative">
                          <input 
                            type="checkbox"
                            name="create_issues_on_alert"
                            className="sr-only"
                            checked={formData.create_issues_on_alert}
                            onChange={handleChange}
                          />
                          <div className={`w-11 h-6 rounded-full shadow-neu-pressed transition-colors ${formData.create_issues_on_alert ? 'bg-primary' : 'bg-background'}`}></div>
                          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.create_issues_on_alert ? 'translate-x-5' : 'translate-x-0'}`}></div>
                          <span className="ml-3 text-sm font-medium text-text-main">Auto-Create Issues</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
                    <Button
                      type="submit"
                      disabled={loading}
                      fullWidth
                      className="sm:w-auto"
                    >
                      {loading ? 'Saving...' : 'Save Website'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onClose}
                      fullWidth
                      className="sm:w-auto mt-3 sm:mt-0"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}