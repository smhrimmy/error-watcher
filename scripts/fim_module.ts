import fs from 'fs';
import crypto from 'crypto';
import axios from 'axios';

// Basic FIM Configuration
const WATCH_PATHS = [
  './package.json',
  './.env'
];

interface FileHash {
  path: string;
  hash: string;
  lastChecked: number;
}

const fileHashes: Map<string, string> = new Map();

export const runFIMCheck = async (agentId: string, apiKey: string, apiUrl: string) => {
  console.log('[FIM] Running Integrity Check...');
  const changes = [];

  for (const filePath of WATCH_PATHS) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      if (fileHashes.has(filePath)) {
        const oldHash = fileHashes.get(filePath);
        if (oldHash !== hash) {
          console.warn(`[FIM] File Modified: ${filePath}`);
          changes.push({
            path: filePath,
            type: 'modified',
            oldHash,
            newHash: hash
          });
        }
      } else {
        // Initial baseline
        console.log(`[FIM] Baseline recorded: ${filePath}`);
      }
      
      fileHashes.set(filePath, hash);
    }
  }

  // Report changes to server
  if (changes.length > 0) {
    try {
      await axios.post(`${apiUrl}/infrastructure/agents/${agentId}/fim-events`, {
        events: changes
      }, {
        headers: {
          'X-Agent-ID': agentId,
          'X-Agent-Key': apiKey
        }
      });
      console.log(`[FIM] Reported ${changes.length} integrity events.`);
    } catch (err) {
      console.error('[FIM] Failed to report events:', err.message);
    }
  }
};
