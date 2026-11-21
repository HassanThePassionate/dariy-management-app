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

    // Chunk milkEntries so serverless execution never hits Vercel timeouts
    const chunkSize = 350;
    const milkChunks: any[][] = [];
    if (milkEntries.length > 0) {
      for (let i = 0; i < milkEntries.length; i += chunkSize) {
        milkChunks.push(milkEntries.slice(i, i + chunkSize));
      }
    } else {
      milkChunks.push([]);
    }

    let finalCounts = {
      customers: 0,
      sales: 0,
      milkEntries: 0,
      payments: 0,
      expenses: 0,
      suppliers: 0,
      stock: 0,
      ghee: 0,
      shopper: 0,
    };
    let latestTimestamp = '';

    for (let cIdx = 0; cIdx < milkChunks.length; cIdx++) {
      const isFirst = cIdx === 0;
      const subPayload = {
        deviceId: config.deviceId,
        lastSyncTimestamp: meta.lastSyncAt,
        customers: isFirst ? customers : [],
        sales: isFirst ? sales : [],
        milkEntries: milkChunks[cIdx],
        customerMonthRates: isFirst ? customerMonthRates : [],
        receivedPayments: isFirst ? receivedPayments : [],
        khataOpeningOverrides: isFirst ? khataOpeningOverrides : [],
        suppliers: isFirst ? suppliers : [],
        supplierPurchases: isFirst ? supplierPurchases : [],
        supplierPayments: isFirst ? supplierPayments : [],
        expenses: isFirst ? expenses : [],
        gheeTransactions: isFirst ? gheeTransactions : [],
        shopperTransactions: isFirst ? shopperTransactions : [],
        dailyStockRecords: isFirst ? dailyStockRecords : [],
        billSettings: isFirst ? billSettings : null,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(`${config.apiUrl}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'x-device-id': config.deviceId,
        },
        body: JSON.stringify(subPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok || !data.success) {
        const err = data.error || `Sync failed with status ${response.status}`;
        setLocalSyncMeta('last_sync_error', err);
        return { success: false, error: err };
      }

      if (data.serverTimestamp) {
        latestTimestamp = data.serverTimestamp;
      }
      if (data.counts) {
        for (const [k, v] of Object.entries(data.counts)) {
          if (k in finalCounts) (finalCounts as any)[k] += Number(v) || 0;
        }
      }
    }

    // Update last sync timestamp on complete success
    if (latestTimestamp) {
      setLocalSyncMeta('last_synced_at', latestTimestamp);
      setLocalSyncMeta('last_sync_error', '');
    }

    return {
      success: true,
      counts: finalCounts,
      serverTimestamp: latestTimestamp,
    };
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError' ? 'Sync timed out' : err.message || 'Sync failed';
    setLocalSyncMeta('last_sync_error', errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    isSyncInProgress = false;
  }
}
