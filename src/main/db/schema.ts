import { getDatabase } from './database';

export function setupSchema(): void {
  const db = getDatabase();

  const createTablesQuery = `
    -- Settings table (key-value store for app configuration)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Sample tasks table (Step 1 verification requirement)
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customers table for Dairy System
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      default_rate REAL DEFAULT 90.0,
      balance REAL DEFAULT 0.0,
      previous_balance REAL DEFAULT 0.0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Milk Sales / Daily entries table
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      total_amount REAL NOT NULL,
      payment_status TEXT CHECK(payment_status IN ('Paid', 'Due')) DEFAULT 'Paid',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    -- Monthly Khatta: one row per customer per day (liters taken)
    CREATE TABLE IF NOT EXISTS milk_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      entry_date TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(customer_id, entry_date),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- Monthly Khatta: milk rate frozen per customer per month
    CREATE TABLE IF NOT EXISTS customer_month_rates (
      customer_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      rate REAL NOT NULL,
      PRIMARY KEY (customer_id, month),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- Suppliers (milk purchased from)
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      default_rate REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supplier_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      liters REAL NOT NULL,
      rate REAL NOT NULL,
      total REAL NOT NULL,
      notes TEXT,
      shift TEXT DEFAULT 'Morning',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    );

    -- User-edited opening (previous arrears) of a customer for a month
    CREATE TABLE IF NOT EXISTS khata_opening_override (
      customer_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      PRIMARY KEY (customer_id, month),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- Daily Expenses & Fleet (Shop/Home/Drawer/Fleet/Other)
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL CHECK(category IN ('Shop','Home','Drawer','Fleet','Other')),
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      paid_to TEXT,
      source TEXT DEFAULT 'Cash',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Desi Ghee stock ledger (Inward purchase / Outward sale)
    CREATE TABLE IF NOT EXISTS ghee_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('Inward','Outward')),
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      total REAL NOT NULL,
      payment TEXT NOT NULL DEFAULT 'Cash' CHECK(payment IN ('Cash','Udhaar')),
      party TEXT,
      date TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Shopper bags / packing stock ledger
    CREATE TABLE IF NOT EXISTS shopper_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('Inward','Outward')),
      sizes TEXT,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      total REAL NOT NULL,
      payment TEXT NOT NULL DEFAULT 'Cash' CHECK(payment IN ('Cash','Udhaar')),
      party TEXT,
      date TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Bill header / bank details shown on customer bills
    CREATE TABLE IF NOT EXISTS bill_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shop_title TEXT DEFAULT '',
      owner_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      bank_name TEXT DEFAULT '',
      account_title TEXT DEFAULT '',
      account_number TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS supplier_opening_override (
      supplier_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      PRIMARY KEY (supplier_id, month),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    );

    -- Monthly Khatta: amount received from a customer for a given month
    CREATE TABLE IF NOT EXISTS received_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(customer_id, month),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- Vehicles & Bikes fleet
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      reg_number TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'MOTORCYCLE',
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- User and Operator Accounts
    CREATE TABLE IF NOT EXISTS operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'OPERATOR',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Milk Price History
    CREATE TABLE IF NOT EXISTS milk_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rate REAL NOT NULL,
      effective_from TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Daily Stock Register (Leftover, auto-aggregated supplier milk, sales, dahi, notes)
    CREATE TABLE IF NOT EXISTS daily_stock_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      yesterday_leftover REAL DEFAULT 0,
      received_today REAL DEFAULT 0,
      sold_today REAL DEFAULT 0,
      leftover_tomorrow REAL DEFAULT 0,
      rate REAL DEFAULT 0,
      dahi_kg REAL DEFAULT 0,
      dahi_milk_used REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.exec(createTablesQuery);
  db.exec('CREATE INDEX IF NOT EXISTS idx_milk_entries_date ON milk_entries(entry_date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_supplier_purchases_date ON supplier_purchases(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_ghee_date ON ghee_transactions(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_shopper_date ON shopper_transactions(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_daily_stock_records_date ON daily_stock_records(date)');
  db.exec(`
    INSERT OR IGNORE INTO bill_settings (id, shop_title, owner_name, phone, bank_name, account_title, account_number)
    VALUES (1, 'قاری ظفر ملک شاپ', 'حافظ مصعب ظفر', '+92 321 0001168', 'میزان بینک', 'حافظ مصعب ظفر', '02090111954760')
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_milk_entries_customer ON milk_entries(customer_id)');
  console.log('[SQLite] Core tables verified/created successfully.');

  migrateCustomerColumns();

  // Seed default vehicles if empty
  const vCount = db.prepare('SELECT COUNT(*) as count FROM vehicles').get() as { count: number };
  if (vCount.count === 0) {
    db.prepare('INSERT INTO vehicles (name, reg_number, type, assigned_to) VALUES (?, ?, ?, ?)').run('Bike 1 (Honda CD70)', 'LEA-1021', 'MOTORCYCLE', 'Rider 1');
    db.prepare('INSERT INTO vehicles (name, reg_number, type, assigned_to) VALUES (?, ?, ?, ?)').run('Bike 2 (Honda 125)', 'LEB-5044', 'MOTORCYCLE', 'Rider 2');
    db.prepare('INSERT INTO vehicles (name, reg_number, type, assigned_to) VALUES (?, ?, ?, ?)').run('Pickup (Suzuki Bolan / Ravi)', 'LEC-8902', 'PICKUP', 'Driver');
  }

  // Seed milk price history if empty
  const pCount = db.prepare('SELECT COUNT(*) as count FROM milk_price_history').get() as { count: number };
  if (pCount.count === 0) {
    db.prepare('INSERT INTO milk_price_history (rate, effective_from) VALUES (?, ?)').run(240, '2026-09-22');
    db.prepare('INSERT INTO milk_price_history (rate, effective_from) VALUES (?, ?)').run(240, '2026-09-22');
  }

  // Seed operators if empty
  const opCount = db.prepare('SELECT COUNT(*) as count FROM operators').get() as { count: number };
  if (opCount.count === 0) {
    db.prepare('INSERT INTO operators (username, name, password, role) VALUES (?, ?, ?, ?)').run('admin', 'Shop Admin', 'admin', 'ADMIN');
  }

  // Seed default settings if not exists
  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
  `);

  const defaultSettings = [
    ['language', 'ur'],
    ['shop_name', 'قاری ظفر اقبال ملک شاپ'],
    ['owner_name', 'حافظ مصعب ظفر'],
    ['mobile_number', '+92 321 0001168'],
    ['default_rate', '240'],
    ['milk_price', '240'],
    ['prev_milk_price', '240'],
    ['admin_password', 'admin'],
    ['currency', 'Rs.'],
  ];

  const setMany = db.transaction((settingsList: string[][]) => {
    for (const [k, v] of settingsList) {
      insertSetting.run(k, v);
    }
  });
  setMany(defaultSettings);

  // Initial schema setup complete.
  // Note: Mockup seeding removed so user's customer deletions are strictly preserved.
}

/**
 * Adds columns introduced after the first release to existing databases and
 * backfills sort_order so the customer list keeps a stable manual order.
 */
function migrateCustomerColumns(): void {
  const db = getDatabase();
  const columns = db.prepare('PRAGMA table_info(customers)').all() as { name: string }[];
  const existing = new Set(columns.map((c) => c.name));

  const saleCols = new Set((db.prepare('PRAGMA table_info(sales)').all() as { name: string }[]).map((c) => c.name));
  if (!saleCols.has('payment_method')) {
    db.exec("ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'Cash'");
    console.log('[SQLite] Migration: added sales.payment_method');
  }

  const purchaseCols = new Set((db.prepare('PRAGMA table_info(supplier_purchases)').all() as { name: string }[]).map((c) => c.name));
  if (!purchaseCols.has('shift')) {
    db.exec("ALTER TABLE supplier_purchases ADD COLUMN shift TEXT DEFAULT 'Morning'");
    console.log('[SQLite] Migration: added supplier_purchases.shift');
  }

  if (!existing.has('previous_balance')) {
    db.exec('ALTER TABLE customers ADD COLUMN previous_balance REAL DEFAULT 0.0');
    console.log('[SQLite] Migration: added customers.previous_balance');
  }

  if (!existing.has('shift')) {
    db.exec("ALTER TABLE customers ADD COLUMN shift TEXT DEFAULT 'Morning'");
    console.log('[SQLite] Migration: added customers.shift');
  }

  if (!existing.has('sort_order')) {
    db.exec('ALTER TABLE customers ADD COLUMN sort_order INTEGER DEFAULT 0');
    console.log('[SQLite] Migration: added customers.sort_order');
  }

  if (!existing.has('whatsapp_consent')) {
    db.exec('ALTER TABLE customers ADD COLUMN whatsapp_consent INTEGER DEFAULT 1');
    console.log('[SQLite] Migration: added customers.whatsapp_consent');
  }

  if (!existing.has('whatsapp_opt_out_at')) {
    db.exec('ALTER TABLE customers ADD COLUMN whatsapp_opt_out_at TEXT');
    console.log('[SQLite] Migration: added customers.whatsapp_opt_out_at');
  }

  // Cloud sync & WhatsApp billing tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS cloud_sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS whatsapp_bill_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      customer_name TEXT,
      phone TEXT NOT NULL,
      bill_month TEXT NOT NULL,
      bill_amount REAL NOT NULL,
      liters REAL NOT NULL,
      rate REAL NOT NULL,
      balance_due REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      message_id TEXT,
      media_id TEXT,
      error_message TEXT,
      idempotency_key TEXT UNIQUE,
      retry_count INTEGER DEFAULT 0,
      sent_at DATETIME,
      delivered_at DATETIME,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_wa_bill_logs_month ON whatsapp_bill_logs(bill_month);
    CREATE INDEX IF NOT EXISTS idx_wa_bill_logs_cust ON whatsapp_bill_logs(customer_id);
    CREATE INDEX IF NOT EXISTS idx_wa_bill_logs_status ON whatsapp_bill_logs(status);

    -- WhatsApp persistent dispatch queue with anti-ban rate pacing
    CREATE TABLE IF NOT EXISTS whatsapp_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      bill_month TEXT NOT NULL,
      month_label TEXT,
      liters REAL DEFAULT 0,
      rate REAL DEFAULT 0,
      bill_amount REAL DEFAULT 0,
      carry REAL DEFAULT 0,
      received REAL DEFAULT 0,
      payable REAL DEFAULT 0,
      account_number TEXT,
      message_text TEXT,
      image_path TEXT,
      status TEXT DEFAULT 'queued',
      scheduled_at DATETIME,
      sent_at DATETIME,
      delivered_at DATETIME,
      message_id TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      speed_preset TEXT DEFAULT 'safe_10m',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(customer_id, bill_month)
    );

    CREATE INDEX IF NOT EXISTS idx_wa_queue_status ON whatsapp_queue(status);
    CREATE INDEX IF NOT EXISTS idx_wa_queue_month ON whatsapp_queue(bill_month);
    CREATE INDEX IF NOT EXISTS idx_wa_queue_cust ON whatsapp_queue(customer_id);
  `);

  // Backfill missing / duplicate sort_order values by current name ordering
  const needsBackfill = db
    .prepare('SELECT COUNT(*) as c FROM customers WHERE sort_order IS NULL OR sort_order = 0')
    .get() as { c: number };

  if (needsBackfill.c > 0) {
    const rows = db.prepare('SELECT id FROM customers ORDER BY name ASC, id ASC').all() as { id: number }[];
    const update = db.prepare('UPDATE customers SET sort_order = ? WHERE id = ?');
    const apply = db.transaction(() => {
      rows.forEach((row, idx) => update.run(idx + 1, row.id));
    });
    apply();
    console.log('[SQLite] Migration: backfilled sort_order for', rows.length, 'customers');
  }

  db.exec('CREATE INDEX IF NOT EXISTS idx_customers_sort_order ON customers(sort_order)');

  // Clean up any orphaned supplier purchases or payments where supplier was deleted
  try {
    db.exec(`
      DELETE FROM supplier_purchases WHERE supplier_id NOT IN (SELECT id FROM suppliers);
      DELETE FROM supplier_payments WHERE supplier_id NOT IN (SELECT id FROM suppliers);
      DELETE FROM supplier_opening_override WHERE supplier_id NOT IN (SELECT id FROM suppliers);
    `);
  } catch (err) {
    console.error('[SQLite] Cleanup orphaned supplier records failed:', err);
  }
}

function seedInitialMockupData(): void {
  const db = getDatabase();
  console.log('[SQLite] Seeding initial sample customers and transactions to match UI mockup...');

  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, phone, address, default_rate, balance, previous_balance, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSale = db.prepare(`
    INSERT INTO sales (date, customer_id, customer_name, quantity, rate, total_amount, payment_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    // Insert initial customers matching screenshot
    const c1 = insertCustomer.run('Ali Raza', '03011112233', 'Street 4, Sector G-9', 90, 0, 0, 1);
    const c2 = insertCustomer.run('Sajid Khan', '03022223344', 'Shop 12, Main Bazaar', 90, 90, 0, 2);
    const c3 = insertCustomer.run('M. Usman', '03033334455', 'House 55, Block B', 90, 0, 0, 3);
    const c4 = insertCustomer.run('Hamza Ali', '03044445566', 'Flat 3, Al-Madina Arcade', 90, 0, 0, 4);
    const c5 = insertCustomer.run('Bilal Ahmed', '03055556677', 'Street 8, Tariq Road', 90, 90, 0, 5);
    const c6 = insertCustomer.run('Usman Khalid', '03066667788', 'House 19, Cavalry Ground', 90, 0, 0, 6);

    // Add extra dummy customers up to 35 to match "35 Total Customers" in the mockup badge
    for (let i = 7; i <= 35; i++) {
      insertCustomer.run(
        `Customer ${i}`,
        `030000000${i.toString().padStart(2, '0')}`,
        `Area Block ${i}`,
        90,
        i % 3 === 0 ? 1500 : 0,
        0,
        i
      );
    }

    const todayStr = '20/05/2025';

    // Insert transactions matching screenshot table
    insertSale.run(todayStr, c1.lastInsertRowid, 'Ali Raza', 2, 90, 180, 'Paid', 'Morning fresh delivery');
    insertSale.run(todayStr, c2.lastInsertRowid, 'Sajid Khan', 1, 90, 90, 'Due', 'Pending evening payment');
    insertSale.run(todayStr, c3.lastInsertRowid, 'M. Usman', 3, 90, 270, 'Paid', 'Regular 3 ltr');
    insertSale.run('19/05/2025', c4.lastInsertRowid, 'Hamza Ali', 2, 90, 180, 'Paid', '');
    insertSale.run('18/05/2025', c5.lastInsertRowid, 'Bilal Ahmed', 1, 90, 90, 'Due', 'Will pay end of month');
    insertSale.run('18/05/2025', c6.lastInsertRowid, 'Usman Khalid', 2, 90, 180, 'Paid', '');

    // Add sample task for Step 1
    db.prepare(`
      INSERT INTO tasks (title, status) VALUES ('Initial SQLite connection verified', 'completed')
    `).run();
  });

  seed();
  console.log('[SQLite] Initial data seeded successfully.');
}
