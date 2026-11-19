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

/**
 * Builds self-contained HTML for ModernBillCard rendering
 */
function buildBillHtml(data: BillRenderData): string {
  const shopTitle = data.shopTitle || 'قاری ظفر اقبال ملک شاپ';
  const ownerName = data.ownerName || 'حافظ مصعب ظفر';
  const shopPhone = data.shopPhone || '+92 321 0001168';
  const bankName = data.bankName || 'میزان بینک';
  const accountTitle = data.accountTitle || 'حافظ مصعب ظفر';
  const accountNumber = data.accountNumber || '02090111954760';

  const money = (n: number) => Math.round(n || 0).toLocaleString('en-US');
  const qty = (n: number) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(2));

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
      <span class="label" style="font-weight: bold;">موبائل نمبر:</span>
    </div>

    <!-- Bill No & Customer -->
    <div class="box grid-2">
      <div style="border-left: 1px solid rgba(0,210,255,0.3); padding-left: 8px;">
        <div class="label">بل نمبر: <strong class="value">${data.billNo || data.customerId}</strong></div>
        <div class="label highlight">${data.monthLabel}</div>
      </div>
      <div>
        <div class="label">بل بنام:</div>
        <div class="value" style="font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.customerName}</div>
      </div>
    </div>

    <!-- Rate & Liters -->
    <div class="grid-2" style="margin-top: 8px;">
      <div class="box flex-between">
        <span class="label">فی لیٹر ریٹ:</span>
        <span class="value">${data.rate} روپے</span>
      </div>
      <div class="box flex-between">
        <span class="label">کل دودھ:</span>
        <span class="value highlight">${qty(data.liters)} لیٹر</span>
      </div>
    </div>

    <!-- Arrears & Milk Amount -->
    <div class="box grid-2">
      <div style="border-left: 1px solid rgba(0,210,255,0.3); padding-left: 8px;">
        <div class="label">سابقہ رقم:</div>
        <span class="value amber">${money(data.carry)} روپے</span>
      </div>
      <div>
        <div class="label">کل رقم دودھ:</div>
        <span class="value">${money(data.billAmount)} روپے</span>
      </div>
    </div>

    <!-- Total Payable -->
    <div class="payable-box flex-between">
      <div style="font-size: 13px; font-weight: 900; color: #a5f3fc;">کل بل ادائیگی:</div>
      <div class="payable-amount">${money(data.payable)} <span style="font-size: 16px; color: #00d2ff;">روپے</span></div>
    </div>

    <!-- Warning -->
    <div class="warning">
      بل ہر ماہ کی <span style="color: #00d2ff;">5 تاریخ</span> تک ادا کریں، بصورت دیگر دودھ کی سپلائی بند کر دی جائے گی۔
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
