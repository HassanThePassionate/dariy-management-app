import { BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface BillRenderData {
  customerId: number;
  customerName: string;
  phone?: string;
  month: string; // e.g. "2026-11" or "November 2026"
  monthLabel: string;
  rate: number;
  liters: number;
  billAmount: number;
  carry: number;
  received: number;
  payable: number;
  billNo?: number | string;
  shopTitle?: string;
  ownerName?: string;
  shopPhone?: string;
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
}

function getLogoDataUri(): string {
  try {
    const candidates = [
      path.join(app.getAppPath(), 'public', 'logo.png'),
      path.join(__dirname, '../../public/logo.png'),
      path.join(__dirname, '../renderer/assets/logo.png'),
      path.join(process.cwd(), 'public', 'logo.png'),
      path.join(process.cwd(), 'src', 'renderer', 'src', 'assets', 'logo.png'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        return `data:image/png;base64,${buf.toString('base64')}`;
      }
    }
  } catch {}
  return '';
}

/**
 * Builds self-contained HTML for ModernBillCard rendering
 */
function buildBillHtml(data: BillRenderData): string {
  const shopTitle = data.shopTitle || 'قاری ظفر اقبال ملک شاپ';
  const ownerName = data.ownerName || 'حافظ مصعب ظفر';
  const shopPhone = data.shopPhone || '+92 321 0001168';
  const bankName = data.bankName || 'faysalbank';
  const accountTitle = data.accountTitle || 'Hafiz Musab Zafar';
  const accountNumber = data.accountNumber || '0210-1234567890';

  const money = (n: number) => Math.round(n || 0).toLocaleString('en-US');
  const qty = (n: number) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(2));
  const logoDataUri = getLogoDataUri();

  return `<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #101d35;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Nastaliq Urdu", sans-serif;
      color: #f4f3ed;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 440px;
      padding: 10px;
    }
    .card {
      width: 420px;
      background: linear-gradient(180deg, #101d35 0%, #0c1628 100%);
      border: 2px solid rgba(233, 184, 63, 0.45);
      border-radius: 26px;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5), 0 0 1px rgba(233, 184, 63, 0.35);
      padding: 18px 16px 18px;
      text-align: right;
    }
    .header { margin-bottom: 8px; }
    .header-flex { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .logo-badge {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: rgba(25, 43, 72, 0.9);
      border: 1px solid rgba(233, 184, 63, 0.5);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
    }
    .logo-img { max-height: 44px; max-width: 44px; object-fit: contain; }
    .shop-title { font-size: 24px; font-weight: 900; color: #f4f3ed; line-height: 1.2; }
    .owner-pill {
      display: inline-block;
      padding: 2px 14px;
      background: #192b48;
      border: 1px solid #e9b83f;
      border-radius: 9999px;
      font-size: 11px;
      color: #e9b83f;
      font-weight: bold;
      margin-top: 4px;
    }
    .box {
      margin-top: 8px;
      padding: 8px 12px;
      background: #192b48;
      border: 1.5px solid rgba(57, 201, 216, 0.4);
      border-radius: 16px;
    }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .label { font-size: 11px; color: #b7c1d0; }
    .value { font-size: 16px; font-weight: 900; color: #f4f3ed; font-family: monospace; }
    .highlight { color: #39c9d8; }
    .gold { color: #e9b83f; }
    .payable-box {
      margin-top: 10px;
      padding: 12px 14px;
      background: linear-gradient(135deg, #1e3357 0%, #192b48 100%);
      border: 2px solid #e9b83f;
      border-radius: 18px;
      box-shadow: 0 4px 20px rgba(233, 184, 63, 0.22);
    }
    .payable-amount { font-size: 28px; font-weight: 900; color: #f4f3ed; font-family: monospace; }
    .warning {
      margin-top: 8px;
      padding: 8px 10px;
      background: #14233d;
      border: 1.5px solid rgba(57, 201, 216, 0.35);
      border-radius: 16px;
      font-size: 11px;
      font-weight: bold;
      color: #f4f3ed;
      text-align: center;
    }
    .bank-box {
      margin-top: 8px;
      padding: 8px 12px;
      background: #192b48;
      border: 1.5px solid rgba(57, 201, 216, 0.4);
      border-radius: 16px;
      font-size: 11px;
    }
    .note-box {
      margin-top: 8px;
      padding: 8px 10px;
      background: #13223b;
      border: 1px solid rgba(57, 201, 216, 0.3);
      border-radius: 16px;
      font-size: 10.5px;
      color: #b7c1d0;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-flex">
        <div style="display: flex; align-items: center; gap: 6px;">
          ${logoDataUri ? `
          <div class="logo-badge">
            <img class="logo-img" src="${logoDataUri}" alt="Logo" />
          </div>` : ''}
          <div style="width: 32px; height: 44px; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 64 64" style="width: 32px; height: 40px;" fill="none">
              <rect x="22" y="8" width="14" height="6" rx="2" fill="#E2E8F0" stroke="#39c9d8" stroke-width="1.5" />
              <path d="M20 14h18l4 8v32a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V22l4-8z" fill="#FFFFFF" fill-opacity="0.95" stroke="#39c9d8" stroke-width="2" />
              <path d="M22 28c4 3 12 3 14 0v24a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V28z" fill="#39c9d8" fill-opacity="0.35" />
              <path d="M42 32h12l2 24a2 2 0 0 1-2 2H40a2 2 0 0 1-2-2l2-24h2z" fill="#FFFFFF" fill-opacity="0.9" stroke="#39c9d8" stroke-width="1.5" />
            </svg>
          </div>
        </div>
        <div style="text-align: right; flex: 1;">
          <div class="shop-title">${shopTitle}</div>
          <div><span class="owner-pill">${ownerName}</span></div>
        </div>
      </div>
    </div>

    <!-- Phone -->
    <div class="box flex-between" dir="ltr">
      <span class="value highlight" style="font-family: monospace;">${shopPhone}</span>
      <span class="label" style="font-weight: bold; color: #b7c1d0;">موبائل نمبر:</span>
    </div>

    <!-- Bill No & Customer -->
    <div class="box grid-2">
      <div style="border-left: 1px solid rgba(57, 201, 216, 0.3); padding-left: 8px;">
        <div class="label">بل نمبر: <strong class="value" style="color: #f4f3ed;">${data.billNo || data.customerId}</strong></div>
        <div class="label highlight">${data.monthLabel}</div>
      </div>
      <div>
        <div class="label">بل بنام:</div>
        <div class="value" style="font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.customerName}</div>
      </div>
    </div>

    <!-- Rate & Liters -->
    <div class="grid-2" style="margin-top: 8px;">
      <div class="box flex-between">
        <span class="label">فی لیٹر ریٹ:</span>
        <span class="value">${data.rate} <span style="font-size: 12px; color: #39c9d8;">روپے</span></span>
      </div>
      <div class="box flex-between">
        <span class="label">کل دودھ:</span>
        <span class="value highlight">${qty(data.liters)} <span style="font-size: 12px; color: #f4f3ed;">لیٹر</span></span>
      </div>
    </div>

    <!-- Arrears & Milk Amount -->
    <div class="box grid-2">
      <div style="border-left: 1px solid rgba(57, 201, 216, 0.3); padding-left: 8px;">
        <div class="label">سابقہ رقم:</div>
        <span class="value gold">${money(data.carry)} <span style="font-size: 12px; color: #b7c1d0;">روپے</span></span>
      </div>
      <div>
        <div class="label">کل رقم دودھ:</div>
        <span class="value">${money(data.billAmount)} <span style="font-size: 12px; color: #39c9d8;">روپے</span></span>
      </div>
    </div>

    <!-- Total Payable (کل بل ادائیگی) -->
    <div class="payable-box flex-between">
      <div style="font-size: 13px; font-weight: 900; color: #e9b83f;">کل بل ادائیگی:</div>
      <div class="payable-amount">${money(data.payable)} <span style="font-size: 18px; color: #e9b83f;">روپے</span></div>
    </div>

    <!-- Warning -->
    <div class="warning">
      بل ہر ماہ کی <span style="color: #39c9d8; font-weight: 900;">5 تاریخ</span> تک ادا کریں، بصورت دیگر دودھ کی سپلائی بند کر دی جائے گی۔
    </div>

    <!-- Bank Details -->
    <div class="bank-box flex-between" dir="ltr">
      <div style="font-weight: bold; color: #39c9d8;">${bankName}</div>
      <div style="text-align: right;">
        <div style="color: #39c9d8; font-family: monospace; font-weight: bold; font-size: 13px;">A/C: ${accountNumber}</div>
        <div style="color: #b7c1d0; font-size: 10px;">Title: ${accountTitle}</div>
      </div>
    </div>

    <!-- Online Note -->
    <div class="note-box">
      آن لائن رقم کی ادائیگی کے لیے بینک اکاؤنٹ میں رقم ٹرانسفر کریں۔ ادائیگی کی رسید اس نمبر <span style="color: #39c9d8; font-weight: bold; font-family: monospace;">${shopPhone}</span> پر واٹس ایپ کریں۔
    </div>

    <!-- Waves -->
    <div style="margin-top: 10px; display: flex; justify-content: center; opacity: 0.9;">
      <svg viewBox="0 0 300 24" style="width: 100%; height: 22px; color: #39c9d8;" fill="currentColor">
        <path d="M0 12 Q 25 24 50 12 T 100 12 T 150 12 T 200 12 T 250 12 T 300 12 V 24 H 0 Z" fill="#F4F3ED" fill-opacity="0.75" />
        <path d="M0 16 Q 25 6 50 16 T 100 16 T 150 16 T 200 16 T 250 16 T 300 16 V 24 H 0 Z" fill="#39c9d8" fill-opacity="0.35" />
      </svg>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Renders the bill card using offscreen Electron BrowserWindow and captures a PNG buffer
 */
export async function generateBillImage(data: BillRenderData): Promise<{
  success: boolean;
  filePath?: string;
  buffer?: Buffer;
  error?: string;
}> {
  let offscreenWin: BrowserWindow | null = null;

  try {
    const html = buildBillHtml(data);

    offscreenWin = new BrowserWindow({
      width: 440,
      height: 720,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: {
        offscreen: true,
      },
    });

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await offscreenWin.loadURL(dataUrl);

    // Small delay to allow CSS gradients and fonts to paint
    await new Promise((r) => setTimeout(r, 200));

    const image = await offscreenWin.webContents.capturePage({
      x: 0,
      y: 0,
      width: 440,
      height: 720,
    });

    const pngBuffer = image.toPNG();

    // Save to user bills directory
    const billsDir = path.join(app.getPath('userData'), 'bills', data.month.replace(/[^a-zA-Z0-9_-]/g, '_'));
    if (!fs.existsSync(billsDir)) {
      fs.mkdirSync(billsDir, { recursive: true });
    }

    const filePath = path.join(billsDir, `bill_customer_${data.customerId}_${data.month}.png`);
    fs.writeFileSync(filePath, pngBuffer);

    return {
      success: true,
      filePath,
      buffer: pngBuffer,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to render offscreen bill image',
    };
  } finally {
    if (offscreenWin && !offscreenWin.isDestroyed()) {
      offscreenWin.destroy();
      offscreenWin = null;
    }
  }
}
