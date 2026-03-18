import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { User, Bell, Shield, Key, Github } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [profile, setProfile] = useState({
    name: '',
    email: user?.email || '',
    github_token: '',
    slack_webhook_url: '',
    discord_webhook_url: '',
  });

  const [githubMessage, setGithubMessage] = useState({ type: '', text: '' });
  const [githubLoading, setGithubLoading] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState({ type: '', text: '' });
  const [notifyLoading, setNotifyLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, email, github_token, slack_webhook_url, discord_webhook_url')
          .eq('id', user.id)
          .single();
          
        if (data && !error) {
          setProfile({
            name: data.name || '',
            email: data.email || user.email || '',
            github_token: data.github_token || '',
            slack_webhook_url: data.slack_webhook_url || '',
            discord_webhook_url: data.discord_webhook_url || '',
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: profile.name })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleGithubUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setGithubLoading(true);
    setGithubMessage({ type: '', text: '' });
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ github_token: profile.github_token })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setGithubMessage({ type: 'success', text: 'GitHub token saved successfully' });
    } catch (err) {
      setGithubMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save token' });
    } finally {
      setGithubLoading(false);
    }
  };

  const handleNotifyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setNotifyLoading(true);
    setNotifyMessage({ type: '', text: '' });
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          slack_webhook_url: profile.slack_webhook_url,
          discord_webhook_url: profile.discord_webhook_url
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setNotifyMessage({ type: 'success', text: 'Notification preferences saved' });
    } catch (err) {
      setNotifyMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save notifications' });
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your account settings and preferences.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            <a href="#profile" className="bg-blue-50 text-blue-700 hover:text-blue-700 hover:bg-blue-50 group rounded-md px-3 py-2 flex items-center text-sm font-medium">
              <User className="text-blue-500 group-hover:text-blue-500 flex-shrink-0 -ml-1 mr-3 h-6 w-6" />
              <span className="truncate">Profile</span>
            </a>
            <a href="#notifications" className="text-gray-900 hover:text-gray-900 hover:bg-gray-50 group rounded-md px-3 py-2 flex items-center text-sm font-medium">
              <Bell className="text-gray-400 group-hover:text-gray-500 flex-shrink-0 -ml-1 mr-3 h-6 w-6" />
              <span className="truncate">Notifications</span>
            </a>
            <a href="#security" className="text-gray-900 hover:text-gray-900 hover:bg-gray-50 group rounded-md px-3 py-2 flex items-center text-sm font-medium">
              <Shield className="text-gray-400 group-hover:text-gray-500 flex-shrink-0 -ml-1 mr-3 h-6 w-6" />
              <span className="truncate">Security</span>
            </a>
            <a href="#github" className="text-gray-900 hover:text-gray-900 hover:bg-gray-50 group rounded-md px-3 py-2 flex items-center text-sm font-medium">
              <Github className="text-gray-400 group-hover:text-gray-500 flex-shrink-0 -ml-1 mr-3 h-6 w-6" />
              <span className="truncate">GitHub Integration</span>
            </a>
          </nav>
        </div>

        {/* Settings Forms */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Profile Section */}
          <div id="profile" className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Personal Information</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Update your personal details and how we can reach you.</p>
              </div>
              
              {message.text && (
                <div className={`mt-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {message.text}
                </div>
              )}
              
              <form className="mt-5 space-y-4" onSubmit={handleProfileUpdate}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    disabled
                    className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-500 sm:text-sm"
                    value={profile.email}
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed directly.</p>
                </div>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                
                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          {/* Notifications Section */}
          <div id="notifications" className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Global Notifications</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Manage default notification settings for all your websites.</p>
              </div>

              {notifyMessage.text && (
                <div className={`mt-4 p-3 rounded-md text-sm ${notifyMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {notifyMessage.text}
                </div>
              )}

              <form className="mt-5 space-y-4" onSubmit={handleNotifyUpdate}>
                <div>
                  <label htmlFor="slack_webhook" className="block text-sm font-medium text-gray-700">Slack Webhook URL</label>
                  <input
                    type="url"
                    name="slack_webhook"
                    id="slack_webhook"
                    placeholder="https://hooks.slack.com/services/..."
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={profile.slack_webhook_url}
                    onChange={(e) => setProfile({ ...profile, slack_webhook_url: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="discord_webhook" className="block text-sm font-medium text-gray-700">Discord Webhook URL</label>
                  <input
                    type="url"
                    name="discord_webhook"
                    id="discord_webhook"
                    placeholder="https://discord.com/api/webhooks/..."
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={profile.discord_webhook_url}
                    onChange={(e) => setProfile({ ...profile, discord_webhook_url: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={notifyLoading}
                    className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {notifyLoading ? 'Saving...' : 'Save Webhooks'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Security Section (Placeholder) */}
          <div id="security" className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Security</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Update your password or configure two-factor authentication.</p>
              </div>
              <div className="mt-5">
                <button type="button" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </button>
              </div>
            </div>
          </div>

          {/* GitHub Integration Section */}
          <div id="github" className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <Github className="w-5 h-5 mr-2" />
                GitHub Integration
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Connect your GitHub account to enable automatic issue creation, commit tracking, and one-click rollbacks for monitored websites.</p>
              </div>
              
              {githubMessage.text && (
                <div className={`mt-4 p-3 rounded-md text-sm ${githubMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {githubMessage.text}
                </div>
              )}
              
              <form className="mt-5 space-y-4" onSubmit={handleGithubUpdate}>
                <div>
                  <label htmlFor="github_token" className="block text-sm font-medium text-gray-700">Personal Access Token (Classic)</label>
                  <input
                    type="password"
                    name="github_token"
                    id="github_token"
                    placeholder="ghp_..."
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={profile.github_token}
                    onChange={(e) => setProfile({ ...profile, github_token: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Create a token with <strong>repo</strong> permissions in your GitHub Developer Settings.
                  </p>
                </div>
                
                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={githubLoading}
                    className="bg-gray-900 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
                  >
                    {githubLoading ? 'Saving...' : 'Save GitHub Token'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}