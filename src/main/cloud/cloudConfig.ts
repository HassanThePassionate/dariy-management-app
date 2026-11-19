import { getDatabase } from '../db/database';

export interface CloudConfig {
  apiUrl: string;
  apiKey: string;
  deviceId: string;
}

export function getCloudConfig(): CloudConfig {
  const db = getDatabase();

  let url = process.env.CLOUD_API_URL || '';
  let key = process.env.CLOUD_API_KEY || '';
  let deviceId = process.env.APP_DEVICE_ID || 'dairy-desktop-pos-1';

  try {
    const urlRow = db.prepare("SELECT value FROM settings WHERE key = 'cloud_api_url'").get() as any;
    const keyRow = db.prepare("SELECT value FROM settings WHERE key = 'cloud_api_key'").get() as any;
    const devRow = db.prepare("SELECT value FROM settings WHERE key = 'cloud_device_id'").get() as any;

    if (urlRow?.value) url = urlRow.value.trim();
    if (keyRow?.value) key = keyRow.value.trim();
    if (devRow?.value) deviceId = devRow.value.trim();
  } catch {}

  // Default fallback if not set
  if (!url) {
    url = 'http://localhost:3001';
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
  if (config.apiKey !== undefined) upsert.run('cloud_api_key', config.apiKey.trim());
  if (config.deviceId !== undefined) upsert.run('cloud_device_id', config.deviceId.trim());
}
