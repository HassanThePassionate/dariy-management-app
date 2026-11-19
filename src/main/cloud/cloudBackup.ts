import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app } from 'electron';
import { createDatabaseSnapshot, restoreDatabaseFromFile, getDatabasePath } from '../db/database';
import { getCloudConfig } from './cloudConfig';
import { getConnectionStatus } from './connectivity';
import { performCloudSync } from './cloudSync';

export interface BackupProgressCallback {
  (stage: string, percent?: number): void;
}

let activeAbortController: AbortController | null = null;
let isBackupInProgress = false;

export function cancelActiveBackup(): boolean {
  if (activeAbortController) {
    console.log('[Cloud Backup] Backup cancelled by user.');
    activeAbortController.abort();
    activeAbortController = null;
    isBackupInProgress = false;
    return true;
  }
  return false;
}

export async function createAndUploadCloudBackup(
  onProgress?: BackupProgressCallback,
  notes: string = 'Application shutdown auto-backup'
): Promise<{
  success: boolean;
  backupId?: string;
  checksum?: string;
  sizeBytes?: number;
  error?: string;
  cancelled?: boolean;
}> {
  if (isBackupInProgress) {
    return { success: false, error: 'A backup upload is already in progress.' };
  }

  isBackupInProgress = true;
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  let tempSnapshotPath: string | null = null;

  try {
    // Stage 1: Connectivity check
    onProgress?.('Checking cloud connection...', 10);
    if (signal.aborted) throw new Error('Cancelled');

    const conn = await getConnectionStatus();
    if (!conn.isOnline || !conn.isBackendReachable) {
      return {
        success: false,
        error: conn.error || 'Cannot backup: No internet connection or cloud backend is offline.',
      };
    }

    // Stage 2: Database synchronization before snapshot
    onProgress?.('Synchronizing latest database changes...', 25);
    if (signal.aborted) throw new Error('Cancelled');
    try {
      await performCloudSync();
    } catch (syncErr) {
      console.warn('[Cloud Backup] Pre-backup sync warning (continuing with snapshot):', syncErr);
    }

    // Stage 3: Create consistent WAL snapshot
    onProgress?.('Creating consistent SQLite database snapshot...', 50);
    if (signal.aborted) throw new Error('Cancelled');

    const tempDir = path.join(app.getPath('temp'), 'dairy_backups');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    tempSnapshotPath = path.join(tempDir, `dairy_snapshot_${timestamp}.db`);

    await createDatabaseSnapshot(tempSnapshotPath);

    if (!fs.existsSync(tempSnapshotPath)) {
      throw new Error('Failed to create local database snapshot file.');
    }

    const fileBuffer = fs.readFileSync(tempSnapshotPath);
    const sizeBytes = fileBuffer.length;

    // Stage 4: Compute SHA-256 Checksum
    onProgress?.('Verifying snapshot integrity...', 65);
    if (signal.aborted) throw new Error('Cancelled');

    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Stage 5: Upload Snapshot to Cloud Backend
    onProgress?.('Uploading backup to cloud storage...', 80);
    if (signal.aborted) throw new Error('Cancelled');

    const config = getCloudConfig();

    const formData = new FormData();
    const blob = new Blob([fileBuffer as any], { type: 'application/x-sqlite3' });
    formData.append('file', blob, `dairy_${timestamp}.db`);
    formData.append('checksum', checksum);
    formData.append('deviceId', config.deviceId);
    formData.append('notes', notes);

    const uploadResponse = await fetch(`${config.apiUrl}/api/backup`, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
      body: formData,
      signal,
    });

    if (!uploadResponse.ok) {
      const errData = await uploadResponse.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed with HTTP status ${uploadResponse.status}`);
    }

    const resJson = await uploadResponse.json();

    if (!resJson.success) {
      throw new Error(resJson.error || 'Server rejected backup upload');
    }

    // Stage 6: Final Verification
    onProgress?.('Backup verified successfully!', 100);

    return {
      success: true,
      backupId: resJson.backupId,
      checksum,
      sizeBytes,
    };
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message === 'Cancelled') {
      return { success: false, cancelled: true, error: 'Backup cancelled by user' };
    }
    return {
      success: false,
      error: err.message || 'Backup failed unexpectedly',
    };
  } finally {
    isBackupInProgress = false;
    activeAbortController = null;
    // Clean up temporary snapshot file
    if (tempSnapshotPath && fs.existsSync(tempSnapshotPath)) {
      try {
        fs.unlinkSync(tempSnapshotPath);
      } catch {}
    }
  }
}

/**
 * Fetch cloud backup history from backend
 */
export async function getCloudBackupHistory(): Promise<{
  success: boolean;
  backups?: any[];
  error?: string;
}> {
  const config = getCloudConfig();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${config.apiUrl}/api/backup/history`, {
      headers: {
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || `Error ${res.status}` };
    }

    return {
      success: true,
      backups: data.backups || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'History fetch timed out' : err.message || 'Failed to fetch history',
    };
  }
}

/**
 * Safely restores a backup from cloud
 */
export async function restoreCloudBackup(
  backupId: string,
  onProgress?: BackupProgressCallback
): Promise<{
  success: boolean;
  safetyBackupPath?: string;
  error?: string;
}> {
  const config = getCloudConfig();

  try {
    onProgress?.('Requesting backup restore from cloud...', 20);

    const res = await fetch(`${config.apiUrl}/api/backup/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
      body: JSON.stringify({ backupId }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to initiate restore' };
    }

    onProgress?.('Downloading cloud backup file...', 50);

    const fileRes = await fetch(data.downloadUrl);
    if (!fileRes.ok) {
      return { success: false, error: `Failed to download file from storage (${fileRes.status})` };
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    onProgress?.('Verifying download integrity (SHA-256)...', 75);

    const computedChecksum = crypto.createHash('sha256').update(buffer).digest('hex');
    if (data.sha256Checksum && computedChecksum.toLowerCase() !== data.sha256Checksum.toLowerCase()) {
      return {
        success: false,
        error: `Integrity check failed: Checksum mismatch! Downloaded file may be corrupted.`,
      };
    }

    const tempRestorePath = path.join(app.getPath('temp'), `restore_${backupId}.db`);
    fs.writeFileSync(tempRestorePath, buffer);

    onProgress?.('Safely restoring local SQLite database...', 90);

    const restoreRes = restoreDatabaseFromFile(tempRestorePath);

    try {
      fs.unlinkSync(tempRestorePath);
    } catch {}

    if (!restoreRes.success) {
      return { success: false, error: restoreRes.error };
    }

    onProgress?.('Restore completed successfully!', 100);

    return {
      success: true,
      safetyBackupPath: restoreRes.safetyBackupPath,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error occurred while restoring cloud backup',
    };
  }
}
