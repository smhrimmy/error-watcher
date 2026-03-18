import { Octokit } from '@octokit/rest';
import { supabase } from '../utils/supabase.js';

export class GithubService {
  /**
   * Initialize Octokit with the user's GitHub token
   */
  private static async getClient(userId: string): Promise<Octokit | null> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('github_token')
      .eq('id', userId)
      .single();

    if (!profile?.github_token) {
      return null;
    }

    return new Octokit({ auth: profile.github_token });
  }

  /**
   * Get recent commits for a website's repository
   */
  static async getRecentCommits(userId: string, websiteId: string, limit = 5) {
    const { data: website } = await supabase
      .from('websites')
      .select('github_repo, github_branch')
      .eq('id', websiteId)
      .single();

    if (!website?.github_repo) {
      throw new Error('No GitHub repository linked to this website');
    }

    const octokit = await this.getClient(userId);
    if (!octokit) {
      throw new Error('GitHub integration not configured for this user');
    }

    const [owner, repo] = website.github_repo.split('/');
    
    try {
      const response = await octokit.repos.listCommits({
        owner,
        repo,
        sha: website.github_branch || 'main',
        per_page: limit,
      });

      return response.data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name,
        date: commit.commit.author?.date,
        url: commit.html_url
      }));
    } catch (error: any) {
      console.error('Error fetching commits:', error);
      throw new Error(`Failed to fetch commits: ${error.message}`);
    }
  }

  /**
   * Create an issue in the linked repository
   */
  static async createIssue(userId: string, websiteId: string, title: string, body: string) {
    const { data: website } = await supabase
      .from('websites')
      .select('github_repo')
      .eq('id', websiteId)
      .single();

    if (!website?.github_repo) {
      return null;
    }

    const octokit = await this.getClient(userId);
    if (!octokit) {
      return null;
    }

    const [owner, repo] = website.github_repo.split('/');

    try {
      const response = await octokit.issues.create({
        owner,
        repo,
        title,
        body,
        labels: ['bug', 'automated-alert']
      });

      return response.data;
    } catch (error: any) {
      console.error('Error creating issue:', error);
      return null;
    }
  }

  /**
   * Trigger a rollback (e.g., via repository dispatch or workflow dispatch)
   * This assumes there's a GitHub Action workflow configured to handle 'rollback' events
   */
  static async triggerRollback(userId: string, websiteId: string, commitSha: string) {
    const { data: website } = await supabase
      .from('websites')
      .select('github_repo, github_branch')
      .eq('id', websiteId)
      .single();

    if (!website?.github_repo) {
      throw new Error('No GitHub repository linked to this website');
    }

    const octokit = await this.getClient(userId);
    if (!octokit) {
      throw new Error('GitHub integration not configured for this user');
    }

    const [owner, repo] = website.github_repo.split('/');

    try {
      // Create a repository dispatch event that a GitHub Action can listen for
      await octokit.repos.createDispatchEvent({
        owner,
        repo,
        event_type: 'error_watcher_rollback',
        client_payload: {
          target_commit: commitSha,
          branch: website.github_branch || 'main'
        }
      });

      return { success: true, message: 'Rollback event dispatched successfully' };
    } catch (error: any) {
      console.error('Error triggering rollback:', error);
      throw new Error(`Failed to trigger rollback: ${error.message}`);
    }
  }

  /**
   * Trigger Maintenance Mode via GitHub Dispatch
   */
  static async triggerMaintenanceMode(userId: string, websiteId: string, enabled: boolean) {
    const { data: website } = await supabase
      .from('websites')
      .select('github_repo')
      .eq('id', websiteId)
      .single();

    if (!website?.github_repo) {
      return false;
    }

    const octokit = await this.getClient(userId);
    if (!octokit) {
      return false;
    }

    const [owner, repo] = website.github_repo.split('/');

    try {
      await octokit.repos.createDispatchEvent({
        owner,
        repo,
        event_type: 'maintenance_mode_toggle',
        client_payload: {
          maintenance_enabled: enabled,
          timestamp: new Date().toISOString()
        }
      });
      return true;
    } catch (error: any) {
      console.error('Error triggering maintenance mode dispatch:', error);
      return false;
    }
  }
}
