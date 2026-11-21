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

export interface ReceiptRenderData {
  customerId: number;
  receiptNumber?: string;
  customerName: string;
  phone?: string;
  month: string;
  monthLabel: string;
  issueDateStr?: string;
  rate: number;
  liters: number;
  billAmount: number;
  carry: number;
  paidNow: number;
  totalReceived: number;
  remaining: number;
  billNo?: number | string;
  shopTitle?: string;
  ownerName?: string;
  shopPhone?: string;
}

const esc = (val: unknown): string =>
  String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (n: number | undefined | null): string => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  return Math.round(num).toLocaleString('en-US');
};

const qty = (n: number | undefined | null): string => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(2)));
};

const sharedAquaStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: #f0f9ff;
    font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', 'Inter', 'Segoe UI', Tahoma, sans-serif;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    width: 460px;
    padding: 10px;
    direction: rtl;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .slip {
    width: 430px;
    background: linear-gradient(180deg, #dcf4fd 0%, #e0f2fe 30%, #f0fdfa 70%, #d8f3fd 100%);
    border: 3px solid #0284c7;
    border-radius: 26px;
    box-shadow: 0 14px 40px rgba(2, 132, 199, 0.25), 0 0 20px rgba(56, 189, 248, 0.35);
    padding: 16px 14px 18px;
    color: #0f172a;
    overflow: hidden;
  }
  .header { text-align: center; padding-bottom: 4px; }
  .bottle-wrap { display: flex; justify-content: center; margin-bottom: 4px; }
  .shop-title {
    font-size: 26px;
    font-weight: 900;
    color: #0c2e5e;
    line-height: 1.9;
    margin: 0;
  }
  .owner-pill {
    display: inline-block;
    margin-top: 2px;
    padding: 2px 18px;
    border-radius: 9999px;
    border: 2px solid #0284c7;
    background: #0c4a7e;
    color: #ffffff;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.7;
  }
  .receipt-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    padding: 3px 16px;
    border-radius: 9999px;
    background: #0284c7;
    color: #ffffff;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.7;
  }
  .card {
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 12px;
    border: 2px solid #0284c7;
    background: #ffffff;
  }
  .mobile-box {
    margin-top: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .mobile-left {
    display: flex;
    align-items: center;
    gap: 8px;
    direction: ltr;
  }
  .circle-icon {
    width: 28px;
    height: 28px;
    border-radius: 9999px;
    background: #0284c7;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sq-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #e0f2fe;
    border: 1px solid #0284c7;
    color: #0284c7;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sq-icon-solid {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #0284c7;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .mobile-num {
    font-family: 'Inter', 'Segoe UI', monospace;
    font-size: 19px;
    font-weight: 900;
    color: #0c2e5e;
    letter-spacing: 0.4px;
  }
  .mobile-lbl {
    font-size: 12px;
    font-weight: 800;
    color: #0c2e5e;
    border-right: 2px solid rgba(2, 132, 199, 0.3);
    padding-right: 10px;
  }
  .info-box {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .info-left {
    display: flex;
    align-items: center;
    gap: 8px;
    border-left: 2px solid rgba(2, 132, 199, 0.3);
    padding-left: 8px;
  }
  .info-right {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-right: 4px;
  }
  .lbl { font-size: 10.5px; color: #64748b; font-weight: 700; line-height: 1.5; }
  .val-num { font-family: 'Inter', monospace; font-size: 21px; font-weight: 900; color: #0c2e5e; line-height: 1.1; }
  .val-sub { font-size: 10px; color: #0284c7; font-weight: 700; margin-top: 2px; line-height: 1.4; }
  .val-name { font-size: 19px; font-weight: 900; color: #0c2e5e; line-height: 1.6; word-break: break-word; }
  .grid-2 {
    margin-top: 8px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .card-cell {
    padding: 8px 10px;
    border-radius: 12px;
    border: 2px solid #0284c7;
    background: #ffffff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
  }
  .cell-right { text-align: right; }
  .cell-val {
    font-family: 'Inter', monospace;
    font-size: 18px;
    font-weight: 900;
    color: #0c2e5e;
    line-height: 1.3;
  }
  .unit { font-family: 'Noto Nastaliq Urdu', 'Segoe UI', sans-serif; font-size: 11px; color: #475569; font-weight: 700; }
  .total-banner {
    margin-top: 10px;
    padding: 10px 14px;
    border-radius: 16px;
    border: 2px solid #0284c7;
    background: linear-gradient(90deg, #e0f2fe 0%, #bae6fd 50%, #e0f2fe 100%);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .total-banner-emerald {
    margin-top: 10px;
    padding: 10px 14px;
    border-radius: 16px;
    border: 2px solid #059669;
    background: linear-gradient(90deg, #ecfdf5 0%, #d1fae5 50%, #ecfdf5 100%);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .check-circle {
    width: 42px;
    height: 42px;
    border-radius: 9999px;
    background: #ffffff;
    border: 2px solid #0284c7;
    color: #0284c7;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .total-lbl { font-size: 12px; font-weight: 900; color: #0c4a7e; line-height: 1.6; }
  .total-val { font-family: 'Inter', monospace; font-size: 28px; font-weight: 900; color: #0c2e5e; line-height: 1.1; }
  .warn-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 800;
    color: #0c2e5e;
    line-height: 1.7;
  }
  .bank-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .bank-badge {
    background: #0c4a7e;
    color: #ffffff;
    padding: 5px 10px;
    border-radius: 8px;
    font-weight: 900;
    font-size: 13px;
    font-family: 'Inter', sans-serif;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .bank-tag {
    background: #06b6d4;
    color: #ffffff;
    padding: 1px 4px;
    border-radius: 4px;
    font-size: 9.5px;
    font-family: 'Noto Nastaliq Urdu', sans-serif;
  }
  .note-box {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10.5px;
    color: #334155;
    line-height: 1.8;
    font-weight: 600;
  }
  .waves { margin-top: 10px; width: 100%; height: 20px; }
`;

const bottleSvg = `
<svg width="46" height="46" viewBox="0 0 64 64" fill="none">
  <rect x="22" y="8" width="14" height="6" rx="2" fill="#E2E8F0" stroke="#0284c7" stroke-width="1.5" />
  <path d="M20 14h18l4 8v32a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V22l4-8z" fill="#FFFFFF" fill-opacity="0.95" stroke="#0284c7" stroke-width="2" />
  <path d="M22 28c4 3 12 3 14 0v24a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V28z" fill="#38bdf8" fill-opacity="0.35" />
  <path d="M42 32h12l2 24a2 2 0 0 1-2 2H40a2 2 0 0 1-2-2l2-24h2z" fill="#FFFFFF" fill-opacity="0.95" stroke="#0284c7" stroke-width="1.5" />
</svg>`;

const wavesSvg = `
<svg viewBox="0 0 300 24" class="waves" fill="currentColor" preserveAspectRatio="none">
  <path d="M0 12 Q 25 24 50 12 T 100 12 T 150 12 T 200 12 T 250 12 T 300 12 V 24 H 0 Z" fill="#FFFFFF" fill-opacity="0.85" />
  <path d="M0 16 Q 25 6 50 16 T 100 16 T 150 16 T 200 16 T 250 16 T 300 16 V 24 H 0 Z" fill="#0284c7" fill-opacity="0.45" />
</svg>`;

/**
 * Builds self-contained HTML for Aqua/Cyan Bill matching ModernBillCard.tsx
 */
function buildBillHtml(data: BillRenderData): string {
  const shopTitle = esc(data.shopTitle || 'قاری ظفر اقبال ملک شاپ');
  const ownerName = esc(data.ownerName || 'حافظ مصعب ظفر');
  const contactPhone = esc(data.shopPhone || '0300-1234567');
  const accountTitle = esc(data.accountTitle || 'Hafiz Musab Zafar');
  const accountNumber = esc(data.accountNumber || '0210-1234567890');
  const customerName = esc(data.customerName || '');
  const monthLabel = esc(data.monthLabel || data.month || '');
  const billNo = esc(data.billNo || data.customerId || '28');

  const rateVal = Number(data.rate) || 0;
  const litersVal = Number(data.liters) || 0;
  const billAmt = Number.isFinite(Number(data.billAmount)) ? Number(data.billAmount) : Math.round(litersVal * rateVal);
  const carryVal = Number(data.carry) || 0;
  const receivedVal = Number(data.received) || 0;
  const payableVal = Number.isFinite(Number(data.payable))
    ? Number(data.payable)
    : Math.max(0, billAmt + carryVal - receivedVal);

  return `<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet">
  <style>${sharedAquaStyles}</style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="bottle-wrap">${bottleSvg}</div>
      <h1 class="shop-title">${shopTitle}</h1>
      <div class="owner-pill">${ownerName}</div>
    </div>

    <div class="card mobile-box">
      <div class="mobile-left">
        <div class="circle-icon">📞</div>
        <span class="mobile-num">${contactPhone}</span>
      </div>
      <span class="mobile-lbl">موبائل نمبر:</span>
    </div>

    <div class="card info-box">
      <div class="info-left">
        <div class="sq-icon-solid">📄</div>
        <div>
          <div class="lbl">بل نمبر:</div>
          <div class="val-num">${billNo}</div>
          <div class="val-sub">مہینہ: ${monthLabel}</div>
        </div>
      </div>
      <div class="info-right">
        <div class="lbl">بل نام:</div>
        <div class="val-name">${customerName}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card-cell">
        <div class="sq-icon">🥛</div>
        <div class="cell-right">
          <div class="lbl">فی لیٹر ریٹ:</div>
          <div class="cell-val">${rateVal} <span class="unit">روپے</span></div>
        </div>
      </div>
      <div class="card-cell">
        <div class="sq-icon">🫙</div>
        <div class="cell-right">
          <div class="lbl">کل دودھ:</div>
          <div class="cell-val" style="color: #0284c7;">${qty(litersVal)} <span class="unit">لیٹر</span></div>
        </div>
      </div>
    </div>

    <div class="card info-box">
      <div class="info-left">
        <div class="sq-icon" style="background: #fffbeb; border-color: #f59e0b; color: #d97706;">🪙</div>
        <div>
          <div class="lbl">سابقہ رقم:</div>
          <div class="cell-val" style="color: #d97706; font-size: 17px;">${money(carryVal)} <span class="unit">روپے</span></div>
        </div>
      </div>
      <div class="info-right">
        <div class="lbl">کل رقم دودھ:</div>
        <div class="cell-val" style="font-size: 17px;">${money(billAmt)} <span class="unit">روپے</span></div>
      </div>
    </div>

    ${receivedVal > 0 ? `
    <div class="card" style="display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border-color: #10b981;">
      <span class="lbl" style="color: #047857; font-size: 11px;">وصول شدہ رقم:</span>
      <span class="cell-val" style="color: #059669; font-size: 16px;">-${money(receivedVal)} <span class="unit" style="color: #047857;">روپے</span></span>
    </div>` : ''}

    <div class="total-banner">
      <div class="check-circle">✓</div>
      <div style="text-align: right;">
        <div class="total-lbl">کل قابل ادائیگی:</div>
        <div class="total-val">${money(payableVal)} <span class="unit" style="font-size: 16px; color: #0284c7;">روپے</span></div>
      </div>
    </div>

    <div class="card warn-banner">
      <span>📢</span>
      <span>بل ہر ماہ کی <span style="color: #0284c7;">5 تاریخ تک</span> ادا کریں، بصورت دیگر دودھ کی سپلائی بند کر دی جائے گی۔</span>
    </div>

    <div class="card bank-box">
      <div class="bank-badge">
        <span>faysalbank</span>
        <span class="bank-tag">فیصل</span>
      </div>
      <div style="font-size: 11px; direction: ltr; text-align: left;">
        <div style="font-family: 'Inter', monospace; font-weight: 900; color: #0c2e5e; font-size: 12.5px;">
          <span style="color: #64748b; font-weight: 600; font-size: 10px;">A/C:</span> ${accountNumber}
        </div>
        <div style="font-size: 10px; color: #334155; font-weight: 700;">
          <span style="color: #64748b; font-weight: 500;">Title:</span> ${accountTitle}
        </div>
      </div>
    </div>

    <div class="card note-box">
      <div class="sq-icon" style="width: 28px; height: 28px;">🏦</div>
      <div>
        آن لائن رقم کی ادائیگی کے لیے میزان بینک اکاؤنٹ میں رقم ٹرانسفر کریں۔ ادائیگی کی رسید اس نمبر <b dir="ltr" style="color: #0284c7; font-family: 'Inter', monospace;">${contactPhone}</b> پر واٹس ایپ کریں۔
      </div>
    </div>

    ${wavesSvg}
  </div>
</body>
</html>`;
}

/**
 * Builds self-contained HTML for Aqua/Cyan Receiving Receipt matching ModernReceiptCard.tsx
 */
function buildReceiptHtml(data: ReceiptRenderData): string {
  const shopTitle = esc(data.shopTitle || 'قاری ظفر اقبال ملک شاپ');
  const ownerName = esc(data.ownerName || 'حافظ مصعب ظفر');
  const contactPhone = esc(data.shopPhone || '0300-1234567');
  const customerName = esc(data.customerName || '');
  const monthLabel = esc(data.monthLabel || data.month || '');
  const billNo = esc(data.billNo || data.receiptNumber || data.customerId || '28');

  const rateVal = Number(data.rate) || 0;
  const litersVal = Number(data.liters) || 0;
  const billAmt = Number.isFinite(Number(data.billAmount)) ? Number(data.billAmount) : Math.round(litersVal * rateVal);
  const carryVal = Number(data.carry) || 0;
  const totalBillVal = billAmt + carryVal;
  const paidVal = (Number(data.paidNow) || 0) > 0 ? Number(data.paidNow) : (Number(data.totalReceived) || 0);
  const remainingVal = Math.max(0, Number(data.remaining) || 0);

  return `<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet">
  <style>${sharedAquaStyles}</style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="bottle-wrap">${bottleSvg}</div>
      <h1 class="shop-title">${shopTitle}</h1>
      <div class="owner-pill">${ownerName}</div>
      <div>
        <div class="receipt-pill">✓ رسید وصولی رقم (Payment Receipt)</div>
      </div>
    </div>

    <div class="card mobile-box">
      <div class="mobile-left">
        <div class="circle-icon">📞</div>
        <span class="mobile-num">${contactPhone}</span>
      </div>
      <span class="mobile-lbl">موبائل نمبر:</span>
    </div>

    <div class="card info-box">
      <div class="info-left">
        <div class="sq-icon-solid">📄</div>
        <div>
          <div class="lbl">بل نمبر:</div>
          <div class="val-num">${billNo}</div>
          <div class="val-sub">مہینہ: ${monthLabel}</div>
        </div>
      </div>
      <div class="info-right">
        <div class="lbl">بل نام:</div>
        <div class="val-name">${customerName}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card-cell">
        <div class="sq-icon">🥛</div>
        <div class="cell-right">
          <div class="lbl">فی لیٹر ریٹ:</div>
          <div class="cell-val">${rateVal} <span class="unit">روپے</span></div>
        </div>
      </div>
      <div class="card-cell">
        <div class="sq-icon">🫙</div>
        <div class="cell-right">
          <div class="lbl">کل دودھ:</div>
          <div class="cell-val" style="color: #0284c7;">${qty(litersVal)} <span class="unit">لیٹر</span></div>
        </div>
      </div>
    </div>

    <div class="card info-box">
      <div class="info-left">
        <div class="sq-icon" style="background: #fffbeb; border-color: #f59e0b; color: #d97706;">🪙</div>
        <div>
          <div class="lbl">سابقہ رقم:</div>
          <div class="cell-val" style="color: #d97706; font-size: 17px;">${money(carryVal)} <span class="unit">روپے</span></div>
        </div>
      </div>
      <div class="info-right">
        <div class="lbl">کل رقم دودھ:</div>
        <div class="cell-val" style="font-size: 17px;">${money(billAmt)} <span class="unit">روپے</span></div>
      </div>
    </div>

    <div class="card" style="display: flex; justify-content: space-between; align-items: center; background: #e0f2fe;">
      <div class="cell-val" style="color: #0c2e5e; font-size: 18px;">${money(totalBillVal)} <span class="unit">روپے</span></div>
      <span class="lbl" style="color: #0c4a7e; font-size: 12px;">کل بل (دودھ + سابقہ):</span>
    </div>

    <div class="total-banner-emerald">
      <div class="check-circle" style="border-color: #059669; color: #059669;">✓</div>
      <div style="text-align: right;">
        <div class="total-lbl" style="color: #065f46;">ادائیگی شدہ رقم:</div>
        <div class="total-val" style="color: #064e3b;">${money(paidVal)} <span class="unit" style="font-size: 16px; color: #047857;">روپے</span></div>
      </div>
    </div>

    <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
      <div class="cell-val" style="color: #d97706; font-size: 19px;">${money(remainingVal)} <span class="unit">روپے</span></div>
      <span class="lbl" style="color: #0c2e5e; font-size: 12px;">باقی رقم:</span>
    </div>

    <div class="card" style="text-align: center;">
      <div style="font-size: 20px; font-weight: 900; color: #0284c7; line-height: 1.7;">شکریہ</div>
      <div style="font-size: 11px; font-weight: 700; color: #475569; line-height: 1.6;">خالص دودھ و تازہ دہی کا بااعتماد مرکز • تشریف لانے کا شکریہ!</div>
    </div>

    ${wavesSvg}
  </div>
</body>
</html>`;
}

async function renderHtmlToPng(
  html: string,
  outDir: string,
  fileName: string
): Promise<{ success: boolean; filePath?: string; buffer?: Buffer; error?: string }> {
  let offscreenWin: BrowserWindow | null = null;
  try {
    offscreenWin = new BrowserWindow({
      width: 470,
      height: 980,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: {
        offscreen: true,
        contextIsolation: true,
      },
    });

    await offscreenWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Wait for Google Fonts (with a 1500ms timeout fallback for offline usage) and measure exact slip bounds
    const bounds = await offscreenWin.webContents.executeJavaScript(`
      new Promise(async (resolve) => {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise((r) => setTimeout(r, 1500))
          ]);
        } catch (e) {}
        await new Promise((r) => setTimeout(r, 150));
        const el = document.querySelector('.slip');
        if (!el) {
          resolve({ x: 0, y: 0, width: 460, height: 740 });
        } else {
          const rect = el.getBoundingClientRect();
          resolve({
            x: Math.max(0, Math.floor(rect.left) - 10),
            y: Math.max(0, Math.floor(rect.top) - 10),
            width: Math.ceil(rect.width) + 20,
            height: Math.ceil(rect.height) + 20,
          });
        }
      });
    `);

    const image = await offscreenWin.webContents.capturePage(bounds);
    const pngBuffer = image.toPNG();

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const filePath = path.join(outDir, fileName);
    fs.writeFileSync(filePath, pngBuffer);

    return {
      success: true,
      filePath,
      buffer: pngBuffer,
    };
  } catch (err: any) {
    console.error('[BillImageGenerator] Offscreen render error:', err);
    return {
      success: false,
      error: err.message || 'Failed to render offscreen image',
    };
  } finally {
    if (offscreenWin && !offscreenWin.isDestroyed()) {
      offscreenWin.close();
      offscreenWin = null;
    }
  }
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
  const html = buildBillHtml(data);
  const safeMonth = (data.month || 'month').replace(/[^a-zA-Z0-9_-]/g, '_');
  const billsDir = path.join(app.getPath('userData'), 'bills', safeMonth);
  return renderHtmlToPng(html, billsDir, `bill_customer_${data.customerId}_${safeMonth}.png`);
}

/**
 * Renders the receiving receipt card using offscreen Electron BrowserWindow and captures a PNG buffer
 */
export async function generateReceiptImage(data: ReceiptRenderData): Promise<{
  success: boolean;
  filePath?: string;
  buffer?: Buffer;
  error?: string;
}> {
  const html = buildReceiptHtml(data);
  const safeMonth = (data.month || 'month').replace(/[^a-zA-Z0-9_-]/g, '_');
  const receiptsDir = path.join(app.getPath('userData'), 'receipts', safeMonth);
  return renderHtmlToPng(html, receiptsDir, `receipt_customer_${data.customerId}_${safeMonth}.png`);
}
