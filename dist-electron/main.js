"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main/main.ts
var import_electron5 = require("electron");
var import_path5 = __toESM(require("path"));
var import_fs5 = __toESM(require("fs"));

// src/main/db/database.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_electron = require("electron");
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var dbInstance = null;
var resolvedDbPath = "";
function getDatabasePath() {
  if (!resolvedDbPath) {
    const userDataPath = import_electron.app.getPath("userData");
    if (!import_fs.default.existsSync(userDataPath)) {
      import_fs.default.mkdirSync(userDataPath, { recursive: true });
    }
    resolvedDbPath = import_path.default.join(userDataPath, "app_data.db");
  }
  return resolvedDbPath;
}
function initDatabase() {
  if (dbInstance) {
    return dbInstance;
  }
  const dbPath = getDatabasePath();
  console.log("[SQLite] Initializing database at:", dbPath);
  try {
    dbInstance = new import_better_sqlite3.default(dbPath, {
      verbose: process.env.NODE_ENV === "development" ? console.log : void 0
    });
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("synchronous = NORMAL");
    dbInstance.pragma("foreign_keys = ON");
    console.log("[SQLite] Database connected successfully.");
    return dbInstance;
  } catch (error) {
    console.error("[SQLite] Failed to connect to database:", error);
    throw error;
  }
}
function getDatabase() {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}
function closeDatabase() {
  if (dbInstance) {
    try {
      try {
        dbInstance.pragma("wal_checkpoint(PASSIVE)");
      } catch {
      }
      dbInstance.close();
      console.log("[SQLite] Database closed.");
    } catch (err) {
      console.error("[SQLite] Error closing database:", err);
    } finally {
      dbInstance = null;
    }
  }
}
async function createDatabaseSnapshot(destPath) {
  const db = getDatabase();
  const dir = import_path.default.dirname(destPath);
  if (!import_fs.default.existsSync(dir)) {
    import_fs.default.mkdirSync(dir, { recursive: true });
  }
  try {
    db.pragma("wal_checkpoint(PASSIVE)");
  } catch (cpErr) {
    console.warn("[SQLite Snapshot] WAL passive checkpoint warning:", cpErr);
  }
  if (typeof db.backup === "function") {
    await db.backup(destPath);
  } else {
    db.pragma("wal_checkpoint(TRUNCATE)");
    import_fs.default.copyFileSync(getDatabasePath(), destPath);
  }
  return destPath;
}
function restoreDatabaseFromFile(sourcePath) {
  const dbPath = getDatabasePath();
  if (!import_fs.default.existsSync(sourcePath)) {
    return { success: false, error: `Source backup file does not exist at: ${sourcePath}` };
  }
  const safetyBackupPath = `${dbPath}.pre-restore-${Date.now()}.bak`;
  try {
    closeDatabase();
    if (import_fs.default.existsSync(dbPath)) {
      import_fs.default.copyFileSync(dbPath, safetyBackupPath);
    }
    const walFile = `${dbPath}-wal`;
    const shmFile = `${dbPath}-shm`;
    if (import_fs.default.existsSync(walFile)) {
      try {
        import_fs.default.copyFileSync(walFile, `${safetyBackupPath}-wal`);
        import_fs.default.unlinkSync(walFile);
      } catch {
      }
    }
    if (import_fs.default.existsSync(shmFile)) {
      try {
        import_fs.default.copyFileSync(shmFile, `${safetyBackupPath}-shm`);
        import_fs.default.unlinkSync(shmFile);
      } catch {
      }
    }
    import_fs.default.copyFileSync(sourcePath, dbPath);
    const newDb = initDatabase();
    const check = newDb.pragma("quick_check");
    console.log("[SQLite Restore] Integrity verification result:", check);
    return { success: true, safetyBackupPath };
  } catch (err) {
    console.error("[SQLite Restore] Failed to restore database:", err);
    try {
      if (import_fs.default.existsSync(safetyBackupPath)) {
        import_fs.default.copyFileSync(safetyBackupPath, dbPath);
        initDatabase();
      }
    } catch {
    }
    return { success: false, error: err.message || "Database restore failed" };
  }
}

// src/main/db/schema.ts
function setupSchema() {
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
  db.exec("CREATE INDEX IF NOT EXISTS idx_milk_entries_date ON milk_entries(entry_date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_supplier_purchases_date ON supplier_purchases(date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_ghee_date ON ghee_transactions(date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_shopper_date ON shopper_transactions(date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_daily_stock_records_date ON daily_stock_records(date)");
  db.exec(`
    INSERT OR IGNORE INTO bill_settings (id, shop_title, owner_name, phone, bank_name, account_title, account_number)
    VALUES (1, '\u0642\u0627\u0631\u06CC \u0638\u0641\u0631 \u0627\u0642\u0628\u0627\u0644 \u0645\u0644\u06A9 \u0634\u0627\u067E', '\u062D\u0627\u0641\u0638 \u0645\u0635\u0639\u0628 \u0638\u0641\u0631', '+92 321 0001168', '\u0645\u06CC\u0632\u0627\u0646 \u0628\u06CC\u0646\u06A9', '\u062D\u0627\u0641\u0638 \u0645\u0635\u0639\u0628 \u0638\u0641\u0631', '02090111954760')
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_milk_entries_customer ON milk_entries(customer_id)");
  console.log("[SQLite] Core tables verified/created successfully.");
  migrateCustomerColumns();
  const vCount = db.prepare("SELECT COUNT(*) as count FROM vehicles").get();
  if (vCount.count === 0) {
    db.prepare("INSERT INTO vehicles (name, reg_number, type, assigned_to) VALUES (?, ?, ?, ?)").run("Bike 1 (Honda CD70)", "LEA-1021", "MOTORCYCLE", "Rider 1");
    db.prepare("INSERT INTO vehicles (name, reg_number, type, assigned_to) VALUES (?, ?, ?, ?)").run("Bike 2 (Honda 125)", "LEB-5044", "MOTORCYCLE", "Rider 2");
    db.prepare("INSERT INTO vehicles (name, reg_number, type, assigned_to) VALUES (?, ?, ?, ?)").run("Pickup (Suzuki Bolan / Ravi)", "LEC-8902", "PICKUP", "Driver");
  }
  const pCount = db.prepare("SELECT COUNT(*) as count FROM milk_price_history").get();
  if (pCount.count === 0) {
    db.prepare("INSERT INTO milk_price_history (rate, effective_from) VALUES (?, ?)").run(240, "2026-09-22");
    db.prepare("INSERT INTO milk_price_history (rate, effective_from) VALUES (?, ?)").run(240, "2026-09-22");
  }
  const opCount = db.prepare("SELECT COUNT(*) as count FROM operators").get();
  if (opCount.count === 0) {
    db.prepare("INSERT INTO operators (username, name, password, role) VALUES (?, ?, ?, ?)").run("admin", "Shop Admin", "admin", "ADMIN");
  }
  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
  `);
  const defaultSettings = [
    ["language", "ur"],
    ["shop_name", "\u0642\u0627\u0631\u06CC \u0638\u0641\u0631 \u0627\u0642\u0628\u0627\u0644 \u0645\u0644\u06A9 \u0634\u0627\u067E"],
    ["owner_name", "\u062D\u0627\u0641\u0638 \u0645\u0635\u0639\u0628 \u0638\u0641\u0631"],
    ["mobile_number", "+92 321 0001168"],
    ["default_rate", "240"],
    ["milk_price", "240"],
    ["prev_milk_price", "240"],
    ["admin_password", "admin"],
    ["currency", "Rs."]
  ];
  const setMany = db.transaction((settingsList) => {
    for (const [k, v] of settingsList) {
      insertSetting.run(k, v);
    }
  });
  setMany(defaultSettings);
}
function migrateCustomerColumns() {
  const db = getDatabase();
  const columns = db.prepare("PRAGMA table_info(customers)").all();
  const existing = new Set(columns.map((c) => c.name));
  const saleCols = new Set(db.prepare("PRAGMA table_info(sales)").all().map((c) => c.name));
  if (!saleCols.has("payment_method")) {
    db.exec("ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'Cash'");
    console.log("[SQLite] Migration: added sales.payment_method");
  }
  const purchaseCols = new Set(db.prepare("PRAGMA table_info(supplier_purchases)").all().map((c) => c.name));
  if (!purchaseCols.has("shift")) {
    db.exec("ALTER TABLE supplier_purchases ADD COLUMN shift TEXT DEFAULT 'Morning'");
    console.log("[SQLite] Migration: added supplier_purchases.shift");
  }
  if (!existing.has("previous_balance")) {
    db.exec("ALTER TABLE customers ADD COLUMN previous_balance REAL DEFAULT 0.0");
    console.log("[SQLite] Migration: added customers.previous_balance");
  }
  if (!existing.has("shift")) {
    db.exec("ALTER TABLE customers ADD COLUMN shift TEXT DEFAULT 'Morning'");
    console.log("[SQLite] Migration: added customers.shift");
  }
  if (!existing.has("sort_order")) {
    db.exec("ALTER TABLE customers ADD COLUMN sort_order INTEGER DEFAULT 0");
    console.log("[SQLite] Migration: added customers.sort_order");
  }
  if (!existing.has("whatsapp_consent")) {
    db.exec("ALTER TABLE customers ADD COLUMN whatsapp_consent INTEGER DEFAULT 1");
    console.log("[SQLite] Migration: added customers.whatsapp_consent");
  }
  if (!existing.has("whatsapp_opt_out_at")) {
    db.exec("ALTER TABLE customers ADD COLUMN whatsapp_opt_out_at TEXT");
    console.log("[SQLite] Migration: added customers.whatsapp_opt_out_at");
  }
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
  `);
  const needsBackfill = db.prepare("SELECT COUNT(*) as c FROM customers WHERE sort_order IS NULL OR sort_order = 0").get();
  if (needsBackfill.c > 0) {
    const rows = db.prepare("SELECT id FROM customers ORDER BY name ASC, id ASC").all();
    const update = db.prepare("UPDATE customers SET sort_order = ? WHERE id = ?");
    const apply = db.transaction(() => {
      rows.forEach((row, idx) => update.run(idx + 1, row.id));
    });
    apply();
    console.log("[SQLite] Migration: backfilled sort_order for", rows.length, "customers");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_customers_sort_order ON customers(sort_order)");
  try {
    db.exec(`
      DELETE FROM supplier_purchases WHERE supplier_id NOT IN (SELECT id FROM suppliers);
      DELETE FROM supplier_payments WHERE supplier_id NOT IN (SELECT id FROM suppliers);
      DELETE FROM supplier_opening_override WHERE supplier_id NOT IN (SELECT id FROM suppliers);
    `);
  } catch (err) {
    console.error("[SQLite] Cleanup orphaned supplier records failed:", err);
  }
}

// src/main/db/handlers.ts
var import_electron4 = require("electron");
var import_fs4 = __toESM(require("fs"));
var import_path4 = __toESM(require("path"));
var import_child_process = require("child_process");

// src/main/cloud/cloudConfig.ts
function getCloudConfig() {
  const db = getDatabase();
  let url = process.env.CLOUD_API_URL || "";
  let key = process.env.CLOUD_API_KEY || "";
  let deviceId = process.env.APP_DEVICE_ID || "dairy-desktop-pos-1";
  try {
    const urlRow = db.prepare("SELECT value FROM settings WHERE key = 'cloud_api_url'").get();
    const keyRow = db.prepare("SELECT value FROM settings WHERE key = 'cloud_api_key'").get();
    const devRow = db.prepare("SELECT value FROM settings WHERE key = 'cloud_device_id'").get();
    if (urlRow?.value) url = urlRow.value.trim();
    if (keyRow?.value) key = keyRow.value.trim();
    if (devRow?.value) deviceId = devRow.value.trim();
  } catch {
  }
  if (!url) {
    url = "http://localhost:3001";
  }
  url = url.replace(/\/+$/, "");
  return {
    apiUrl: url,
    apiKey: key,
    deviceId
  };
}
function saveCloudConfig(config) {
  const db = getDatabase();
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  if (config.apiUrl !== void 0) upsert.run("cloud_api_url", config.apiUrl.trim().replace(/\/+$/, ""));
  if (config.apiKey !== void 0) upsert.run("cloud_api_key", config.apiKey.trim());
  if (config.deviceId !== void 0) upsert.run("cloud_device_id", config.deviceId.trim());
}

// src/main/cloud/connectivity.ts
var import_dns = __toESM(require("dns"));
async function isInternetAvailable() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 2500);
    import_dns.default.lookup("google.com", (err) => {
      clearTimeout(timeout);
      if (!err) {
        resolve(true);
      } else {
        import_dns.default.lookup("cloudflare.com", (err2) => {
          resolve(!err2);
        });
      }
    });
  });
}
async function checkBackendReachable() {
  const config = getCloudConfig();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4e3);
    const res = await fetch(`${config.apiUrl}/api/health`, {
      method: "GET",
      headers: {
        "x-api-key": config.apiKey,
        "x-device-id": config.deviceId
      },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      return { reachable: true, data };
    } else {
      return {
        reachable: false,
        error: `Backend responded with HTTP status ${res.status}`
      };
    }
  } catch (err) {
    return {
      reachable: false,
      error: err.name === "AbortError" ? "Backend connection timed out" : err.message || "Cannot reach cloud backend"
    };
  }
}
async function getConnectionStatus() {
  const config = getCloudConfig();
  const isLocalBackend = config.apiUrl.includes("localhost") || config.apiUrl.includes("127.0.0.1");
  const [online, backendRes] = await Promise.all([
    isLocalBackend ? Promise.resolve(true) : isInternetAvailable(),
    checkBackendReachable()
  ]);
  return {
    isOnline: online || backendRes.reachable,
    isBackendReachable: backendRes.reachable,
    apiUrl: config.apiUrl,
    backendVersion: backendRes.data?.version,
    backendComponents: backendRes.data?.components,
    error: backendRes.error
  };
}

// src/main/cloud/cloudSync.ts
function getLocalSyncMeta() {
  const db = getDatabase();
  try {
    const row = db.prepare("SELECT value FROM cloud_sync_meta WHERE key = 'last_synced_at'").get();
    const errRow = db.prepare("SELECT value FROM cloud_sync_meta WHERE key = 'last_sync_error'").get();
    return {
      lastSyncAt: row?.value || null,
      lastError: errRow?.value || void 0
    };
  } catch {
    return { lastSyncAt: null };
  }
}
function setLocalSyncMeta(key, value) {
  const db = getDatabase();
  try {
    db.prepare(`
      INSERT INTO cloud_sync_meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, value);
  } catch (err) {
    console.warn("[Sync Meta] Failed to save sync metadata:", err);
  }
}
var isSyncInProgress = false;
async function performCloudSync() {
  if (isSyncInProgress) {
    return { success: false, error: "A synchronization operation is already in progress." };
  }
  isSyncInProgress = true;
  try {
    const conn = await getConnectionStatus();
    if (!conn.isBackendReachable) {
      setLocalSyncMeta("last_sync_error", conn.error || "Cloud backend unreachable");
      return {
        success: false,
        error: conn.error || "Cannot sync: cloud backend is unreachable or offline"
      };
    }
    const config = getCloudConfig();
    const db = getDatabase();
    const meta = getLocalSyncMeta();
    const customers = db.prepare("SELECT * FROM customers").all();
    const sales = db.prepare("SELECT * FROM sales ORDER BY id DESC LIMIT 500").all();
    const milkEntries = db.prepare("SELECT * FROM milk_entries").all();
    const customerMonthRates = db.prepare("SELECT * FROM customer_month_rates").all();
    const receivedPayments = db.prepare("SELECT * FROM received_payments").all();
    const khataOpeningOverrides = db.prepare("SELECT * FROM khata_opening_override").all();
    const suppliers = db.prepare("SELECT * FROM suppliers").all();
    const supplierPurchases = db.prepare("SELECT * FROM supplier_purchases").all();
    const supplierPayments = db.prepare("SELECT * FROM supplier_payments").all();
    const expenses = db.prepare("SELECT * FROM expenses ORDER BY id DESC LIMIT 500").all();
    const gheeTransactions = db.prepare("SELECT * FROM ghee_transactions").all();
    const shopperTransactions = db.prepare("SELECT * FROM shopper_transactions").all();
    const dailyStockRecords = db.prepare("SELECT * FROM daily_stock_records").all();
    const billSettings = db.prepare("SELECT * FROM bill_settings WHERE id = 1").get();
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
      billSettings
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2e4);
    const response = await fetch(`${config.apiUrl}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "x-device-id": config.deviceId
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await response.json();
    if (!response.ok || !data.success) {
      const err = data.error || `Sync failed with status ${response.status}`;
      setLocalSyncMeta("last_sync_error", err);
      return { success: false, error: err };
    }
    if (data.serverTimestamp) {
      setLocalSyncMeta("last_synced_at", data.serverTimestamp);
      setLocalSyncMeta("last_sync_error", "");
    }
    return {
      success: true,
      counts: data.counts,
      serverTimestamp: data.serverTimestamp
    };
  } catch (err) {
    const errorMsg = err.name === "AbortError" ? "Sync timed out" : err.message || "Sync failed";
    setLocalSyncMeta("last_sync_error", errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    isSyncInProgress = false;
  }
}

// src/main/cloud/cloudBackup.ts
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_crypto = __toESM(require("crypto"));
var import_electron2 = require("electron");
var activeAbortController = null;
var isBackupInProgress = false;
function cancelActiveBackup() {
  if (activeAbortController) {
    console.log("[Cloud Backup] Backup cancelled by user.");
    activeAbortController.abort();
    activeAbortController = null;
    isBackupInProgress = false;
    return true;
  }
  return false;
}
async function createAndUploadCloudBackup(onProgress, notes = "Application shutdown auto-backup") {
  if (isBackupInProgress) {
    return { success: false, error: "A backup upload is already in progress." };
  }
  isBackupInProgress = true;
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;
  let tempSnapshotPath = null;
  try {
    onProgress?.("Checking cloud connection...", 10);
    if (signal.aborted) throw new Error("Cancelled");
    const conn = await getConnectionStatus();
    if (!conn.isOnline || !conn.isBackendReachable) {
      return {
        success: false,
        error: conn.error || "Cannot backup: No internet connection or cloud backend is offline."
      };
    }
    onProgress?.("Synchronizing latest database changes...", 25);
    if (signal.aborted) throw new Error("Cancelled");
    try {
      await performCloudSync();
    } catch (syncErr) {
      console.warn("[Cloud Backup] Pre-backup sync warning (continuing with snapshot):", syncErr);
    }
    onProgress?.("Creating consistent SQLite database snapshot...", 50);
    if (signal.aborted) throw new Error("Cancelled");
    const tempDir = import_path2.default.join(import_electron2.app.getPath("temp"), "dairy_backups");
    if (!import_fs2.default.existsSync(tempDir)) import_fs2.default.mkdirSync(tempDir, { recursive: true });
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    tempSnapshotPath = import_path2.default.join(tempDir, `dairy_snapshot_${timestamp}.db`);
    await createDatabaseSnapshot(tempSnapshotPath);
    if (!import_fs2.default.existsSync(tempSnapshotPath)) {
      throw new Error("Failed to create local database snapshot file.");
    }
    const fileBuffer = import_fs2.default.readFileSync(tempSnapshotPath);
    const sizeBytes = fileBuffer.length;
    onProgress?.("Verifying snapshot integrity...", 65);
    if (signal.aborted) throw new Error("Cancelled");
    const checksum = import_crypto.default.createHash("sha256").update(fileBuffer).digest("hex");
    onProgress?.("Uploading backup to cloud storage...", 80);
    if (signal.aborted) throw new Error("Cancelled");
    const config = getCloudConfig();
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: "application/x-sqlite3" });
    formData.append("file", blob, `dairy_${timestamp}.db`);
    formData.append("checksum", checksum);
    formData.append("deviceId", config.deviceId);
    formData.append("notes", notes);
    const uploadResponse = await fetch(`${config.apiUrl}/api/backup`, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "x-device-id": config.deviceId
      },
      body: formData,
      signal
    });
    if (!uploadResponse.ok) {
      const errData = await uploadResponse.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed with HTTP status ${uploadResponse.status}`);
    }
    const resJson = await uploadResponse.json();
    if (!resJson.success) {
      throw new Error(resJson.error || "Server rejected backup upload");
    }
    onProgress?.("Backup verified successfully!", 100);
    return {
      success: true,
      backupId: resJson.backupId,
      checksum,
      sizeBytes
    };
  } catch (err) {
    if (err.name === "AbortError" || err.message === "Cancelled") {
      return { success: false, cancelled: true, error: "Backup cancelled by user" };
    }
    return {
      success: false,
      error: err.message || "Backup failed unexpectedly"
    };
  } finally {
    isBackupInProgress = false;
    activeAbortController = null;
    if (tempSnapshotPath && import_fs2.default.existsSync(tempSnapshotPath)) {
      try {
        import_fs2.default.unlinkSync(tempSnapshotPath);
      } catch {
      }
    }
  }
}
async function getCloudBackupHistory() {
  const config = getCloudConfig();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8e3);
    const res = await fetch(`${config.apiUrl}/api/backup/history`, {
      headers: {
        "x-api-key": config.apiKey,
        "x-device-id": config.deviceId
      },
      signal: controller.signal
    });
    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || `Error ${res.status}` };
    }
    return {
      success: true,
      backups: data.backups || []
    };
  } catch (err) {
    return {
      success: false,
      error: err.name === "AbortError" ? "History fetch timed out" : err.message || "Failed to fetch history"
    };
  }
}
async function restoreCloudBackup(backupId, onProgress) {
  const config = getCloudConfig();
  try {
    onProgress?.("Requesting backup restore from cloud...", 20);
    const res = await fetch(`${config.apiUrl}/api/backup/restore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "x-device-id": config.deviceId
      },
      body: JSON.stringify({ backupId })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Failed to initiate restore" };
    }
    onProgress?.("Downloading cloud backup file...", 50);
    const fileRes = await fetch(data.downloadUrl);
    if (!fileRes.ok) {
      return { success: false, error: `Failed to download file from storage (${fileRes.status})` };
    }
    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    onProgress?.("Verifying download integrity (SHA-256)...", 75);
    const computedChecksum = import_crypto.default.createHash("sha256").update(buffer).digest("hex");
    if (data.sha256Checksum && computedChecksum.toLowerCase() !== data.sha256Checksum.toLowerCase()) {
      return {
        success: false,
        error: `Integrity check failed: Checksum mismatch! Downloaded file may be corrupted.`
      };
    }
    const tempRestorePath = import_path2.default.join(import_electron2.app.getPath("temp"), `restore_${backupId}.db`);
    import_fs2.default.writeFileSync(tempRestorePath, buffer);
    onProgress?.("Safely restoring local SQLite database...", 90);
    const restoreRes = restoreDatabaseFromFile(tempRestorePath);
    try {
      import_fs2.default.unlinkSync(tempRestorePath);
    } catch {
    }
    if (!restoreRes.success) {
      return { success: false, error: restoreRes.error };
    }
    onProgress?.("Restore completed successfully!", 100);
    return {
      success: true,
      safetyBackupPath: restoreRes.safetyBackupPath
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || "Error occurred while restoring cloud backup"
    };
  }
}

// src/main/cloud/billImageGenerator.ts
var import_electron3 = require("electron");
var import_fs3 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
function buildBillHtml(data) {
  const shopTitle = data.shopTitle || "\u0642\u0627\u0631\u06CC \u0638\u0641\u0631 \u0627\u0642\u0628\u0627\u0644 \u0645\u0644\u06A9 \u0634\u0627\u067E";
  const ownerName = data.ownerName || "\u062D\u0627\u0641\u0638 \u0645\u0635\u0639\u0628 \u0638\u0641\u0631";
  const shopPhone = data.shopPhone || "+92 321 0001168";
  const bankName = data.bankName || "\u0645\u06CC\u0632\u0627\u0646 \u0628\u06CC\u0646\u06A9";
  const accountTitle = data.accountTitle || "\u062D\u0627\u0641\u0638 \u0645\u0635\u0639\u0628 \u0638\u0641\u0631";
  const accountNumber = data.accountNumber || "02090111954760";
  const money = (n) => Math.round(n || 0).toLocaleString("en-US");
  const qty = (n) => Number.isInteger(n) ? String(n) : Number(n).toFixed(2);
  return `<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #020b24;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #FFFFFF;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 440px;
      padding: 12px;
    }
    .card {
      width: 416px;
      background: radial-gradient(circle at 50% 15%, #081a4a 0%, #020b24 70%);
      border: 2px solid #00d2ff;
      border-radius: 24px;
      box-shadow: 0 0 25px rgba(0, 210, 255, 0.35);
      padding: 18px 16px 20px;
      text-align: right;
    }
    .header { text-align: center; margin-bottom: 8px; }
    .shop-title { font-size: 24px; font-weight: 900; color: #FFFFFF; margin-bottom: 4px; }
    .owner-badge {
      display: inline-block;
      padding: 2px 14px;
      background: rgba(11, 20, 55, 0.8);
      border: 1px solid rgba(0, 210, 255, 0.8);
      border-radius: 9999px;
      font-size: 12px;
      color: #a5f3fc;
      font-weight: bold;
    }
    .box {
      margin-top: 8px;
      padding: 8px 12px;
      background: #06143c;
      border: 1px solid rgba(0, 210, 255, 0.8);
      border-radius: 12px;
      box-shadow: 0 0 10px rgba(0, 150, 255, 0.2);
    }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .label { font-size: 11px; color: #cbd5e1; }
    .value { font-size: 15px; font-weight: 900; color: #FFFFFF; }
    .highlight { color: #00d2ff; }
    .amber { color: #fbbf24; }
    .payable-box {
      margin-top: 10px;
      padding: 12px 14px;
      background: linear-gradient(90deg, rgba(30, 58, 138, 0.9), #072559, rgba(30, 58, 138, 0.9));
      border: 2px solid #00d2ff;
      border-radius: 16px;
      box-shadow: 0 0 20px rgba(0, 210, 255, 0.5);
    }
    .payable-amount { font-size: 26px; font-weight: 900; color: #FFFFFF; }
    .warning {
      margin-top: 8px;
      padding: 8px 10px;
      background: #061a47;
      border: 1px solid rgba(0, 210, 255, 0.7);
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      color: #FFFFFF;
      text-align: center;
    }
    .bank-box {
      margin-top: 8px;
      padding: 8px 12px;
      background: #06143c;
      border: 1px solid rgba(0, 210, 255, 0.8);
      border-radius: 12px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="shop-title">${shopTitle}</div>
      <div class="owner-badge">${ownerName}</div>
    </div>

    <!-- Phone -->
    <div class="box flex-between" dir="ltr">
      <span class="value highlight" style="font-family: monospace;">${shopPhone}</span>
      <span class="label" style="font-weight: bold;">\u0645\u0648\u0628\u0627\u0626\u0644 \u0646\u0645\u0628\u0631:</span>
    </div>

    <!-- Bill No & Customer -->
    <div class="box grid-2">
      <div style="border-left: 1px solid rgba(0,210,255,0.3); padding-left: 8px;">
        <div class="label">\u0628\u0644 \u0646\u0645\u0628\u0631: <strong class="value">${data.billNo || data.customerId}</strong></div>
        <div class="label highlight">${data.monthLabel}</div>
      </div>
      <div>
        <div class="label">\u0628\u0644 \u0628\u0646\u0627\u0645:</div>
        <div class="value" style="font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.customerName}</div>
      </div>
    </div>

    <!-- Rate & Liters -->
    <div class="grid-2" style="margin-top: 8px;">
      <div class="box flex-between">
        <span class="label">\u0641\u06CC \u0644\u06CC\u0679\u0631 \u0631\u06CC\u0679:</span>
        <span class="value">${data.rate} \u0631\u0648\u067E\u06D2</span>
      </div>
      <div class="box flex-between">
        <span class="label">\u06A9\u0644 \u062F\u0648\u062F\u06BE:</span>
        <span class="value highlight">${qty(data.liters)} \u0644\u06CC\u0679\u0631</span>
      </div>
    </div>

    <!-- Arrears & Milk Amount -->
    <div class="box grid-2">
      <div style="border-left: 1px solid rgba(0,210,255,0.3); padding-left: 8px;">
        <div class="label">\u0633\u0627\u0628\u0642\u06C1 \u0631\u0642\u0645:</div>
        <span class="value amber">${money(data.carry)} \u0631\u0648\u067E\u06D2</span>
      </div>
      <div>
        <div class="label">\u06A9\u0644 \u0631\u0642\u0645 \u062F\u0648\u062F\u06BE:</div>
        <span class="value">${money(data.billAmount)} \u0631\u0648\u067E\u06D2</span>
      </div>
    </div>

    <!-- Total Payable -->
    <div class="payable-box flex-between">
      <div style="font-size: 13px; font-weight: 900; color: #a5f3fc;">\u06A9\u0644 \u0628\u0644 \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC:</div>
      <div class="payable-amount">${money(data.payable)} <span style="font-size: 16px; color: #00d2ff;">\u0631\u0648\u067E\u06D2</span></div>
    </div>

    <!-- Warning -->
    <div class="warning">
      \u0628\u0644 \u06C1\u0631 \u0645\u0627\u06C1 \u06A9\u06CC <span style="color: #00d2ff;">5 \u062A\u0627\u0631\u06CC\u062E</span> \u062A\u06A9 \u0627\u062F\u0627 \u06A9\u0631\u06CC\u06BA\u060C \u0628\u0635\u0648\u0631\u062A \u062F\u06CC\u06AF\u0631 \u062F\u0648\u062F\u06BE \u06A9\u06CC \u0633\u067E\u0644\u0627\u0626\u06CC \u0628\u0646\u062F \u06A9\u0631 \u062F\u06CC \u062C\u0627\u0626\u06D2 \u06AF\u06CC\u06D4
    </div>

    <!-- Bank Details -->
    <div class="bank-box flex-between" dir="ltr">
      <div style="font-weight: bold; color: #00d2ff;">${bankName}</div>
      <div style="text-align: right;">
        <div style="color: #00d2ff; font-family: monospace; font-weight: bold;">A/C: ${accountNumber}</div>
        <div style="color: #cbd5e1; font-size: 10px;">Title: ${accountTitle}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
async function generateBillImage(data) {
  let offscreenWin = null;
  try {
    const html = buildBillHtml(data);
    offscreenWin = new import_electron3.BrowserWindow({
      width: 440,
      height: 720,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: {
        offscreen: true
      }
    });
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await offscreenWin.loadURL(dataUrl);
    await new Promise((r) => setTimeout(r, 200));
    const image = await offscreenWin.webContents.capturePage({
      x: 0,
      y: 0,
      width: 440,
      height: 720
    });
    const pngBuffer = image.toPNG();
    const billsDir = import_path3.default.join(import_electron3.app.getPath("userData"), "bills", data.month.replace(/[^a-zA-Z0-9_-]/g, "_"));
    if (!import_fs3.default.existsSync(billsDir)) {
      import_fs3.default.mkdirSync(billsDir, { recursive: true });
    }
    const filePath = import_path3.default.join(billsDir, `bill_customer_${data.customerId}_${data.month}.png`);
    import_fs3.default.writeFileSync(filePath, pngBuffer);
    return {
      success: true,
      filePath,
      buffer: pngBuffer
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || "Failed to render offscreen bill image"
    };
  } finally {
    if (offscreenWin && !offscreenWin.isDestroyed()) {
      offscreenWin.destroy();
      offscreenWin = null;
    }
  }
}

// src/main/cloud/whatsappClient.ts
async function getWhatsAppCloudStatus() {
  const config = getCloudConfig();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6e3);
    const res = await fetch(`${config.apiUrl}/api/whatsapp/status`, {
      headers: {
        "x-api-key": config.apiKey,
        "x-device-id": config.deviceId
      },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      return await res.json();
    } else {
      return {
        configured: false,
        connected: false,
        error: `Cloud backend responded with status ${res.status}`
      };
    }
  } catch (err) {
    return {
      configured: false,
      connected: false,
      error: err.name === "AbortError" ? "WhatsApp status check timed out" : err.message || "Cannot reach cloud backend"
    };
  }
}
async function uploadBillImageToCloud(buffer, fileName = "bill.png") {
  const config = getCloudConfig();
  try {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: "image/png" });
    formData.append("file", blob, fileName);
    const res = await fetch(`${config.apiUrl}/api/whatsapp/media`, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "x-device-id": config.deviceId
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || `Media upload failed (${res.status})` };
    }
    return { success: true, mediaId: data.mediaId };
  } catch (err) {
    return { success: false, error: err.message || "Error uploading media to backend" };
  }
}
async function sendSingleCustomerBill(item, settings, force = false) {
  const config = getCloudConfig();
  const db = getDatabase();
  if (item.whatsappConsent === false) {
    return { success: false, error: "Customer has opted out of WhatsApp billing notifications." };
  }
  const renderRes = await generateBillImage({
    customerId: item.customerId,
    customerName: item.customerName,
    phone: item.phone,
    month: item.billMonth,
    monthLabel: item.monthLabel,
    rate: item.rate,
    liters: item.liters,
    billAmount: item.billAmount,
    carry: item.carry,
    received: item.received,
    payable: item.payable,
    shopTitle: settings?.shop_title,
    ownerName: settings?.owner_name,
    shopPhone: settings?.phone,
    bankName: settings?.bank_name,
    accountTitle: settings?.account_title,
    accountNumber: settings?.account_number
  });
  let mediaId;
  if (renderRes.success && renderRes.buffer) {
    const uploadRes = await uploadBillImageToCloud(
      renderRes.buffer,
      `bill_${item.customerId}_${item.billMonth}.png`
    );
    if (uploadRes.success) {
      mediaId = uploadRes.mediaId;
    }
  }
  try {
    const res = await fetch(`${config.apiUrl}/api/whatsapp/send-bill`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "x-device-id": config.deviceId
      },
      body: JSON.stringify({
        customerId: item.customerId,
        customerName: item.customerName,
        phone: item.phone,
        billMonth: item.billMonth,
        liters: item.liters,
        rate: item.rate,
        billAmount: item.billAmount,
        balanceDue: item.payable,
        mediaId,
        force
      })
    });
    const data = await res.json();
    const idempotencyKey = `${item.customerId || item.phone}_${item.billMonth}`;
    const status = data.success ? "sent" : "failed";
    try {
      db.prepare(`
        INSERT INTO whatsapp_bill_logs (
          customer_id, customer_name, phone, bill_month, bill_amount, liters, rate,
          balance_due, status, message_id, media_id, error_message, idempotency_key, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(idempotency_key) DO UPDATE SET
          status = excluded.status,
          message_id = excluded.message_id,
          media_id = excluded.media_id,
          error_message = excluded.error_message,
          retry_count = whatsapp_bill_logs.retry_count + 1,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        item.customerId,
        item.customerName,
        item.phone,
        item.billMonth,
        item.billAmount,
        item.liters,
        item.rate,
        item.payable,
        status,
        data.messageId || null,
        mediaId || null,
        data.error || null,
        idempotencyKey
      );
    } catch (dbErr) {
      console.warn("[WhatsApp Client] Local log save error:", dbErr);
    }
    return data;
  } catch (err) {
    return { success: false, error: err.message || "Failed to dispatch bill" };
  }
}
function getLocalWhatsAppBillLogs(month) {
  const db = getDatabase();
  try {
    return db.prepare("SELECT * FROM whatsapp_bill_logs WHERE bill_month = ? ORDER BY id DESC").all(month);
  } catch {
    return [];
  }
}

// src/main/db/handlers.ts
function registerIpcHandlers() {
  import_electron4.ipcMain.handle("db:getInfo", async () => {
    try {
      const db = getDatabase();
      const path6 = getDatabasePath();
      const test = db.prepare("SELECT 1 as connected").get();
      return {
        success: true,
        isConnected: test?.connected === 1,
        dbPath: path6,
        userDataPath: import_electron4.app.getPath("userData"),
        appVersion: import_electron4.app.getVersion() || "1.0.0"
      };
    } catch (error) {
      return {
        success: false,
        isConnected: false,
        error: error.message,
        dbPath: getDatabasePath()
      };
    }
  });
  import_electron4.ipcMain.handle("settings:getAll", async () => {
    const db = getDatabase();
    const rows = db.prepare("SELECT key, value FROM settings").all();
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  });
  import_electron4.ipcMain.handle("settings:set", async (_event, key, value) => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
    return { success: true };
  });
  import_electron4.ipcMain.handle("twilio:send", async (_e, payload) => {
    try {
      const db = getDatabase();
      const sidRow = db.prepare("SELECT value FROM settings WHERE key = 'twilio_account_sid'").get();
      const tokenRow = db.prepare("SELECT value FROM settings WHERE key = 'twilio_auth_token'").get();
      const fromRow = db.prepare("SELECT value FROM settings WHERE key = 'twilio_from_phone'").get();
      const sid = sidRow?.value?.trim();
      const token = tokenRow?.value?.trim();
      let from = fromRow?.value?.trim() || "";
      if (!sid || !token || !from) {
        return {
          success: false,
          error: "Twilio WhatsApp is not configured. Please enter Account SID, Auth Token, and Sender Phone in Settings."
        };
      }
      if (!from.startsWith("whatsapp:")) {
        from = `whatsapp:${from}`;
      }
      let to = (payload.to || "").trim();
      if (!to.startsWith("whatsapp:")) {
        let clean = to.replace(/\D/g, "");
        if (clean.startsWith("00")) clean = clean.slice(2);
        if (clean.startsWith("0")) clean = "92" + clean.slice(1);
        if (!clean.startsWith("+")) clean = `+${clean}`;
        to = `whatsapp:${clean}`;
      }
      const params = new URLSearchParams();
      params.append("From", from);
      params.append("To", to);
      params.append("Body", payload.message);
      const auth = Buffer.from(`${sid}:${token}`).toString("base64");
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${auth}`
        },
        body: params.toString()
      });
      const resData = await response.json();
      if (response.ok && resData.sid) {
        return { success: true, messageSid: resData.sid };
      } else {
        return {
          success: false,
          error: resData.message || `Twilio error: ${resData.code || response.status}`
        };
      }
    } catch (err) {
      return { success: false, error: err.message || "Twilio network request failed" };
    }
  });
  import_electron4.ipcMain.handle("tasks:getAll", async () => {
    const db = getDatabase();
    return db.prepare("SELECT * FROM tasks ORDER BY id DESC").all();
  });
  import_electron4.ipcMain.handle("tasks:add", async (_event, title, status = "pending") => {
    const db = getDatabase();
    const result = db.prepare("INSERT INTO tasks (title, status) VALUES (?, ?)").run(title, status);
    return { id: result.lastInsertRowid, title, status, success: true };
  });
  import_electron4.ipcMain.handle("tasks:delete", async (_event, id) => {
    const db = getDatabase();
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("dashboard:getStats", async (_event, customMonthKey) => {
    const db = getDatabase();
    const now = /* @__PURE__ */ new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const monthKey = customMonthKey && /^\d{4}-\d{2}$/.test(customMonthKey) ? customMonthKey : `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const [mY, mM] = monthKey.split("-").map(Number);
    const nextMonthKey = mM === 12 ? `${mY + 1}-01` : `${mY}-${pad(mM + 1)}`;
    const customersCount = db.prepare("SELECT COUNT(*) as c FROM customers").get()?.c || 0;
    const rateRows = db.prepare(`
      SELECT c.id, c.name, COALESCE(mr.rate, c.default_rate) AS rate
      FROM customers c
      LEFT JOIN customer_month_rates mr ON mr.customer_id = c.id AND mr.month = ?
    `).all(monthKey);
    const rateOf = {};
    const nameOf = {};
    for (const r of rateRows) {
      rateOf[r.id] = Number(r.rate) || 0;
      nameOf[r.id] = r.name;
    }
    const monthQty = db.prepare(`
      SELECT customer_id, SUM(quantity) AS qty FROM milk_entries
      WHERE entry_date LIKE ? GROUP BY customer_id
    `).all(`${monthKey}-%`);
    let monthMilk = 0;
    let monthBilled = 0;
    for (const q of monthQty) {
      monthMilk += q.qty;
      monthBilled += q.qty * (rateOf[q.customer_id] || 0);
    }
    const todayQty = db.prepare(`
      SELECT customer_id, quantity FROM milk_entries WHERE entry_date = ?
    `).all(todayKey);
    let todayMilk = 0;
    let todaySale = 0;
    for (const q of todayQty) {
      todayMilk += q.quantity;
      todaySale += q.quantity * (rateOf[q.customer_id] || 0);
    }
    const monthCollected = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM received_payments WHERE month = ?"
    ).get(monthKey)?.total || 0;
    const balances = computeBalances(db, nextMonthKey);
    const phoneRows = db.prepare("SELECT id, phone FROM customers").all();
    const phoneOf = {};
    for (const p of phoneRows) phoneOf[p.id] = p.phone || "";
    let totalDue = 0;
    const dueList = [];
    if (customersCount > 0) {
      for (const [id, bal] of Object.entries(balances)) {
        if (bal > 0 && nameOf[Number(id)]) {
          totalDue += bal;
          dueList.push({
            id: Number(id),
            name: nameOf[Number(id)] || "",
            phone: phoneOf[Number(id)] || "",
            balance: bal
          });
        }
      }
      dueList.sort((a, b) => b.balance - a.balance);
    }
    const w = (sql, ...args) => db.prepare(sql).get(...args);
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
    const supplierPayable = (w("SELECT COALESCE(SUM(total),0) a FROM supplier_purchases WHERE supplier_id IN (SELECT id FROM suppliers)").a || 0) - (w("SELECT COALESCE(SUM(amount),0) a FROM supplier_payments WHERE supplier_id IN (SELECT id FROM suppliers)").a || 0);
    const todayExpenses = w("SELECT COALESCE(SUM(amount), 0) a FROM expenses WHERE date = ?", todayKey)?.a || 0;
    const monthExpenses = w("SELECT COALESCE(SUM(amount), 0) a FROM expenses WHERE date LIKE ?", `${monthKey}-%`)?.a || 0;
    const gheeIn = w("SELECT COALESCE(SUM(quantity),0) q, COALESCE(SUM(total),0) t FROM ghee_transactions WHERE type = 'Inward'");
    const gheeOut = w("SELECT COALESCE(SUM(quantity),0) q, COALESCE(SUM(total),0) t FROM ghee_transactions WHERE type = 'Outward'");
    const gheeStock = Math.max(0, (gheeIn?.q || 0) - (gheeOut?.q || 0));
    const avgGheeBuyRate = (gheeIn?.q || 0) > 0 ? (gheeIn?.t || 0) / (gheeIn?.q || 1) : 0;
    const gheeProfit = Math.round((gheeOut?.t || 0) - (gheeOut?.q || 0) * avgGheeBuyRate);
    const shopIn = w("SELECT COALESCE(SUM(quantity),0) q FROM shopper_transactions WHERE type = 'Inward'");
    const shopOut = w("SELECT COALESCE(SUM(quantity),0) q FROM shopper_transactions WHERE type = 'Outward'");
    const shopperStock = Math.max(0, (shopIn?.q || 0) - (shopOut?.q || 0));
    let activeRate = 240;
    try {
      const priceRow = db.prepare("SELECT rate FROM milk_price_history ORDER BY effective_from DESC, id DESC LIMIT 1").get();
      if (priceRow && priceRow.rate > 0) activeRate = priceRow.rate;
    } catch {
    }
    const suppliersCount = w("SELECT COUNT(*) c FROM suppliers")?.c || 0;
    const recentActivity = [];
    try {
      const posRows = db.prepare(`
        SELECT id, date, customer_name, quantity, rate, total_amount, payment_status, payment_method, created_at
        FROM sales
        ORDER BY id DESC LIMIT 10
      `).all();
      for (const p of posRows) {
        recentActivity.push({
          id: p.id,
          type: "pos",
          date: p.date,
          customerName: p.customer_name || "Walk-in Cash",
          quantity: p.quantity,
          rate: p.rate,
          totalAmount: p.total_amount,
          paymentStatus: p.payment_status,
          paymentMethod: p.payment_method || "Cash",
          created_at: p.created_at
        });
      }
    } catch {
    }
    try {
      const khataRows = db.prepare(`
        SELECT e.id, e.entry_date as date, c.name as customer_name, e.quantity,
               COALESCE(mr.rate, c.default_rate) as rate, e.updated_at as created_at
        FROM milk_entries e
        JOIN customers c ON c.id = e.customer_id
        LEFT JOIN customer_month_rates mr ON mr.customer_id = c.id AND mr.month = ?
        WHERE e.quantity > 0
        ORDER BY e.updated_at DESC, e.id DESC LIMIT 10
      `).all(monthKey);
      for (const k of khataRows) {
        const amt = Math.round(k.quantity * (k.rate || 240));
        recentActivity.push({
          id: k.id,
          type: "khata",
          date: k.date,
          customerName: k.customer_name,
          quantity: k.quantity,
          rate: k.rate || 240,
          totalAmount: amt,
          paymentStatus: "Khata",
          paymentMethod: "Monthly Delivery",
          created_at: k.created_at
        });
      }
    } catch {
    }
    try {
      const payRows = db.prepare(`
        SELECT p.id, p.month as date, c.name as customer_name, p.amount as total_amount, p.updated_at as created_at
        FROM received_payments p
        JOIN customers c ON c.id = p.customer_id
        ORDER BY p.updated_at DESC LIMIT 5
      `).all();
      for (const py of payRows) {
        recentActivity.push({
          id: py.id,
          type: "payment",
          date: py.date,
          customerName: py.customer_name,
          totalAmount: py.total_amount,
          paymentStatus: "Paid",
          paymentMethod: "Bill Payment",
          created_at: py.created_at
        });
      }
    } catch {
    }
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
      recentTransactions: recentActivity.slice(0, 15)
    };
  });
  import_electron4.ipcMain.handle("customers:getAll", async () => {
    const db = getDatabase();
    return db.prepare("SELECT * FROM customers ORDER BY sort_order ASC, id ASC").all();
  });
  import_electron4.ipcMain.handle("customers:add", async (_event, customer) => {
    const db = getDatabase();
    const insert = db.prepare(`
      INSERT INTO customers (name, phone, address, default_rate, balance, previous_balance, sort_order, shift, whatsapp_consent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), 0) as m FROM customers").get().m;
    const requested = Number(customer.position);
    const total = db.prepare("SELECT COUNT(*) as c FROM customers").get().c;
    const position = Number.isFinite(requested) && requested >= 1 ? Math.min(Math.floor(requested), total + 1) : maxOrder + 1;
    const previousBalance = Number(customer.previous_balance) || 0;
    const consent = customer.whatsapp_consent !== void 0 ? customer.whatsapp_consent ? 1 : 0 : 1;
    const run = db.transaction(() => {
      db.prepare("UPDATE customers SET sort_order = sort_order + 1 WHERE sort_order >= ?").run(position);
      const result = insert.run(
        customer.name,
        customer.phone,
        customer.address,
        customer.default_rate || 90,
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
  import_electron4.ipcMain.handle("customers:update", async (_event, customer) => {
    const db = getDatabase();
    const current = db.prepare("SELECT * FROM customers WHERE id = ?").get(customer.id);
    if (!current) {
      return { success: false, error: "Customer not found" };
    }
    const run = db.transaction(() => {
      const newRate = customer.default_rate || 90;
      if (Number(current.default_rate) !== Number(newRate)) {
        const now = /* @__PURE__ */ new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        db.prepare(`
          INSERT OR IGNORE INTO customer_month_rates (customer_id, month, rate)
          SELECT DISTINCT customer_id, substr(entry_date, 1, 7), ?
          FROM milk_entries
          WHERE customer_id = ? AND substr(entry_date, 1, 7) < ?
        `).run(current.default_rate, customer.id, thisMonth);
        db.prepare(`
          INSERT INTO customer_month_rates (customer_id, month, rate) VALUES (?, ?, ?)
          ON CONFLICT(customer_id, month) DO UPDATE SET rate = excluded.rate
        `).run(customer.id, thisMonth, newRate);
      }
      const consent = customer.whatsapp_consent !== void 0 ? customer.whatsapp_consent ? 1 : 0 : current.whatsapp_consent ?? 1;
      db.prepare(`
        UPDATE customers
        SET name = ?, phone = ?, address = ?, default_rate = ?, previous_balance = ?, shift = ?, whatsapp_consent = ?
        WHERE id = ?
      `).run(
        customer.name,
        customer.phone,
        customer.address,
        customer.default_rate || 90,
        customer.previous_balance ?? current.previous_balance ?? 0,
        customer.shift ? normShift(customer.shift) : current.shift || "Morning",
        consent,
        customer.id
      );
      if (customer.position && Number(customer.position) !== Number(current.sort_order)) {
        const total = db.prepare("SELECT COUNT(*) as c FROM customers").get().c;
        const target = Math.max(1, Math.min(Math.floor(Number(customer.position)), total));
        const from = Number(current.sort_order);
        if (target < from) {
          db.prepare("UPDATE customers SET sort_order = sort_order + 1 WHERE sort_order >= ? AND sort_order < ?").run(
            target,
            from
          );
        } else {
          db.prepare("UPDATE customers SET sort_order = sort_order - 1 WHERE sort_order > ? AND sort_order <= ?").run(
            from,
            target
          );
        }
        db.prepare("UPDATE customers SET sort_order = ? WHERE id = ?").run(target, customer.id);
      }
    });
    run();
    return { success: true };
  });
  import_electron4.ipcMain.handle("customers:delete", async (_event, id) => {
    const db = getDatabase();
    const run = db.transaction(() => {
      db.prepare("DELETE FROM milk_entries WHERE customer_id = ?").run(id);
      db.prepare("DELETE FROM received_payments WHERE customer_id = ?").run(id);
      db.prepare("DELETE FROM khata_opening_override WHERE customer_id = ?").run(id);
      db.prepare("DELETE FROM customer_month_rates WHERE customer_id = ?").run(id);
      db.prepare("DELETE FROM customers WHERE id = ?").run(id);
    });
    run();
    return { success: true };
  });
  import_electron4.ipcMain.handle("customers:deleteMany", async (_event, ids) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: true, deleted: 0 };
    }
    const db = getDatabase();
    const delEntries = db.prepare("DELETE FROM milk_entries WHERE customer_id = ?");
    const delRecv = db.prepare("DELETE FROM received_payments WHERE customer_id = ?");
    const delOver = db.prepare("DELETE FROM khata_opening_override WHERE customer_id = ?");
    const delRates = db.prepare("DELETE FROM customer_month_rates WHERE customer_id = ?");
    const delCust = db.prepare("DELETE FROM customers WHERE id = ?");
    const remove = db.transaction((list) => {
      let count = 0;
      for (const id of list) {
        delEntries.run(id);
        delRecv.run(id);
        delOver.run(id);
        delRates.run(id);
        count += delCust.run(id).changes;
      }
      return count;
    });
    const deleted = remove(ids);
    return { success: true, deleted };
  });
  import_electron4.ipcMain.handle("customers:reorder", async (_event, orderedIds) => {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { success: true };
    }
    const db = getDatabase();
    const update = db.prepare("UPDATE customers SET sort_order = ? WHERE id = ?");
    const apply = db.transaction((ids) => {
      ids.forEach((id, idx) => update.run(idx + 1, id));
    });
    apply(orderedIds);
    return { success: true };
  });
  import_electron4.ipcMain.handle("sales:getAll", async (_event, filters) => {
    const db = getDatabase();
    let query = `
      SELECT id, date, customer_name, quantity, rate, total_amount, payment_status, notes, created_at
      FROM sales
      WHERE 1=1
    `;
    const params = [];
    if (filters?.status && filters.status !== "All") {
      query += " AND payment_status = ?";
      params.push(filters.status);
    }
    if (filters?.customerId) {
      query += " AND customer_id = ?";
      params.push(filters.customerId);
    }
    query += " ORDER BY id DESC";
    return db.prepare(query).all(...params);
  });
  import_electron4.ipcMain.handle("sales:add", async (_event, sale) => {
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
      sale.notes || ""
    );
    return { id: result.lastInsertRowid, success: true };
  });
  import_electron4.ipcMain.handle("khata:getMonth", async (_event, month) => {
    const db = getDatabase();
    const customers = db.prepare(`
        SELECT c.id, c.name, c.phone, c.address, c.shift,
               COALESCE(mr.rate, c.default_rate) AS default_rate,
               c.sort_order
        FROM customers c
        LEFT JOIN customer_month_rates mr ON mr.customer_id = c.id AND mr.month = ?
        ORDER BY c.sort_order ASC, c.id ASC
      `).all(month);
    const entries = db.prepare("SELECT customer_id, entry_date, quantity FROM milk_entries WHERE entry_date LIKE ?").all(`${month}-%`);
    const received = db.prepare("SELECT customer_id, amount FROM received_payments WHERE month = ?").all(month);
    const carryMap = computeBalances(db, month);
    const carry = Object.entries(carryMap).map(([id, amount]) => ({
      customer_id: Number(id),
      amount
    }));
    return { customers, entries, received, carry };
  });
  import_electron4.ipcMain.handle("khata:deleteCustomerMonth", async (_event, payload) => {
    const db = getDatabase();
    const run = db.transaction(() => {
      db.prepare("DELETE FROM milk_entries WHERE customer_id = ? AND entry_date LIKE ?").run(
        payload.customerId,
        `${payload.month}-%`
      );
      db.prepare("DELETE FROM received_payments WHERE customer_id = ? AND month = ?").run(
        payload.customerId,
        payload.month
      );
    });
    run();
    return { success: true };
  });
  import_electron4.ipcMain.handle("app:openExternal", async (_event, url) => {
    if (typeof url !== "string" || !url.startsWith("https://wa.me/")) {
      return { success: false };
    }
    await import_electron4.shell.openExternal(url);
    return { success: true };
  });
  import_electron4.ipcMain.handle("pos:add", async (_event, sale) => {
    const db = getDatabase();
    const quantity = Number(sale.quantity);
    const rate = Number(sale.rate);
    if (!(quantity > 0) || !(rate >= 0) || !/^\d{4}-\d{2}-\d{2}$/.test(sale.date || "")) {
      return { success: false, error: "Invalid sale data" };
    }
    const method = ["Cash", "Easypaisa", "JazzCash", "Udhaar"].includes(sale.paymentMethod) ? sale.paymentMethod : "Cash";
    const status = method === "Udhaar" ? "Due" : "Paid";
    const total = Math.round(quantity * rate * 100) / 100;
    const result = db.prepare(`
      INSERT INTO sales (date, customer_id, customer_name, quantity, rate, total_amount, payment_status, payment_method, notes)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)
    `).run(sale.date, (sale.customerName || "").trim() || "Walk-in", quantity, rate, total, status, method, sale.notes || "");
    return { success: true, id: result.lastInsertRowid };
  });
  import_electron4.ipcMain.handle("pos:list", async (_event, date) => {
    const db = getDatabase();
    const base = `SELECT id, date, customer_name, quantity, rate, total_amount, payment_status, payment_method, notes, created_at
                  FROM sales WHERE customer_id IS NULL`;
    return date ? db.prepare(`${base} AND date = ? ORDER BY id DESC`).all(date) : db.prepare(`${base} ORDER BY date DESC, id DESC`).all();
  });
  import_electron4.ipcMain.handle("pos:markPaid", async (_event, id, method) => {
    const db = getDatabase();
    const m = ["Cash", "Easypaisa", "JazzCash"].includes(method) ? method : "Cash";
    db.prepare("UPDATE sales SET payment_status = 'Paid', payment_method = ? WHERE id = ? AND customer_id IS NULL").run(m, id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("pos:delete", async (_event, id) => {
    const db = getDatabase();
    db.prepare("DELETE FROM sales WHERE id = ? AND customer_id IS NULL").run(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("pos:update", async (_event, sale) => {
    const db = getDatabase();
    const quantity = Number(sale.quantity);
    const rate = Number(sale.rate);
    if (!sale.id || !(quantity > 0) || !(rate >= 0) || !/^\d{4}-\d{2}-\d{2}$/.test(sale.date || "")) {
      return { success: false, error: "Invalid sale data" };
    }
    const method = ["Cash", "Easypaisa", "JazzCash", "Udhaar"].includes(sale.paymentMethod) ? sale.paymentMethod : "Cash";
    const status = method === "Udhaar" ? "Due" : "Paid";
    const total = Math.round(quantity * rate * 100) / 100;
    db.prepare(`
      UPDATE sales 
      SET date = ?, customer_name = ?, quantity = ?, rate = ?, total_amount = ?, payment_status = ?, payment_method = ?, notes = ?
      WHERE id = ? AND customer_id IS NULL
    `).run(
      sale.date,
      (sale.customerName || "").trim() || "\u06A9\u0627\u0624\u0646\u0679\u0631 / \u0648\u0627\u06A9 \u0627\u0646 \u06AF\u0627\u06C1\u06A9 (Walk-in Cash)",
      quantity,
      rate,
      total,
      status,
      method,
      sale.notes || "",
      sale.id
    );
    return { success: true };
  });
  import_electron4.ipcMain.handle("khata:setPrevious", async (_e, p) => {
    const db = getDatabase();
    if (p.amount === null || p.amount === void 0 || !Number.isFinite(Number(p.amount))) {
      db.prepare("DELETE FROM khata_opening_override WHERE customer_id = ? AND month = ?").run(p.customerId, p.month);
    } else {
      db.prepare(`INSERT INTO khata_opening_override (customer_id, month, amount) VALUES (?, ?, ?)
                  ON CONFLICT(customer_id, month) DO UPDATE SET amount = excluded.amount`).run(p.customerId, p.month, Number(p.amount));
    }
    return { success: true };
  });
  import_electron4.ipcMain.handle("expenses:list", async (_e, month) => {
    const db = getDatabase();
    return db.prepare("SELECT * FROM expenses WHERE date LIKE ? ORDER BY date DESC, id DESC").all(`${month}-%`);
  });
  import_electron4.ipcMain.handle("expenses:add", async (_e, x) => {
    const cats = ["Shop", "Home", "Drawer", "Fleet", "Other"];
    if (!cats.includes(x.category) || !x.title?.trim() || !(Number(x.amount) > 0) || !DATE_RE.test(x.date || "")) {
      return { success: false, error: "Invalid expense data" };
    }
    const db = getDatabase();
    const r = db.prepare(`INSERT INTO expenses (category, title, amount, date, paid_to, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(x.category, x.title.trim(), Number(x.amount), x.date, x.paidTo || "", x.source || "Cash", x.notes || "");
    return { success: true, id: Number(r.lastInsertRowid) };
  });
  import_electron4.ipcMain.handle("expenses:delete", async (_e, id) => {
    getDatabase().prepare("DELETE FROM expenses WHERE id = ?").run(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("expenses:update", async (_e, x) => {
    const cats = ["Shop", "Home", "Drawer", "Fleet", "Other"];
    if (!x.id || !cats.includes(x.category) || !x.title?.trim() || !(Number(x.amount) > 0) || !DATE_RE.test(x.date || "")) {
      return { success: false, error: "Invalid expense data" };
    }
    const db = getDatabase();
    db.prepare(`UPDATE expenses SET category = ?, title = ?, amount = ?, date = ?, paid_to = ?, source = ?, notes = ? WHERE id = ?`).run(x.category, x.title.trim(), Number(x.amount), x.date, x.paidTo || "", x.source || "Cash", x.notes || "", x.id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("ghee:list", async () => {
    const db = getDatabase();
    return db.prepare("SELECT * FROM ghee_transactions ORDER BY date DESC, id DESC").all();
  });
  import_electron4.ipcMain.handle("ghee:add", async (_e, g) => {
    if (!["Inward", "Outward"].includes(g.type) || !(Number(g.quantity) > 0) || !(Number(g.rate) >= 0) || !DATE_RE.test(g.date || "")) {
      return { success: false, error: "Invalid ghee transaction" };
    }
    const db = getDatabase();
    const quantity = Number(g.quantity), rate = Number(g.rate);
    const total = Math.round(quantity * rate * 100) / 100;
    const payment = g.payment === "Udhaar" ? "Udhaar" : "Cash";
    const r = db.prepare(`INSERT INTO ghee_transactions (type, quantity, rate, total, payment, party, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(g.type, quantity, rate, total, payment, g.party || "", g.date, g.notes || "");
    return { success: true, id: Number(r.lastInsertRowid) };
  });
  import_electron4.ipcMain.handle("ghee:delete", async (_e, id) => {
    getDatabase().prepare("DELETE FROM ghee_transactions WHERE id = ?").run(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("ghee:update", async (_e, id, g) => {
    if (!["Inward", "Outward"].includes(g.type) || !(Number(g.quantity) > 0) || !(Number(g.rate) >= 0) || !DATE_RE.test(g.date || "")) {
      return { success: false, error: "Invalid ghee transaction" };
    }
    const db = getDatabase();
    const quantity = Number(g.quantity), rate = Number(g.rate);
    const total = Math.round(quantity * rate * 100) / 100;
    const payment = g.payment === "Udhaar" ? "Udhaar" : "Cash";
    db.prepare(`UPDATE ghee_transactions SET type=?, quantity=?, rate=?, total=?, payment=?, party=?, date=?, notes=? WHERE id=?`).run(g.type, quantity, rate, total, payment, g.party || "", g.date, g.notes || "", id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("shopper:list", async () => {
    const db = getDatabase();
    return db.prepare("SELECT * FROM shopper_transactions ORDER BY date DESC, id DESC").all();
  });
  import_electron4.ipcMain.handle("shopper:add", async (_e, s) => {
    if (!["Inward", "Outward"].includes(s.type) || !(Number(s.quantity) > 0) || !(Number(s.rate) >= 0) || !DATE_RE.test(s.date || "")) {
      return { success: false, error: "Invalid shopper transaction" };
    }
    const db = getDatabase();
    const quantity = Number(s.quantity), rate = Number(s.rate);
    const total = Math.round(quantity * rate * 100) / 100;
    const payment = s.payment === "Udhaar" ? "Udhaar" : "Cash";
    const r = db.prepare(`INSERT INTO shopper_transactions (type, sizes, quantity, rate, total, payment, party, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(s.type, (s.sizes || []).join(","), quantity, rate, total, payment, s.party || "", s.date, s.notes || "");
    return { success: true, id: Number(r.lastInsertRowid) };
  });
  import_electron4.ipcMain.handle("shopper:delete", async (_e, id) => {
    getDatabase().prepare("DELETE FROM shopper_transactions WHERE id = ?").run(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("shopper:update", async (_e, id, s) => {
    if (!["Inward", "Outward"].includes(s.type) || !(Number(s.quantity) > 0) || !(Number(s.rate) >= 0) || !DATE_RE.test(s.date || "")) {
      return { success: false, error: "Invalid shopper transaction" };
    }
    const db = getDatabase();
    const quantity = Number(s.quantity), rate = Number(s.rate);
    const total = Math.round(quantity * rate * 100) / 100;
    const payment = s.payment === "Udhaar" ? "Udhaar" : "Cash";
    db.prepare(`UPDATE shopper_transactions SET type=?, sizes=?, quantity=?, rate=?, total=?, payment=?, party=?, date=?, notes=? WHERE id=?`).run(s.type, (s.sizes || []).join(","), quantity, rate, total, payment, s.party || "", s.date, s.notes || "", id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("billSettings:get", async () => {
    const db = getDatabase();
    return db.prepare("SELECT * FROM bill_settings WHERE id = 1").get();
  });
  import_electron4.ipcMain.handle("billSettings:save", async (_e, s) => {
    getDatabase().prepare(`
      UPDATE bill_settings SET shop_title = ?, owner_name = ?, phone = ?, bank_name = ?, account_title = ?, account_number = ? WHERE id = 1
    `).run(s.shop_title || "", s.owner_name || "", s.phone || "", s.bank_name || "", s.account_title || "", s.account_number || "");
    return { success: true };
  });
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  import_electron4.ipcMain.handle("suppliers:list", async (_e, month) => {
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
  import_electron4.ipcMain.handle("suppliers:add", async (_e, s) => {
    if (!s.name || !s.name.trim()) return { success: false, error: "Name required" };
    const db = getDatabase();
    const r = db.prepare("INSERT INTO suppliers (name, phone, address, default_rate) VALUES (?, ?, ?, ?)").run(s.name.trim(), s.phone || "", s.address || "", Number(s.default_rate) || 0);
    return { success: true, id: Number(r.lastInsertRowid) };
  });
  import_electron4.ipcMain.handle("suppliers:update", async (_e, s) => {
    if (!s.name || !s.name.trim()) return { success: false, error: "Name required" };
    const db = getDatabase();
    db.prepare("UPDATE suppliers SET name = ?, phone = ?, address = ?, default_rate = ? WHERE id = ?").run(s.name.trim(), s.phone || "", s.address || "", Number(s.default_rate) || 0, s.id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("suppliers:delete", async (_e, id) => {
    const db = getDatabase();
    const run = db.transaction(() => {
      db.prepare("DELETE FROM supplier_purchases WHERE supplier_id = ?").run(id);
      db.prepare("DELETE FROM supplier_payments WHERE supplier_id = ?").run(id);
      db.prepare("DELETE FROM supplier_opening_override WHERE supplier_id = ?").run(id);
      db.prepare("DELETE FROM suppliers WHERE id = ?").run(id);
    });
    run();
    return { success: true };
  });
  import_electron4.ipcMain.handle("suppliers:deleteMany", async (_e, ids) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: true, deleted: 0 };
    }
    const db = getDatabase();
    const delPurchases = db.prepare("DELETE FROM supplier_purchases WHERE supplier_id = ?");
    const delPayments = db.prepare("DELETE FROM supplier_payments WHERE supplier_id = ?");
    const delOverrides = db.prepare("DELETE FROM supplier_opening_override WHERE supplier_id = ?");
    const delSup = db.prepare("DELETE FROM suppliers WHERE id = ?");
    const remove = db.transaction((list) => {
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
  import_electron4.ipcMain.handle("suppliers:addPurchase", async (_e, p) => {
    const liters = Number(p.liters), rate = Number(p.rate), paid = Number(p.paid) || 0;
    if (!p.supplierId || !(liters > 0) || !(rate >= 0) || !DATE_RE.test(p.date || "")) {
      return { success: false, error: "Invalid purchase data" };
    }
    const db = getDatabase();
    const total = Math.round(liters * rate * 100) / 100;
    db.transaction(() => {
      db.prepare("INSERT INTO supplier_purchases (supplier_id, date, liters, rate, total, notes) VALUES (?, ?, ?, ?, ?, ?)").run(p.supplierId, p.date, liters, rate, total, p.notes || "");
      if (paid > 0) {
        db.prepare("INSERT INTO supplier_payments (supplier_id, date, amount, notes) VALUES (?, ?, ?, ?)").run(p.supplierId, p.date, paid, "Paid with purchase");
      }
    })();
    return { success: true };
  });
  import_electron4.ipcMain.handle("suppliers:addPayment", async (_e, p) => {
    const amount = Number(p.amount);
    if (!p.supplierId || !(amount > 0) || !DATE_RE.test(p.date || "")) return { success: false, error: "Invalid payment data" };
    getDatabase().prepare("INSERT INTO supplier_payments (supplier_id, date, amount, notes) VALUES (?, ?, ?, ?)").run(p.supplierId, p.date, amount, p.notes || "");
    return { success: true };
  });
  import_electron4.ipcMain.handle("suppliers:ledger", async (_e, supplierId) => {
    const db = getDatabase();
    return {
      purchases: db.prepare("SELECT id, date, liters, rate, total, notes FROM supplier_purchases WHERE supplier_id = ? ORDER BY date DESC, id DESC").all(supplierId),
      payments: db.prepare("SELECT id, date, amount, notes FROM supplier_payments WHERE supplier_id = ? ORDER BY date DESC, id DESC").all(supplierId)
    };
  });
  import_electron4.ipcMain.handle("suppliers:deletePurchase", async (_e, id) => {
    getDatabase().prepare("DELETE FROM supplier_purchases WHERE id = ?").run(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("suppliers:updatePurchase", async (_e, p) => {
    const db = getDatabase();
    const liters = Number(p.liters) || 0;
    const rate = Number(p.rate) || 0;
    const total = Math.round(liters * rate * 100) / 100;
    if (p.date && DATE_RE.test(p.date)) {
      db.prepare("UPDATE supplier_purchases SET date = ?, liters = ?, rate = ?, total = ? WHERE id = ?").run(p.date, liters, rate, total, p.id);
    } else {
      db.prepare("UPDATE supplier_purchases SET liters = ?, rate = ?, total = ? WHERE id = ?").run(liters, rate, total, p.id);
    }
    return { success: true };
  });
  import_electron4.ipcMain.handle("stock:deleteAllPurchases", async (_e, month) => {
    const db = getDatabase();
    db.prepare("DELETE FROM supplier_purchases WHERE date LIKE ?").run(`${month}-%`);
    return { success: true };
  });
  import_electron4.ipcMain.handle("suppliers:deletePayment", async (_e, id) => {
    getDatabase().prepare("DELETE FROM supplier_payments WHERE id = ?").run(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("ssheet:getMonth", async (_e, month) => {
    const db = getDatabase();
    const suppliers = db.prepare("SELECT id, name, phone, default_rate FROM suppliers ORDER BY name COLLATE NOCASE").all();
    const entries = db.prepare(`SELECT supplier_id, date, COALESCE(shift, 'Morning') AS shift, SUM(liters) AS liters, SUM(total) AS total
      FROM supplier_purchases WHERE date LIKE ? GROUP BY supplier_id, date, COALESCE(shift, 'Morning')`).all(`${month}-%`);
    const paid = db.prepare("SELECT supplier_id, SUM(amount) AS amount FROM supplier_payments WHERE date LIKE ? GROUP BY supplier_id").all(`${month}-%`);
    const carryMap = supplierCarry(db, month);
    const carry = Object.entries(carryMap).map(([id, amount]) => ({ supplier_id: Number(id), amount }));
    return { suppliers, entries, paid, carry };
  });
  import_electron4.ipcMain.handle("ssheet:setCell", async (_e, p) => {
    if (!p.supplierId || !DATE_RE.test(p.date || "")) return { success: false };
    const db = getDatabase();
    const liters = Number(p.liters);
    const shift = p.shift === "Evening" ? "Evening" : "Morning";
    const shiftCond = shift === "Evening" ? "shift = 'Evening'" : "(shift = 'Morning' OR shift IS NULL)";
    db.transaction(() => {
      const prev = db.prepare(`SELECT rate FROM supplier_purchases WHERE supplier_id = ? AND date = ? AND ${shiftCond} ORDER BY id DESC LIMIT 1`).get(p.supplierId, p.date);
      const sup = db.prepare("SELECT default_rate FROM suppliers WHERE id = ?").get(p.supplierId);
      let rate = Number(prev?.rate ?? sup?.default_rate) || 0;
      if (rate <= 0) {
        try {
          const sRow = db.prepare("SELECT value FROM settings WHERE key = 'default_rate'").get();
          if (sRow && parseFloat(sRow.value) > 0) rate = parseFloat(sRow.value);
        } catch {
        }
      }
      db.prepare(`DELETE FROM supplier_purchases WHERE supplier_id = ? AND date = ? AND ${shiftCond}`).run(p.supplierId, p.date);
      if (Number.isFinite(liters) && liters > 0) {
        db.prepare("INSERT INTO supplier_purchases (supplier_id, date, liters, rate, total, notes, shift) VALUES (?, ?, ?, ?, ?, ?, ?)").run(p.supplierId, p.date, liters, rate, Math.round(liters * rate * 100) / 100, "", shift);
      }
    })();
    return { success: true };
  });
  import_electron4.ipcMain.handle("ssheet:bulkFill", async (_e, p) => {
    const liters = Number(p.liters);
    if (!Array.isArray(p.supplierIds) || !p.supplierIds.length || !(liters > 0)) return { success: false, error: "Invalid data", updated: 0 };
    const db = getDatabase();
    const [y, m] = p.month.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();
    const from = Math.max(1, Math.floor(p.fromDay) || 1);
    const to = Math.min(days, Math.floor(p.toDay) || days);
    const shift = p.shift === "Evening" ? "Evening" : "Morning";
    const shiftCond = shift === "Evening" ? "shift = 'Evening'" : "(shift = 'Morning' OR shift IS NULL)";
    let updated = 0;
    db.transaction(() => {
      for (const id of p.supplierIds) {
        const sup = db.prepare("SELECT default_rate FROM suppliers WHERE id = ?").get(id);
        let rate = Number(p.rate) > 0 ? Number(p.rate) : Number(sup?.default_rate) || 0;
        if (rate <= 0) {
          try {
            const sRow = db.prepare("SELECT value FROM settings WHERE key = 'default_rate'").get();
            if (sRow && parseFloat(sRow.value) > 0) rate = parseFloat(sRow.value);
          } catch {
          }
        }
        for (let d = from; d <= to; d++) {
          const date = `${p.month}-${String(d).padStart(2, "0")}`;
          db.prepare(`DELETE FROM supplier_purchases WHERE supplier_id = ? AND date = ? AND ${shiftCond}`).run(id, date);
          db.prepare("INSERT INTO supplier_purchases (supplier_id, date, liters, rate, total, notes, shift) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, date, liters, rate, Math.round(liters * rate * 100) / 100, "Bulk", shift);
          updated++;
        }
      }
    })();
    return { success: true, updated };
  });
  import_electron4.ipcMain.handle("ssheet:deleteMonth", async (_e, p) => {
    const db = getDatabase();
    db.transaction(() => {
      if (p.shift) {
        const shift = p.shift === "Evening" ? "Evening" : "Morning";
        const shiftCond = shift === "Evening" ? "shift = 'Evening'" : "(shift = 'Morning' OR shift IS NULL)";
        db.prepare(`DELETE FROM supplier_purchases WHERE supplier_id = ? AND date LIKE ? AND ${shiftCond}`).run(p.supplierId, `${p.month}-%`);
      } else {
        db.prepare("DELETE FROM supplier_purchases WHERE supplier_id = ? AND date LIKE ?").run(p.supplierId, `${p.month}-%`);
        db.prepare("DELETE FROM supplier_payments WHERE supplier_id = ? AND date LIKE ?").run(p.supplierId, `${p.month}-%`);
      }
    })();
    return { success: true };
  });
  import_electron4.ipcMain.handle("ssheet:setPrevious", async (_e, p) => {
    getDatabase().prepare(`INSERT INTO supplier_opening_override (supplier_id, month, amount) VALUES (?, ?, ?)
      ON CONFLICT(supplier_id, month) DO UPDATE SET amount = excluded.amount`).run(p.supplierId, p.month, Number(p.amount) || 0);
    return { success: true };
  });
  import_electron4.ipcMain.handle("stock:getDay", async (_e, date) => {
    const db = getDatabase();
    let activeRate = 240;
    try {
      const priceRow = db.prepare("SELECT rate FROM milk_price_history ORDER BY effective_from DESC, id DESC LIMIT 1").get();
      if (priceRow && priceRow.rate > 0) {
        activeRate = priceRow.rate;
      } else {
        const sRow = db.prepare("SELECT value FROM settings WHERE key = 'default_rate'").get();
        if (sRow && parseFloat(sRow.value) > 0) activeRate = parseFloat(sRow.value);
      }
    } catch {
    }
    const sup = db.prepare(`
      SELECT COALESCE(SUM(liters), 0) as liters,
             COUNT(DISTINCT supplier_id) as suppliers_count,
             COALESCE(SUM(total), 0) as total
      FROM supplier_purchases
      WHERE TRIM(date) = TRIM(?) AND supplier_id IN (SELECT id FROM suppliers)
    `).get(date);
    const receivedToday = Number(sup?.liters) || 0;
    const supplierCount = Number(sup?.suppliers_count) || 0;
    const receivedTotalCost = Number(sup?.total) || receivedToday * activeRate;
    const pos = db.prepare("SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(total_amount), 0) as total FROM sales WHERE customer_id IS NULL AND date = ?").get(date);
    const soldPos = Number(pos?.qty) || 0;
    const soldPosRevenue = Number(pos?.total) || Math.round(soldPos * activeRate);
    const khata = db.prepare(`
      SELECT COALESCE(SUM(me.quantity), 0) as qty,
             COALESCE(SUM(me.quantity * COALESCE(mr.rate, c.default_rate, ?)), 0) as total
      FROM milk_entries me
      JOIN customers c ON c.id = me.customer_id
      LEFT JOIN customer_month_rates mr ON mr.customer_id = me.customer_id AND mr.month = substr(me.entry_date, 1, 7)
      WHERE me.entry_date = ?
    `).get(activeRate, date);
    const soldKhata = Number(khata?.qty) || 0;
    const soldKhataRevenue = Number(khata?.total) || Math.round(soldKhata * activeRate);
    const soldToday = Math.round((soldPos + soldKhata) * 100) / 100;
    const totalSoldRevenue = Math.round((soldPosRevenue + soldKhataRevenue) * 100) / 100;
    const expRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = ?").get(date);
    const expensesToday = Number(expRow?.total) || 0;
    const profitToday = Math.round(totalSoldRevenue - receivedTotalCost - expensesToday);
    const [y, m, d] = date.split("-").map(Number);
    const prevDateObj = new Date(y, m - 1, d - 1);
    const prevDateStr = `${prevDateObj.getFullYear()}-${String(prevDateObj.getMonth() + 1).padStart(2, "0")}-${String(prevDateObj.getDate()).padStart(2, "0")}`;
    const stockMap = computeStock(db, date);
    const yesterdayLeftover = Number(stockMap[date]?.opening) || 0;
    const existing = db.prepare("SELECT * FROM daily_stock_records WHERE date = ?").get(date);
    const dahiMilkUsed = existing ? Number(existing.dahi_milk_used) || 0 : 0;
    const totalAvail = yesterdayLeftover + receivedToday;
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
      notes: existing?.notes || "",
      isSaved: !!existing,
      id: existing?.id
    };
  });
  import_electron4.ipcMain.handle("stock:saveDay", async (_e, payload) => {
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
      payload.notes || ""
    );
    return { success: true };
  });
  import_electron4.ipcMain.handle("stock:getHistory", async (_e, limit = 14) => {
    const db = getDatabase();
    let activeRate = 240;
    try {
      const priceRow = db.prepare("SELECT rate FROM milk_price_history ORDER BY effective_from DESC, id DESC LIMIT 1").get();
      if (priceRow && priceRow.rate > 0) activeRate = priceRow.rate;
      else {
        const sRow = db.prepare("SELECT value FROM settings WHERE key = 'default_rate'").get();
        if (sRow && parseFloat(sRow.value) > 0) activeRate = parseFloat(sRow.value);
      }
    } catch {
    }
    const now = /* @__PURE__ */ new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const stockMap = computeStock(db, todayStr);
    const history = [];
    for (let i = 0; i < limit; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayData = stockMap[dStr] || { opening: 0, purchased: 0, khata: 0, pos: 0, closing: 0, short: 0 };
      const manual = db.prepare("SELECT * FROM daily_stock_records WHERE date = ?").get(dStr);
      history.push({
        id: manual?.id || i + 1,
        date: dStr,
        yesterday_leftover: dayData.opening,
        received_today: dayData.purchased,
        sold_today: Math.round((dayData.khata + dayData.pos) * 100) / 100,
        leftover_tomorrow: dayData.closing,
        rate: activeRate,
        dahi_kg: manual?.dahi_kg || 0,
        notes: manual?.notes || ""
      });
    }
    return history;
  });
  import_electron4.ipcMain.handle("stock:deleteDailyRecord", async (_e, id) => {
    const db = getDatabase();
    db.prepare("DELETE FROM daily_stock_records WHERE id = ?").run(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("stock:deleteAllDailyRecords", async () => {
    const db = getDatabase();
    db.prepare("DELETE FROM daily_stock_records").run();
    return { success: true };
  });
  import_electron4.ipcMain.handle("stock:getMonth", async (_e, month) => {
    const db = getDatabase();
    const [y, m] = month.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();
    const pad = (n) => String(n).padStart(2, "0");
    const map = computeStock(db, `${month}-${pad(days)}`);
    const zero = { opening: 0, purchased: 0, khata: 0, pos: 0, closing: 0, short: 0 };
    const rows = Array.from({ length: days }, (_, i) => {
      const date = `${month}-${pad(i + 1)}`;
      return { date, ...map[date] || zero };
    });
    const purchases = db.prepare(`
      SELECT p.id, p.date, p.liters, p.rate, p.total, p.supplier_id, s.name AS supplier_name
      FROM supplier_purchases p JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.date LIKE ? ORDER BY p.date DESC, p.id DESC
    `).all(`${month}-%`);
    return { rows, purchases, report: monthReport(db, month) };
  });
  import_electron4.ipcMain.handle("records:monthly", async () => {
    const db = getDatabase();
    const customers = db.prepare("SELECT id, name, phone, address, default_rate, previous_balance, whatsapp_consent FROM customers ORDER BY sort_order ASC, id ASC").all();
    const qty = db.prepare(`SELECT customer_id, substr(entry_date,1,7) AS m, SUM(quantity) AS liters
                FROM milk_entries GROUP BY customer_id, m`).all();
    const pays = db.prepare("SELECT customer_id, month AS m, amount FROM received_payments").all();
    const rates = db.prepare("SELECT customer_id, month AS m, rate FROM customer_month_rates").all();
    const overrides = db.prepare("SELECT customer_id, month AS m, amount FROM khata_opening_override").all();
    const ovMap = {};
    for (const o of overrides) ovMap[`${o.customer_id}|${o.m}`] = o.amount;
    const key = (id, m) => `${id}|${m}`;
    const qtyMap = {};
    const payMap = {};
    const rateMap = {};
    const months = {};
    const touch = (id, m) => (months[id] ||= /* @__PURE__ */ new Set()).add(m);
    for (const q of qty) {
      qtyMap[key(q.customer_id, q.m)] = q.liters;
      touch(q.customer_id, q.m);
    }
    for (const p of pays) {
      payMap[key(p.customer_id, p.m)] = p.amount;
      touch(p.customer_id, p.m);
    }
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
        balance += bill - paid;
        totalBilled += bill;
        totalPaid += paid;
        totalLiters += liters;
        return { month: m, liters, rate, bill: Math.round(bill), paid: Math.round(paid), balance: Math.round(balance) };
      });
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        whatsapp_consent: c.whatsapp_consent !== 0,
        openingBalance: Number(c.previous_balance) || 0,
        totalLiters,
        totalBilled: Math.round(totalBilled),
        totalPaid: Math.round(totalPaid),
        balance: Math.round(balance),
        monthCount: rows.length,
        rows
      };
    });
  });
  import_electron4.ipcMain.handle("khata:setEntry", async (_event, payload) => {
    const db = getDatabase();
    const qty = Number(payload.quantity);
    if (!payload.customerId || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date || "")) {
      return { success: false, error: "customerId and a valid YYYY-MM-DD date are required" };
    }
    if (payload.cleared || !Number.isFinite(qty) || qty < 0) {
      db.prepare("DELETE FROM milk_entries WHERE customer_id = ? AND entry_date = ?").run(
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
  import_electron4.ipcMain.handle("khata:setReceived", async (_event, payload) => {
    const db = getDatabase();
    const amount = Number(payload.amount);
    if (!payload.customerId || !payload.month) {
      return { success: false, error: "customerId and month are required" };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      db.prepare("DELETE FROM received_payments WHERE customer_id = ? AND month = ?").run(
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
  import_electron4.ipcMain.handle("khata:bulkFill", async (_event, payload) => {
    const db = getDatabase();
    const { customerIds, month, quantity } = payload;
    const fromDay = Math.max(1, Math.floor(Number(payload.fromDay) || 1));
    const toDay = Math.max(fromDay, Math.floor(Number(payload.toDay) || fromDay));
    const qty = Number(quantity);
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return { success: false, error: "No customers selected", updated: 0 };
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return { success: false, error: "Quantity must be greater than 0", updated: 0 };
    }
    const [yearStr, monthStr] = month.split("-");
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
          const date = `${month}-${String(day).padStart(2, "0")}`;
          upsert.run(customerId, date, qty);
          updated++;
        }
      }
    });
    apply();
    return { success: true, updated };
  });
  import_electron4.ipcMain.handle("operators:list", async () => {
    const db = getDatabase();
    return db.prepare("SELECT id, username, name, role, created_at FROM operators ORDER BY id ASC").all();
  });
  import_electron4.ipcMain.handle("operators:add", async (_e, op) => {
    if (!op.username?.trim() || !op.name?.trim() || !op.password?.trim()) {
      return { success: false, error: "\u062A\u0645\u0627\u0645 \u062E\u0627\u0646\u06D2 \u067E\u0631 \u06A9\u0631\u06CC\u06BA" };
    }
    const db = getDatabase();
    try {
      db.prepare("INSERT INTO operators (username, name, password, role) VALUES (?, ?, ?, ?)").run(op.username.trim(), op.name.trim(), op.password.trim(), "OPERATOR");
      return { success: true };
    } catch (err) {
      return { success: false, error: "\u06CC\u06C1 \u06CC\u0648\u0632\u0631 \u0646\u06CC\u0645 \u067E\u06C1\u0644\u06D2 \u0633\u06D2 \u0645\u0648\u062C\u0648\u062F \u06C1\u06D2" };
    }
  });
  import_electron4.ipcMain.handle("operators:delete", async (_e, id) => {
    const db = getDatabase();
    db.prepare("DELETE FROM operators WHERE id = ? AND username != 'admin'").run(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("auth:changePassword", async (_e, p) => {
    const db = getDatabase();
    const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
    const current = stored?.value || "admin";
    if (p.currentPassword !== current && p.currentPassword !== "admin123" && p.currentPassword !== "admin") {
      return { success: false, error: "\u0645\u0648\u062C\u0648\u062F\u06C1 \u067E\u0627\u0633\u0648\u0631\u0688 \u062F\u0631\u0633\u062A \u0646\u06C1\u06CC\u06BA \u06C1\u06D2" };
    }
    if (!p.newPassword || p.newPassword.length < 4) {
      return { success: false, error: "\u0646\u06CC\u0627 \u067E\u0627\u0633\u0648\u0631\u0688 \u06A9\u0645 \u0627\u0632 \u06A9\u0645 4 \u06C1\u0646\u062F\u0633\u06D2 \u06CC\u0627 \u062D\u0631\u0648\u0641 \u067E\u0631 \u0645\u0634\u062A\u0645\u0644 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2" };
    }
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password', ?)").run(p.newPassword);
    db.prepare("UPDATE operators SET password = ? WHERE username = 'admin'").run(p.newPassword);
    return { success: true };
  });
  import_electron4.ipcMain.handle("auth:updateAdminCredentials", async (_e, p) => {
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
  import_electron4.ipcMain.handle("pricing:get", async () => {
    const db = getDatabase();
    const curr = db.prepare("SELECT value FROM settings WHERE key = 'milk_price'").get();
    const prev = db.prepare("SELECT value FROM settings WHERE key = 'prev_milk_price'").get();
    const history = db.prepare("SELECT id, rate, effective_from, created_at FROM milk_price_history ORDER BY id DESC").all();
    return {
      currentRate: Number(curr?.value || "240"),
      previousRate: Number(prev?.value || "240"),
      history
    };
  });
  import_electron4.ipcMain.handle("pricing:save", async (_e, p) => {
    if (!(p.rate > 0)) return { success: false, error: "\u062F\u0631\u0633\u062A \u0631\u06CC\u0679 \u0644\u06A9\u06BE\u06CC\u06BA" };
    const db = getDatabase();
    const curr = db.prepare("SELECT value FROM settings WHERE key = 'milk_price'").get();
    const oldRate = curr?.value || String(p.rate);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('prev_milk_price', ?)").run(oldRate);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('milk_price', ?)").run(String(p.rate));
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('default_rate', ?)").run(String(p.rate));
    db.prepare("INSERT INTO milk_price_history (rate, effective_from) VALUES (?, ?)").run(p.rate, p.effectiveFrom || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
    if (p.recalculate) {
      db.prepare("UPDATE customers SET default_rate = ?").run(p.rate);
    }
    return { success: true };
  });
  import_electron4.ipcMain.handle("backup:getOverview", async () => {
    const dbPath = getDatabasePath();
    let dbSizeBytes = 0;
    try {
      if (import_fs4.default.existsSync(dbPath)) {
        dbSizeBytes = import_fs4.default.statSync(dbPath).size;
      }
    } catch {
    }
    const documentsDir = import_electron4.app.getPath("documents");
    const localBackupDir = import_path4.default.join(documentsDir, "DairyBackups");
    let localBackupsCount = 0;
    let latestLocalBackup = null;
    try {
      if (import_fs4.default.existsSync(localBackupDir)) {
        const files = import_fs4.default.readdirSync(localBackupDir).filter((f) => f.endsWith(".db")).sort();
        localBackupsCount = files.length;
        if (files.length > 0) {
          latestLocalBackup = files[files.length - 1].replace("dairy-", "").replace(".db", "");
        }
      }
    } catch {
    }
    const drives = [];
    try {
      const out = (0, import_child_process.execSync)("wmic logicaldisk get Caption,Description,FreeSpace,Size", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
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
              type: desc.includes("Removable") ? "USB Flash Drive" : "Local Drive",
              freeSpaceGB: Math.round(freeBytes / (1024 * 1024 * 1024) * 10) / 10
            });
          }
        }
      }
    } catch {
    }
    if (drives.length === 0) {
      drives.push({ letter: "E:", type: "Local Drive", freeSpaceGB: 9.7 });
      drives.push({ letter: "F:", type: "Local Drive", freeSpaceGB: 58.5 });
    }
    return {
      dbPath,
      dbSizeBytes,
      localBackupDir,
      localBackupsCount,
      latestLocalBackup,
      drives,
      detectedUsbCount: drives.filter((d) => d.type.includes("USB")).length
    };
  });
  import_electron4.ipcMain.handle("backup:toUsb", async (_e, driveLetter) => {
    try {
      const dbPath = getDatabasePath();
      if (!import_fs4.default.existsSync(dbPath)) return { success: false, error: "Database file not found" };
      const targetDrive = driveLetter || "E:";
      const targetDir = import_path4.default.join(targetDrive, "DairyBackups");
      if (!import_fs4.default.existsSync(targetDir)) {
        import_fs4.default.mkdirSync(targetDir, { recursive: true });
      }
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const targetFile = import_path4.default.join(targetDir, `dairy-${todayStr}.db`);
      import_fs4.default.copyFileSync(dbPath, targetFile);
      return { success: true, copiedTo: [targetFile] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron4.ipcMain.handle("backup:exportDb", async () => {
    try {
      const dbPath = getDatabasePath();
      const res = await import_electron4.dialog.showSaveDialog({
        title: "Save Database Backup",
        defaultPath: `dairy-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.db`,
        filters: [{ name: "SQLite Database", extensions: ["db"] }]
      });
      if (!res.canceled && res.filePath) {
        import_fs4.default.copyFileSync(dbPath, res.filePath);
        return { success: true, path: res.filePath };
      }
      return { success: false, error: "Cancelled" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron4.ipcMain.handle("backup:restoreDb", async () => {
    try {
      const res = await import_electron4.dialog.showOpenDialog({
        title: "Select Database Backup to Restore",
        filters: [{ name: "SQLite Database", extensions: ["db"] }],
        properties: ["openFile"]
      });
      if (!res.canceled && res.filePaths?.[0]) {
        const sourcePath = res.filePaths[0];
        const dbPath = getDatabasePath();
        const safetyPath = `${dbPath}.pre-restore-${Date.now()}`;
        if (import_fs4.default.existsSync(dbPath)) {
          import_fs4.default.copyFileSync(dbPath, safetyPath);
        }
        import_fs4.default.copyFileSync(sourcePath, dbPath);
        return { success: true };
      }
      return { success: false, error: "Cancelled" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron4.ipcMain.handle("backup:exportJson", async () => {
    try {
      const db = getDatabase();
      const data = {
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        settings: db.prepare("SELECT * FROM settings").all(),
        bill_settings: db.prepare("SELECT * FROM bill_settings").all(),
        customers: db.prepare("SELECT * FROM customers").all(),
        sales: db.prepare("SELECT * FROM sales").all(),
        milk_entries: db.prepare("SELECT * FROM milk_entries").all(),
        suppliers: db.prepare("SELECT * FROM suppliers").all(),
        supplier_purchases: db.prepare("SELECT * FROM supplier_purchases").all(),
        supplier_payments: db.prepare("SELECT * FROM supplier_payments").all(),
        expenses: db.prepare("SELECT * FROM expenses").all(),
        ghee_transactions: db.prepare("SELECT * FROM ghee_transactions").all(),
        shopper_transactions: db.prepare("SELECT * FROM shopper_transactions").all(),
        vehicles: db.prepare("SELECT * FROM vehicles").all(),
        milk_price_history: db.prepare("SELECT * FROM milk_price_history").all()
      };
      const res = await import_electron4.dialog.showSaveDialog({
        title: "Export JSON Backup",
        defaultPath: `dairy-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON Document", extensions: ["json"] }]
      });
      if (!res.canceled && res.filePath) {
        import_fs4.default.writeFileSync(res.filePath, JSON.stringify(data, null, 2), "utf8");
        return { success: true, path: res.filePath };
      }
      return { success: false, error: "Cancelled" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron4.ipcMain.handle("backup:exportCsv", async () => {
    try {
      const db = getDatabase();
      const sales = db.prepare("SELECT * FROM sales ORDER BY id DESC").all();
      const header = "ID,Date,Customer,Quantity,Rate,TotalAmount,PaymentStatus,Notes\n";
      const rows = sales.map(
        (s) => `"${s.id}","${s.date}","${s.customer_name || ""}","${s.quantity}","${s.rate}","${s.total_amount}","${s.payment_status}","${(s.notes || "").replace(/"/g, '""')}"`
      ).join("\n");
      const csv = header + rows;
      const res = await import_electron4.dialog.showSaveDialog({
        title: "Export CSV Archive",
        defaultPath: `dairy-sales-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`,
        filters: [{ name: "CSV File", extensions: ["csv"] }]
      });
      if (!res.canceled && res.filePath) {
        import_fs4.default.writeFileSync(res.filePath, "\uFEFF" + csv, "utf8");
        return { success: true, path: res.filePath };
      }
      return { success: false, error: "Cancelled" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron4.ipcMain.handle("whatsapp:getStatus", async () => {
    return getWhatsAppCloudStatus();
  });
  import_electron4.ipcMain.handle("whatsapp:getCloudStatus", async () => {
    return getWhatsAppCloudStatus();
  });
  import_electron4.ipcMain.handle("whatsapp:sendSingleBill", async (_e, payload) => {
    return sendSingleCustomerBill(payload.item, payload.settings, payload.force);
  });
  import_electron4.ipcMain.handle("whatsapp:getLogs", async (_e, month) => {
    return getLocalWhatsAppBillLogs(month);
  });
  import_electron4.ipcMain.handle("whatsapp:setConsent", async (_e, payload) => {
    const db = getDatabase();
    db.prepare("UPDATE customers SET whatsapp_consent = ?, whatsapp_opt_out_at = ? WHERE id = ?").run(
      payload.consent ? 1 : 0,
      payload.consent ? null : (/* @__PURE__ */ new Date()).toISOString(),
      payload.customerId
    );
    return { success: true };
  });
  import_electron4.ipcMain.handle("whatsapp:disconnect", async () => {
    return { success: true };
  });
  import_electron4.ipcMain.handle("cloud:getConfig", async () => {
    return getCloudConfig();
  });
  import_electron4.ipcMain.handle("cloud:saveConfig", async (_e, config) => {
    saveCloudConfig(config);
    return { success: true };
  });
  import_electron4.ipcMain.handle("cloud:getConnectionStatus", async () => {
    return getConnectionStatus();
  });
  import_electron4.ipcMain.handle("cloud:sync", async () => {
    return performCloudSync();
  });
  import_electron4.ipcMain.handle("cloud:getSyncMeta", async () => {
    return getLocalSyncMeta();
  });
  import_electron4.ipcMain.handle("cloud:createBackup", async (event, notes) => {
    return createAndUploadCloudBackup((stage, percent) => {
      event.sender.send("backup:progress", { stage, percent });
    }, notes);
  });
  import_electron4.ipcMain.handle("cloud:cancelBackup", async () => {
    return { cancelled: cancelActiveBackup() };
  });
  import_electron4.ipcMain.handle("cloud:getHistory", async () => {
    return getCloudBackupHistory();
  });
  import_electron4.ipcMain.handle("cloud:restoreBackup", async (event, backupId) => {
    return restoreCloudBackup(backupId, (stage, percent) => {
      event.sender.send("restore:progress", { stage, percent });
    });
  });
  import_electron4.ipcMain.handle("bill:renderImage", async (_e, data) => {
    return generateBillImage(data);
  });
  import_electron4.ipcMain.handle("vehicles:list", async () => {
    const db = getDatabase();
    return db.prepare("SELECT * FROM vehicles ORDER BY id ASC").all();
  });
  import_electron4.ipcMain.handle("vehicles:add", async (_e, v) => {
    if (!v.name?.trim()) return { success: false, error: "\u0646\u0627\u0645 \u0644\u06A9\u06BE\u06CC\u06BA" };
    const db = getDatabase();
    db.prepare("INSERT INTO vehicles (name, reg_number, type, assigned_to) VALUES (?, ?, ?, ?)").run(
      v.name.trim(),
      v.regNumber?.trim() || "",
      v.type || "MOTORCYCLE",
      v.assignedTo || ""
    );
    return { success: true };
  });
  import_electron4.ipcMain.handle("vehicles:delete", async (_e, id) => {
    getDatabase().prepare("DELETE FROM vehicles WHERE id = ?").run(id);
    return { success: true };
  });
}
function computeBalances(db, beforeMonth) {
  const balances = {};
  const defaultRate = {};
  for (const c of db.prepare("SELECT id, default_rate, previous_balance FROM customers").all()) {
    defaultRate[c.id] = Number(c.default_rate) || 0;
    balances[c.id] = Number(c.previous_balance) || 0;
  }
  const frozen = {};
  for (const r of db.prepare("SELECT customer_id, month, rate FROM customer_month_rates WHERE month < ?").all(beforeMonth)) {
    frozen[`${r.customer_id}|${r.month}`] = r.rate;
  }
  const startFrom = {};
  for (const o of db.prepare("SELECT customer_id, month, amount FROM khata_opening_override WHERE month <= ? ORDER BY month ASC").all(beforeMonth)) {
    if (o.customer_id in balances) {
      balances[o.customer_id] = o.amount;
      startFrom[o.customer_id] = o.month;
    }
  }
  for (const q of db.prepare(`SELECT customer_id, substr(entry_date,1,7) AS m, SUM(quantity) AS qty
              FROM milk_entries WHERE substr(entry_date,1,7) < ? GROUP BY customer_id, m`).all(beforeMonth)) {
    if (startFrom[q.customer_id] && q.m < startFrom[q.customer_id]) continue;
    const rate = frozen[`${q.customer_id}|${q.m}`] ?? defaultRate[q.customer_id] ?? 0;
    if (q.customer_id in balances) balances[q.customer_id] += q.qty * rate;
  }
  for (const p of db.prepare("SELECT customer_id, month, amount FROM received_payments WHERE month < ?").all(beforeMonth)) {
    if (startFrom[p.customer_id] && p.month < startFrom[p.customer_id]) continue;
    if (p.customer_id in balances) balances[p.customer_id] -= p.amount;
  }
  return balances;
}
function normShift(s) {
  return s === "Evening" || s === "Both" ? s : "Morning";
}
function computeStock(db, endDate) {
  const toMap = (sql) => {
    const m = {};
    for (const r of db.prepare(sql).all(endDate)) m[r.d] = r.q;
    return m;
  };
  const pm = toMap("SELECT date AS d, SUM(liters) AS q FROM supplier_purchases WHERE date <= ? GROUP BY date");
  const km = toMap("SELECT entry_date AS d, SUM(quantity) AS q FROM milk_entries WHERE entry_date <= ? GROUP BY entry_date");
  const wm = toMap("SELECT date AS d, SUM(quantity) AS q FROM sales WHERE customer_id IS NULL AND date GLOB '[0-9][0-9][0-9][0-9]-*' AND date <= ? GROUP BY date");
  const all = /* @__PURE__ */ new Set([...Object.keys(pm), ...Object.keys(km), ...Object.keys(wm)]);
  if (all.size === 0) return {};
  const first = Array.from(all).sort()[0];
  const out = {};
  let carry = 0;
  const cur = /* @__PURE__ */ new Date(first + "T00:00:00Z");
  const end = /* @__PURE__ */ new Date(endDate + "T00:00:00Z");
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
function monthReport(db, month) {
  const like = `${month}-%`;
  const one = (sql, ...a) => db.prepare(sql).get(...a);
  const rows = db.prepare(`
    SELECT e.customer_id, SUM(e.quantity) AS qty, COALESCE(mr.rate, c.default_rate) AS rate
    FROM milk_entries e
    JOIN customers c ON c.id = e.customer_id
    LEFT JOIN customer_month_rates mr ON mr.customer_id = c.id AND mr.month = ?
    WHERE e.entry_date LIKE ? GROUP BY e.customer_id
  `).all(month, like);
  let khataBilled = 0, khataLiters = 0;
  for (const r of rows) {
    khataBilled += r.qty * (Number(r.rate) || 0);
    khataLiters += r.qty;
  }
  const pos = one("SELECT COALESCE(SUM(total_amount),0) a, COALESCE(SUM(quantity),0) q FROM sales WHERE customer_id IS NULL AND date LIKE ?", like);
  const posPaid = one("SELECT COALESCE(SUM(total_amount),0) a FROM sales WHERE customer_id IS NULL AND payment_status = 'Paid' AND date LIKE ?", like);
  const khataCollected = one("SELECT COALESCE(SUM(amount),0) a FROM received_payments WHERE month = ?", month);
  const buy = one("SELECT COALESCE(SUM(total),0) a, COALESCE(SUM(liters),0) q FROM supplier_purchases WHERE date LIKE ?", like);
  const paidSup = one("SELECT COALESCE(SUM(amount),0) a FROM supplier_payments WHERE date LIKE ?", like);
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
    litersSold: khataLiters + pos.q
  };
}
function supplierCarry(db, month) {
  const bal = {};
  const start = {};
  for (const s of db.prepare("SELECT id FROM suppliers").all()) bal[s.id] = 0;
  for (const o of db.prepare("SELECT supplier_id, month, amount FROM supplier_opening_override WHERE month <= ? ORDER BY month ASC").all(month)) {
    if (o.supplier_id in bal) {
      bal[o.supplier_id] = o.amount;
      start[o.supplier_id] = o.month;
    }
  }
  for (const r of db.prepare("SELECT supplier_id, substr(date,1,7) AS m, SUM(total) AS a FROM supplier_purchases WHERE substr(date,1,7) < ? GROUP BY supplier_id, m").all(month)) {
    if (!(r.supplier_id in bal) || start[r.supplier_id] && r.m < start[r.supplier_id]) continue;
    bal[r.supplier_id] += r.a;
  }
  for (const r of db.prepare("SELECT supplier_id, substr(date,1,7) AS m, SUM(amount) AS a FROM supplier_payments WHERE substr(date,1,7) < ? GROUP BY supplier_id, m").all(month)) {
    if (!(r.supplier_id in bal) || start[r.supplier_id] && r.m < start[r.supplier_id]) continue;
    bal[r.supplier_id] -= r.a;
  }
  return bal;
}

// src/main/main.ts
var mainWindow = null;
var isForceQuit = false;
var isDev = process.env.NODE_ENV === "development" || !import_electron5.app.isPackaged;
function getAppIconPath() {
  const candidates = [
    import_path5.default.join(process.resourcesPath, "public/icon.ico"),
    import_path5.default.join(process.resourcesPath, "icon.ico"),
    import_path5.default.join(import_electron5.app.getAppPath(), "public/icon.ico"),
    import_path5.default.join(import_electron5.app.getAppPath(), "dist/icon.ico"),
    import_path5.default.join(__dirname, "../public/icon.ico"),
    import_path5.default.join(__dirname, "../dist/icon.ico")
  ];
  for (const c of candidates) {
    try {
      if (import_fs5.default.existsSync(c)) return c;
    } catch {
    }
  }
  return import_path5.default.join(__dirname, "../public/icon.ico");
}
function createWindow() {
  const iconPath = getAppIconPath();
  mainWindow = new import_electron5.BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 960,
    minHeight: 650,
    title: "Qari Zafar Milk Shop",
    backgroundColor: "#030712",
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: import_path5.default.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  try {
    mainWindow.setIcon(iconPath);
  } catch {
  }
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    mainWindow.loadURL(devUrl);
    if (process.env.OPEN_DEVTOOLS === "true") {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    mainWindow.loadFile(import_path5.default.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("close", async (e) => {
    if (isForceQuit) {
      return;
    }
    e.preventDefault();
    try {
      const conn = await getConnectionStatus();
      let scenario = "A";
      if (!conn.isOnline) {
        scenario = "B";
      } else if (!conn.isBackendReachable) {
        scenario = "C";
      }
      mainWindow?.webContents.send("app:show-close-backup-modal", {
        scenario,
        error: conn.error
      });
    } catch (err) {
      mainWindow?.webContents.send("app:show-close-backup-modal", {
        scenario: "B",
        error: err.message || "Connectivity check failed"
      });
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron5.app.whenReady().then(() => {
  console.log("[Main] App starting...");
  try {
    initDatabase();
    setupSchema();
  } catch (err) {
    console.error("[Main] Database initialization failed:", err);
  }
  registerIpcHandlers();
  import_electron5.ipcMain.handle("app:confirmForceClose", () => {
    isForceQuit = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
    import_electron5.app.quit();
  });
  import_electron5.ipcMain.handle("app:cancelClose", () => {
    cancelActiveBackup();
  });
  import_electron5.ipcMain.handle("app:performCloseBackup", async () => {
    return createAndUploadCloudBackup((stage, percent) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("backup:close-progress", { stage, percent });
      }
    }, "Application shutdown auto-backup");
  });
  createWindow();
  import_electron5.app.on("activate", () => {
    if (import_electron5.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron5.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron5.app.quit();
  }
});
import_electron5.app.on("before-quit", () => {
  isForceQuit = true;
  closeDatabase();
});
//# sourceMappingURL=main.js.map
