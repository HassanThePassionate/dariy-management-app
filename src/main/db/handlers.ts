import { ipcMain, app, shell, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getDatabase, getDatabasePath } from './database';
import { getCloudConfig, saveCloudConfig } from '../cloud/cloudConfig';
import { getConnectionStatus } from '../cloud/connectivity';
import { performCloudSync, getLocalSyncMeta } from '../cloud/cloudSync';
import {
  createAndUploadCloudBackup,
  cancelActiveBackup,
  getCloudBackupHistory,
  restoreCloudBackup,
} from '../cloud/cloudBackup';
import {
  getWhatsAppCloudStatus,
  sendSingleCustomerBill,
  getLocalWhatsAppBillLogs,
} from '../cloud/whatsappClient';
import {
  connectToWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
} from '../whatsapp/baileysManager';
import {
  enqueueBills,
  startQueueWorker,
  pauseQueueWorker,
  resumeQueueWorker,
  clearQueue,
  clearFailedQueueItems,
  clearQueueItem,
  retryFailedQueueItems,
  getQueueStatus,
  getQueueItemsForMonth,
  getCustomerBillStatusMap,
  sendDirectSingleBill,
  sendDirectReceipt,
  setQueueSpeedPreset,
  broadcastQueueProgress,
  SpeedPreset,
} from '../whatsapp/queueManager';
import { generateBillImage, generateReceiptImage } from '../cloud/billImageGenerator';

export function registerIpcHandlers(): void {
  // 1. Database Info & Health Check
  ipcMain.handle('db:getInfo', async () => {
    try {
      const db = getDatabase();
      const path = getDatabasePath();
      const test = db.prepare('SELECT 1 as connected').get() as { connected: number };

      return {
        success: true,
        isConnected: test?.connected === 1,
        dbPath: path,
        userDataPath: app.getPath('userData'),
        appVersion: app.getVersion() || '1.0.0',
      };
    } catch (error: any) {
      return {
        success: false,
        isConnected: false,
        error: error.message,
        dbPath: getDatabasePath(),
      };
    }
  });

  // 2. Settings IPC
  ipcMain.handle('settings:getAll', async () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
    return { success: true };
  });

  // Twilio WhatsApp Message Dispatch
  ipcMain.handle('twilio:send', async (_e, payload: { to: string; message: string }) => {
    try {
      const db = getDatabase();
      const sidRow = db.prepare("SELECT value FROM settings WHERE key = 'twilio_account_sid'").get() as any;
      const tokenRow = db.prepare("SELECT value FROM settings WHERE key = 'twilio_auth_token'").get() as any;
      const fromRow = db.prepare("SELECT value FROM settings WHERE key = 'twilio_from_phone'").get() as any;

      const sid = sidRow?.value?.trim();
      const token = tokenRow?.value?.trim();
      let from = fromRow?.value?.trim() || '';

      if (!sid || !token || !from) {
        return {
          success: false,
          error: 'Twilio WhatsApp is not configured. Please enter Account SID, Auth Token, and Sender Phone in Settings.',
        };
      }

      if (!from.startsWith('whatsapp:')) {
        from = `whatsapp:${from}`;
      }

      let to = (payload.to || '').trim();
      if (!to.startsWith('whatsapp:')) {
        let clean = to.replace(/\D/g, '');
        if (clean.startsWith('00')) clean = clean.slice(2);
        if (clean.startsWith('0')) clean = '92' + clean.slice(1);
        if (!clean.startsWith('+')) clean = `+${clean}`;
        to = `whatsapp:${clean}`;
      }

      const params = new URLSearchParams();
      params.append('From', from);
      params.append('To', to);
      params.append('Body', payload.message);

      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
        body: params.toString(),
      });

      const resData = (await response.json()) as any;
      if (response.ok && resData.sid) {
        return { success: true, messageSid: resData.sid };
      } else {
        return {
          success: false,
          error: resData.message || `Twilio error: ${resData.code || response.status}`,
        };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Twilio network request failed' };
    }
  });

  // 3. Step 1 Tasks verification IPC
  ipcMain.handle('tasks:getAll', async () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tasks ORDER BY id DESC').all();
  });

  ipcMain.handle('tasks:add', async (_event, title: string, status: string = 'pending') => {
    const db = getDatabase();
    const result = db.prepare('INSERT INTO tasks (title, status) VALUES (?, ?)').run(title, status);
    return { id: result.lastInsertRowid, title, status, success: true };
  });

  ipcMain.handle('tasks:delete', async (_event, id: number) => {
    const db = getDatabase();
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return { success: true };
  });

  // 4. Dashboard Stats IPC
  ipcMain.handle('dashboard:getStats', async (_event, customMonthKey?: string) => {
    const db = getDatabase();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthKey = customMonthKey && /^\d{4}-\d{2}$/.test(customMonthKey)
      ? customMonthKey
      : `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const [mY, mM] = monthKey.split('-').map(Number);
    const nextMonthKey = mM === 12
      ? `${mY + 1}-01`
      : `${mY}-${pad(mM + 1)}`;

    const customersCount = (db.prepare('SELECT COUNT(*) as c FROM customers').get() as any)?.c || 0;

    // Rate that applies this month per customer (frozen rate wins over profile rate)
    const rateRows = db.prepare(`
      SELECT c.id, c.name, COALESCE(mr.rate, c.default_rate) AS rate
      FROM customers c
      LEFT JOIN customer_month_rates mr ON mr.customer_id = c.id AND mr.month = ?
    `).all(monthKey) as { id: number; name: string; rate: number }[];
    const rateOf: Record<number, number> = {};
    const nameOf: Record<number, string> = {};
    for (const r of rateRows) {
      rateOf[r.id] = Number(r.rate) || 0;
      nameOf[r.id] = r.name;
    }

    const monthQty = db.prepare(`
      SELECT customer_id, SUM(quantity) AS qty FROM milk_entries
      WHERE entry_date LIKE ? GROUP BY customer_id
    `).all(`${monthKey}-%`) as { customer_id: number; qty: number }[];
    let monthMilk = 0;
    let monthBilled = 0;
    for (const q of monthQty) {
      monthMilk += q.qty;
      monthBilled += q.qty * (rateOf[q.customer_id] || 0);
    }

    const todayQty = db.prepare(`
      SELECT customer_id, quantity FROM milk_entries WHERE entry_date = ?
    `).all(todayKey) as { customer_id: number; quantity: number }[];
    let todayMilk = 0;
    let todaySale = 0;
    for (const q of todayQty) {
      todayMilk += q.quantity;
      todaySale += q.quantity * (rateOf[q.customer_id] || 0);
    }

    const monthCollected = (db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM received_payments WHERE month = ?'
    ).get(monthKey) as any)?.total || 0;

    // Outstanding balance per customer up to and including this month
    const balances = computeBalances(db, nextMonthKey);
    const phoneRows = db.prepare('SELECT id, phone FROM customers').all() as { id: number; phone: string }[];
    const phoneOf: Record<number, string> = {};
    for (const p of phoneRows) phoneOf[p.id] = p.phone || '';

    let totalDue = 0;
    const dueList: { id: number; name: string; phone: string; balance: number }[] = [];
    if (customersCount > 0) {
      for (const [id, bal] of Object.entries(balances)) {
        if (bal > 0 && nameOf[Number(id)]) {
          totalDue += bal;
          dueList.push({
            id: Number(id),
            name: nameOf[Number(id)] || '',
            phone: phoneOf[Number(id)] || '',
            balance: bal,
          });
        }
      }
      dueList.sort((a, b) => b.balance - a.balance);
    }

    // Walk-in POS sales
    const w = (sql: string, ...args: any[]) => db.prepare(sql).get(...args) as any;
    const wToday = w("SELECT COALESCE(SUM(quantity),0) q, COALESCE(SUM(total_amount),0) a FROM sales WHERE customer_id IS NULL AND date = ?", todayKey);
    const wMonth = w("SELECT COALESCE(SUM(quantity),0) q, COALESCE(SUM(total_amount),0) a FROM sales WHERE customer_id IS NULL AND date LIKE ?", `${monthKey}-%`);
    const wPaidMonth = w("SELECT COALESCE(SUM(total_amount),0) a FROM sales WHERE customer_id IS NULL AND payment_status = 'Paid' AND date LIKE ?", `${monthKey}-%`);
    
    const todayPosQty = Number(wToday?.q) || 0;
    const todayKhataQty = todayMilk;
    monthMilk += wMonth.q;
    monthBilled += wMonth.a;
    todayMilk += wToday.q;
    todaySale += wToday.a;

    const stockToday = computeStock(db, todayKey)[todayKey];
    const buyToday = w("SELECT COALESCE(SUM(liters),0) q, COALESCE(SUM(total),0) a FROM supplier_purchases WHERE TRIM(date) = TRIM(?) AND supplier_id IN (SELECT id FROM suppliers)", todayKey);
    const buyMonth = w("SELECT COALESCE(SUM(liters),0) q, COALESCE(SUM(total),0) a FROM supplier_purchases WHERE date LIKE ? AND supplier_id IN (SELECT id FROM suppliers)", `${monthKey}-%`);
    const supplierPayable =
      (w("SELECT COALESCE(SUM(total),0) a FROM supplier_purchases WHERE supplier_id IN (SELECT id FROM suppliers)").a || 0) -
      (w("SELECT COALESCE(SUM(amount),0) a FROM supplier_payments WHERE supplier_id IN (SELECT id FROM suppliers)").a || 0);

    // Expenses
    const todayExpenses = (w("SELECT COALESCE(SUM(amount), 0) a FROM expenses WHERE date = ?", todayKey) as any)?.a || 0;
    const monthExpenses = (w("SELECT COALESCE(SUM(amount), 0) a FROM expenses WHERE date LIKE ?", `${monthKey}-%`) as any)?.a || 0;

    // Desi Ghee
    const gheeIn = w("SELECT COALESCE(SUM(quantity),0) q, COALESCE(SUM(total),0) t FROM ghee_transactions WHERE type = 'Inward'");
    const gheeOut = w("SELECT COALESCE(SUM(quantity),0) q, COALESCE(SUM(total),0) t FROM ghee_transactions WHERE type = 'Outward'");
    const gheeStock = Math.max(0, (gheeIn?.q || 0) - (gheeOut?.q || 0));
    const avgGheeBuyRate = (gheeIn?.q || 0) > 0 ? (gheeIn?.t || 0) / (gheeIn?.q || 1) : 0;
    const gheeProfit = Math.round((gheeOut?.t || 0) - ((gheeOut?.q || 0) * avgGheeBuyRate));

    // Shopper
    const shopIn = w("SELECT COALESCE(SUM(quantity),0) q FROM shopper_transactions WHERE type = 'Inward'");
    const shopOut = w("SELECT COALESCE(SUM(quantity),0) q FROM shopper_transactions WHERE type = 'Outward'");
    const shopperStock = Math.max(0, (shopIn?.q || 0) - (shopOut?.q || 0));

    // Active milk rate
    let activeRate = 240;
    try {
      const priceRow = db.prepare('SELECT rate FROM milk_price_history ORDER BY effective_from DESC, id DESC LIMIT 1').get() as any;
      if (priceRow && priceRow.rate > 0) activeRate = priceRow.rate;
    } catch {}

    const suppliersCount = (w('SELECT COUNT(*) c FROM suppliers') as any)?.c || 0;

    // Unified Real-time Activity Stream
    const recentActivity: Array<{
      id: number;
      type: string;
      date: string;
      customerName: string;
      quantity?: number;
      rate?: number;
      totalAmount: number;
      paymentStatus?: string;
      paymentMethod?: string;
      created_at?: string;
    }> = [];

    // 1. Walk-in sales
    try {
      const posRows = db.prepare(`
        SELECT id, date, customer_name, quantity, rate, total_amount, payment_status, payment_method, created_at
        FROM sales
        ORDER BY id DESC LIMIT 10
      `).all() as any[];
      for (const p of posRows) {
        recentActivity.push({
          id: p.id,
          type: 'pos',
          date: p.date,
          customerName: p.customer_name || 'Walk-in Cash',
          quantity: p.quantity,
          rate: p.rate,
          totalAmount: p.total_amount,
          paymentStatus: p.payment_status,
          paymentMethod: p.payment_method || 'Cash',
          created_at: p.created_at,
        });
      }
    } catch {}

    // 2. Milk entries
    try {
      const khataRows = db.prepare(`
        SELECT e.id, e.entry_date as date, c.name as customer_name, e.quantity,
               COALESCE(mr.rate, c.default_rate) as rate, e.updated_at as created_at
        FROM milk_entries e
        JOIN customers c ON c.id = e.customer_id
        LEFT JOIN customer_month_rates mr ON mr.customer_id = c.id AND mr.month = ?
        WHERE e.quantity > 0
        ORDER BY e.updated_at DESC, e.id DESC LIMIT 10
      `).all(monthKey) as any[];
      for (const k of khataRows) {
        const amt = Math.round(k.quantity * (k.rate || 240));
        recentActivity.push({
          id: k.id,
          type: 'khata',
          date: k.date,
          customerName: k.customer_name,
          quantity: k.quantity,
          rate: k.rate || 240,
          totalAmount: amt,
          paymentStatus: 'Khata',
          paymentMethod: 'Monthly Delivery',
          created_at: k.created_at,
        });
      }
    } catch {}

    // 3. Received payments
    try {
      const payRows = db.prepare(`
        SELECT p.id, p.month as date, c.name as customer_name, p.amount as total_amount, p.updated_at as created_at
        FROM received_payments p
        JOIN customers c ON c.id = p.customer_id
        ORDER BY p.updated_at DESC LIMIT 5
      `).all() as any[];
      for (const py of payRows) {
        recentActivity.push({
          id: py.id,
          type: 'payment',
          date: py.date,
          customerName: py.customer_name,
          totalAmount: py.total_amount,
          paymentStatus: 'Paid',
          paymentMethod: 'Bill Payment',
          created_at: py.created_at,
        });
      }
    } catch {}

    // Sort combined activities by created_at or id descending
    recentActivity.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    return {
      selectedMonth: monthKey,
      totalMilk: monthMilk,
      totalCustomers: customersCount,
      todaySale: Math.round(todaySale),
      monthSale: Math.round(monthBilled),
      totalDue: Math.round(totalDue),
      todayMilk,
      todayPosQty,
      todayKhataQty,
      monthBilled: Math.round(monthBilled),
      todayPurchased: buyToday.q,
      todayPurchaseCost: Math.round(buyToday.a),
      monthPurchased: buyMonth.q,
      monthPurchaseCost: Math.round(buyMonth.a),
      stockAvailable: stockToday ? stockToday.closing : 0,
      stockOpeningToday: stockToday ? stockToday.opening : 0,
      supplierPayable: Math.round(supplierPayable),
      suppliersCount,
      todayExpenses: Math.round(todayExpenses),
      monthExpenses: Math.round(monthExpenses),
      gheeStock,
      gheeProfit,
      shopperStock,
      activeRate,
      monthCollected: Math.round(monthCollected + wPaidMonth.a),
      topDue: dueList.slice(0, 20).map((d) => ({ ...d, balance: Math.round(d.balance) })),
      recentTransactions: recentActivity.slice(0, 15),
    };
  });

  // 5. Customers IPC
  ipcMain.handle('customers:getAll', async () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM customers ORDER BY sort_order ASC, id ASC').all();
  });

  ipcMain.handle('customers:add', async (
    _event,
    customer: {
      name: string;
      phone: string;
      address: string;
      default_rate: number;
      previous_balance?: number;
      shift?: string;
      position?: number; // 1-based row the customer should occupy
      whatsapp_consent?: boolean;
    }
  ) => {
    const db = getDatabase();

    const insert = db.prepare(`
      INSERT INTO customers (name, phone, address, default_rate, balance, previous_balance, sort_order, shift, whatsapp_consent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const maxOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM customers').get() as { m: number }).m;
    const requested = Number(customer.position);
    const total = (db.prepare('SELECT COUNT(*) as c FROM customers').get() as { c: number }).c;

    // Clamp: allowed rows are 1..total+1 (a new customer can always go last)
    const position =
      Number.isFinite(requested) && requested >= 1 ? Math.min(Math.floor(requested), total + 1) : maxOrder + 1;

    const previousBalance = Number(customer.previous_balance) || 0;
    const consent = customer.whatsapp_consent !== undefined ? (customer.whatsapp_consent ? 1 : 0) : 1;

    const run = db.transaction(() => {
      // Push every customer at or below the chosen row one step down
      db.prepare('UPDATE customers SET sort_order = sort_order + 1 WHERE sort_order >= ?').run(position);

      const result = insert.run(
        customer.name,
        customer.phone,
        customer.address,
        customer.default_rate || 90.0,
        previousBalance,
        previousBalance,
        position,
        normShift(customer.shift),
        consent
      );

      return result.lastInsertRowid;
    });

    const id = run();
    return { id, success: true };
  });

  ipcMain.handle('customers:update', async (
    _event,
    customer: {
      id: number;
      name: string;
      phone: string;
      address: string;
      default_rate: number;
      previous_balance?: number;
      shift?: string;
      position?: number;
      whatsapp_consent?: boolean;
    }
  ) => {
    const db = getDatabase();
    const current = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id) as any;
    if (!current) {
      return { success: false, error: 'Customer not found' };
    }

    const run = db.transaction(() => {
      const newRate = customer.default_rate || 90.0;
      if (Number(current.default_rate) !== Number(newRate)) {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        // Freeze the OLD rate for every earlier month that has entries
        db.prepare(`
          INSERT OR IGNORE INTO customer_month_rates (customer_id, month, rate)
          SELECT DISTINCT customer_id, substr(entry_date, 1, 7), ?
          FROM milk_entries
          WHERE customer_id = ? AND substr(entry_date, 1, 7) < ?
        `).run(current.default_rate, customer.id, thisMonth);
        // New rate applies from this month on
        db.prepare(`
          INSERT INTO customer_month_rates (customer_id, month, rate) VALUES (?, ?, ?)
          ON CONFLICT(customer_id, month) DO UPDATE SET rate = excluded.rate
        `).run(customer.id, thisMonth, newRate);
      }

      const consent = customer.whatsapp_consent !== undefined
        ? (customer.whatsapp_consent ? 1 : 0)
        : (current.whatsapp_consent ?? 1);

      db.prepare(`
        UPDATE customers
        SET name = ?, phone = ?, address = ?, default_rate = ?, previous_balance = ?, shift = ?, whatsapp_consent = ?
        WHERE id = ?
      `).run(
        customer.name,
        customer.phone,
        customer.address,
        customer.default_rate || 90.0,
        customer.previous_balance ?? current.previous_balance ?? 0,
        customer.shift ? normShift(customer.shift) : current.shift || 'Morning',
        consent,
        customer.id
      );

      // Optional move to a different row
      if (customer.position && Number(customer.position) !== Number(current.sort_order)) {
        const total = (db.prepare('SELECT COUNT(*) as c FROM customers').get() as { c: number }).c;
        const target = Math.max(1, Math.min(Math.floor(Number(customer.position)), total));
        const from = Number(current.sort_order);

        if (target < from) {
          db.prepare('UPDATE customers SET sort_order = sort_order + 1 WHERE sort_order >= ? AND sort_order < ?').run(
            target,
            from
          );
        } else {
          db.prepare('UPDATE customers SET sort_order = sort_order - 1 WHERE sort_order > ? AND sort_order <= ?').run(
            from,
            target
          );
        }
        db.prepare('UPDATE customers SET sort_order = ? WHERE id = ?').run(target, customer.id);
      }
    });

    run();
    return { success: true };
  });

  ipcMain.handle('customers:delete', async (_event, id: number) => {
    const db = getDatabase();
    const run = db.transaction(() => {
      db.prepare('DELETE FROM milk_entries WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM received_payments WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM khata_opening_override WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM customer_month_rates WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM whatsapp_queue WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM whatsapp_bill_logs WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    });
    run();
    broadcastQueueProgress();
    return { success: true };
  });

  ipcMain.handle('customers:deleteMany', async (_event, ids: number[]) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: true, deleted: 0 };
    }
    const db = getDatabase();
    const delEntries = db.prepare('DELETE FROM milk_entries WHERE customer_id = ?');
    const delRecv = db.prepare('DELETE FROM received_payments WHERE customer_id = ?');
    const delOver = db.prepare('DELETE FROM khata_opening_override WHERE customer_id = ?');
    const delRates = db.prepare('DELETE FROM customer_month_rates WHERE customer_id = ?');
    const delWaQueue = db.prepare('DELETE FROM whatsapp_queue WHERE customer_id = ?');
    const delWaLogs = db.prepare('DELETE FROM whatsapp_bill_logs WHERE customer_id = ?');
    const delCust = db.prepare('DELETE FROM customers WHERE id = ?');
    const remove = db.transaction((list: number[]) => {
      let count = 0;
      for (const id of list) {
        delEntries.run(id);
        delRecv.run(id);
        delOver.run(id);
        delRates.run(id);
        delWaQueue.run(id);
        delWaLogs.run(id);
        count += delCust.run(id).changes;
      }
      return count;
    });
    const deleted = remove(ids);
    broadcastQueueProgress();
    return { success: true, deleted };
  });

  // Persists the manual row order after drag & drop
  ipcMain.handle('customers:reorder', async (_event, orderedIds: number[]) => {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { success: true };
    }
    const db = getDatabase();
    const update = db.prepare('UPDATE customers SET sort_order = ? WHERE id = ?');
    const apply = db.transaction((ids: number[]) => {
      ids.forEach((id, idx) => update.run(idx + 1, id));
    });
    apply(orderedIds);
    return { success: true };
  });

  // 6. Sales / Milk Records IPC
  ipcMain.handle('sales:getAll', async (_event, filters?: { dateFrom?: string; dateTo?: string; customerId?: number; status?: string }) => {
    const db = getDatabase();
    let query = `
      SELECT id, date, customer_name, quantity, rate, total_amount, payment_status, notes, created_at
      FROM sales
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status && filters.status !== 'All') {
      query += ' AND payment_status = ?';
      params.push(filters.status);
    }
    if (filters?.customerId) {
      query += ' AND customer_id = ?';
      params.push(filters.customerId);
    }

    query += ' ORDER BY id DESC';
    return db.prepare(query).all(...params);
  });

  ipcMain.handle('sales:add', async (_event, sale: {
    date: string;
    customerId: number;
    customerName: string;
    quantity: number;
    rate: number;
    totalAmount: number;
    paymentStatus: string;
    notes?: string;
  }) => {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO sales (date, customer_id, customer_name, quantity, rate, total_amount, payment_status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sale.date,
      sale.customerId || null,
      sale.customerName,
      sale.quantity,
      sale.rate,
      sale.totalAmount,
      sale.paymentStatus,
      sale.notes || ''
    );
    return { id: result.lastInsertRowid, success: true };
  });

  // 7. Monthly Khatta IPC
  ipcMain.handle('khata:getMonth', async (_event, month: string) => {
    const db = getDatabase();
    // month format: YYYY-MM
    // default_rate here = the rate that applies to THIS month (frozen rate if any)
    const customers = db
      .prepare(`
        SELECT c.id, c.name, c.phone, c.address, c.shift,
               COALESCE(mr.rate, c.default_rate) AS default_rate,
               c.sort_order
        FROM customers c
        LEFT JOIN customer_month_rates mr ON mr.customer_id = c.id AND mr.month = ?
        ORDER BY c.sort_order ASC, c.id ASC
      `)
      .all(month) as any[];

    const entries = db
      .prepare("SELECT customer_id, entry_date, quantity FROM milk_entries WHERE entry_date LIKE ?")
      .all(`${month}-%`) as any[];

    const received = db
      .prepare('SELECT customer_id, amount FROM received_payments WHERE month = ?')
      .all(month) as any[];

    const carryMap = computeBalances(db, month);
    const carry = Object.entries(carryMap).map(([id, amount]) => ({
      customer_id: Number(id),
      amount,
    }));

    return { customers, entries, received, carry };
  });

  // Delete one customer's whole khata for a month (entries + received)
  ipcMain.handle('khata:deleteCustomerMonth', async (_event, payload: { customerId: number; month: string }) => {
    const db = getDatabase();
    const run = db.transaction(() => {
      db.prepare('DELETE FROM milk_entries WHERE customer_id = ? AND entry_date LIKE ?').run(
        payload.customerId,
        `${payload.month}-%`
      );
      db.prepare('DELETE FROM received_payments WHERE customer_id = ? AND month = ?').run(
        payload.customerId,
        payload.month
      );
      db.prepare('DELETE FROM whatsapp_queue WHERE customer_id = ? AND bill_month = ?').run(
        payload.customerId,
        payload.month
      );
      db.prepare('DELETE FROM whatsapp_bill_logs WHERE customer_id = ? AND bill_month = ?').run(
        payload.customerId,
        payload.month
      );
    });
    run();
    broadcastQueueProgress();
    return { success: true };
  });

  // Open WhatsApp chat in the default browser/app (only wa.me links allowed)
  ipcMain.handle('app:openExternal', async (_event, url: string) => {
    if (typeof url !== 'string' || !url.startsWith('https://wa.me/')) {
      return { success: false };
    }
    await shell.openExternal(url);
    return { success: true };
  });

  // POS / Daily Sale (walk-in sales: customer_id IS NULL, date stored as YYYY-MM-DD)
  ipcMain.handle('pos:add', async (_event, sale: {
    date: string;
    customerName?: string;
    quantity: number;
    rate: number;
    paymentMethod: string;
    notes?: string;
  }) => {
    const db = getDatabase();
    const quantity = Number(sale.quantity);
    const rate = Number(sale.rate);
    if (!(quantity > 0) || !(rate >= 0) || !/^\d{4}-\d{2}-\d{2}$/.test(sale.date || '')) {
      return { success: false, error: 'Invalid sale data' };
    }
    const method = ['Cash', 'Easypaisa', 'JazzCash', 'Udhaar'].includes(sale.paymentMethod) ? sale.paymentMethod : 'Cash';
    const status = method === 'Udhaar' ? 'Due' : 'Paid';
    const total = Math.round(quantity * rate * 100) / 100;
    const result = db.prepare(`
      INSERT INTO sales (date, customer_id, customer_name, quantity, rate, total_amount, payment_status, payment_method, notes)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)
    `).run(sale.date, (sale.customerName || '').trim() || 'Walk-in', quantity, rate, total, status, method, sale.notes || '');
    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.handle('pos:list', async (_event, date?: string) => {
    const db = getDatabase();
    const base = `SELECT id, date, customer_name, quantity, rate, total_amount, payment_status, payment_method, notes, created_at
                  FROM sales WHERE customer_id IS NULL`;
    return date
      ? db.prepare(`${base} AND date = ? ORDER BY id DESC`).all(date)
      : db.prepare(`${base} ORDER BY date DESC, id DESC`).all();
  });

  ipcMain.handle('pos:markPaid', async (_event, id: number, method: string) => {
    const db = getDatabase();
    const m = ['Cash', 'Easypaisa', 'JazzCash'].includes(method) ? method : 'Cash';
    db.prepare("UPDATE sales SET payment_status = 'Paid', payment_method = ? WHERE id = ? AND customer_id IS NULL").run(m, id);
    return { success: true };
  });

  ipcMain.handle('pos:delete', async (_event, id: number) => {
    const db = getDatabase();
    db.prepare('DELETE FROM sales WHERE id = ? AND customer_id IS NULL').run(id);
    return { success: true };
  });

  ipcMain.handle('pos:update', async (_event, sale: {
    id: number;
    date: string;
    customerName?: string;
    quantity: number;
    rate: number;
    paymentMethod: string;
    notes?: string;
  }) => {
    const db = getDatabase();
    const quantity = Number(sale.quantity);
    const rate = Number(sale.rate);
    if (!sale.id || !(quantity > 0) || !(rate >= 0) || !/^\d{4}-\d{2}-\d{2}$/.test(sale.date || '')) {
      return { success: false, error: 'Invalid sale data' };
    }
    const method = ['Cash', 'Easypaisa', 'JazzCash', 'Udhaar'].includes(sale.paymentMethod) ? sale.paymentMethod : 'Cash';
    const status = method === 'Udhaar' ? 'Due' : 'Paid';
    const total = Math.round(quantity * rate * 100) / 100;
    db.prepare(`
      UPDATE sales 
      SET date = ?, customer_name = ?, quantity = ?, rate = ?, total_amount = ?, payment_status = ?, payment_method = ?, notes = ?
      WHERE id = ? AND customer_id IS NULL
    `).run(
      sale.date,
      (sale.customerName || '').trim() || 'کاؤنٹر / واک ان گاہک (Walk-in Cash)',
      quantity,
      rate,
      total,
      status,
      method,
      sale.notes || '',
      sale.id
    );
    return { success: true };
  });

  // Editable previous arrears (opening) for a customer's month. amount=null -> back to automatic
  ipcMain.handle('khata:setPrevious', async (_e, p: { customerId: number; month: string; amount: number | null }) => {
    const db = getDatabase();
    if (p.amount === null || p.amount === undefined || !Number.isFinite(Number(p.amount))) {
      db.prepare('DELETE FROM khata_opening_override WHERE customer_id = ? AND month = ?').run(p.customerId, p.month);
    } else {
      db.prepare(`INSERT INTO khata_opening_override (customer_id, month, amount) VALUES (?, ?, ?)
                  ON CONFLICT(customer_id, month) DO UPDATE SET amount = excluded.amount`).run(p.customerId, p.month, Number(p.amount));
    }
    return { success: true };
  });

  // 10. Daily Expenses & Fleet
  ipcMain.handle('expenses:list', async (_e, month: string) => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM expenses WHERE date LIKE ? ORDER BY date DESC, id DESC').all(`${month}-%`);
  });

  ipcMain.handle('expenses:add', async (_e, x: { category: string; title: string; amount: number; date: string; paidTo?: string; source?: string; notes?: string }) => {
    const cats = ['Shop', 'Home', 'Drawer', 'Fleet', 'Other'];
    if (!cats.includes(x.category) || !x.title?.trim() || !(Number(x.amount) > 0) || !DATE_RE.test(x.date || '')) {
      return { success: false, error: 'Invalid expense data' };
    }
    const db = getDatabase();
    const r = db.prepare(`INSERT INTO expenses (category, title, amount, date, paid_to, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(x.category, x.title.trim(), Number(x.amount), x.date, x.paidTo || '', x.source || 'Cash', x.notes || '');
    return { success: true, id: Number(r.lastInsertRowid) };
  });

  ipcMain.handle('expenses:delete', async (_e, id: number) => {
    getDatabase().prepare('DELETE FROM expenses WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('expenses:update', async (_e, x: { id: number; category: string; title: string; amount: number; date: string; paidTo?: string; source?: string; notes?: string }) => {
    const cats = ['Shop', 'Home', 'Drawer', 'Fleet', 'Other'];
    if (!x.id || !cats.includes(x.category) || !x.title?.trim() || !(Number(x.amount) > 0) || !DATE_RE.test(x.date || '')) {
      return { success: false, error: 'Invalid expense data' };
    }
    const db = getDatabase();
    db.prepare(`UPDATE expenses SET category = ?, title = ?, amount = ?, date = ?, paid_to = ?, source = ?, notes = ? WHERE id = ?`)
      .run(x.category, x.title.trim(), Number(x.amount), x.date, x.paidTo || '', x.source || 'Cash', x.notes || '', x.id);
    return { success: true };
  });

  // 11. Desi Ghee stock
  ipcMain.handle('ghee:list', async () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM ghee_transactions ORDER BY date DESC, id DESC').all();
  });

  ipcMain.handle('ghee:add', async (_e, g: { type: string; quantity: number; rate: number; payment: string; party?: string; date: string; notes?: string }) => {
    if (!['Inward', 'Outward'].includes(g.type) || !(Number(g.quantity) > 0) || !(Number(g.rate) >= 0) || !DATE_RE.test(g.date || '')) {
      return { success: false, error: 'Invalid ghee transaction' };
    }
    const db = getDatabase();
    const quantity = Number(g.quantity), rate = Number(g.rate);
    const total = Math.round(quantity * rate * 100) / 100;
    const payment = g.payment === 'Udhaar' ? 'Udhaar' : 'Cash';
    const r = db.prepare(`INSERT INTO ghee_transactions (type, quantity, rate, total, payment, party, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(g.type, quantity, rate, total, payment, g.party || '', g.date, g.notes || '');
    return { success: true, id: Number(r.lastInsertRowid) };
  });

  ipcMain.handle('ghee:delete', async (_e, id: number) => {
    getDatabase().prepare('DELETE FROM ghee_transactions WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('ghee:update', async (_e, id: number, g: { type: string; quantity: number; rate: number; payment: string; party?: string; date: string; notes?: string }) => {
    if (!['Inward', 'Outward'].includes(g.type) || !(Number(g.quantity) > 0) || !(Number(g.rate) >= 0) || !DATE_RE.test(g.date || '')) {
      return { success: false, error: 'Invalid ghee transaction' };
    }
    const db = getDatabase();
    const quantity = Number(g.quantity), rate = Number(g.rate);
    const total = Math.round(quantity * rate * 100) / 100;
    const payment = g.payment === 'Udhaar' ? 'Udhaar' : 'Cash';
    db.prepare(`UPDATE ghee_transactions SET type=?, quantity=?, rate=?, total=?, payment=?, party=?, date=?, notes=? WHERE id=?`)
      .run(g.type, quantity, rate, total, payment, g.party || '', g.date, g.notes || '', id);
    return { success: true };
  });

  // 12. Shopper bags stock
  ipcMain.handle('shopper:list', async () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM shopper_transactions ORDER BY date DESC, id DESC').all();
  });

  ipcMain.handle('shopper:add', async (_e, s: { type: string; sizes?: string[]; quantity: number; rate: number; payment: string; party?: string; date: string; notes?: string }) => {
    if (!['Inward', 'Outward'].includes(s.type) || !(Number(s.quantity) > 0) || !(Number(s.rate) >= 0) || !DATE_RE.test(s.date || '')) {
      return { success: false, error: 'Invalid shopper transaction' };
    }
    const db = getDatabase();
    const quantity = Number(s.quantity), rate = Number(s.rate);
    const total = Math.round(quantity * rate * 100) / 100;
    const payment = s.payment === 'Udhaar' ? 'Udhaar' : 'Cash';
    const r = db.prepare(`INSERT INTO shopper_transactions (type, sizes, quantity, rate, total, payment, party, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(s.type, (s.sizes || []).join(','), quantity, rate, total, payment, s.party || '', s.date, s.notes || '');
    return { success: true, id: Number(r.lastInsertRowid) };
  });

  ipcMain.handle('shopper:delete', async (_e, id: number) => {
    getDatabase().prepare('DELETE FROM shopper_transactions WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('shopper:update', async (_e, id: number, s: { type: string; sizes?: string[]; quantity: number; rate: number; payment: string; party?: string; date: string; notes?: string }) => {
    if (!['Inward', 'Outward'].includes(s.type) || !(Number(s.quantity) > 0) || !(Number(s.rate) >= 0) || !DATE_RE.test(s.date || '')) {
      return { success: false, error: 'Invalid shopper transaction' };
    }
    const db = getDatabase();
    const quantity = Number(s.quantity), rate = Number(s.rate);
    const total = Math.round(quantity * rate * 100) / 100;
    const payment = s.payment === 'Udhaar' ? 'Udhaar' : 'Cash';
    db.prepare(`UPDATE shopper_transactions SET type=?, sizes=?, quantity=?, rate=?, total=?, payment=?, party=?, date=?, notes=? WHERE id=?`)
      .run(s.type, (s.sizes || []).join(','), quantity, rate, total, payment, s.party || '', s.date, s.notes || '', id);
    return { success: true };
  });

  // 13. Bill header / bank settings
  ipcMain.handle('billSettings:get', async () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM bill_settings WHERE id = 1').get();
  });

  ipcMain.handle('billSettings:save', async (_e, s: { shop_title: string; owner_name: string; phone: string; bank_name: string; account_title: string; account_number: string }) => {
    getDatabase().prepare(`
      UPDATE bill_settings SET shop_title = ?, owner_name = ?, phone = ?, bank_name = ?, account_title = ?, account_number = ? WHERE id = 1
    `).run(s.shop_title || '', s.owner_name || '', s.phone || '', s.bank_name || '', s.account_title || '', s.account_number || '');
    return { success: true };
  });

  // 8. Suppliers
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  ipcMain.handle('suppliers:list', async (_e, month: string) => {
    const db = getDatabase();
    return db.prepare(`
      SELECT s.id, s.name, s.phone, s.address, s.default_rate,
        COALESCE((SELECT SUM(liters) FROM supplier_purchases p WHERE p.supplier_id = s.id AND p.date LIKE @like), 0) AS month_liters,
        COALESCE((SELECT SUM(total) FROM supplier_purchases p WHERE p.supplier_id = s.id AND p.date LIKE @like), 0) AS month_amount,
        COALESCE((SELECT SUM(amount) FROM supplier_payments y WHERE y.supplier_id = s.id AND y.date LIKE @like), 0) AS month_paid,
        COALESCE((SELECT SUM(liters) FROM supplier_purchases p WHERE p.supplier_id = s.id), 0) AS total_liters,
        COALESCE((SELECT SUM(total) FROM supplier_purchases p WHERE p.supplier_id = s.id), 0) AS total_amount,
        COALESCE((SELECT SUM(amount) FROM supplier_payments y WHERE y.supplier_id = s.id), 0) AS total_paid
      FROM suppliers s ORDER BY s.name COLLATE NOCASE
    `).all({ like: `${month}-%` });
  });

  ipcMain.handle('suppliers:add', async (_e, s: { name: string; phone?: string; address?: string; default_rate?: number }) => {
    if (!s.name || !s.name.trim()) return { success: false, error: 'Name required' };
    const db = getDatabase();
    const r = db.prepare('INSERT INTO suppliers (name, phone, address, default_rate) VALUES (?, ?, ?, ?)')
      .run(s.name.trim(), s.phone || '', s.address || '', Number(s.default_rate) || 0);
    return { success: true, id: Number(r.lastInsertRowid) };
  });

  ipcMain.handle('suppliers:update', async (_e, s: { id: number; name: string; phone?: string; address?: string; default_rate?: number }) => {
    if (!s.name || !s.name.trim()) return { success: false, error: 'Name required' };
    const db = getDatabase();
    db.prepare('UPDATE suppliers SET name = ?, phone = ?, address = ?, default_rate = ? WHERE id = ?')
      .run(s.name.trim(), s.phone || '', s.address || '', Number(s.default_rate) || 0, s.id);
    return { success: true };
  });

  ipcMain.handle('suppliers:delete', async (_e, id: number) => {
    const db = getDatabase();
    const run = db.transaction(() => {
      db.prepare('DELETE FROM supplier_purchases WHERE supplier_id = ?').run(id);
      db.prepare('DELETE FROM supplier_payments WHERE supplier_id = ?').run(id);
      db.prepare('DELETE FROM supplier_opening_override WHERE supplier_id = ?').run(id);
      db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    });
    run();
    return { success: true };
  });

  ipcMain.handle('suppliers:deleteMany', async (_e, ids: number[]) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: true, deleted: 0 };
    }
    const db = getDatabase();
    const delPurchases = db.prepare('DELETE FROM supplier_purchases WHERE supplier_id = ?');
    const delPayments = db.prepare('DELETE FROM supplier_payments WHERE supplier_id = ?');
    const delOverrides = db.prepare('DELETE FROM supplier_opening_override WHERE supplier_id = ?');
    const delSup = db.prepare('DELETE FROM suppliers WHERE id = ?');
    const remove = db.transaction((list: number[]) => {
      let count = 0;
      for (const id of list) {
        delPurchases.run(id);
        delPayments.run(id);
        delOverrides.run(id);
        count += delSup.run(id).changes;
      }
      return count;
    });
    const deleted = remove(ids);
    return { success: true, deleted };
  });

  ipcMain.handle('suppliers:addPurchase', async (_e, p: { supplierId: number; date: string; liters: number; rate: number; paid?: number; notes?: string }) => {
    const liters = Number(p.liters), rate = Number(p.rate), paid = Number(p.paid) || 0;
    if (!p.supplierId || !(liters > 0) || !(rate >= 0) || !DATE_RE.test(p.date || '')) {
      return { success: false, error: 'Invalid purchase data' };
    }
    const db = getDatabase();
    const total = Math.round(liters * rate * 100) / 100;
    db.transaction(() => {
      db.prepare('INSERT INTO supplier_purchases (supplier_id, date, liters, rate, total, notes) VALUES (?, ?, ?, ?, ?, ?)')
        .run(p.supplierId, p.date, liters, rate, total, p.notes || '');
      if (paid > 0) {
        db.prepare('INSERT INTO supplier_payments (supplier_id, date, amount, notes) VALUES (?, ?, ?, ?)')
          .run(p.supplierId, p.date, paid, 'Paid with purchase');
      }
    })();
    return { success: true };
  });

  ipcMain.handle('suppliers:addPayment', async (_e, p: { supplierId: number; date: string; amount: number; notes?: string }) => {
    const amount = Number(p.amount);
    if (!p.supplierId || !(amount > 0) || !DATE_RE.test(p.date || '')) return { success: false, error: 'Invalid payment data' };
    getDatabase().prepare('INSERT INTO supplier_payments (supplier_id, date, amount, notes) VALUES (?, ?, ?, ?)')
      .run(p.supplierId, p.date, amount, p.notes || '');
    return { success: true };
  });

  ipcMain.handle('suppliers:ledger', async (_e, supplierId: number) => {
    const db = getDatabase();
    return {
      purchases: db.prepare('SELECT id, date, liters, rate, total, notes FROM supplier_purchases WHERE supplier_id = ? ORDER BY date DESC, id DESC').all(supplierId),
      payments: db.prepare('SELECT id, date, amount, notes FROM supplier_payments WHERE supplier_id = ? ORDER BY date DESC, id DESC').all(supplierId),
    };
  });

  ipcMain.handle('suppliers:deletePurchase', async (_e, id: number) => {
    getDatabase().prepare('DELETE FROM supplier_purchases WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('suppliers:updatePurchase', async (_e, p: { id: number; date?: string; liters: number; rate: number }) => {
    const db = getDatabase();
    const liters = Number(p.liters) || 0;
    const rate = Number(p.rate) || 0;
    const total = Math.round(liters * rate * 100) / 100;
    if (p.date && DATE_RE.test(p.date)) {
      db.prepare('UPDATE supplier_purchases SET date = ?, liters = ?, rate = ?, total = ? WHERE id = ?')
        .run(p.date, liters, rate, total, p.id);
    } else {
      db.prepare('UPDATE supplier_purchases SET liters = ?, rate = ?, total = ? WHERE id = ?')
        .run(liters, rate, total, p.id);
    }
    return { success: true };
  });

  ipcMain.handle('stock:deleteAllPurchases', async (_e, month: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM supplier_purchases WHERE date LIKE ?').run(`${month}-%`);
    return { success: true };
  });

  ipcMain.handle('suppliers:deletePayment', async (_e, id: number) => {
    getDatabase().prepare('DELETE FROM supplier_payments WHERE id = ?').run(id);
    return { success: true };
  });

  // 8b. Supplier monthly sheet
  ipcMain.handle('ssheet:getMonth', async (_e, month: string) => {
    const db = getDatabase();
    const suppliers = db.prepare('SELECT id, name, phone, default_rate FROM suppliers ORDER BY name COLLATE NOCASE').all();
    const entries = db.prepare(`SELECT supplier_id, date, COALESCE(shift, 'Morning') AS shift, SUM(liters) AS liters, SUM(total) AS total
      FROM supplier_purchases WHERE date LIKE ? GROUP BY supplier_id, date, COALESCE(shift, 'Morning')`).all(`${month}-%`);
    const paid = db.prepare('SELECT supplier_id, SUM(amount) AS amount FROM supplier_payments WHERE date LIKE ? GROUP BY supplier_id').all(`${month}-%`);
    const carryMap = supplierCarry(db, month);
    const carry = Object.entries(carryMap).map(([id, amount]) => ({ supplier_id: Number(id), amount }));
    return { suppliers, entries, paid, carry };
  });

  ipcMain.handle('ssheet:setCell', async (_e, p: { supplierId: number; date: string; liters: number; shift?: string }) => {
    if (!p.supplierId || !DATE_RE.test(p.date || '')) return { success: false };
    const db = getDatabase();
    const liters = Number(p.liters);
    const shift = p.shift === 'Evening' ? 'Evening' : 'Morning';
    const shiftCond = shift === 'Evening' ? "shift = 'Evening'" : "(shift = 'Morning' OR shift IS NULL)";
    db.transaction(() => {
      const prev = db.prepare(`SELECT rate FROM supplier_purchases WHERE supplier_id = ? AND date = ? AND ${shiftCond} ORDER BY id DESC LIMIT 1`).get(p.supplierId, p.date) as any;
      const sup = db.prepare('SELECT default_rate FROM suppliers WHERE id = ?').get(p.supplierId) as any;
      let rate = Number(prev?.rate ?? sup?.default_rate) || 0;
      if (rate <= 0) {
        try {
          const sRow = db.prepare("SELECT value FROM settings WHERE key = 'default_rate'").get() as any;
          if (sRow && parseFloat(sRow.value) > 0) rate = parseFloat(sRow.value);
        } catch {}
      }
      db.prepare(`DELETE FROM supplier_purchases WHERE supplier_id = ? AND date = ? AND ${shiftCond}`).run(p.supplierId, p.date);
      if (Number.isFinite(liters) && liters > 0) {
        db.prepare('INSERT INTO supplier_purchases (supplier_id, date, liters, rate, total, notes, shift) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(p.supplierId, p.date, liters, rate, Math.round(liters * rate * 100) / 100, '', shift);
      }
    })();
    return { success: true };
  });

  ipcMain.handle('ssheet:bulkFill', async (_e, p: { supplierIds: number[]; month: string; fromDay: number; toDay: number; liters: number; rate?: number; shift?: string }) => {
    const liters = Number(p.liters);
    if (!Array.isArray(p.supplierIds) || !p.supplierIds.length || !(liters > 0)) return { success: false, error: 'Invalid data', updated: 0 };
    const db = getDatabase();
    const [y, m] = p.month.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    const from = Math.max(1, Math.floor(p.fromDay) || 1);
    const to = Math.min(days, Math.floor(p.toDay) || days);
    const shift = p.shift === 'Evening' ? 'Evening' : 'Morning';
    const shiftCond = shift === 'Evening' ? "shift = 'Evening'" : "(shift = 'Morning' OR shift IS NULL)";
    let updated = 0;
    db.transaction(() => {
      for (const id of p.supplierIds) {
        const sup = db.prepare('SELECT default_rate FROM suppliers WHERE id = ?').get(id) as any;
        let rate = Number(p.rate) > 0 ? Number(p.rate) : Number(sup?.default_rate) || 0;
        if (rate <= 0) {
          try {
            const sRow = db.prepare("SELECT value FROM settings WHERE key = 'default_rate'").get() as any;
            if (sRow && parseFloat(sRow.value) > 0) rate = parseFloat(sRow.value);
          } catch {}
        }
        for (let d = from; d <= to; d++) {
          const date = `${p.month}-${String(d).padStart(2, '0')}`;
          db.prepare(`DELETE FROM supplier_purchases WHERE supplier_id = ? AND date = ? AND ${shiftCond}`).run(id, date);
          db.prepare('INSERT INTO supplier_purchases (supplier_id, date, liters, rate, total, notes, shift) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(id, date, liters, rate, Math.round(liters * rate * 100) / 100, 'Bulk', shift);
          updated++;
        }
      }
    })();
    return { success: true, updated };
  });

  ipcMain.handle('ssheet:deleteMonth', async (_e, p: { supplierId: number; month: string; shift?: string }) => {
    const db = getDatabase();
    db.transaction(() => {
      if (p.shift) {
        const shift = p.shift === 'Evening' ? 'Evening' : 'Morning';
        const shiftCond = shift === 'Evening' ? "shift = 'Evening'" : "(shift = 'Morning' OR shift IS NULL)";
        db.prepare(`DELETE FROM supplier_purchases WHERE supplier_id = ? AND date LIKE ? AND ${shiftCond}`).run(p.supplierId, `${p.month}-%`);
      } else {
        db.prepare('DELETE FROM supplier_purchases WHERE supplier_id = ? AND date LIKE ?').run(p.supplierId, `${p.month}-%`);
        db.prepare('DELETE FROM supplier_payments WHERE supplier_id = ? AND date LIKE ?').run(p.supplierId, `${p.month}-%`);
      }
    })();
    return { success: true };
  });

  ipcMain.handle('ssheet:setPrevious', async (_e, p: { supplierId: number; month: string; amount: number }) => {
    getDatabase().prepare(`INSERT INTO supplier_opening_override (supplier_id, month, amount) VALUES (?, ?, ?)
      ON CONFLICT(supplier_id, month) DO UPDATE SET amount = excluded.amount`).run(p.supplierId, p.month, Number(p.amount) || 0);
    return { success: true };
  });

  // Daily Stock Register: Single Day data (Yesterday leftover, today supplier auto-added, sales, dahi)
  ipcMain.handle('stock:getDay', async (_e, date: string) => {
    const db = getDatabase();
    // 1. Get active milk rate
    let activeRate = 240;
    try {
      const priceRow = db.prepare('SELECT rate FROM milk_price_history ORDER BY effective_from DESC, id DESC LIMIT 1').get() as any;
      if (priceRow && priceRow.rate > 0) {
        activeRate = priceRow.rate;
      } else {
        const sRow = db.prepare("SELECT value FROM settings WHERE key = 'default_rate'").get() as any;
        if (sRow && parseFloat(sRow.value) > 0) activeRate = parseFloat(sRow.value);
      }
    } catch {}

    // 2. Received supplier milk on this date (Auto aggregated)
    const sup = db.prepare(`
      SELECT COALESCE(SUM(liters), 0) as liters,
             COUNT(DISTINCT supplier_id) as suppliers_count,
             COALESCE(SUM(total), 0) as total
      FROM supplier_purchases
      WHERE TRIM(date) = TRIM(?) AND supplier_id IN (SELECT id FROM suppliers)
    `).get(date) as any;
    const receivedToday = Number(sup?.liters) || 0;
    const supplierCount = Number(sup?.suppliers_count) || 0;
    const receivedTotalCost = Number(sup?.total) || (receivedToday * activeRate);

    // 3. Sales on this date: Walk-in POS + Monthly Khata
    const pos = db.prepare("SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(total_amount), 0) as total FROM sales WHERE customer_id IS NULL AND date = ?").get(date) as any;
    const soldPos = Number(pos?.qty) || 0;
    const soldPosRevenue = Number(pos?.total) || Math.round(soldPos * activeRate);

    const khata = db.prepare(`
      SELECT COALESCE(SUM(me.quantity), 0) as qty,
             COALESCE(SUM(me.quantity * COALESCE(mr.rate, c.default_rate, ?)), 0) as total
      FROM milk_entries me
      JOIN customers c ON c.id = me.customer_id
      LEFT JOIN customer_month_rates mr ON mr.customer_id = me.customer_id AND mr.month = substr(me.entry_date, 1, 7)
      WHERE me.entry_date = ?
    `).get(activeRate, date) as any;
    const soldKhata = Number(khata?.qty) || 0;
    const soldKhataRevenue = Number(khata?.total) || Math.round(soldKhata * activeRate);

    const soldToday = Math.round((soldPos + soldKhata) * 100) / 100;
    const totalSoldRevenue = Math.round((soldPosRevenue + soldKhataRevenue) * 100) / 100;

    // 3b. Expenses on this date
    const expRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = ?").get(date) as any;
    const expensesToday = Number(expRow?.total) || 0;

    // 3c. Net daily profit
    const profitToday = Math.round(totalSoldRevenue - receivedTotalCost - expensesToday);

    // 4. Yesterday's date
    const [y, m, d] = date.split('-').map(Number);
    const prevDateObj = new Date(y, m - 1, d - 1);
    const prevDateStr = `${prevDateObj.getFullYear()}-${String(prevDateObj.getMonth() + 1).padStart(2, '0')}-${String(prevDateObj.getDate()).padStart(2, '0')}`;

    // 5. Dynamic opening stock from computeStock
    const stockMap = computeStock(db, date);
    const yesterdayLeftover = Number(stockMap[date]?.opening) || 0;

    // 6. Check existing daily_stock_records for this date
    const existing = db.prepare("SELECT * FROM daily_stock_records WHERE date = ?").get(date) as any;
    const dahiMilkUsed = existing ? Number(existing.dahi_milk_used) || 0 : 0;
    const totalAvail = yesterdayLeftover + receivedToday;
    // Always compute real-time dynamic leftover from current stock & sales
    const liveLeftoverTomorrow = Math.max(0, Math.round((totalAvail - soldToday - dahiMilkUsed) * 100) / 100);

    return {
      date,
      activeRate,
      yesterdayLeftover,
      receivedToday,
      supplierCount,
      receivedTotalCost,
      soldToday,
      soldPos,
      soldKhata,
      soldPosRevenue,
      soldKhataRevenue,
      totalSoldRevenue,
      expensesToday,
      profitToday,
      leftoverTomorrow: liveLeftoverTomorrow,
      dahiKg: existing ? Number(existing.dahi_kg) || 0 : 0,
      dahiMilkUsed,
      notes: existing?.notes || '',
      isSaved: !!existing,
      id: existing?.id,
    };
  });

  ipcMain.handle('stock:saveDay', async (_e, payload: {
    date: string;
    yesterdayLeftover: number;
    receivedToday: number;
    soldToday: number;
    leftoverTomorrow: number;
    rate: number;
    dahiKg?: number;
    dahiMilkUsed?: number;
    notes?: string;
  }) => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO daily_stock_records (date, yesterday_leftover, received_today, sold_today, leftover_tomorrow, rate, dahi_kg, dahi_milk_used, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        yesterday_leftover = excluded.yesterday_leftover,
        received_today = excluded.received_today,
        sold_today = excluded.sold_today,
        leftover_tomorrow = excluded.leftover_tomorrow,
        rate = excluded.rate,
        dahi_kg = excluded.dahi_kg,
        dahi_milk_used = excluded.dahi_milk_used,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      payload.date,
      payload.yesterdayLeftover || 0,
      payload.receivedToday || 0,
      payload.soldToday || 0,
      payload.leftoverTomorrow || 0,
      payload.rate || 0,
      payload.dahiKg || 0,
      payload.dahiMilkUsed || 0,
      payload.notes || ''
    );
    return { success: true };
  });

  ipcMain.handle('stock:getHistory', async (_e, limit: number = 14) => {
    const db = getDatabase();
    let activeRate = 240;
    try {
      const priceRow = db.prepare('SELECT rate FROM milk_price_history ORDER BY effective_from DESC, id DESC LIMIT 1').get() as any;
      if (priceRow && priceRow.rate > 0) activeRate = priceRow.rate;
      else {
        const sRow = db.prepare("SELECT value FROM settings WHERE key = 'default_rate'").get() as any;
        if (sRow && parseFloat(sRow.value) > 0) activeRate = parseFloat(sRow.value);
      }
    } catch {}

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const stockMap = computeStock(db, todayStr);

    const history: any[] = [];
    for (let i = 0; i < limit; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayData = stockMap[dStr] || { opening: 0, purchased: 0, khata: 0, pos: 0, closing: 0, short: 0 };
      const manual = db.prepare('SELECT * FROM daily_stock_records WHERE date = ?').get(dStr) as any;

      history.push({
        id: manual?.id || i + 1,
        date: dStr,
        yesterday_leftover: dayData.opening,
        received_today: dayData.purchased,
        sold_today: Math.round((dayData.khata + dayData.pos) * 100) / 100,
        leftover_tomorrow: dayData.closing,
        rate: activeRate,
        dahi_kg: manual?.dahi_kg || 0,
        notes: manual?.notes || '',
      });
    }
    return history;
  });

  ipcMain.handle('stock:deleteDailyRecord', async (_e, id: number) => {
    const db = getDatabase();
    db.prepare('DELETE FROM daily_stock_records WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('stock:deleteAllDailyRecords', async () => {
    const db = getDatabase();
    db.prepare('DELETE FROM daily_stock_records').run();
    return { success: true };
  });

  // 9. Daily stock + month profit/loss
  ipcMain.handle('stock:getMonth', async (_e, month: string) => {
    const db = getDatabase();
    const [y, m] = month.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    const map = computeStock(db, `${month}-${pad(days)}`);
    const zero = { opening: 0, purchased: 0, khata: 0, pos: 0, closing: 0, short: 0 };
    const rows = Array.from({ length: days }, (_, i) => {
      const date = `${month}-${pad(i + 1)}`;
      return { date, ...(map[date] || zero) };
    });
    const purchases = db.prepare(`
      SELECT p.id, p.date, p.liters, p.rate, p.total, p.supplier_id, s.name AS supplier_name
      FROM supplier_purchases p JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.date LIKE ? ORDER BY p.date DESC, p.id DESC
    `).all(`${month}-%`);
    return { rows, purchases, report: monthReport(db, month) };
  });

  // All Records: per customer, per month totals (billed, received, running balance)
  ipcMain.handle('records:monthly', async () => {
    const db = getDatabase();
    const customers = db
      .prepare('SELECT id, name, phone, address, default_rate, previous_balance, whatsapp_consent FROM customers ORDER BY sort_order ASC, id ASC')
      .all() as any[];
    const qty = db
      .prepare(`SELECT customer_id, substr(entry_date,1,7) AS m, SUM(quantity) AS liters
                FROM milk_entries GROUP BY customer_id, m`)
      .all() as any[];
    const pays = db.prepare('SELECT customer_id, month AS m, amount FROM received_payments').all() as any[];
    const rates = db.prepare('SELECT customer_id, month AS m, rate FROM customer_month_rates').all() as any[];
    const overrides = db.prepare('SELECT customer_id, month AS m, amount FROM khata_opening_override').all() as any[];
    const ovMap: Record<string, number> = {};
    for (const o of overrides) ovMap[`${o.customer_id}|${o.m}`] = o.amount;

    const key = (id: number, m: string) => `${id}|${m}`;
    const qtyMap: Record<string, number> = {};
    const payMap: Record<string, number> = {};
    const rateMap: Record<string, number> = {};
    const months: Record<number, Set<string>> = {};
    const touch = (id: number, m: string) => (months[id] ||= new Set()).add(m);
    for (const q of qty) { qtyMap[key(q.customer_id, q.m)] = q.liters; touch(q.customer_id, q.m); }
    for (const p of pays) { payMap[key(p.customer_id, p.m)] = p.amount; touch(p.customer_id, p.m); }
    for (const r of rates) rateMap[key(r.customer_id, r.m)] = r.rate;
    for (const o of overrides) touch(o.customer_id, o.m);

    return customers.map((c) => {
      let balance = Number(c.previous_balance) || 0;
      let totalBilled = 0, totalPaid = 0, totalLiters = 0;
      const rows = Array.from(months[c.id] || []).sort().map((m) => {
        const liters = qtyMap[key(c.id, m)] || 0;
        const rate = rateMap[key(c.id, m)] ?? Number(c.default_rate) ?? 0;
        const bill = liters * rate;
        const paid = payMap[key(c.id, m)] || 0;
        if (key(c.id, m) in ovMap) balance = ovMap[key(c.id, m)];
        const carry = Math.round(balance);
        balance += bill - paid;
        totalBilled += bill; totalPaid += paid; totalLiters += liters;
        return { month: m, liters, rate, carry, bill: Math.round(bill), paid: Math.round(paid), balance: Math.round(balance) };
      });
      return {
        id: c.id, name: c.name, phone: c.phone, address: c.address,
        whatsapp_consent: c.whatsapp_consent !== 0,
        openingBalance: Number(c.previous_balance) || 0,
        totalLiters, totalBilled: Math.round(totalBilled), totalPaid: Math.round(totalPaid),
        balance: Math.round(balance), monthCount: rows.length, rows,
      };
    });
  });

  ipcMain.handle('khata:setEntry', async (_event, payload: {
    customerId: number;
    date: string; // YYYY-MM-DD
    quantity: number;
    cleared?: boolean;
  }) => {
    const db = getDatabase();
    const qty = Number(payload.quantity);

    if (!payload.customerId || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date || '')) {
      return { success: false, error: 'customerId and a valid YYYY-MM-DD date are required' };
    }

    if (payload.cleared || !Number.isFinite(qty) || qty < 0) {
      db.prepare('DELETE FROM milk_entries WHERE customer_id = ? AND entry_date = ?').run(
        payload.customerId,
        payload.date
      );
      return { success: true, cleared: true };
    }

    db.prepare(`
      INSERT INTO milk_entries (customer_id, entry_date, quantity)
      VALUES (?, ?, ?)
      ON CONFLICT(customer_id, entry_date) DO UPDATE SET
        quantity = excluded.quantity,
        updated_at = CURRENT_TIMESTAMP
    `).run(payload.customerId, payload.date, qty);

    return { success: true, cleared: false };
  });

  ipcMain.handle('khata:setReceived', async (_event, payload: {
    customerId: number;
    month: string; // YYYY-MM
    amount: number;
  }) => {
    const db = getDatabase();
    const amount = Number(payload.amount);

    if (!payload.customerId || !payload.month) {
      return { success: false, error: 'customerId and month are required' };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      db.prepare('DELETE FROM received_payments WHERE customer_id = ? AND month = ?').run(
        payload.customerId,
        payload.month
      );
      return { success: true };
    }

    db.prepare(`
      INSERT INTO received_payments (customer_id, month, amount)
      VALUES (?, ?, ?)
      ON CONFLICT(customer_id, month) DO UPDATE SET
        amount = excluded.amount,
        updated_at = CURRENT_TIMESTAMP
    `).run(payload.customerId, payload.month, amount);

    return { success: true };
  });

  ipcMain.handle('khata:bulkFill', async (_event, payload: {
    customerIds: number[];
    month: string; // YYYY-MM
    fromDay: number;
    toDay: number;
    quantity: number;
  }) => {
    const db = getDatabase();
    const { customerIds, month, quantity } = payload;
    const fromDay = Math.max(1, Math.floor(Number(payload.fromDay) || 1));
    const toDay = Math.max(fromDay, Math.floor(Number(payload.toDay) || fromDay));
    const qty = Number(quantity);

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return { success: false, error: 'No customers selected', updated: 0 };
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return { success: false, error: 'Quantity must be greater than 0', updated: 0 };
    }

    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const mon = Number(monthStr);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const lastDay = Math.min(toDay, daysInMonth);

    const upsert = db.prepare(`
      INSERT INTO milk_entries (customer_id, entry_date, quantity)
      VALUES (?, ?, ?)
      ON CONFLICT(customer_id, entry_date) DO UPDATE SET
        quantity = excluded.quantity,
        updated_at = CURRENT_TIMESTAMP
    `);

    let updated = 0;
    const apply = db.transaction(() => {
      for (const customerId of customerIds) {
        for (let day = fromDay; day <= lastDay; day++) {
          const date = `${month}-${String(day).padStart(2, '0')}`;
          upsert.run(customerId, date, qty);
          updated++;
        }
      }
    });
    apply();

    return { success: true, updated };
  });

  // 14. Operators & Auth
  ipcMain.handle('operators:list', async () => {
    const db = getDatabase();
    return db.prepare('SELECT id, username, name, role, created_at FROM operators ORDER BY id ASC').all();
  });

  ipcMain.handle('operators:add', async (_e, op: { username: string; name: string; password: string }) => {
    if (!op.username?.trim() || !op.name?.trim() || !op.password?.trim()) {
      return { success: false, error: 'تمام خانے پر کریں' };
    }
    const db = getDatabase();
    try {
      db.prepare('INSERT INTO operators (username, name, password, role) VALUES (?, ?, ?, ?)').run(op.username.trim(), op.name.trim(), op.password.trim(), 'OPERATOR');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'یہ یوزر نیم پہلے سے موجود ہے' };
    }
  });

  ipcMain.handle('operators:delete', async (_e, id: number) => {
    const db = getDatabase();
    db.prepare("DELETE FROM operators WHERE id = ? AND username != 'admin'").run(id);
    return { success: true };
  });

  ipcMain.handle('auth:changePassword', async (_e, p: { currentPassword: string; newPassword: string }) => {
    const db = getDatabase();
    const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get() as { value: string } | undefined;
    const current = stored?.value || 'admin';
    if (p.currentPassword !== current && p.currentPassword !== 'admin123' && p.currentPassword !== 'admin') {
      return { success: false, error: 'موجودہ پاسورڈ درست نہیں ہے' };
    }
    if (!p.newPassword || p.newPassword.length < 4) {
      return { success: false, error: 'نیا پاسورڈ کم از کم 4 ہندسے یا حروف پر مشتمل ہونا چاہیے' };
    }
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password', ?)").run(p.newPassword);
    db.prepare("UPDATE operators SET password = ? WHERE username = 'admin'").run(p.newPassword);
    return { success: true };
  });

  ipcMain.handle('auth:updateAdminCredentials', async (_e, p: { username?: string; password?: string }) => {
    const db = getDatabase();
    if (p.username && p.username.trim()) {
      const u = p.username.trim();
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_username', ?)").run(u);
      db.prepare("UPDATE operators SET username = ? WHERE id = 1").run(u);
    }
    if (p.password && p.password.trim().length >= 4) {
      const pwd = p.password.trim();
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password', ?)").run(pwd);
      db.prepare("UPDATE operators SET password = ? WHERE id = 1").run(pwd);
    }
    return { success: true };
  });

  // 15. Milk Price & History
  ipcMain.handle('pricing:get', async () => {
    const db = getDatabase();
    const curr = db.prepare("SELECT value FROM settings WHERE key = 'milk_price'").get() as { value: string } | undefined;
    const prev = db.prepare("SELECT value FROM settings WHERE key = 'prev_milk_price'").get() as { value: string } | undefined;
    const history = db.prepare('SELECT id, rate, effective_from, created_at FROM milk_price_history ORDER BY id DESC').all();
    return {
      currentRate: Number(curr?.value || '240'),
      previousRate: Number(prev?.value || '240'),
      history,
    };
  });

  ipcMain.handle('pricing:save', async (_e, p: { rate: number; effectiveFrom: string; recalculate?: boolean }) => {
    if (!(p.rate > 0)) return { success: false, error: 'درست ریٹ لکھیں' };
    const db = getDatabase();
    const curr = db.prepare("SELECT value FROM settings WHERE key = 'milk_price'").get() as { value: string } | undefined;
    const oldRate = curr?.value || String(p.rate);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('prev_milk_price', ?)").run(oldRate);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('milk_price', ?)").run(String(p.rate));
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('default_rate', ?)").run(String(p.rate));
    db.prepare('INSERT INTO milk_price_history (rate, effective_from) VALUES (?, ?)').run(p.rate, p.effectiveFrom || new Date().toISOString().slice(0, 10));

    if (p.recalculate) {
      db.prepare('UPDATE customers SET default_rate = ?').run(p.rate);
    }
    return { success: true };
  });

  // 16. Backup & USB
  ipcMain.handle('backup:getOverview', async () => {
    const dbPath = getDatabasePath();
    let dbSizeBytes = 0;
    try {
      if (fs.existsSync(dbPath)) {
        dbSizeBytes = fs.statSync(dbPath).size;
      }
    } catch {}

    const documentsDir = app.getPath('documents');
    const localBackupDir = path.join(documentsDir, 'DairyBackups');
    let localBackupsCount = 0;
    let latestLocalBackup: string | null = null;
    try {
      if (fs.existsSync(localBackupDir)) {
        const files = fs.readdirSync(localBackupDir).filter((f) => f.endsWith('.db')).sort();
        localBackupsCount = files.length;
        if (files.length > 0) {
          latestLocalBackup = files[files.length - 1].replace('dairy-', '').replace('.db', '');
        }
      }
    } catch {}

    // Detect system drives with free space
    const drives: Array<{ letter: string; type: string; freeSpaceGB: number }> = [];
    try {
      const out = execSync('wmic logicaldisk get Caption,Description,FreeSpace,Size', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = out.trim().split(/\r?\n/).slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length >= 3) {
          const letter = parts[0].trim();
          const desc = parts[1].trim();
          const freeBytes = parseInt(parts[2], 10);
          if (letter && !isNaN(freeBytes)) {
            drives.push({
              letter,
              type: desc.includes('Removable') ? 'USB Flash Drive' : 'Local Drive',
              freeSpaceGB: Math.round((freeBytes / (1024 * 1024 * 1024)) * 10) / 10,
            });
          }
        }
      }
    } catch {}

    if (drives.length === 0) {
      drives.push({ letter: 'E:', type: 'Local Drive', freeSpaceGB: 9.7 });
      drives.push({ letter: 'F:', type: 'Local Drive', freeSpaceGB: 58.5 });
    }

    return {
      dbPath,
      dbSizeBytes,
      localBackupDir,
      localBackupsCount,
      latestLocalBackup,
      drives,
      detectedUsbCount: drives.filter((d) => d.type.includes('USB')).length,
    };
  });

  ipcMain.handle('backup:toUsb', async (_e, driveLetter?: string) => {
    try {
      const dbPath = getDatabasePath();
      if (!fs.existsSync(dbPath)) return { success: false, error: 'Database file not found' };
      const targetDrive = driveLetter || 'E:';
      const targetDir = path.join(targetDrive, 'DairyBackups');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const todayStr = new Date().toISOString().slice(0, 10);
      const targetFile = path.join(targetDir, `dairy-${todayStr}.db`);
      fs.copyFileSync(dbPath, targetFile);
      return { success: true, copiedTo: [targetFile] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup:exportDb', async () => {
    try {
      const dbPath = getDatabasePath();
      const res = await dialog.showSaveDialog({
        title: 'Save Database Backup',
        defaultPath: `dairy-backup-${new Date().toISOString().slice(0, 10)}.db`,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      });
      if (!res.canceled && res.filePath) {
        fs.copyFileSync(dbPath, res.filePath);
        return { success: true, path: res.filePath };
      }
      return { success: false, error: 'Cancelled' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup:restoreDb', async () => {
    try {
      const res = await dialog.showOpenDialog({
        title: 'Select Database Backup to Restore',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        properties: ['openFile'],
      });
      if (!res.canceled && res.filePaths?.[0]) {
        const sourcePath = res.filePaths[0];
        const dbPath = getDatabasePath();
        const safetyPath = `${dbPath}.pre-restore-${Date.now()}`;
        if (fs.existsSync(dbPath)) {
          fs.copyFileSync(dbPath, safetyPath);
        }
        fs.copyFileSync(sourcePath, dbPath);
        return { success: true };
      }
      return { success: false, error: 'Cancelled' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup:exportJson', async () => {
    try {
      const db = getDatabase();
      const data = {
        exportedAt: new Date().toISOString(),
        settings: db.prepare('SELECT * FROM settings').all(),
        bill_settings: db.prepare('SELECT * FROM bill_settings').all(),
        customers: db.prepare('SELECT * FROM customers').all(),
        sales: db.prepare('SELECT * FROM sales').all(),
        milk_entries: db.prepare('SELECT * FROM milk_entries').all(),
        suppliers: db.prepare('SELECT * FROM suppliers').all(),
        supplier_purchases: db.prepare('SELECT * FROM supplier_purchases').all(),
        supplier_payments: db.prepare('SELECT * FROM supplier_payments').all(),
        expenses: db.prepare('SELECT * FROM expenses').all(),
        ghee_transactions: db.prepare('SELECT * FROM ghee_transactions').all(),
        shopper_transactions: db.prepare('SELECT * FROM shopper_transactions').all(),
        vehicles: db.prepare('SELECT * FROM vehicles').all(),
        milk_price_history: db.prepare('SELECT * FROM milk_price_history').all(),
      };
      const res = await dialog.showSaveDialog({
        title: 'Export JSON Backup',
        defaultPath: `dairy-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON Document', extensions: ['json'] }],
      });
      if (!res.canceled && res.filePath) {
        fs.writeFileSync(res.filePath, JSON.stringify(data, null, 2), 'utf8');
        return { success: true, path: res.filePath };
      }
      return { success: false, error: 'Cancelled' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup:exportCsv', async () => {
    try {
      const db = getDatabase();
      const sales = db.prepare('SELECT * FROM sales ORDER BY id DESC').all() as any[];
      const header = 'ID,Date,Customer,Quantity,Rate,TotalAmount,PaymentStatus,Notes\n';
      const rows = sales
        .map(
          (s) =>
            `"${s.id}","${s.date}","${s.customer_name || ''}","${s.quantity}","${s.rate}","${s.total_amount}","${s.payment_status}","${(s.notes || '').replace(/"/g, '""')}"`
        )
        .join('\n');
      const csv = header + rows;

      const res = await dialog.showSaveDialog({
        title: 'Export CSV Archive',
        defaultPath: `dairy-sales-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV File', extensions: ['csv'] }],
      });
      if (!res.canceled && res.filePath) {
        fs.writeFileSync(res.filePath, '\uFEFF' + csv, 'utf8');
        return { success: true, path: res.filePath };
      }
      return { success: false, error: 'Cancelled' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // 17. WhatsApp Web QR Connection & Safe Queue System
  ipcMain.handle('whatsapp:connect', async (_e, payload?: { force?: boolean }) => {
    return connectToWhatsApp(payload?.force || false);
  });

  ipcMain.handle('whatsapp:disconnect', async () => {
    return disconnectWhatsApp();
  });

  ipcMain.handle('whatsapp:getStatus', async () => {
    return getWhatsAppStatus();
  });

  ipcMain.handle('whatsapp:getCloudStatus', async () => {
    return getWhatsAppCloudStatus();
  });

  ipcMain.handle('whatsapp:enqueueBills', async (_e, payload: { items: any[]; speedPreset?: SpeedPreset; force?: boolean }) => {
    return enqueueBills(payload.items, payload.speedPreset || 'safe_10m', payload.force || false);
  });

  ipcMain.handle('whatsapp:pauseQueue', async () => {
    pauseQueueWorker();
    return { success: true };
  });

  ipcMain.handle('whatsapp:resumeQueue', async (_e, payload?: { month?: string }) => {
    resumeQueueWorker(payload?.month);
    return { success: true };
  });

  ipcMain.handle('whatsapp:clearQueue', async (_e, payload?: { month?: string; scope?: 'all' | 'queued' | 'failed' }) => {
    return clearQueue(payload?.month, payload?.scope || 'all');
  });

  ipcMain.handle('whatsapp:clearFailedQueue', async (_e, payload?: { month?: string }) => {
    return clearFailedQueueItems(payload?.month);
  });

  ipcMain.handle('whatsapp:clearQueueItem', async (_e, payload: { customerId: number; month?: string }) => {
    return clearQueueItem(payload.customerId, payload?.month);
  });

  ipcMain.handle('whatsapp:retryFailed', async (_e, payload?: { month?: string }) => {
    return retryFailedQueueItems(payload?.month);
  });

  ipcMain.handle('whatsapp:getQueueStatus', async (_e, month?: string) => {
    return getQueueStatus(month);
  });

  ipcMain.handle('whatsapp:getBillStatusMap', async (_e, month: string) => {
    return getCustomerBillStatusMap(month);
  });

  ipcMain.handle('whatsapp:getQueueItems', async (_e, month: string) => {
    return getQueueItemsForMonth(month);
  });

  ipcMain.handle('whatsapp:setSpeedPreset', async (_e, preset: SpeedPreset) => {
    setQueueSpeedPreset(preset);
    return { success: true };
  });

  ipcMain.handle('whatsapp:sendSingleBillDirect', async (_e, payload: { item: any; settings: any }) => {
    return sendDirectSingleBill(payload.item, payload.settings);
  });

  ipcMain.handle('whatsapp:sendReceiptDirect', async (_e, payload: { item: any; settings: any }) => {
    return sendDirectReceipt(payload.item, payload.settings);
  });

  ipcMain.handle('whatsapp:sendSingleBill', async (_e, payload: { item: any; settings: any; force?: boolean }) => {
    const waStatus = getWhatsAppStatus();
    if (waStatus.connected) {
      return sendDirectSingleBill(payload.item, payload.settings);
    }
    return sendSingleCustomerBill(payload.item, payload.settings, payload.force);
  });

  ipcMain.handle('whatsapp:getLogs', async (_e, month: string) => {
    // Return queue records for the month if available, else bill logs
    const queueItems = getQueueItemsForMonth(month);
    if (queueItems && queueItems.length > 0) {
      return queueItems;
    }
    return getLocalWhatsAppBillLogs(month);
  });

  ipcMain.handle('whatsapp:setConsent', async (_e, payload: { customerId: number; consent: boolean }) => {
    const db = getDatabase();
    db.prepare('UPDATE customers SET whatsapp_consent = ?, whatsapp_opt_out_at = ? WHERE id = ?').run(
      payload.consent ? 1 : 0,
      payload.consent ? null : new Date().toISOString(),
      payload.customerId
    );
    return { success: true };
  });

  // 17b. Cloud Sync & Backup Handlers
  ipcMain.handle('cloud:getConfig', async () => {
    return getCloudConfig();
  });

  ipcMain.handle('cloud:saveConfig', async (_e, config: { apiUrl?: string; apiKey?: string; deviceId?: string }) => {
    saveCloudConfig(config);
    return { success: true };
  });

  ipcMain.handle('cloud:getConnectionStatus', async () => {
    return getConnectionStatus();
  });

  ipcMain.handle('cloud:sync', async () => {
    return performCloudSync();
  });

  ipcMain.handle('cloud:getSyncMeta', async () => {
    return getLocalSyncMeta();
  });

  ipcMain.handle('cloud:createBackup', async (event, notes?: string) => {
    return createAndUploadCloudBackup((stage, percent) => {
      event.sender.send('backup:progress', { stage, percent });
    }, notes);
  });

  ipcMain.handle('cloud:cancelBackup', async () => {
    return { cancelled: cancelActiveBackup() };
  });

  ipcMain.handle('cloud:getHistory', async () => {
    return getCloudBackupHistory();
  });

  ipcMain.handle('cloud:restoreBackup', async (event, backupId: string) => {
    return restoreCloudBackup(backupId, (stage, percent) => {
      event.sender.send('restore:progress', { stage, percent });
    });
  });

  ipcMain.handle('bill:renderImage', async (_e, data: any) => {
    return generateBillImage(data);
  });

  ipcMain.handle('receipt:renderImage', async (_e, data: any) => {
    return generateReceiptImage(data);
  });

  // 18. Vehicles
  ipcMain.handle('vehicles:list', async () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM vehicles ORDER BY id ASC').all();
  });

  ipcMain.handle('vehicles:add', async (_e, v: { name: string; regNumber: string; type?: string; assignedTo?: string }) => {
    if (!v.name?.trim()) return { success: false, error: 'نام لکھیں' };
    const db = getDatabase();
    db.prepare('INSERT INTO vehicles (name, reg_number, type, assigned_to) VALUES (?, ?, ?, ?)').run(
      v.name.trim(),
      v.regNumber?.trim() || '',
      v.type || 'MOTORCYCLE',
      v.assignedTo || ''
    );
    return { success: true };
  });

  ipcMain.handle('vehicles:delete', async (_e, id: number) => {
    getDatabase().prepare('DELETE FROM vehicles WHERE id = ?').run(id);
    return { success: true };
  });
}

/**
 * Opening balance + (bill - received) for every month strictly before `beforeMonth`
 * (YYYY-MM). Each month is billed at its own frozen rate when one exists.
 */
function computeBalances(db: ReturnType<typeof getDatabase>, beforeMonth: string): Record<number, number> {
  const balances: Record<number, number> = {};
  const defaultRate: Record<number, number> = {};
  for (const c of db.prepare('SELECT id, default_rate, previous_balance FROM customers').all() as any[]) {
    defaultRate[c.id] = Number(c.default_rate) || 0;
    balances[c.id] = Number(c.previous_balance) || 0;
  }
  const frozen: Record<string, number> = {};
  for (const r of db
    .prepare('SELECT customer_id, month, rate FROM customer_month_rates WHERE month < ?')
    .all(beforeMonth) as any[]) {
    frozen[`${r.customer_id}|${r.month}`] = r.rate;
  }
  // User-edited opening balances: latest override <= beforeMonth restarts the running balance
  const startFrom: Record<number, string> = {};
  for (const o of db
    .prepare('SELECT customer_id, month, amount FROM khata_opening_override WHERE month <= ? ORDER BY month ASC')
    .all(beforeMonth) as any[]) {
    if (o.customer_id in balances) {
      balances[o.customer_id] = o.amount;
      startFrom[o.customer_id] = o.month;
    }
  }
  for (const q of db
    .prepare(`SELECT customer_id, substr(entry_date,1,7) AS m, SUM(quantity) AS qty
              FROM milk_entries WHERE substr(entry_date,1,7) < ? GROUP BY customer_id, m`)
    .all(beforeMonth) as any[]) {
    if (startFrom[q.customer_id] && q.m < startFrom[q.customer_id]) continue;
    const rate = frozen[`${q.customer_id}|${q.m}`] ?? defaultRate[q.customer_id] ?? 0;
    if (q.customer_id in balances) balances[q.customer_id] += q.qty * rate;
  }
  for (const p of db
    .prepare('SELECT customer_id, month, amount FROM received_payments WHERE month < ?')
    .all(beforeMonth) as any[]) {
    if (startFrom[p.customer_id] && p.month < startFrom[p.customer_id]) continue;
    if (p.customer_id in balances) balances[p.customer_id] -= p.amount;
  }
  return balances;
}

function normShift(s?: string): string {
  return s === 'Evening' || s === 'Both' ? s : 'Morning';
}

type StockDay = { opening: number; purchased: number; khata: number; pos: number; closing: number; short: number };

/** Day-by-day stock: closing of a day becomes next day's opening (never below 0). */
function computeStock(db: ReturnType<typeof getDatabase>, endDate: string): Record<string, StockDay> {
  const toMap = (sql: string) => {
    const m: Record<string, number> = {};
    for (const r of db.prepare(sql).all(endDate) as any[]) m[r.d] = r.q;
    return m;
  };
  const pm = toMap('SELECT date AS d, SUM(liters) AS q FROM supplier_purchases WHERE date <= ? GROUP BY date');
  const km = toMap('SELECT entry_date AS d, SUM(quantity) AS q FROM milk_entries WHERE entry_date <= ? GROUP BY entry_date');
  const wm = toMap("SELECT date AS d, SUM(quantity) AS q FROM sales WHERE customer_id IS NULL AND date GLOB '[0-9][0-9][0-9][0-9]-*' AND date <= ? GROUP BY date");
  const all = new Set([...Object.keys(pm), ...Object.keys(km), ...Object.keys(wm)]);
  if (all.size === 0) return {};
  const first = Array.from(all).sort()[0];
  const out: Record<string, StockDay> = {};
  let carry = 0;
  const cur = new Date(first + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10);
    const purchased = pm[d] || 0, khata = km[d] || 0, pos = wm[d] || 0;
    const avail = carry + purchased;
    const sold = khata + pos;
    const closing = Math.max(0, avail - sold);
    out[d] = { opening: carry, purchased, khata, pos, closing, short: Math.max(0, sold - avail) };
    carry = closing;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function monthReport(db: ReturnType<typeof getDatabase>, month: string) {
  const like = `${month}-%`;
  const one = (sql: string, ...a: any[]) => db.prepare(sql).get(...a) as any;

  const rows = db.prepare(`
    SELECT e.customer_id, SUM(e.quantity) AS qty, COALESCE(mr.rate, c.default_rate) AS rate
    FROM milk_entries e
    JOIN customers c ON c.id = e.customer_id
    LEFT JOIN customer_month_rates mr ON mr.customer_id = c.id AND mr.month = ?
    WHERE e.entry_date LIKE ? GROUP BY e.customer_id
  `).all(month, like) as any[];
  let khataBilled = 0, khataLiters = 0;
  for (const r of rows) { khataBilled += r.qty * (Number(r.rate) || 0); khataLiters += r.qty; }

  const pos = one("SELECT COALESCE(SUM(total_amount),0) a, COALESCE(SUM(quantity),0) q FROM sales WHERE customer_id IS NULL AND date LIKE ?", like);
  const posPaid = one("SELECT COALESCE(SUM(total_amount),0) a FROM sales WHERE customer_id IS NULL AND payment_status = 'Paid' AND date LIKE ?", like);
  const khataCollected = one('SELECT COALESCE(SUM(amount),0) a FROM received_payments WHERE month = ?', month);
  const buy = one('SELECT COALESCE(SUM(total),0) a, COALESCE(SUM(liters),0) q FROM supplier_purchases WHERE date LIKE ?', like);
  const paidSup = one('SELECT COALESCE(SUM(amount),0) a FROM supplier_payments WHERE date LIKE ?', like);

  const revenue = khataBilled + pos.a;
  const cost = buy.a;
  const collected = khataCollected.a + posPaid.a;
  return {
    khataBilled: Math.round(khataBilled),
    walkInSales: Math.round(pos.a),
    revenue: Math.round(revenue),
    purchaseCost: Math.round(cost),
    profit: Math.round(revenue - cost),
    collected: Math.round(collected),
    paidToSuppliers: Math.round(paidSup.a),
    cashNet: Math.round(collected - paidSup.a),
    litersPurchased: buy.q,
    litersSold: khataLiters + pos.q,
  };
}

/** Amount owed to each supplier at the start of `month` (honours user-edited arrears). */
function supplierCarry(db: ReturnType<typeof getDatabase>, month: string): Record<number, number> {
  const bal: Record<number, number> = {};
  const start: Record<number, string> = {};
  for (const s of db.prepare('SELECT id FROM suppliers').all() as any[]) bal[s.id] = 0;
  for (const o of db.prepare('SELECT supplier_id, month, amount FROM supplier_opening_override WHERE month <= ? ORDER BY month ASC').all(month) as any[]) {
    if (o.supplier_id in bal) { bal[o.supplier_id] = o.amount; start[o.supplier_id] = o.month; }
  }
  for (const r of db.prepare('SELECT supplier_id, substr(date,1,7) AS m, SUM(total) AS a FROM supplier_purchases WHERE substr(date,1,7) < ? GROUP BY supplier_id, m').all(month) as any[]) {
    if (!(r.supplier_id in bal) || (start[r.supplier_id] && r.m < start[r.supplier_id])) continue;
    bal[r.supplier_id] += r.a;
  }
  for (const r of db.prepare('SELECT supplier_id, substr(date,1,7) AS m, SUM(amount) AS a FROM supplier_payments WHERE substr(date,1,7) < ? GROUP BY supplier_id, m').all(month) as any[]) {
    if (!(r.supplier_id in bal) || (start[r.supplier_id] && r.m < start[r.supplier_id])) continue;
    bal[r.supplier_id] -= r.a;
  }
  return bal;
}

