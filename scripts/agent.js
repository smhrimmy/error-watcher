/**
 * Node.js Monitoring Agent
 * 
 * Usage:
 *   export AGENT_ID="your-agent-id"
 *   export AGENT_KEY="your-agent-key"
 *   export API_URL="http://localhost:3002/api/infrastructure"
 *   node agent.js
 */

const os = require('os');
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const chokidar = require('chokidar');

const CONFIG = {
  agentId: process.env.AGENT_ID,
  agentKey: process.env.AGENT_KEY,
  apiUrl: process.env.API_URL || 'http://localhost:3002/api/infrastructure',
  heartbeatInterval: 60000, // 1 minute
  metricsInterval: 10000,   // 10 seconds
  fimPaths: [
    path.join(__dirname, '..', 'package.json'),
    path.join(__dirname, '..', '.env.example')
  ]
};

if (!CONFIG.agentId || !CONFIG.agentKey) {
  console.error('Error: AGENT_ID and AGENT_KEY environment variables are required.');
  process.exit(1);
}

console.log(`Starting Monitoring Agent...`);
console.log(`ID: ${CONFIG.agentId}`);
console.log(`Target: ${CONFIG.apiUrl}`);

// Helper to make HTTP requests with retry
async function request(method, path, data, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await new Promise((resolve, reject) => {
        const targetUrl = new url.URL(`${CONFIG.apiUrl}${path}`);
        const lib = targetUrl.protocol === 'https:' ? https : http;
        
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Agent-ID': CONFIG.agentId,
            'X-Agent-Key': CONFIG.agentKey,
          },
          timeout: 5000 // 5s timeout
        };

        const req = lib.request(targetUrl, options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                 resolve(body ? JSON.parse(body) : {});
              } catch (e) {
                 reject(e);
              }
            } else {
              reject(new Error(`Request failed with status ${res.statusCode}: ${body}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timed out'));
        });
        
        if (data) {
          req.write(JSON.stringify(data));
        }
        req.end();
      });
    } catch (err) {
      if (i === retries - 1) throw err;
      const delay = 1000 * Math.pow(2, i); // Exponential backoff
      console.warn(`[${new Date().toISOString()}] Request failed (${err.message}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// System Metrics Collection
let lastCpuUsage = null;

function getCpuUsage() {
  const cpus = os.cpus();
  let user = 0;
  let nice = 0;
  let sys = 0;
  let idle = 0;
  let irq = 0;

  for (const cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }

  const total = user + nice + sys + idle + irq;
  
  if (lastCpuUsage) {
    const totalDiff = total - lastCpuUsage.total;
    const idleDiff = idle - lastCpuUsage.idle;
    lastCpuUsage = { total, idle };
    return 100 - Math.floor((idleDiff / totalDiff) * 100);
  }

  lastCpuUsage = { total, idle };
  return 0;
}

function getMemoryUsage() {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.floor(((total - free) / total) * 100);
}

// Simulating disk/network for now as they require platform-specific commands or deps
function getDiskUsage() {
    // Placeholder: in a real agent, we'd run `df -h` or `wmic`
    return Math.floor(Math.random() * 20) + 40; // Random 40-60%
}

function getNetworkStats() {
    // Placeholder
    return {
        rx: Math.floor(Math.random() * 1000),
        tx: Math.floor(Math.random() * 1000)
    };
}

// Tasks
async function sendHeartbeat() {
  try {
    await request('POST', '/heartbeat', {
      hostname: os.hostname(),
      ip_address: '127.0.0.1', // Simplified
      os_info: {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        arch: os.arch()
      },
      version: '1.0.0'
    });
    console.log(`[${new Date().toISOString()}] Heartbeat sent`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Heartbeat failed:`, err.message);
  }
}

async function sendMetrics() {
  try {
    const cpu = getCpuUsage();
    const mem = getMemoryUsage();
    const disk = getDiskUsage();
    const net = getNetworkStats();

    await request('POST', '/metrics', {
      cpu_usage: cpu,
      memory_usage: mem,
      disk_usage: disk,
      network_rx_bytes: net.rx,
      network_tx_bytes: net.tx
    });
    console.log(`[${new Date().toISOString()}] Metrics sent: CPU ${cpu}%, MEM ${mem}%`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Metrics failed:`, err.message);
  }
}

// FIM State
const fileHashes = new Map();

function getFileHash(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (err) {
    console.error(`Error hashing file ${filePath}:`, err.message);
    return null;
  }
}

async function reportFimEvent(filePath, eventType) {
  const currentHash = eventType === 'deleted' ? null : getFileHash(filePath);
  const previousHash = fileHashes.get(filePath) || null;

  if (currentHash) {
    fileHashes.set(filePath, currentHash);
  } else {
    fileHashes.delete(filePath);
  }

  // Don't report initial baseline setup as 'modified'
  if (eventType === 'baseline') return;

  const event = {
    file_path: filePath,
    event_type: eventType,
    previous_hash: previousHash,
    new_hash: currentHash
  };

  try {
    await request('POST', '/fim/events', { events: [event] });
    console.log(`[${new Date().toISOString()}] FIM Event reported: ${eventType} on ${filePath}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Failed to report FIM event:`, err.message);
  }
}

function initFim() {
  console.log(`[${new Date().toISOString()}] Initializing File Integrity Monitoring (Async)...`);
  
  // Initialize baseline
  CONFIG.fimPaths.forEach(p => reportFimEvent(p, 'baseline'));

  const watcher = chokidar.watch(CONFIG.fimPaths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  watcher
    .on('add', path => reportFimEvent(path, 'created'))
    .on('change', path => reportFimEvent(path, 'modified'))
    .on('unlink', path => reportFimEvent(path, 'deleted'))
    .on('error', error => console.error(`Watcher error: ${error}`));
}

// Init
setInterval(sendHeartbeat, CONFIG.heartbeatInterval);
setInterval(sendMetrics, CONFIG.metricsInterval);

// Initial call
sendHeartbeat();
sendMetrics();
initFim();
