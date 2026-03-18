import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:3001/api';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runTest() {
  console.log('--- Starting System Test ---');

  // 1. Auth: Create User via Admin API (guaranteed)
  const email = `testuser${Date.now()}@example.com`;
  const password = 'Password123!';
  
  console.log(`1. Creating user via Admin API: ${email}`);
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (userError) {
    if (userError.message.includes('already registered')) {
        console.log('   User already exists, proceeding to login.');
    } else {
        console.error('Admin Create User failed:', userError.message);
        return;
    }
  }

  // Login to get token
  const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (loginError) {
    console.error('Login failed:', loginError.message);
    return;
  }

  const token = authData.session?.access_token;
  if (!token) {
    console.error('No token received after login');
    return;
  }
  console.log('   User created and logged in.');

  const apiHeaders = { Authorization: `Bearer ${token}` };

  // 1.5 Test General Health Check
  console.log('1.5 Testing General Health Check...');
  try {
    const health = await axios.get(`${API_URL}/health`);
    if (health.status === 200 && health.data.status === 'ok') {
        console.log('   Health Check Passed:', health.data);
    } else {
        console.error('   Health Check Failed:', health.data);
    }
  } catch (err) {
    console.error('   Health Check Request Failed:', err.message || JSON.stringify(err));
  }

  // 2. Create Website
  console.log('2. Creating Website Monitor...');
  try {
    const siteRes = await axios.post(`${API_URL}/websites`, {
      name: 'Test Site',
      url: 'https://example.com',
      check_interval: 5
    }, { headers: apiHeaders });
    console.log(`   Website created: ${siteRes.data.id}`);
  } catch (err) {
    console.error('   Failed to create website:', err.response?.data || err.message);
  }

  // 3. Register Agent
  console.log('3. Registering Infrastructure Agent...');
  let agentId, agentKey;
  try {
    const agentRes = await axios.post(`${API_URL}/infrastructure/agents`, {
      hostname: 'test-server-01',
      os_info: { type: 'Linux', release: '5.4.0' },
      version: '1.0.0'
    }, { headers: apiHeaders });
    
    agentId = agentRes.data.id;
    agentKey = agentRes.data.apiKey;
    console.log(`   Agent registered: ${agentId}`);
    console.log(`   Agent Key: ${agentKey}`);
  } catch (err) {
    console.error('   Failed to register agent:', err.response?.data || err.message);
    process.exit(1);
  }

  // 4. Simulate Agent Heartbeat & Metrics
  console.log('4. Simulating Agent Activity...');
  const agentHeaders = {
    'X-Agent-ID': agentId,
    'X-Agent-Key': agentKey
  };

  try {
    // Heartbeat
    await axios.post(`${API_URL}/infrastructure/heartbeat`, {
      hostname: 'test-server-01',
      version: '1.0.1'
    }, { headers: agentHeaders });
    console.log('   Heartbeat sent.');

    // Metrics
    await axios.post(`${API_URL}/infrastructure/metrics`, {
      cpu_usage: 45,
      memory_usage: 60,
      disk_usage: 55,
      network_rx_bytes: 1024,
      network_tx_bytes: 2048
    }, { headers: agentHeaders });
    console.log('   Metrics sent.');

  } catch (err) {
    console.error('   Agent communication failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 5. Verify Metrics via User API
  console.log('5. Verifying Data via Dashboard API...');
  try {
    const metricsRes = await axios.get(`${API_URL}/infrastructure/agents/${agentId}/metrics`, { headers: apiHeaders });
    if (metricsRes.data.length > 0) {
      console.log(`   Success! Retrieved ${metricsRes.data.length} metric records.`);
      console.log(`   Latest CPU: ${metricsRes.data[0].cpu_usage}%`);
    } else {
      console.error('   Failed: No metrics found.');
    }
  } catch (err) {
    console.error('   Failed to fetch metrics:', err.response?.data || err.message);
  }

  // 6. Test Emergency Actions
  console.log('6. Testing Emergency Actions (Block IP)...');
  try {
    const blockRes = await axios.post(`${API_URL}/emergency/block-ip`, {
      ip_address: '1.2.3.4',
      reason: 'Automated Test Block'
    }, { headers: apiHeaders });
    console.log(`   IP Blocked: ${blockRes.data.ip_address} (ID: ${blockRes.data.id})`);

    // Verify it appears in the list
    const listRes = await axios.get(`${API_URL}/emergency/blocked-ips`, { headers: apiHeaders });
    const blocked = listRes.data.find(ip => ip.ip_address === '1.2.3.4');
    if (blocked) {
      console.log('   Verification: IP found in blocklist.');
    } else {
      console.error('   Verification Failed: IP not found in list.');
    }
  } catch (err) {
    console.error('   Emergency action failed:', err.response?.data || err.message);
  }

  // 7. Test Platform Health
  console.log('7. Testing Platform Health Metrics...');
  try {
    // Wait a bit for metrics to be collected
    await new Promise(r => setTimeout(r, 2000));
    
    const healthRes = await axios.get(`${API_URL}/infrastructure/platform-health`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    if (healthRes.data && healthRes.data.api_latency) {
      console.log('   Platform Health Data received.');
      console.log(`   Avg Latency records: ${healthRes.data.api_latency.length}`);
      console.log(`   Scheduler Execution records: ${healthRes.data.scheduler_execution.length}`);
    } else {
      console.error('   Failed: Invalid platform health response');
    }
  } catch (err) {
     console.error('   Platform Health check failed:', err.response?.data || err.message);
  }

  console.log('--- Test Complete ---');
}

runTest();
