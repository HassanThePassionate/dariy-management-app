export interface BillMessageParams {
  customerName: string;
  monthLabel: string;
  liters: number;
  rate: number;
  billAmount: number;
  carry?: number;
  received?: number;
  payable: number;
  shopTitle?: string;
  ownerName?: string;
  shopPhone?: string;
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
}

export function buildUrduBillMessage(params: BillMessageParams): string {
  const shopTitle = params.shopTitle || 'قاری ظفر ملک شاپ';
  const owner = params.ownerName || 'حافظ مصعب ظفر';
  const phone = params.shopPhone || '+92 321 0001168';
  const bank = params.bankName || 'میزان بینک';
  const accTitle = params.accountTitle || 'حافظ مصعب ظفر';
  const accNo = params.accountNumber || '02090111954760';

  const round = (n: number) => Math.round(n || 0).toLocaleString('en-US');
  const qty = (n: number) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(2));

  return `بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ

🥛 *${shopTitle}*
پروپرائٹر: ${owner} | رابطہ: ${phone}
━━━━━━━━━━━━━━━━━━
محترم جناب *${params.customerName}* صاحب،
السلام علیکم ورحمۃ اللہ!
آپ کا ماہانہ دودھ کا بل برائے *${params.monthLabel}* درج ذیل ہے:

▫️ *کل دودھ:* ${qty(params.liters)} لٹر
▫️ *نرخ (ریٹ):* ${round(params.rate)} روپے فی لٹر
▫️ *ماہانہ بل:* ${round(params.billAmount)} روپے
${params.carry ? `▫️ *سابقہ بقایا:* ${round(params.carry)} روپے\n` : ''}▫️ *وصول شدہ رقم:* ${round(params.received || 0)} روپے
──────────────────
🔴 *کل واجب الادا رقم:* *${round(params.payable)} روپے*
──────────────────

🏦 *بینک اکاؤنٹ برائے ادائیگی:*
• بینک: ${bank}
• اکاؤنٹ ٹائٹل: ${accTitle}
• اکاؤنٹ نمبر: ${accNo}

شکریہ! برائے مہربانی بل کی رقم جلد ادا فرما کر تعاون فرمائیں۔
جزاک اللہ خیراً!`;
}
