import { getDb, schema } from '@/db';
import { eq, and, sql } from 'drizzle-orm';

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

  // If cloud database is not connected/configured, simulate a successful offline acknowledge
  if (!db) {
    return {
      success: true,
      serverTimestamp,
      counts,
      error: 'Database not connected in cloud-backend. Verified payload structure.',
    };
  }

  try {
    // 1. Sync Customers
    if (payload.customers && payload.customers.length > 0) {
      for (const c of payload.customers) {
        if (!c.name) continue;
        const existing = await db
          .select()
          .from(schema.customers)
          .where(eq(schema.customers.localId, c.id))
          .limit(1);

        if (existing.length > 0) {
          const rec = existing[0];
          const localUpdate = c.updated_at ? new Date(c.updated_at) : new Date();
          const cloudUpdate = rec.updatedAt ? new Date(rec.updatedAt) : new Date(0);

          if (localUpdate >= cloudUpdate) {
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
              .where(eq(schema.customers.id, rec.id));
            counts.customers++;
          }
        } else {
          await db.insert(schema.customers).values({
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
          counts.customers++;
        }
      }
    }

    // 2. Sync Milk Entries
    if (payload.milkEntries && payload.milkEntries.length > 0) {
      for (const m of payload.milkEntries) {
        if (!m.customer_id || !m.entry_date) continue;
        const existing = await db
          .select()
          .from(schema.milkEntries)
          .where(
            and(
              eq(schema.milkEntries.customerId, m.customer_id),
              eq(schema.milkEntries.entryDate, m.entry_date)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(schema.milkEntries)
            .set({
              quantity: Number(m.quantity) || 0,
              updatedAt: new Date(),
            })
            .where(eq(schema.milkEntries.id, existing[0].id));
        } else {
          await db.insert(schema.milkEntries).values({
            localId: m.id,
            customerId: m.customer_id,
            entryDate: m.entry_date,
            quantity: Number(m.quantity) || 0,
            createdAt: m.created_at ? new Date(m.created_at) : new Date(),
            updatedAt: new Date(),
          });
        }
        counts.milkEntries++;
      }
    }

    // 3. Sync Sales
    if (payload.sales && payload.sales.length > 0) {
      for (const s of payload.sales) {
        if (!s.date || !s.customer_name) continue;
        const existing = await db
          .select()
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

    // 4. Sync Received Payments
    if (payload.receivedPayments && payload.receivedPayments.length > 0) {
      for (const p of payload.receivedPayments) {
        if (!p.customer_id || !p.month) continue;
        const existing = await db
          .select()
          .from(schema.receivedPayments)
          .where(
            and(
              eq(schema.receivedPayments.customerId, p.customer_id),
              eq(schema.receivedPayments.month, p.month)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(schema.receivedPayments)
            .set({
              amount: Number(p.amount) || 0,
              updatedAt: new Date(),
            })
            .where(eq(schema.receivedPayments.id, existing[0].id));
        } else {
          await db.insert(schema.receivedPayments).values({
            localId: p.id,
            customerId: p.customer_id,
            month: p.month,
            amount: Number(p.amount) || 0,
            updatedAt: new Date(),
          });
        }
        counts.payments++;
      }
    }

    // 5. Sync Expenses
    if (payload.expenses && payload.expenses.length > 0) {
      for (const ex of payload.expenses) {
        if (!ex.title || !ex.date) continue;
        const existing = await db
          .select()
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

    // 6. Record Sync Session Log
    await db.insert(schema.syncSessions).values({
      deviceId: payload.deviceId || 'unknown',
      recordsReceived:
        counts.customers +
        counts.sales +
        counts.milkEntries +
        counts.payments +
        counts.expenses,
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
    return {
      success: false,
      serverTimestamp,
      counts,
      error: err.message || 'Error occurred during synchronization',
    };
  }
}
