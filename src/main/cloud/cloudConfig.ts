import { getDatabase } from '../db/database';
import fs from 'fs';
import path from 'path';

export interface CloudConfig {
  apiUrl: string;
  apiKey: string;
  deviceId: string;
}

function readEnvUrl(): string {
  try {
    const candidates = [
      path.join(process.cwd(), '.env'),
      path.join(__dirname, '../../.env'),
      path.join(__dirname, '../.env'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          if (line.startsWith('CLOUD_API_URL=')) {
            return line.substring('CLOUD_API_URL='.length).trim().replace(/^['"]|['"]$/g, '');
          }
        }
      }
    }
  } catch {}
  return '';
}

export function getCloudConfig(): CloudConfig {
  const db = getDatabase();

  let url = process.env.CLOUD_API_URL || readEnvUrl() || '';
  let key = '';
  let deviceId = 'dairy-desktop-terminal-1';

  try {
    const urlRow = db.prepare("SELECT value FROM settings WHERE key = 'cloud_api_url'").get() as any;
    if (urlRow?.value) url = urlRow.value.trim();
  } catch {}

  // Production backend URL default fallback
  if (!url) {
    url = 'https://dariy-backend.vercel.app';
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  return {
    apiUrl: url,
    apiKey: key,
    deviceId,
  };
}

export function saveCloudConfig(config: { apiUrl?: string; apiKey?: string; deviceId?: string }): void {
  const db = getDatabase();
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  if (config.apiUrl !== undefined) upsert.run('cloud_api_url', config.apiUrl.trim().replace(/\/+$/, ''));
}
