import {
  pgTable,
  serial,
  text,
  doublePrecision,
  integer,
  boolean,
  timestamp,
  bigint,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 1. Customers Table
export const customers = pgTable(
  'customers',
  {
    id: serial('id').primaryKey(),
    localId: integer('local_id'),
    name: text('name').notNull(),
    phone: text('phone'),
    address: text('address'),
    defaultRate: doublePrecision('default_rate').default(90.0),
    balance: doublePrecision('balance').default(0.0),
    previousBalance: doublePrecision('previous_balance').default(0.0),
    sortOrder: integer('sort_order').default(0),
    shift: text('shift').default('Morning'),
    whatsappConsent: boolean('whatsapp_consent').default(true),
    whatsappOptOutAt: timestamp('whatsapp_opt_out_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_customers_local_id').on(table.localId),
    index('idx_customers_phone').on(table.phone),
  ]
);

// 2. Milk Sales (POS / Daily Entries)
export const sales = pgTable(
  'sales',
  {
    id: serial('id').primaryKey(),
    localId: integer('local_id'),
    date: text('date').notNull(),
    customerId: integer('customer_id'),
    customerName: text('customer_name').notNull(),
    quantity: doublePrecision('quantity').notNull(),
    rate: doublePrecision('rate').notNull(),
    totalAmount: doublePrecision('total_amount').notNull(),
    paymentStatus: text('payment_status').default('Paid'),
    paymentMethod: text('payment_method').default('Cash'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_sales_date').on(table.date),
    index('idx_sales_customer_id').on(table.customerId),
  ]
);

// 3. Monthly Khatta: Daily Milk Entries
export const milkEntries = pgTable(
  'milk_entries',
  {
    id: serial('id').primaryKey(),
    localId: integer('local_id'),
    customerId: integer('customer_id').notNull(),
    entryDate: text('entry_date').notNull(),
    quantity: doublePrecision('quantity').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_milk_entries_customer_date').on(table.customerId, table.entryDate),
    uniqueIndex('idx_milk_entries_unique').on(table.customerId, table.entryDate),
  ]
);

// 4. Customer Month Rates (Frozen Rate per Customer per Month)
export const customerMonthRates = pgTable(
  'customer_month_rates',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id').notNull(),
    month: text('month').notNull(),
    rate: doublePrecision('rate').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_customer_month_rates_unique').on(table.customerId, table.month),
  ]
);

// 5. Received Payments for Monthly Khatta
export const receivedPayments = pgTable(
  'received_payments',
  {
    id: serial('id').primaryKey(),
    localId: integer('local_id'),
    customerId: integer('customer_id').notNull(),
    month: text('month').notNull(),
    amount: doublePrecision('amount').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_received_payments_unique').on(table.customerId, table.month),
  ]
);

// 6. Khatta Opening Overrides
export const khataOpeningOverrides = pgTable(
  'khata_opening_overrides',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id').notNull(),
    month: text('month').notNull(),
    amount: doublePrecision('amount').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_khata_opening_unique').on(table.customerId, table.month),
  ]
);

// 7. Suppliers
export const suppliers = pgTable(
  'suppliers',
  {
    id: serial('id').primaryKey(),
    localId: integer('local_id'),
    name: text('name').notNull(),
    phone: text('phone'),
    address: text('address'),
    defaultRate: doublePrecision('default_rate').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_suppliers_local_id').on(table.localId),
  ]
);

// 8. Supplier Purchases
export const supplierPurchases = pgTable(
  'supplier_purchases',
  {
    id: serial('id').primaryKey(),
    localId: integer('local_id'),
    supplierId: integer('supplier_id').notNull(),
    date: text('date').notNull(),
    liters: doublePrecision('liters').notNull(),
    rate: doublePrecision('rate').notNull(),
    total: doublePrecision('total').notNull(),
    shift: text('shift').default('Morning'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_supplier_purchases_supplier_date').on(table.supplierId, table.date),
  ]
);

// 9. Supplier Payments
export const supplierPayments = pgTable(
  'supplier_payments',
  {
    id: serial('id').primaryKey(),
    localId: integer('local_id'),
    supplierId: integer('supplier_id').notNull(),
    date: text('date').notNull(),
    amount: doublePrecision('amount').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_supplier_payments_supplier_date').on(table.supplierId, table.date),
  ]
);

// 10. Expenses
export const expenses = pgTable(
  'expenses',
  {
    id: serial('id').primaryKey(),
    localId: integer('local_id'),
    category: text('category').notNull(),
    title: text('title').notNull(),
    amount: doublePrecision('amount').notNull(),
    date: text('date').notNull(),
    paidTo: text('paid_to'),
    source: text('source').default('Cash'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_expenses_date').on(table.date),
  ]
);

// 11. Desi Ghee Transactions
export const gheeTransactions = pgTable(
  'ghee_transactions',
  {
    id: serial('id').primaryKey(),
    localId: integer('local_id'),
    type: text('type').notNull(),
    quantity: doublePrecision('quantity').notNull(),
    rate: doublePrecision('rate').notNull(),
    total: doublePrecision('total').notNull(),
    payment: text('payment').default('Cash'),
    party: text('party'),
    date: text('date').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_ghee_date').on(table.date),
  ]
);

// 12. Shopper Transactions
export const shopperTransactions = pgTable(
  'shopper_transactions',
  {
    id: serial('id').primaryKey(),
    localId: integer('local_id'),
    type: text('type').notNull(),
    sizes: text('sizes'),
    quantity: doublePrecision('quantity').notNull(),
    rate: doublePrecision('rate').notNull(),
    total: doublePrecision('total').notNull(),
    payment: text('payment').default('Cash'),
    party: text('party'),
    date: text('date').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_shopper_date').on(table.date),
  ]
);

// 13. Daily Stock Records
export const dailyStockRecords = pgTable(
  'daily_stock_records',
  {
    id: serial('id').primaryKey(),
    localId: integer('local_id'),
    date: text('date').notNull().unique(),
    yesterdayLeftover: doublePrecision('yesterday_leftover').default(0),
    receivedToday: doublePrecision('received_today').default(0),
    soldToday: doublePrecision('sold_today').default(0),
    leftoverTomorrow: doublePrecision('leftover_tomorrow').default(0),
    rate: doublePrecision('rate').default(0),
    dahiKg: doublePrecision('dahi_kg').default(0),
    dahiMilkUsed: doublePrecision('dahi_milk_used').default(0),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_stock_date_unique').on(table.date),
  ]
);

// 14. Bill Settings
export const billSettings = pgTable('bill_settings', {
  id: serial('id').primaryKey(),
  shopTitle: text('shop_title'),
  ownerName: text('owner_name'),
  phone: text('phone'),
  bankName: text('bank_name'),
  accountTitle: text('account_title'),
  accountNumber: text('account_number'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 15. General App Settings Key-Value
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 16. Cloud Backups Metadata
export const backups = pgTable(
  'backups',
  {
    id: text('id').primaryKey(), // UUID or timestamp-based ID
    deviceId: text('device_id'),
    fileName: text('file_name').notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
    storageKey: text('storage_key').notNull(),
    storageUrl: text('storage_url'),
    sha256Checksum: text('sha256_checksum').notNull(),
    status: text('status').default('completed'), // completed, failed, verified
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_backups_created_at').on(table.createdAt),
    index('idx_backups_device_id').on(table.deviceId),
  ]
);

// 17. WhatsApp Monthly Bill Sending Records & Queue Logs
export const whatsappBillLogs = pgTable(
  'whatsapp_bill_logs',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id'),
    customerName: text('customer_name'),
    phone: text('phone').notNull(),
    billMonth: text('bill_month').notNull(),
    billAmount: doublePrecision('bill_amount').notNull(),
    liters: doublePrecision('liters').notNull(),
    rate: doublePrecision('rate').notNull(),
    balanceDue: doublePrecision('balance_due').notNull(),
    status: text('status').notNull().default('pending'), // pending, processing, sent, delivered, read, failed
    messageId: text('message_id'),
    mediaId: text('media_id'),
    mediaUrl: text('media_url'),
    errorMessage: text('error_message'),
    idempotencyKey: text('idempotency_key').unique(),
    retryCount: integer('retry_count').default(0),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_wa_bill_month').on(table.billMonth),
    index('idx_wa_customer').on(table.customerId),
    index('idx_wa_status').on(table.status),
    index('idx_wa_message_id').on(table.messageId),
  ]
);

// 18. Sync Sessions Log
export const syncSessions = pgTable('sync_sessions', {
  id: serial('id').primaryKey(),
  deviceId: text('device_id'),
  recordsReceived: integer('records_received').default(0),
  recordsPushed: integer('records_pushed').default(0),
  status: text('status').default('success'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
