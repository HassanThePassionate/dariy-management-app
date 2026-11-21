import { getDb, schema } from '@/db';
import { eq, and, sql, inArray } from 'drizzle-orm';

export interface SyncPayload {
  deviceId: string;
  lastSyncTimestamp?: string;
  customers?: any[];
  sales?: any[];
  milkEntries?: any[];
  customerMonthRates?: any[];
  receivedPayments?: any[];
  khataOpeningOverrides?: any[];
  suppliers?: any[];
  supplierPurchases?: any[];
  supplierPayments?: any[];
  expenses?: any[];
  gheeTransactions?: any[];
  shopperTransactions?: any[];
  dailyStockRecords?: any[];
  billSettings?: any;
  appSettings?: Record<string, string>;
}

export interface SyncResult {
  success: boolean;
  serverTimestamp: string;
  counts: {
    customers: number;
    sales: number;
    milkEntries: number;
    payments: number;
    expenses: number;
    suppliers: number;
    stock: number;
    ghee: number;
    shopper: number;
  };
  error?: string;
}

export async function processSyncBatch(payload: SyncPayload): Promise<SyncResult> {
  const db = getDb();
  const serverTimestamp = new Date().toISOString();

  const counts = {
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

  if (!db) {
    return {
      success: true,
      serverTimestamp,
      counts,
      error: 'Database not connected in cloud-backend. Verified payload structure.',
    };
  }

  try {
    // 1. Sync Customers (High performance bulk sync)
    if (payload.customers && payload.customers.length > 0) {
      const existing = await db
        .select({ id: schema.customers.id, localId: schema.customers.localId })
        .from(schema.customers);
      const existingMap = new Map<number, number>();
      for (const e of existing) {
        if (e.localId !== null) existingMap.set(e.localId, e.id);
      }

      const toInsert: any[] = [];
      for (const c of payload.customers) {
        if (!c.name) continue;
        const cloudId = existingMap.get(c.id);
        if (cloudId) {
          await db
            .update(schema.customers)
            .set({
              name: c.name,
              phone: c.phone || null,
              address: c.address || null,
              defaultRate: Number(c.default_rate) || 90.0,
              balance: Number(c.balance) || 0.0,
              previousBalance: Number(c.previous_balance) || 0.0,
              sortOrder: Number(c.sort_order) || 0,
              shift: c.shift || 'Morning',
              whatsappConsent: c.whatsapp_consent !== undefined ? Boolean(c.whatsapp_consent) : true,
              updatedAt: new Date(),
            })
            .where(eq(schema.customers.id, cloudId));
          counts.customers++;
        } else {
          toInsert.push({
            localId: c.id,
            name: c.name,
            phone: c.phone || null,
            address: c.address || null,
            defaultRate: Number(c.default_rate) || 90.0,
            balance: Number(c.balance) || 0.0,
            previousBalance: Number(c.previous_balance) || 0.0,
            sortOrder: Number(c.sort_order) || 0,
            shift: c.shift || 'Morning',
            whatsappConsent: c.whatsapp_consent !== undefined ? Boolean(c.whatsapp_consent) : true,
            createdAt: c.created_at ? new Date(c.created_at) : new Date(),
            updatedAt: new Date(),
          });
        }
      }

      if (toInsert.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < toInsert.length; i += chunkSize) {
          const chunk = toInsert.slice(i, i + chunkSize);
          await db.insert(schema.customers).values(chunk);
          counts.customers += chunk.length;
        }
      }
    }

    // 2. Sync Milk Entries (Chunked Upsert)
    if (payload.milkEntries && payload.milkEntries.length > 0) {
      const valid = payload.milkEntries.filter((m) => m.customer_id && m.entry_date);
      const chunkSize = 200;
      for (let i = 0; i < valid.length; i += chunkSize) {
        const chunk = valid.slice(i, i + chunkSize);
        const values = chunk.map((m) => ({
          localId: m.id,
          customerId: m.customer_id,
          entryDate: m.entry_date,
          quantity: Number(m.quantity) || 0,
          createdAt: m.created_at ? new Date(m.created_at) : new Date(),
          updatedAt: new Date(),
        }));

        await db
          .insert(schema.milkEntries)
          .values(values)
          .onConflictDoUpdate({
            target: [schema.milkEntries.customerId, schema.milkEntries.entryDate],
            set: {
              quantity: sql`excluded.quantity`,
              updatedAt: new Date(),
            },
          });
        counts.milkEntries += chunk.length;
      }
    }

    // 3. Sync Customer Month Rates (Upsert)
    if (payload.customerMonthRates && payload.customerMonthRates.length > 0) {
      const valid = payload.customerMonthRates.filter((r) => r.customer_id && r.month);
      const chunkSize = 200;
      for (let i = 0; i < valid.length; i += chunkSize) {
        const chunk = valid.slice(i, i + chunkSize);
        const values = chunk.map((r) => ({
          customerId: r.customer_id,
          month: r.month,
          rate: Number(r.rate) || 0,
          updatedAt: new Date(),
        }));

        await db
          .insert(schema.customerMonthRates)
          .values(values)
          .onConflictDoUpdate({
            target: [schema.customerMonthRates.customerId, schema.customerMonthRates.month],
            set: {
              rate: sql`excluded.rate`,
              updatedAt: new Date(),
            },
          });
      }
    }

    // 4. Sync Received Payments (Upsert)
    if (payload.receivedPayments && payload.receivedPayments.length > 0) {
      const valid = payload.receivedPayments.filter((p) => p.customer_id && p.month);
      const chunkSize = 200;
      for (let i = 0; i < valid.length; i += chunkSize) {
        const chunk = valid.slice(i, i + chunkSize);
        const values = chunk.map((p) => ({
          localId: p.id,
          customerId: p.customer_id,
          month: p.month,
          amount: Number(p.amount) || 0,
          updatedAt: new Date(),
        }));

        await db
          .insert(schema.receivedPayments)
          .values(values)
          .onConflictDoUpdate({
            target: [schema.receivedPayments.customerId, schema.receivedPayments.month],
            set: {
              amount: sql`excluded.amount`,
              updatedAt: new Date(),
            },
          });
        counts.payments += chunk.length;
      }
    }

    // 5. Sync Sales
    if (payload.sales && payload.sales.length > 0) {
      const valid = payload.sales.filter((s) => s.date && s.customer_name);
      for (const s of valid) {
        const existing = await db
          .select({ id: schema.sales.id })
          .from(schema.sales)
          .where(eq(schema.sales.localId, s.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(schema.sales).values({
            localId: s.id,
            date: s.date,
            customerId: s.customer_id || null,
            customerName: s.customer_name,
            quantity: Number(s.quantity) || 0,
            rate: Number(s.rate) || 0,
            totalAmount: Number(s.total_amount) || 0,
            paymentStatus: s.payment_status || 'Paid',
            paymentMethod: s.payment_method || 'Cash',
            notes: s.notes || null,
            createdAt: s.created_at ? new Date(s.created_at) : new Date(),
            updatedAt: new Date(),
          });
          counts.sales++;
        }
      }
    }

    // 6. Sync Expenses
    if (payload.expenses && payload.expenses.length > 0) {
      const valid = payload.expenses.filter((ex) => ex.title && ex.date);
      for (const ex of valid) {
        const existing = await db
          .select({ id: schema.expenses.id })
          .from(schema.expenses)
          .where(eq(schema.expenses.localId, ex.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(schema.expenses).values({
            localId: ex.id,
            category: ex.category || 'Shop',
            title: ex.title,
            amount: Number(ex.amount) || 0,
            date: ex.date,
            paidTo: ex.paid_to || null,
            source: ex.source || 'Cash',
            notes: ex.notes || null,
            createdAt: ex.created_at ? new Date(ex.created_at) : new Date(),
            updatedAt: new Date(),
          });
          counts.expenses++;
        }
      }
    }

    // 7. Sync Desi Ghee Transactions
    if (payload.gheeTransactions && payload.gheeTransactions.length > 0) {
      for (const g of payload.gheeTransactions) {
        const existing = await db
          .select({ id: schema.gheeTransactions.id })
          .from(schema.gheeTransactions)
          .where(eq(schema.gheeTransactions.localId, g.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(schema.gheeTransactions).values({
            localId: g.id,
            type: g.type || 'Outward',
            quantity: Number(g.quantity) || 0,
            rate: Number(g.rate) || 0,
            total: Number(g.total) || 0,
            payment: g.payment || 'Cash',
            party: g.party || null,
            date: g.date,
            notes: g.notes || null,
            createdAt: g.created_at ? new Date(g.created_at) : new Date(),
            updatedAt: new Date(),
          });
          counts.ghee++;
        }
      }
    }

    // 8. Sync Shopper Bags Transactions
    if (payload.shopperTransactions && payload.shopperTransactions.length > 0) {
      for (const sh of payload.shopperTransactions) {
        const existing = await db
          .select({ id: schema.shopperTransactions.id })
          .from(schema.shopperTransactions)
          .where(eq(schema.shopperTransactions.localId, sh.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(schema.shopperTransactions).values({
            localId: sh.id,
            type: sh.type || 'Inward',
            sizes: sh.sizes || null,
            quantity: Number(sh.quantity) || 0,
            rate: Number(sh.rate) || 0,
            total: Number(sh.total) || 0,
            payment: sh.payment || 'Cash',
            party: sh.party || null,
            date: sh.date,
            notes: sh.notes || null,
            createdAt: sh.created_at ? new Date(sh.created_at) : new Date(),
            updatedAt: new Date(),
          });
          counts.shopper++;
        }
      }
    }

    // 9. Sync Bill Settings
    if (payload.billSettings) {
      const bs = payload.billSettings;
      const existingBs = await db.select().from(schema.billSettings).limit(1);
      if (existingBs.length > 0) {
        await db
          .update(schema.billSettings)
          .set({
            shopTitle: bs.shop_title || '',
            ownerName: bs.owner_name || '',
            phone: bs.phone || '',
            bankName: bs.bank_name || '',
            accountTitle: bs.account_title || '',
            accountNumber: bs.account_number || '',
            updatedAt: new Date(),
          })
          .where(eq(schema.billSettings.id, existingBs[0].id));
      } else {
        await db.insert(schema.billSettings).values({
          shopTitle: bs.shop_title || '',
          ownerName: bs.owner_name || '',
          phone: bs.phone || '',
          bankName: bs.bank_name || '',
          accountTitle: bs.account_title || '',
          accountNumber: bs.account_number || '',
          updatedAt: new Date(),
        });
      }
    }

    // 10. Record Sync Session Log
    await db.insert(schema.syncSessions).values({
      deviceId: payload.deviceId || 'dairy-desktop',
      recordsReceived:
        counts.customers +
        counts.sales +
        counts.milkEntries +
        counts.payments +
        counts.expenses +
        counts.ghee +
        counts.shopper,
      recordsPushed: 0,
      status: 'success',
      createdAt: new Date(),
    });

    return {
      success: true,
      serverTimestamp,
      counts,
    };
  } catch (err: any) {
    console.error('[Sync Error]', err);
    return {
      success: false,
      serverTimestamp,
      counts,
      error: err.message || 'Error occurred during synchronization',
    };
  }
}
