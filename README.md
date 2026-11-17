# Milk Shop - Desktop Daily Management App (دودھ کی دکان مینجمنٹ سسٹم)

A modern, clean, offline desktop daily management application built for milk and dairy businesses using **Electron**, **React (Vite)**, **Tailwind CSS**, and **SQLite (`better-sqlite3`)**.

---

## 🚀 Step 1 Core Implementation Summary

### 1. Database Foundation (`better-sqlite3`)
- **Safe Persistent Storage**: Stored inside Electron's `app.getPath('userData')/app_data.db` so database files persist safely across application updates and re-launches.
- **High Performance Pragmas**: Enabled `WAL` (Write-Ahead Logging), `synchronous = NORMAL`, and `foreign_keys = ON`.
- **Schema & Seeding**:
  - `settings` table (key-value store for preferences, shop details, active language).
  - `tasks` table (verification requirement with full CRUD).
  - `customers` table (customer directory, rates, credit balances).
  - `sales` table (daily milk sales, quantities, rates, amounts, Paid/Due payment status).

### 2. IPC Communication & Preload Security
- Complete isolation using Electron's `contextBridge` in `src/preload/preload.ts`.
- Exposes type-safe `window.electronAPI` to the React renderer:
  - `getDbInfo()`: returns live connection state and exact file path on disk.
  - `getDashboardStats()`: live metrics for milk volume, customers, daily sales, and dues.
  - `getTasks()`, `addTask()`, `deleteTask()`: interactive SQLite testing.
  - `getCustomers()`, `addCustomer()`: customer management.
  - `getSales()`, `addSale()`: milk transaction entry and search/filtering.
  - `getSettings()`, `setSetting()`: app configuration.

### 3. UI Implementation Matching User Design Mockup
- **Branding & Theme**: Clean dairy vibrant blue (`#1d70e2` / `#1976d2`) with soft rounded white cards and badges.
- **Loader**: Smooth animated milk bottle & glass loader with pulse effect.
- **Screen 1: Login Screen (Shop Login)**:
  - Custom Milk bottle & glass illustration
  - "Milk Shop - Manage your milk shop easily"
  - Mobile number & password fields with reveal toggle
  - Remember me checkbox & vibrant blue Login button
  - Pre-filled credentials hint
- **Screen 2: Dashboard**:
  - Greeting banner ("Welcome Back! Wajeeh Milk Shop") with live localized date.
  - **Database Connection Banner**: Shows `better-sqlite3` WAL online with the exact SQLite file path.
  - **4 Stat Cards (2x2 Grid)**:
    1. Total Milk (Ltr): **120**
    2. Total Customers: **35**
    3. Today's Sale: **Rs. 12,450**
    4. Total Due: **Rs. 45,230**
  - **Quick Actions**: Add Milk, Customers, Sales, Payments.
  - **Recent Transactions**: List with avatar initials, milk volume, amount, and Paid/Due status badges.
  - **Step 1 Interactive Test Box**: Insert and delete test records directly to/from SQLite in real-time.
- **Screen 3: Add Milk Modal**:
  - Date, Customer dropdown + "+ Add New", Milk quantity (Ltr), Rate/Ltr, auto-calculated Total Amount, Paid/Due radio buttons, notes, and SAVE button.
- **Screen 4: Add Customer Modal**:
  - Full Name, Mobile Number, Address, Default Rate Per Ltr, and SAVE button.
- **Screen 5 & 6: Search / Filter & All Record Table**:
  - Date From/To, Customer, Payment Status, Min/Max Amount filter.
  - Table results with summary chips and record/amount totals.

### 4. Bilingual Support: English & Urdu (انگلش اور اردو)
- Instant toggle button `[ English | اردو ]` available on both the Header and Login screen.
- Dynamic RTL (`dir="rtl"`) layout switching with Urdu typography (`Noto Nastaliq Urdu`).
- All 11 navigation modules, stat cards, buttons, placeholders, and error messages are fully translated.
- Language preference is automatically saved to SQLite `settings` table.

### 5. All 11 Modular Pages in Navigation Sidebar:
1. **Dashboard** (ڈیش بورڈ)
2. **Monthly Khatta** (ماہانہ کھاتہ)
3. **Customers** (گاہک / کسٹمرز)
4. **Suppliers (Dahi)** (سپلائرز (دہی))
5. **Daily Sale** (روزانہ فروخت)
6. **All Record** (تمام ریکارڈ)
7. **Daily Stock** (روزانہ اسٹاک)
8. **Fleet & Expenses** (گاڑیاں اور اخراجات)
9. **Monthly Bills** (ماہانہ بل)
10. **Payments** (ادائیگی و وصولی)
11. **Settings** (ترتیبات)

---

## 🏃 How to Run the App

Open terminal inside `E:\dairy-mangement-system-app` and run:

```bash
# Start Vite + Electron concurrently
npm run dev
```

Or double-click `start.bat` in the project root!

For quick web preview without Electron shell:
```bash
npm run dev:vite
```
