# 🥛 Dairy Management System - Cloud Backend

Independent Next.js (App Router, TypeScript) backend providing cloud database synchronization with Neon PostgreSQL (Drizzle ORM), S3-compatible cloud SQLite WAL database backups, and official Meta WhatsApp Cloud API integration for automated monthly customer billing.

---

## 📋 Architecture & Tech Stack

- **Framework**: Next.js 15+ (App Router, Server Actions, Route Handlers)
- **Language**: TypeScript (Strict typing)
- **Cloud Database**: [Neon Serverless PostgreSQL](https://neon.tech/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) & Drizzle Kit
- **Cloud Object Storage**: S3-compatible (Cloudflare R2, AWS S3, MinIO, Wasabi, Backblaze B2)
- **WhatsApp API**: Official Meta WhatsApp Cloud API (`graph.facebook.com/v20.0`)
- **Hosting**: Vercel / Node.js container

---

## 🚀 Setup & Local Development

### 1. Prerequisites
- Node.js 20+ or 22+
- npm or pnpm

### 2. Install Dependencies
```bash
cd cloud-backend
npm install
```

### 3. Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env.local
```

Fill in your actual credentials:
```env
# Neon PostgreSQL
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/dairy_cloud?sslmode=require

# API Authentication between Electron Desktop App and Next.js Backend
CLOUD_API_KEY=your_super_secret_secure_key

# Meta WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=EAAG...permanent_system_user_access_token
WHATSAPP_PHONE_NUMBER_ID=100000000000000
WHATSAPP_BUSINESS_ACCOUNT_ID=200000000000000
WHATSAPP_APP_SECRET=your_meta_app_secret
WHATSAPP_VERIFY_TOKEN=dairy_custom_webhook_secret
WHATSAPP_API_VERSION=v20.0
WHATSAPP_TEMPLATE_NAME=monthly_dairy_bill
WHATSAPP_TEMPLATE_LANGUAGE=ur

# S3-Compatible Storage (Cloudflare R2, AWS S3, MinIO)
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_BUCKET=dairy-cloud-backups
S3_ACCESS_KEY_ID=your_access_key_id
S3_SECRET_ACCESS_KEY=your_secret_access_key
S3_REGION=auto
```

### 4. Database Setup with Neon & Drizzle
Generate and push database schema to Neon:
```bash
npm run db:push
```
To inspect data visually in Drizzle Studio:
```bash
npm run db:studio
```

### 5. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3001`.

---

## ☁️ Neon Database Configuration

1. Visit [neon.tech](https://neon.tech/) and create a free project named `dairy-cloud`.
2. Copy the Connection String with `Pooled connection` enabled (`sslmode=require`).
3. Set the `DATABASE_URL` in your `.env.local` and in Vercel project environment variables.
4. Run `npm run db:push` to apply the tables (`customers`, `sales`, `milk_entries`, `backups`, `whatsapp_bill_logs`, etc.).

---

## 🪣 S3-Compatible Cloud Storage Setup (Cloudflare R2 / AWS S3)

### Using Cloudflare R2 (Recommended - Zero egress fees)
1. Go to Cloudflare Dashboard > R2 Object Storage.
2. Create a bucket named `dairy-cloud-backups`.
3. In "Manage R2 API Tokens", create an API token with `Object Read & Write` permissions.
4. Set:
   - `S3_ENDPOINT`: `https://<account-id>.r2.cloudflarestorage.com`
   - `S3_BUCKET`: `dairy-cloud-backups`
   - `S3_ACCESS_KEY_ID`: `<Access Key ID>`
   - `S3_SECRET_ACCESS_KEY`: `<Secret Access Key>`
   - `S3_REGION`: `auto`

---

## 📲 Meta WhatsApp Cloud API Setup

### 1. Meta Developer Portal & App Creation
1. Go to [developers.facebook.com](https://developers.facebook.com/) and create a "Business" type App.
2. Add the **WhatsApp** product.
3. In WhatsApp > API Setup:
   - Copy **Phone Number ID** -> `WHATSAPP_PHONE_NUMBER_ID`
   - Copy **WhatsApp Business Account ID** -> `WHATSAPP_BUSINESS_ACCOUNT_ID`
4. In App Settings > Basic:
   - Copy **App Secret** -> `WHATSAPP_APP_SECRET`

### 2. Permanent System User Access Token
*Do not use temporary 24-hour test tokens in production.*
1. Go to Meta Business Manager > Business Settings > Users > System Users.
2. Create an Admin System User (e.g., `DairyAppSync`).
3. Assign Asset: WhatsApp Business Account (Full Control).
4. Generate Token with permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Copy token -> `WHATSAPP_ACCESS_TOKEN`.

### 3. Utility Message Template Approval
In WhatsApp Manager > Message Templates:
Create a new template:
- **Category**: `Utility`
- **Name**: `monthly_dairy_bill`
- **Language**: `Urdu (ur)` or `English (en_US)`
- **Header**: `Media > Image` (A sample bill image is uploaded for Meta review)
- **Body**:
```text
محترم {{1}} صاحب،
آپ کا {{2}} کا دودھ کا ماہانہ بل درج ذیل ہے:
کل دودھ: {{3}} لیٹر
ریٹ: {{4}}
بل رقم: {{5}}
کل واجب الادا رقم: {{6}}

بل ہر ماہ کی 5 تاریخ تک ادا فرمائیں۔ شکریہ!
قاری ظفر اقبال ملک شاپ
```
- **Sample values**:
  - `{{1}}`: علی رضا
  - `{{2}}`: مئی 2026
  - `{{3}}`: 60
  - `{{4}}`: Rs. 240
  - `{{5}}`: Rs. 14,400
  - `{{6}}`: Rs. 14,400
Submit for review. Meta typically approves Utility templates within minutes.

### 4. Webhook Subscription
1. Under WhatsApp > Configuration:
   - **Callback URL**: `https://<your-vercel-domain>.vercel.app/api/webhooks/whatsapp`
   - **Verify Token**: value of `WHATSAPP_VERIFY_TOKEN`
2. Click **Verify and Save**.
3. Subscribe to webhook field: `messages`.

---

## 🌐 Vercel Production Deployment

1. Install Vercel CLI or import repository to Vercel via GitHub.
2. When importing:
   - **Root Directory**: `cloud-backend`
   - **Framework Preset**: Next.js
3. In Project Settings > Environment Variables, add all variables from `.env.example`.
4. Deploy:
```bash
vercel --prod
```
Your backend will be live with high availability, global CDN, and automated SSL.

---

## 🔌 Connecting to Electron Desktop App

In the root directory of the Electron project, create `.env`:
```env
CLOUD_API_URL=https://<your-vercel-domain>.vercel.app
CLOUD_API_KEY=your_super_secret_secure_key
APP_DEVICE_ID=dairy-shop-pos-main
```
Restart the Electron application. The app will immediately authenticate and show "Online / Connected" sync and backup indicators.
