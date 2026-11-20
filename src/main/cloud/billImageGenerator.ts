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
 * Builds self-contained HTML for Modern Dark Slip rendering matching the real-world printed slip
 */
function buildBillHtml(data: BillRenderData): string {
  const shopTitle = data.shopTitle || 'قاری ظفر اقبال ملک شاپ';
  const ownerName = data.ownerName || 'حافظ مصعب ظفر';
  const bankName = data.bankName || 'میزان بینک';
  const accountTitle = data.accountTitle || 'حافظ مصعب ظفر';
  const accountNumber = data.accountNumber || '02090111954760';

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
      background-color: transparent;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Nastaliq Urdu", sans-serif;
      color: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 520px;
      padding: 10px;
    }
    .slip {
      width: 500px;
      background: linear-gradient(145deg, #050a1d 0%, #081436 60%, #060e28 100%);
      border: 2.5px solid #06b6d4;
      border-radius: 20px;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.8), 0 0 25px rgba(6, 182, 212, 0.25);
      padding: 10px;
      text-align: right;
    }
    .inner-frame {
      border: 1.5px solid rgba(16, 185, 129, 0.6);
      border-radius: 16px;
      padding: 14px;
      background: rgba(8, 18, 50, 0.85);
    }
    .bismillah {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      color: #34d399;
      line-height: 1.9;
      margin-bottom: 6px;
      text-shadow: 0 0 10px rgba(52, 211, 153, 0.4);
    }
    .header-flex {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 10px;
      border-bottom: 1.5px solid rgba(56, 189, 248, 0.3);
      margin-bottom: 10px;
    }
    .logo-container {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid #10b981;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .logo-container img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }
    .shop-title {
      font-size: 22px;
      font-weight: 900;
      color: #ffffff;
      line-height: 2.0;
      margin: 0;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
    }
    .subtitle { font-size: 11px; font-weight: 600; color: #94a3b8; line-height: 1.8; }
    .badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4px 10px;
      background: #0d2250;
      border: 1px solid #06b6d4;
      border-radius: 10px;
      flex-shrink: 0;
    }
    .badge-ur { font-size: 12px; font-weight: 800; color: #34d399; }
    .badge-en { font-size: 8.5px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Mobile Box */
    .mobile-box {
      display: flex;
      align-items: center;
      border: 1.5px solid rgba(56, 189, 248, 0.4);
      background: linear-gradient(135deg, #0b1a40 0%, #0d2358 100%);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .mobile-lbl {
      padding: 8px 12px;
      background: rgba(14, 165, 233, 0.15);
      border-left: 1.5px solid rgba(56, 189, 248, 0.4);
      font-size: 11px;
      font-weight: 800;
      color: #38bdf8;
      font-family: monospace;
      white-space: nowrap;
    }
    .mobile-grid {
      flex: 1;
      padding: 5px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .mobile-row {
      display: flex;
      gap: 8px;
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
      color: #ffffff;
      direction: ltr;
    }

    /* Customer & Account Box */
    .customer-box {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      align-items: stretch;
    }
    .account-badge {
      min-width: 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, #18220f 0%, #293816 100%);
      border: 2px solid #fbbf24;
      border-radius: 12px;
      padding: 6px 10px;
      box-shadow: 0 0 12px rgba(251, 191, 36, 0.25);
    }
    .acc-lbl { font-size: 9px; font-weight: 700; color: #fbbf24; }
    .acc-num { font-family: monospace; font-size: 20px; font-weight: 900; color: #ffffff; }
    .customer-meta {
      flex: 1;
      background: #0c1a45;
      border: 1.5px solid rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
    }
    .c-row { display: flex; align-items: baseline; gap: 8px; font-size: 12.5px; line-height: 1.7; }
    .c-lbl { color: #94a3b8; font-weight: 700; min-width: 70px; }
    .c-name { color: #ffffff; font-weight: 900; font-size: 14.5px; }
    .c-month { color: #34d399; font-weight: 800; }

    /* Calc Grid */
    .calc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 10px;
    }
    .pill {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 10px;
      border-radius: 10px;
      font-size: 12px;
      line-height: 1.7;
    }
    .pill-rate { background: rgba(14, 165, 233, 0.12); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; }
    .pill-liters { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; }
    .pill-milk { background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; }
    .pill-carry { background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; }
    .pill-val { font-family: monospace; font-weight: 800; font-size: 12.5px; }

    /* Grand Total */
    .total-banner {
      background: linear-gradient(135deg, #063c2c 0%, #0b4f3b 60%, #063c2c 100%);
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 9px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
    }
    .total-lbl { font-size: 13.5px; font-weight: 800; color: #ffffff; }
    .total-val { font-family: monospace; font-size: 22px; font-weight: 900; color: #ffffff; }

    /* Rules Card */
    .rules-card {
      background: #09153a;
      border: 1.5px solid rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
      font-size: 11px;
      line-height: 1.9;
    }
    .rule-line { display: flex; align-items: flex-start; gap: 6px; }
    .rule-warn { color: #fca5a5; font-weight: 700; }
    .rule-acc {
      display: inline-block;
      background: #18220f;
      border: 1px solid #fbbf24;
      color: #fbbf24;
      font-family: monospace;
      font-weight: 900;
      padding: 0 6px;
      border-radius: 4px;
      margin: 0 3px;
    }
    .rule-wa {
      display: inline-block;
      background: #0d3c26;
      border: 1px solid #25d366;
      color: #4ade80;
      font-family: monospace;
      font-weight: 900;
      padding: 0 6px;
      border-radius: 4px;
      margin: 0 3px;
    }

    /* Footer */
    .footer {
      border-top: 1px dashed rgba(56, 189, 248, 0.3);
      padding-top: 8px;
      text-align: center;
      font-size: 10.5px;
      color: #94a3b8;
      line-height: 1.7;
    }
    .footer-shukriya {
      font-size: 16px;
      font-weight: bold;
      color: #10b981;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="slip">
    <div class="inner-frame">
      <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>

      <div class="header-flex">
        ${logoDataUri ? `
        <div class="logo-container">
          <img src="${logoDataUri}" alt="${shopTitle}" />
        </div>` : ''}

        <div style="flex: 1;">
          <h1 class="shop-title">${shopTitle}</h1>
          <div class="subtitle">پروپرائٹر: <b style="color: #38bdf8;">${ownerName}</b> • معیار، اعتماد اور خالص دودھ کا مرکز</div>
        </div>

        <div class="badge">
          <span class="badge-ur">دودھ کا بل</span>
          <span class="badge-en">Milk Bill</span>
        </div>
      </div>

      <!-- Mobile Numbers Box -->
      <div class="mobile-box">
        <div class="mobile-lbl">Mobile No:</div>
        <div class="mobile-grid">
          <div class="mobile-row">
            <span>0300-8440710</span>, <span>0320-4815221</span>
          </div>
          <div class="mobile-row">
            <span>0300-9416564</span>, <span>0321-4815221</span>
          </div>
        </div>
      </div>

      <!-- Customer & Bill Account Box -->
      <div class="customer-box">
        <div class="account-badge">
          <div class="acc-lbl">اکاؤنٹ نمبر</div>
          <div class="acc-num">${data.billNo || data.customerId || '28'}</div>
        </div>

        <div class="customer-meta">
          <div class="c-row">
            <span class="c-lbl">بل بنام:</span>
            <span class="c-name">${data.customerName}</span>
            ${data.phone ? `<span style="font-family: monospace; font-size: 11px; color: #38bdf8;" dir="ltr">(${data.phone})</span>` : ''}
          </div>
          <div class="c-row">
            <span class="c-lbl">بل ماہ وسال:</span>
            <span class="c-month">${data.monthLabel}</span>
          </div>
        </div>
      </div>

      <!-- Calculations Grid -->
      <div class="calc-grid">
        <div class="pill pill-rate">
          <span>دودھ فی لٹر:</span>
          <span class="pill-val">Rs. ${data.rate}</span>
        </div>
        <div class="pill pill-liters">
          <span>ٹوٹل لٹر دودھ:</span>
          <span class="pill-val">${qty(data.liters)} Ltr</span>
        </div>
        <div class="pill pill-milk">
          <span>کل رقم دودھ:</span>
          <span class="pill-val">Rs. ${money(data.billAmount)}</span>
        </div>
        <div class="pill pill-carry">
          <span>سابقہ رقم:</span>
          <span class="pill-val">Rs. ${money(data.carry)}</span>
        </div>
        ${data.received > 0 ? `
        <div class="pill pill-liters" style="grid-column: span 2;">
          <span>وصول شدہ رقم:</span>
          <span class="pill-val" style="color: #34d399;">-Rs. ${money(data.received)}</span>
        </div>` : ''}
      </div>

      <!-- Total Payable Banner -->
      <div class="total-banner">
        <div class="total-lbl">ٹوٹل رقم دودھ / کل واجب الادا:</div>
        <div class="total-val">Rs. ${money(data.payable)}</div>
      </div>

      <!-- Rules & Bank Notice -->
      <div class="rules-card">
        <div class="rule-line rule-warn">
          <span>⚠️</span>
          <span>بل ہر ماہ کی 5 تاریخ تک ادا کر دیں بصورت دیگر دودھ بند کر دیا جائے گا۔</span>
        </div>
        <div class="rule-line" style="color: #7dd3fc; font-weight: 700;">
          <span>💳</span>
          <span>آن لائن بل کی رقم ادا کرنے کے لیے میزان بینک میں رقم ٹرانسفر کریں۔</span>
        </div>
        <div class="rule-line" style="color: #cbd5e1;">
          <span>🏦</span>
          <div>
            <span>${bankName} اکاؤنٹ نمبر: </span>
            <span class="rule-acc" dir="ltr">${accountNumber}</span>
            <span>عنوان: <b>${accountTitle}</b></span>
            <div style="font-size: 10.5px; color: #94a3b8; margin-top: 2px;">
              اور اس کے علاوہ کسی بھی بینک اور جاز کیش میں رقم نہ بھیجیں اور بل کی رقم ٹرانسفر کرنے کے بعد سکرین شاٹ لازمی وٹس ایپ کریں۔
            </div>
          </div>
        </div>
        <div class="rule-line" style="color: #e2e8f0;">
          <span>📱</span>
          <span>آن لائن بل کا سکرین شاٹ <span class="rule-wa" dir="ltr">03204815221</span> اس نمبر پر وٹس ایپ کریں۔</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-shukriya">شکریہ! Thank You!</div>
        <div style="margin-top: 2px;">خالص دودھ و تازہ دہی کا بااعتماد مرکز • تشریف لانے کا شکریہ!</div>
      </div>
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
      width: 540,
      height: 800,
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
      width: 540,
      height: 800,
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
