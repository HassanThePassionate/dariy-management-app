# Milk Shop - Desktop Daily Management App & Cloud Backend (دودھ کی دکان مینجمنٹ سسٹم)

A modern, offline-first desktop dairy management application built with **Electron**, **React (Vite)**, **Tailwind CSS**, and **SQLite (`better-sqlite3`)**, extended with an independent **Next.js App Router** cloud backend for **Neon PostgreSQL synchronization**, **S3-compatible WAL database snapshots**, and **Official Meta WhatsApp Cloud API automated billing**.

---

## 🌟 New Cloud & WhatsApp Capabilities

### 1. ☁️ Next.js Independent Cloud Backend (`/cloud-backend`)
- **Location**: Standalone project in `/cloud-backend`
- **Tech Stack**: Next.js 15+ App Router, TypeScript, Drizzle ORM, Neon PostgreSQL, S3 SDK
- **Vercel Ready**: Fully compatible with Vercel serverless deployment
- **Endpoints**:
  - `GET /api/health`: Service health and connected subsystems status
  - `POST /api/auth`: Device API authentication
  - `POST /api/sync`: Bidirectional SQLite to Neon database synchronization
  - `POST /api/backup`: Upload SQLite WAL database snapshots to S3
  - `GET /api/backup/history`: View previous cloud backups and SHA-256 checksums
  - `POST /api/backup/restore`: Download and safely restore verified cloud backups
  - `GET /api/whatsapp/status`: Meta WhatsApp Cloud API connection and template status
  - `POST /api/whatsapp/media`: Upload bill card images to Meta
  - `POST /api/whatsapp/send-bill`: Send monthly bill to single customer
  - `POST /api/whatsapp/send-monthly-bills`: Rate-limited batch sending queue
  - `GET / POST /api/webhooks/whatsapp`: Webhook verification and delivery event tracking

---

### 2. 🔄 Online Database Synchronization (SQLite ⇄ Neon PostgreSQL)
- **Offline-First**: Local SQLite database (`app_data.db`) remains the primary, fast offline datastore.
- **Entities Synchronized**:
  - Customers & phone numbers
  - Monthly milk entries & daily sales
  - Customer month rates & opening overrides
  - Received payments & balance tracking
  - Suppliers, purchases, and payments
  - Daily expenses and fleet costs
  - Desi Ghee & packing shopper bags stock ledgers
  - Daily stock records
  - Bill header and app settings
- **Safe Conflict Handling**:
  - Unique record IDs preserved across local and cloud.
  - Timestamp-based conflict resolution (`updated_at`).
  - No cloud data deletion when records are omitted from an incremental sync batch.
  - Live sync indicator pill in top header (`Cloud Online` / `Cloud Offline`).

---

### 3. 🛡️ Automatic Online Backup When Closing Application
Whenever the user attempts to close the desktop application, Electron intercepts window destruction (`mainWindow.on('close')`) and presents an intelligent backup confirmation dialog matching the app's dark neon aesthetic:

#### Scenario A: Internet Is Available
- **Dialog Title**: "Backup Your Data Before Closing?" (ایپ بند کرنے سے پہلے بیک اپ لیں؟)
- **Options**:
  - `Backup & Close`:
    1. Checks connection to backend
    2. Synchronizes latest database changes
    3. Creates a consistent standalone SQLite WAL snapshot using `better-sqlite3` backup API
    4. Computes SHA-256 checksum for guaranteed file integrity
    5. Uploads snapshot securely to cloud object storage (S3 / Cloudflare R2)
    6. Saves metadata in Neon PostgreSQL
    7. Displays real-time progress modal with active stages and animated progress bar
    8. Verifies upload completion and gracefully closes the application
  - `Close Without Backup`: Quits application immediately without cloud upload.
  - `Cancel`: Aborts shutdown and returns to the application.

#### Scenario B: Internet Is Not Available
- **Dialog Title**: "Internet Connection Required" (انٹرنیٹ کنکشن درکار ہے)
- **Message**: "You are currently offline. We cannot create an online backup because there is no internet connection. Your local data is safe on this device, but your latest changes will not be backed up online."
- **Options**: `Close Without Backup` or `Cancel`.

#### Scenario C: Backend Is Unavailable
- Clearly displays server connection error.
- Options: `Retry`, `Close Without Backup`, or `Cancel`.

---

### 4. 📲 WhatsApp Cloud API Monthly Billing & Queue
Integrates the official Meta WhatsApp Cloud API (`graph.facebook.com/v20.0`):
- **Permanent Tokens Kept on Backend Only**: Never exposes Meta secrets to Electron renderer.
- **Dedicated Billing View**: Accessible via Sidebar (`monthly-bills`).
- **Features**:
  - Select billing month (e.g., `2026-11`)
  - Real-time KPI counters: Total Customers, Valid WhatsApp Numbers, Missing Phones, Already Sent, Pending, Failed
  - Pixel-perfect bill card rendering matching `ModernBillCard` via Electron offscreen rendering
  - High-resolution bill image uploaded directly to Meta's media endpoint
  - Approved Utility template with image header and billing parameters
  - Customer Consent Tracking (Opt-In / Opt-Out toggle)
  - Duplicate-send protection (customer ID + month idempotency key)
  - Rate-limited sending queue with pause/resume and live progress tracking
  - Webhook updates live delivery status (`sent`, `delivered`, `read`, `failed`)

---

## ⚙️ Environment Configuration

### Electron App (`/.env`):
```env
CLOUD_API_URL=http://localhost:3001
CLOUD_API_KEY=your_secure_cloud_api_key_here
APP_DEVICE_ID=dairy-desktop-pos-1
```

### Next.js Backend (`/cloud-backend/.env.local`):
```env
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/dairy_cloud?sslmode=require
CLOUD_API_KEY=your_secure_cloud_api_key_here
WHATSAPP_ACCESS_TOKEN=EAAG...your_permanent_system_user_token
WHATSAPP_PHONE_NUMBER_ID=100000000000000
WHATSAPP_BUSINESS_ACCOUNT_ID=200000000000000
WHATSAPP_APP_SECRET=your_meta_app_secret
WHATSAPP_VERIFY_TOKEN=dairy_custom_webhook_secret
WHATSAPP_API_VERSION=v20.0
WHATSAPP_TEMPLATE_NAME=monthly_dairy_bill
WHATSAPP_TEMPLATE_LANGUAGE=ur
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_BUCKET=dairy-cloud-backups
S3_ACCESS_KEY_ID=your_s3_access_key_id
S3_SECRET_ACCESS_KEY=your_s3_secret_access_key
S3_REGION=auto
```

---

## 🏃 Running Both Projects

### 1. Start Cloud Backend
```bash
cd cloud-backend
npm run dev
```
Runs at `http://localhost:3001`.

### 2. Start Desktop Electron App
```bash
npm run dev
```
Launches Vite dev server and native Electron window concurrently.

### 3. Build for Production
```bash
# Build desktop app
npm run build

# Build cloud backend
cd cloud-backend
npm run build
```
Both projects compile and pass TypeScript validation with 0 errors.
