export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Website {
  id: string;
  user_id: string;
  name: string;
  url: string;
  method?: 'GET' | 'HEAD' | 'POST';
  headers?: Record<string, string>;
  tags?: string[];
  check_interval: number; // Configurable intervals
  timeout_ms?: number;
  is_owned: boolean;
  alert_email?: string;
  alert_sms?: string;
  response_time_threshold: number;
  failure_threshold: number;
  recovery_threshold_minutes: number;
  maintenance_windows?: any[]; // JSON array of maintenance windows
  maintenance_mode?: boolean;
  status: 'active' | 'paused' | 'deleted';
  github_repo?: string;
  github_branch?: string;
  auto_rollback_enabled?: boolean;
  create_issues_on_alert?: boolean;
  maintenance_webhook_url?: string;
  maintenance_webhook_secret?: string;
  created_at: string;
}

export interface WebsiteStatus {
  website_id: string;
  current_status: 'up' | 'down';
  last_check: string | null;
  last_response_time: number;
  last_status_code: number;
  uptime_24h: number;
  uptime_7d: number;
  uptime_30d: number;
}

export interface MonitoringLog {
  id: string;
  website_id: string;
  timestamp: string;
  status_code: number;
  response_time_ms: number;
  request_duration_ms: number;
  check_status: 'success' | 'failed' | 'timeout';
  error_type?: string;
  error_message?: string;
  region?: string;
  checker_node_id?: string;
}

export interface AnalyticsData {
  period: string;
  website_id: string;
  uptime_percentage: number;
  average_response_time: number;
  total_outages: number;
  total_downtime_minutes: number;
  peak_outage_hours: number[];
  response_time_trend: Array<{
    timestamp: string;
    avg_response_time: number;
  }>;
}

export interface Agent {
  id: string;
  user_id: string;
  hostname: string;
  ip_address?: string;
  os_info?: any;
  version?: string;
  status: 'online' | 'offline' | 'maintenance';
  last_heartbeat?: string;
  api_key_hash?: string;
  created_at: string;
}

export interface SystemMetric {
  id: string;
  agent_id: string;
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_rx_bytes?: number;
  network_tx_bytes?: number;
}