import { BrowserWindow } from 'electron';
import { getDatabase } from '../db/database';
import { generateBillImage, BillRenderData } from '../cloud/billImageGenerator';
import { sendWhatsAppImageBill, getWhatsAppStatus, onWhatsAppDeliveryReceipt } from './baileysManager';
import { buildUrduBillMessage } from './messageTemplates';
import { isValidWhatsAppPhone, formatToWhatsAppJid } from './phoneUtils';

export type SpeedPreset = 'safe_10m' | 'safe_6m' | 'moderate' | 'express' | 'test';

export interface QueueProgressState {
  isRunning: boolean;
  isPaused: boolean;
  speedPreset: SpeedPreset;
  activeMonth: string;
  total: number;
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  failed: number;
  currentCustomerName?: string;
  currentCustomerPhone?: string;
  nextCustomerName?: string;
  nextCustomerPhone?: string;
  nextSendInSeconds: number;
  estimatedCompletionMinutes: number;
  failedItems?: Array<{
    customerId: number;
    customerName: string;
    phone: string;
    errorMessage?: string;
  }>;
}

export interface EnqueueBillPayload {
  customerId: number;
  customerName: string;
  phone: string;
  billMonth: string;
  monthLabel: string;
  liters: number;
  rate: number;
  billAmount: number;
  carry?: number;
  received?: number;
  payable: number;
  accountNumber?: string;
  whatsappConsent?: boolean;
}

// Queue Controller State
let isRunning = false;
let isPaused = false;
let currentSpeedPreset: SpeedPreset = 'safe_10m';
let activeMonth: string = '';
let nextSendTimestamp: number = 0;
let remainingDelayMs: number = 0;
let workerTimeout: NodeJS.Timeout | null = null;
let countdownInterval: NodeJS.Timeout | null = null;
let currentSendingItem: { name: string; phone: string } | null = null;

export function broadcastQueueProgress(): void {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) return;

  const status = getQueueStatus();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('whatsapp:queue-progress', status);
    }
  }
}

/**
 * Calculates delay in milliseconds based on speed preset with anti-ban human jitter
 */
function calculateNextDelayMs(preset: SpeedPreset): number {
  switch (preset) {
    case 'safe_10m': {
      // ~10 minutes (600s) ± 60s jitter -> Range: 540s to 660s (approx 9 - 11 mins)
      const baseMs = 600 * 1000;
      const jitterMs = (Math.random() * 120 - 60) * 1000;
      return Math.max(300000, Math.floor(baseMs + jitterMs));
    }
    case 'safe_6m': {
      // ~6 minutes (360s) ± 45s jitter -> 10 messages/hour (315s to 405s)
      const baseMs = 360 * 1000;
      const jitterMs = (Math.random() * 90 - 45) * 1000;
      return Math.max(180000, Math.floor(baseMs + jitterMs));
    }
    case 'moderate': {
      // ~3.5 minutes (210s) ± 30s jitter
      const baseMs = 210 * 1000;
      const jitterMs = (Math.random() * 60 - 30) * 1000;
      return Math.max(120000, Math.floor(baseMs + jitterMs));
    }
    case 'express': {
      // ~1.5 minutes (90s) ± 15s jitter
      const baseMs = 90 * 1000;
      const jitterMs = (Math.random() * 30 - 15) * 1000;
      return Math.max(45000, Math.floor(baseMs + jitterMs));
    }
    case 'test': {
      // 15 to 25 seconds for testing
      const baseMs = 20 * 1000;
      const jitterMs = (Math.random() * 10 - 5) * 1000;
      return Math.max(10000, Math.floor(baseMs + jitterMs));
    }
    default:
      return 600 * 1000;
  }
}

/**
 * Get Bill Settings from DB
 */
function getBillSettings(): any {
  const db = getDatabase();
  try {
    return db.prepare('SELECT * FROM bill_settings WHERE id = 1').get() || {};
  } catch {
    return {};
  }
}

/**
 * Registers delivery receipt handler to update database records
 */
export function initQueueDeliveryReceiptListener(): void {
  onWhatsAppDeliveryReceipt((messageId, status) => {
    try {
      const db = getDatabase();
      db.prepare(`
        UPDATE whatsapp_queue
        SET status = ?, delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE message_id = ?
      `).run(status, messageId);

      db.prepare(`
        UPDATE whatsapp_bill_logs
        SET status = ?, delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE message_id = ?
      `).run(status, messageId);

      broadcastQueueProgress();
    } catch (err) {
      console.error('[WhatsApp Queue] Failed to update delivery receipt in DB:', err);
    }
  });
}

/**
 * Enqueue a list of bills into the database queue
 */
export async function enqueueBills(
  items: EnqueueBillPayload[],
  preset: SpeedPreset = 'safe_10m',
  force: boolean = false
): Promise<{ enqueued: number; skipped: number }> {
  const db = getDatabase();
  currentSpeedPreset = preset;

  let enqueued = 0;
  let skipped = 0;

  const insertStmt = db.prepare(`
    INSERT INTO whatsapp_queue (
      customer_id, customer_name, phone, bill_month, month_label,
      liters, rate, bill_amount, carry, received, payable, account_number,
      status, speed_preset, retry_count, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      'queued', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT(customer_id, bill_month) DO UPDATE SET
      phone = excluded.phone,
      month_label = excluded.month_label,
      liters = excluded.liters,
      rate = excluded.rate,
      bill_amount = excluded.bill_amount,
      carry = excluded.carry,
      received = excluded.received,
      payable = excluded.payable,
      account_number = excluded.account_number,
      status = 'queued',
      error_message = NULL,
      updated_at = CURRENT_TIMESTAMP
  `);

  const runTx = db.transaction(() => {
    for (const item of items) {
      if (!isValidWhatsAppPhone(item.phone) || item.whatsappConsent === false) {
        skipped++;
        continue;
      }

      if (item.billMonth) {
        activeMonth = item.billMonth;
      }

      // Check if already sent successfully for this month
      if (!force) {
        const existing = db
          .prepare(
            'SELECT status FROM whatsapp_queue WHERE customer_id = ? AND bill_month = ? AND status IN (\'sent\', \'delivered\', \'read\')'
          )
          .get(item.customerId, item.billMonth) as any;

        if (existing) {
          skipped++;
          continue;
        }
      }

      insertStmt.run(
        item.customerId,
        item.customerName,
        item.phone,
        item.billMonth,
        item.monthLabel || item.billMonth,
        item.liters || 0,
        item.rate || 0,
        item.billAmount || 0,
        item.carry || 0,
        item.received || 0,
        item.payable || 0,
        item.accountNumber || null,
        preset
      );
      enqueued++;
    }
  });

  runTx();

  // If not currently running, kick off queue loop
  if (!isRunning && enqueued > 0) {
    startQueueWorker();
  } else {
    broadcastQueueProgress();
  }

  return { enqueued, skipped };
}

/**
 * Main queue processing iteration
 */
async function processNextQueueItem(): Promise<void> {
  if (!isRunning || isPaused) {
    return;
  }

  const conn = getWhatsAppStatus();
  if (!conn.connected) {
    console.warn('[WhatsApp Queue] WhatsApp not connected. Waiting for connection...');
    // Recheck in 10 seconds
    nextSendTimestamp = Date.now() + 10000;
    workerTimeout = setTimeout(processNextQueueItem, 10000);
    broadcastQueueProgress();
    return;
  }

  const db = getDatabase();

  // Query next queued item
  let query = 'SELECT * FROM whatsapp_queue WHERE status = \'queued\'';
  const params: any[] = [];
  if (activeMonth) {
    query += ' AND bill_month = ?';
    params.push(activeMonth);
  }
  query += ' ORDER BY id ASC LIMIT 1';

  const item = db.prepare(query).get(...params) as any;

  if (!item) {
    console.log('[WhatsApp Queue] No more items in queue. Pausing worker.');
    isRunning = false;
    currentSendingItem = null;
    nextSendTimestamp = 0;
    broadcastQueueProgress();
    return;
  }

  currentSendingItem = { name: item.customer_name, phone: item.phone };

  // Mark status as 'sending'
  db.prepare(`
    UPDATE whatsapp_queue
    SET status = 'sending', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(item.id);
  broadcastQueueProgress();

  const settings = getBillSettings();

  // 1. Render Bill Image offscreen
  const renderData: BillRenderData = {
    customerId: item.customer_id,
    customerName: item.customer_name,
    phone: item.phone,
    month: item.bill_month,
    monthLabel: item.month_label || item.bill_month,
    rate: item.rate,
    liters: item.liters,
    billAmount: item.bill_amount,
    carry: item.carry,
    received: item.received,
    payable: item.payable,
    shopTitle: settings?.shop_title,
    ownerName: settings?.owner_name,
    shopPhone: settings?.phone,
    bankName: settings?.bank_name,
    accountTitle: settings?.account_title,
    accountNumber: item.account_number || settings?.account_number,
  };

  let imageBuffer: Buffer | undefined;
  try {
    const renderRes = await generateBillImage(renderData);
    if (renderRes.success && renderRes.buffer) {
      imageBuffer = renderRes.buffer;
    }
  } catch (renderErr) {
    console.error('[WhatsApp Queue] Error generating bill image:', renderErr);
  }

  // 2. Build text message caption (kept optional for logs, not sent in WhatsApp)
  const caption = buildUrduBillMessage({
    customerName: item.customer_name,
    monthLabel: item.month_label || item.bill_month,
    liters: item.liters,
    rate: item.rate,
    billAmount: item.bill_amount,
    carry: item.carry,
    received: item.received,
    payable: item.payable,
    shopTitle: settings?.shop_title,
    ownerName: settings?.owner_name,
    shopPhone: settings?.phone,
    bankName: settings?.bank_name,
    accountTitle: settings?.account_title,
    accountNumber: item.account_number || settings?.account_number,
  });

  // 3. Dispatch ONLY IMAGE to WhatsApp (no caption text per user request)
  let sendResult: { success: boolean; messageId?: string; error?: string };

  if (!imageBuffer) {
    sendResult = { success: false, error: 'Failed to generate bill preview image' };
  } else {
    // Send ONLY the bill image with no text caption
    sendResult = await sendWhatsAppImageBill(item.phone, imageBuffer, '');
  }

  // 4. Update Database
  if (sendResult.success) {
    db.prepare(`
      UPDATE whatsapp_queue
      SET status = 'sent', message_id = ?, sent_at = CURRENT_TIMESTAMP, error_message = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(sendResult.messageId || null, item.id);

    // Also update whatsapp_bill_logs for unified reporting
    try {
      const idempotencyKey = `${item.customer_id}_${item.bill_month}`;
      db.prepare(`
        INSERT INTO whatsapp_bill_logs (
          customer_id, customer_name, phone, bill_month, bill_amount, liters, rate,
          balance_due, status, message_id, error_message, idempotency_key, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, NULL, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(idempotency_key) DO UPDATE SET
          status = 'sent',
          message_id = excluded.message_id,
          sent_at = CURRENT_TIMESTAMP,
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        item.customer_id,
        item.customer_name,
        item.phone,
        item.bill_month,
        item.bill_amount,
        item.liters,
        item.rate,
        item.payable,
        sendResult.messageId || null,
        idempotencyKey
      );
    } catch {}
  } else {
    db.prepare(`
      UPDATE whatsapp_queue
      SET status = 'failed', error_message = ?, retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(sendResult.error || 'Failed to dispatch WhatsApp message', item.id);
  }

  currentSendingItem = null;

  // 5. Check if more items exist
  const remainingCount = (
    db
      .prepare('SELECT COUNT(*) as count FROM whatsapp_queue WHERE status = \'queued\'')
      .get() as any
  )?.count || 0;

  if (remainingCount === 0) {
    console.log('[WhatsApp Queue] All items completed.');
    isRunning = false;
    nextSendTimestamp = 0;
    broadcastQueueProgress();
    return;
  }

  // 6. Schedule next message with human-like jitter delay
  const delayMs = calculateNextDelayMs(currentSpeedPreset);
  nextSendTimestamp = Date.now() + delayMs;

  console.log(
    `[WhatsApp Queue] Next message scheduled in ${Math.round(delayMs / 1000)}s (${Math.round(
      delayMs / 60000
    )} mins)`
  );

  broadcastQueueProgress();

  workerTimeout = setTimeout(() => {
    processNextQueueItem().catch(console.error);
  }, delayMs);
}

/**
 * Starts the queue worker
 */
export function startQueueWorker(): void {
  if (isRunning && !isPaused) return;

  isRunning = true;
  isPaused = false;

  // Start countdown ticker for real-time UI display
  if (!countdownInterval) {
    countdownInterval = setInterval(() => {
      if (isRunning && nextSendTimestamp > 0) {
        broadcastQueueProgress();
      }
    }, 1000);
  }

  // Execute immediately
  processNextQueueItem().catch(console.error);
}

/**
 * Initializes Queue on Application Startup:
 * Recovers interrupted items ('sending' -> 'queued') and detects any pending queue
 */
export function initQueueOnStartup(): void {
  try {
    const db = getDatabase();
    // 1. Recover any interrupted sending items
    db.prepare(`UPDATE whatsapp_queue SET status = 'queued' WHERE status = 'sending'`).run();

    // 2. Discover if there were items left in queue
    const queuedRow = db
      .prepare(`SELECT bill_month FROM whatsapp_queue WHERE status = 'queued' ORDER BY id ASC LIMIT 1`)
      .get() as any;

    if (queuedRow?.bill_month) {
      activeMonth = queuedRow.bill_month;
      isPaused = true;
      isRunning = false;
      console.log('[WhatsApp Queue] Startup: Discovered pending queue for month:', activeMonth);
    }
  } catch (err) {
    console.error('[WhatsApp Queue] Startup init error:', err);
  }
}

/**
 * Pauses the queue worker and saves remaining delay
 */
export function pauseQueueWorker(): void {
  isPaused = true;
  isRunning = false;
  if (workerTimeout) {
    clearTimeout(workerTimeout);
    workerTimeout = null;
  }
  const now = Date.now();
  if (nextSendTimestamp > now) {
    remainingDelayMs = nextSendTimestamp - now;
  } else {
    remainingDelayMs = 0;
  }
  console.log(`[WhatsApp Queue] Paused. Saved remaining delay: ${Math.round(remainingDelayMs / 1000)}s`);
  broadcastQueueProgress();
}

/**
 * Resumes paused queue worker, strictly maintaining remaining interval to avoid ban
 */
export function resumeQueueWorker(month?: string): void {
  const db = getDatabase();

  // 1. Recover any interrupted sending item ('sending' -> 'queued')
  db.prepare(`UPDATE whatsapp_queue SET status = 'queued' WHERE status = 'sending'`).run();

  if (month) {
    activeMonth = month;
  } else if (!activeMonth) {
    const nextRow = db
      .prepare(`SELECT bill_month FROM whatsapp_queue WHERE status = 'queued' ORDER BY id ASC LIMIT 1`)
      .get() as any;
    if (nextRow?.bill_month) {
      activeMonth = nextRow.bill_month;
    }
  }

  isPaused = false;
  isRunning = true;

  if (workerTimeout) {
    clearTimeout(workerTimeout);
    workerTimeout = null;
  }

  // Start ticker for real-time second-by-second countdown in UI
  if (!countdownInterval) {
    countdownInterval = setInterval(() => {
      if (isRunning && nextSendTimestamp > 0) {
        broadcastQueueProgress();
      }
    }, 1000);
  }

  // Respect saved remaining delay from when pause was pressed
  const delayToWait = remainingDelayMs > 0 ? remainingDelayMs : 0;
  remainingDelayMs = 0;

  if (delayToWait > 1000) {
    nextSendTimestamp = Date.now() + delayToWait;
    console.log(`[WhatsApp Queue] Resumed with saved remaining delay: ${Math.round(delayToWait / 1000)}s`);
    broadcastQueueProgress();
    workerTimeout = setTimeout(() => {
      workerTimeout = null;
      processNextQueueItem().catch(console.error);
    }, delayToWait);
  } else {
    // If no remaining delay saved, check when the last bill was sent to ensure safe spacing
    try {
      const lastSentRow = db
        .prepare(`SELECT sent_at FROM whatsapp_bill_logs WHERE status = 'sent' ORDER BY id DESC LIMIT 1`)
        .get() as any;
      const minInterval = getDelayForPreset(currentSpeedPreset);
      if (lastSentRow?.sent_at) {
        const lastSentTime = new Date(lastSentRow.sent_at).getTime();
        const elapsed = Date.now() - lastSentTime;
        if (elapsed < minInterval) {
          const waitMs = minInterval - elapsed;
          nextSendTimestamp = Date.now() + waitMs;
          console.log(`[WhatsApp Queue] Safe anti-ban pacing: waiting ${Math.round(waitMs / 1000)}s before next message`);
          broadcastQueueProgress();
          workerTimeout = setTimeout(() => {
            workerTimeout = null;
            processNextQueueItem().catch(console.error);
          }, waitMs);
          return;
        }
      }
    } catch {}

    // Safe to immediately start next message
    nextSendTimestamp = 0;
    processNextQueueItem().catch(console.error);
  }
}

/**
 * Clears queue items (all, queued, or failed)
 */
export function clearQueue(month?: string, scope: 'all' | 'queued' | 'failed' = 'all'): { cleared: number } {
  const db = getDatabase();
  let query = 'DELETE FROM whatsapp_queue WHERE 1=1';
  const params: any[] = [];
  if (month) {
    query += ' AND bill_month = ?';
    params.push(month);
  }
  if (scope === 'queued') {
    query += ' AND status = \'queued\'';
  } else if (scope === 'failed') {
    query += ' AND status = \'failed\'';
  } else {
    query += ' AND status IN (\'queued\', \'failed\', \'sending\')';
  }
  const info = db.prepare(query).run(...params);

  if (scope !== 'failed') {
    if (workerTimeout) {
      clearTimeout(workerTimeout);
      workerTimeout = null;
    }
    isRunning = false;
    isPaused = false;
    nextSendTimestamp = 0;
    currentSendingItem = null;
  }

  broadcastQueueProgress();
  return { cleared: info.changes };
}

/**
 * Specifically clears only failed queue items
 */
export function clearFailedQueueItems(month?: string): { cleared: number } {
  return clearQueue(month, 'failed');
}

/**
 * Clears an individual queue item by customerId
 */
export function clearQueueItem(customerId: number, month?: string): { cleared: number } {
  const db = getDatabase();
  let query = 'DELETE FROM whatsapp_queue WHERE customer_id = ?';
  const params: any[] = [customerId];
  if (month) {
    query += ' AND bill_month = ?';
    params.push(month);
  }
  const info = db.prepare(query).run(...params);
  broadcastQueueProgress();
  return { cleared: info.changes };
}

/**
 * Re-queues failed items
 */
export function retryFailedQueueItems(month?: string): { retried: number } {
  const db = getDatabase();
  let query = 'UPDATE whatsapp_queue SET status = \'queued\', error_message = NULL WHERE status = \'failed\'';
  const params: any[] = [];
  if (month) {
    query += ' AND bill_month = ?';
    params.push(month);
  }
  const info = db.prepare(query).run(...params);

  if (!isRunning && info.changes > 0) {
    startQueueWorker();
  } else {
    broadcastQueueProgress();
  }

  return { retried: info.changes };
}

/**
 * Change speed preset on the fly
 */
export function setQueueSpeedPreset(preset: SpeedPreset): void {
  currentSpeedPreset = preset;
  broadcastQueueProgress();
}

/**
 * Get current Queue Status & Counts
 */
export function getQueueStatus(targetMonth?: string): QueueProgressState {
  const db = getDatabase();

  // Automatically purge orphaned records for customers that were deleted from the database
  try {
    db.prepare('DELETE FROM whatsapp_queue WHERE customer_id NOT IN (SELECT id FROM customers)').run();
    db.prepare('DELETE FROM whatsapp_bill_logs WHERE customer_id NOT IN (SELECT id FROM customers)').run();
  } catch {}

  const queryMonth = targetMonth || activeMonth || '';
  if (!activeMonth && queryMonth) {
    activeMonth = queryMonth;
  } else if (!activeMonth) {
    try {
      const latest = db.prepare('SELECT bill_month FROM whatsapp_queue ORDER BY id DESC LIMIT 1').get() as any;
      if (latest?.bill_month) activeMonth = latest.bill_month;
    } catch {}
  }

  const effectiveMonth = targetMonth || activeMonth;

  let counts = {
    total: 0,
    queued: 0,
    sending: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
  };

  try {
    let query = `
      SELECT q.status, COUNT(*) as count
      FROM whatsapp_queue q
      INNER JOIN customers c ON q.customer_id = c.id
    `;
    const params: any[] = [];
    if (effectiveMonth) {
      query += ' WHERE q.bill_month = ?';
      params.push(effectiveMonth);
    }
    query += ' GROUP BY q.status';

    const rows = db.prepare(query).all(...params) as { status: string; count: number }[];
    for (const r of rows) {
      counts.total += r.count;
      if (r.status === 'queued') counts.queued = r.count;
      else if (r.status === 'sending') counts.sending = r.count;
      else if (r.status === 'sent') counts.sent = r.count;
      else if (r.status === 'delivered' || r.status === 'read') counts.delivered += r.count;
      else if (r.status === 'failed') counts.failed = r.count;
    }
  } catch {}

  // Next recipient to be sent
  let nextItem: any = null;
  try {
    let nextQuery = `
      SELECT q.customer_id, c.name as customer_name, c.phone
      FROM whatsapp_queue q
      INNER JOIN customers c ON q.customer_id = c.id
      WHERE q.status = 'queued'
    `;
    const nextParams: any[] = [];
    if (effectiveMonth) {
      nextQuery += ' AND q.bill_month = ?';
      nextParams.push(effectiveMonth);
    }
    nextQuery += ' ORDER BY q.id ASC LIMIT 1';
    nextItem = db.prepare(nextQuery).get(...nextParams);
  } catch {}

  // List of failed items
  let failedItems: any[] = [];
  try {
    let failedQuery = `
      SELECT q.customer_id as customerId, c.name as customerName, c.phone, q.error_message as errorMessage
      FROM whatsapp_queue q
      INNER JOIN customers c ON q.customer_id = c.id
      WHERE q.status = 'failed'
    `;
    const failedParams: any[] = [];
    if (effectiveMonth) {
      failedQuery += ' AND q.bill_month = ?';
      failedParams.push(effectiveMonth);
    }
    failedQuery += ' ORDER BY q.id ASC';
    failedItems = db.prepare(failedQuery).all(...failedParams);
  } catch {}

  const now = Date.now();
  const nextSendInSeconds = isPaused && remainingDelayMs > 0
    ? Math.ceil(remainingDelayMs / 1000)
    : (nextSendTimestamp > now ? Math.ceil((nextSendTimestamp - now) / 1000) : 0);

  // Approximate delay per message in minutes
  const minutesPerMessage =
    currentSpeedPreset === 'safe_10m' ? 10 : currentSpeedPreset === 'safe_6m' ? 6 : currentSpeedPreset === 'moderate' ? 3.5 : 1.5;
  const estimatedCompletionMinutes = Math.round(counts.queued * minutesPerMessage);

  return {
    isRunning,
    isPaused,
    speedPreset: currentSpeedPreset,
    activeMonth: effectiveMonth || '',
    total: counts.total,
    queued: counts.queued,
    sending: counts.sending,
    sent: counts.sent,
    delivered: counts.delivered,
    failed: counts.failed,
    currentCustomerName: currentSendingItem?.name,
    currentCustomerPhone: currentSendingItem?.phone,
    nextCustomerName: nextItem?.customer_name,
    nextCustomerPhone: nextItem?.phone,
    nextSendInSeconds,
    estimatedCompletionMinutes,
    failedItems,
  };
}

/**
 * Returns map of customerId -> { status: 'sent' | 'queued' | 'failed' | 'sending', sentAt?: string } for a given month
 */
export function getCustomerBillStatusMap(month: string): Record<number, { status: string; sentAt?: string }> {
  const db = getDatabase();
  const map: Record<number, { status: string; sentAt?: string }> = {};

  try {
    // 1. Check queue items
    const queueRows = db.prepare(`
      SELECT customer_id, status, updated_at
      FROM whatsapp_queue
      WHERE bill_month = ?
    `).all(month) as { customer_id: number; status: string; updated_at?: string }[];

    for (const r of queueRows) {
      map[r.customer_id] = {
        status: r.status,
        sentAt: r.updated_at,
      };
    }

    // 2. Check successful logs to ensure confirmed sent bills are marked as 'sent'
    const logRows = db.prepare(`
      SELECT customer_id, sent_at
      FROM whatsapp_bill_logs
      WHERE bill_month = ? AND status = 'sent'
    `).all(month) as { customer_id: number; sent_at: string }[];

    for (const l of logRows) {
      map[l.customer_id] = {
        status: 'sent',
        sentAt: l.sent_at,
      };
    }
  } catch (err) {
    console.error('[WhatsApp Queue] Error getting customer bill status map:', err);
  }

  return map;
}

/**
 * Get all queue records for a specific month
 */
export function getQueueItemsForMonth(month: string): any[] {
  const db = getDatabase();
  try {
    return db
      .prepare('SELECT * FROM whatsapp_queue WHERE bill_month = ? ORDER BY id ASC')
      .all(month);
  } catch {
    return [];
  }
}

/**
 * Dispatch an individual bill directly (e.g. user clicked "Send Now" on a specific row)
 */
export async function sendDirectSingleBill(
  payload: EnqueueBillPayload,
  settings: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const conn = getWhatsAppStatus();
  if (!conn.connected) {
    return {
      success: false,
      error: 'WhatsApp is not connected. Please scan the QR code first.',
    };
  }

  const db = getDatabase();

  // 1. Render Bill Image offscreen
  const renderData: BillRenderData = {
    customerId: payload.customerId,
    customerName: payload.customerName,
    phone: payload.phone,
    month: payload.billMonth,
    monthLabel: payload.monthLabel || payload.billMonth,
    rate: payload.rate,
    liters: payload.liters,
    billAmount: payload.billAmount,
    carry: payload.carry || 0,
    received: payload.received || 0,
    payable: payload.payable,
    shopTitle: settings?.shop_title,
    ownerName: settings?.owner_name,
    shopPhone: settings?.phone,
    bankName: settings?.bank_name,
    accountTitle: settings?.account_title,
    accountNumber: payload.accountNumber || settings?.account_number,
  };

  const renderRes = await generateBillImage(renderData);
  if (!renderRes.success || !renderRes.buffer) {
    return { success: false, error: renderRes.error || 'Failed to render bill image' };
  }

  // 2. Build text message caption
  const caption = buildUrduBillMessage({
    customerName: payload.customerName,
    monthLabel: payload.monthLabel || payload.billMonth,
    liters: payload.liters,
    rate: payload.rate,
    billAmount: payload.billAmount,
    carry: payload.carry,
    received: payload.received,
    payable: payload.payable,
    shopTitle: settings?.shop_title,
    ownerName: settings?.owner_name,
    shopPhone: settings?.phone,
    bankName: settings?.bank_name,
    accountTitle: settings?.account_title,
    accountNumber: payload.accountNumber || settings?.account_number,
  });

  // 3. Dispatch ONLY image to WhatsApp (no caption text per user request)
  const sendRes = await sendWhatsAppImageBill(payload.phone, renderRes.buffer, '');

  // 4. Update DB
  const status = sendRes.success ? 'sent' : 'failed';
  const idempotencyKey = `${payload.customerId}_${payload.billMonth}`;

  try {
    db.prepare(`
      INSERT INTO whatsapp_queue (
        customer_id, customer_name, phone, bill_month, month_label,
        liters, rate, bill_amount, carry, received, payable, account_number,
        status, message_id, error_message, sent_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT(customer_id, bill_month) DO UPDATE SET
        status = excluded.status,
        message_id = excluded.message_id,
        error_message = excluded.error_message,
        sent_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      payload.customerId,
      payload.customerName,
      payload.phone,
      payload.billMonth,
      payload.monthLabel,
      payload.liters,
      payload.rate,
      payload.billAmount,
      payload.carry || 0,
      payload.received || 0,
      payload.payable,
      payload.accountNumber || null,
      status,
      sendRes.messageId || null,
      sendRes.error || null
    );

    db.prepare(`
      INSERT INTO whatsapp_bill_logs (
        customer_id, customer_name, phone, bill_month, bill_amount, liters, rate,
        balance_due, status, message_id, error_message, idempotency_key, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(idempotency_key) DO UPDATE SET
        status = excluded.status,
        message_id = excluded.message_id,
        error_message = excluded.error_message,
        sent_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      payload.customerId,
      payload.customerName,
      payload.phone,
      payload.billMonth,
      payload.billAmount,
      payload.liters,
      payload.rate,
      payload.payable,
      status,
      sendRes.messageId || null,
      sendRes.error || null,
      idempotencyKey
    );
  } catch (dbErr) {
    console.error('[WhatsApp] Failed to save direct send in DB:', dbErr);
  }

  broadcastQueueProgress();
  return sendRes;
}
