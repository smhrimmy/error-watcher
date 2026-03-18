import { useState, useEffect } from 'react';
import { Website } from '../../types';
import api from '../../lib/api';
import { Github, GitCommit, GitPullRequest, AlertCircle, RotateCcw, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GithubPanelProps {
  website: Website;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export default function GithubPanel({ website }: GithubPanelProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (website.github_repo) {
      fetchCommits();
    } else {
      setLoading(false);
    }
  }, [website]);

  const fetchCommits = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get(`/github/websites/${website.id}/commits`);
      setCommits(data.commits || []);
    } catch (err: any) {
      console.error('Failed to fetch commits:', err);
      setError(err.response?.data?.error || 'Failed to connect to GitHub. Ensure your token is configured in Settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (commitSha: string) => {
    if (!window.confirm('Are you sure you want to trigger a rollback to this commit? This will dispatch a GitHub Action.')) {
      return;
    }

    try {
      setRollbackLoading(commitSha);
      setSuccessMsg(null);
      setError(null);
      
      const { data } = await api.post(`/github/websites/${website.id}/rollback`, { commitSha });
      setSuccessMsg(data.message || 'Rollback triggered successfully.');
    } catch (err: any) {
      console.error('Failed to trigger rollback:', err);
      setError(err.response?.data?.error || 'Failed to trigger rollback.');
    } finally {
      setRollbackLoading(null);
    }
  };

  if (!website.github_repo) {
    return (
      <div className="bg-white shadow rounded-2xl p-8 text-center border border-gray-100">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Github className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Not Connected to GitHub</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Link a GitHub repository to this website to enable automatic issues, commit tracking, and one-click rollbacks.
        </p>
        <button 
          className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
          onClick={() => window.location.href = '/settings#github'}
        >
          <Github className="w-4 h-4 mr-2" />
          Configure GitHub Integration
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Config Summary */}
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-gray-100 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mr-4">
            <Github className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              {website.github_repo}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500 flex items-center">
                <GitPullRequest className="w-4 h-4 mr-1" />
                Branch: {website.github_branch || 'main'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            website.auto_rollback_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            Auto-Rollback: {website.auto_rollback_enabled ? 'Enabled' : 'Disabled'}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            website.create_issues_on_alert ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
          }`}>
            Auto-Issues: {website.create_issues_on_alert ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 flex items-start">
          <CheckCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Commits List */}
      <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h4 className="text-lg font-bold text-gray-900 flex items-center">
            <GitCommit className="w-5 h-5 mr-2 text-gray-400" />
            Recent Deployments (Commits)
          </h4>
          <button 
            onClick={fetchCommits}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : commits.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No commits found or unable to fetch.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {commits.map((commit, index) => (
              <li key={commit.sha} className="p-6 hover:bg-gray-50 transition-colors flex items-start justify-between group">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 font-mono">
                      {commit.sha.substring(0, 7)}
                    </span>
                    {index === 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Current
                      </span>
                    )}
                  </div>
                  <a 
                    href={commit.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-gray-900 hover:text-blue-600 line-clamp-1"
                  >
                    {commit.message.split('\n')[0]}
                  </a>
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-4">
                    <span>By {commit.author}</span>
                    <span>{commit.date ? formatDistanceToNow(new Date(commit.date), { addSuffix: true }) : ''}</span>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => handleRollback(commit.sha)}
                    disabled={rollbackLoading !== null || index === 0}
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      index === 0 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-red-600 shadow-sm group-hover:border-red-200'
                    }`}
                  >
                    {rollbackLoading === commit.sha ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600 mr-2"></div>
                    ) : (
                      <RotateCcw className={`w-4 h-4 mr-2 ${index === 0 ? 'text-gray-400' : 'text-red-500'}`} />
                    )}
                    Rollback to this
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
