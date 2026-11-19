import { getDatabase } from '../db/database';
import { getCloudConfig } from './cloudConfig';
import { getConnectionStatus } from './connectivity';

export interface SyncStatus {
  lastSyncAt: string | null;
  status: 'idle' | 'syncing' | 'success' | 'failed' | 'offline';
  pendingChangesCount: number;
  lastError?: string;
}

export function getLocalSyncMeta(): { lastSyncAt: string | null; lastError?: string } {
  const db = getDatabase();
  try {
    const row = db.prepare("SELECT value FROM cloud_sync_meta WHERE key = 'last_synced_at'").get() as any;
    const errRow = db.prepare("SELECT value FROM cloud_sync_meta WHERE key = 'last_sync_error'").get() as any;
    return {
      lastSyncAt: row?.value || null,
      lastError: errRow?.value || undefined,
    };
  } catch {
    return { lastSyncAt: null };
  }
}

export function setLocalSyncMeta(key: string, value: string): void {
  const db = getDatabase();
  try {
    db.prepare(`
      INSERT INTO cloud_sync_meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, value);
  } catch (err) {
    console.warn('[Sync Meta] Failed to save sync metadata:', err);
  }
}

let isSyncInProgress = false;

export async function performCloudSync(): Promise<{
  success: boolean;
  counts?: any;
  serverTimestamp?: string;
  error?: string;
}> {
  if (isSyncInProgress) {
    return { success: false, error: 'A synchronization operation is already in progress.' };
  }

  isSyncInProgress = true;

  try {
    const conn = await getConnectionStatus();
    if (!conn.isBackendReachable) {
      setLocalSyncMeta('last_sync_error', conn.error || 'Cloud backend unreachable');
      return {
        success: false,
        error: conn.error || 'Cannot sync: cloud backend is unreachable or offline',
      };
    }

    const config = getCloudConfig();
    const db = getDatabase();
    const meta = getLocalSyncMeta();

    // Collect records from local SQLite
    const customers = db.prepare('SELECT * FROM customers').all();
    const sales = db.prepare('SELECT * FROM sales ORDER BY id DESC LIMIT 500').all();
    const milkEntries = db.prepare('SELECT * FROM milk_entries').all();
    const customerMonthRates = db.prepare('SELECT * FROM customer_month_rates').all();
    const receivedPayments = db.prepare('SELECT * FROM received_payments').all();
    const khataOpeningOverrides = db.prepare('SELECT * FROM khata_opening_override').all();
    const suppliers = db.prepare('SELECT * FROM suppliers').all();
    const supplierPurchases = db.prepare('SELECT * FROM supplier_purchases').all();
    const supplierPayments = db.prepare('SELECT * FROM supplier_payments').all();
    const expenses = db.prepare('SELECT * FROM expenses ORDER BY id DESC LIMIT 500').all();
    const gheeTransactions = db.prepare('SELECT * FROM ghee_transactions').all();
    const shopperTransactions = db.prepare('SELECT * FROM shopper_transactions').all();
    const dailyStockRecords = db.prepare('SELECT * FROM daily_stock_records').all();
    const billSettings = db.prepare('SELECT * FROM bill_settings WHERE id = 1').get();

    const payload = {
      deviceId: config.deviceId,
      lastSyncTimestamp: meta.lastSyncAt,
      customers,
      sales,
      milkEntries,
      customerMonthRates,
      receivedPayments,
      khataOpeningOverrides,
      suppliers,
      supplierPurchases,
      supplierPayments,
      expenses,
      gheeTransactions,
      shopperTransactions,
      dailyStockRecords,
      billSettings,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout for sync batch

    const response = await fetch(`${config.apiUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok || !data.success) {
      const err = data.error || `Sync failed with status ${response.status}`;
      setLocalSyncMeta('last_sync_error', err);
      return { success: false, error: err };
    }

    // Update last sync timestamp on success
    if (data.serverTimestamp) {
      setLocalSyncMeta('last_synced_at', data.serverTimestamp);
      setLocalSyncMeta('last_sync_error', '');
    }

    return {
      success: true,
      counts: data.counts,
      serverTimestamp: data.serverTimestamp,
    };
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError' ? 'Sync timed out' : err.message || 'Sync failed';
    setLocalSyncMeta('last_sync_error', errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    isSyncInProgress = false;
  }
}
