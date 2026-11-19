import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Send,
  Wallet,
  CheckCircle2,
  Printer,
  Phone,
  Calendar,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Receipt,
  User,
  Clock,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { BillSettings } from '../types/electron';
import { ModernBillCard } from './ModernBillCard';
import { ModernReceiptCard } from './ModernReceiptCard';

interface KhataPayBillModalProps {
  isOpen: boolean;
  mode: 'pay' | 'bill';
  customerId?: number;
  customerName: string;
  phone: string;
  monthLabel: string;
  rate: number;
  liters: number;
  bill: number;
  carry: number;
  /** Total received so far this month (updates after a payment) */
  received: number;
  dayEntries: Record<number, number>;
  onPay: (amount: number) => Promise<void>;
  onClose: () => void;
  autoPrint?: boolean;
}

const money = (n: number | undefined | null) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
};

const qty = (n: number | undefined | null) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
};

// 0300-1234567 -> 923001234567 (Pakistan default)
const toWhatsAppNumber = (raw: string) => {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '92' + d.slice(1);
  return d;
};

const formatIssueDate = (d = new Date(), ur = true) => {
  try {
    return d.toLocaleDateString(ur ? 'ur-PK' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }
};

const formatTime = (d = new Date()) => {
  try {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
};

export const KhataPayBillModal: React.FC<KhataPayBillModalProps> = ({
  isOpen,
  mode,
  customerId,
  customerName,
  phone,
  monthLabel,
  rate,
  liters,
  bill,
  carry,
  received,
  dayEntries,
  onPay,
  onClose,
  autoPrint,
}) => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [stage, setStage] = useState<'form' | 'slip'>('form');
  const [amount, setAmount] = useState('');
  const [paidNow, setPaidNow] = useState(0);
  const [initialReceived, setInitialReceived] = useState(received);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');

  // Live bill & bank settings
  const [settings, setSettings] = useState<BillSettings>({
    shop_title: 'قاری ظفر اقبال ملک شاپ',
    owner_name: 'حافظ مصعب ظفر',
    phone: '+92 321 0001168',
    bank_name: 'میزان بینک',
    account_title: 'حافظ مصعب ظفر',
    account_number: '02090111954760',
  });

  const totalBill = (carry || 0) + (bill || 0);
  const payableBefore = Math.max(0, totalBill - (received || 0));

  const isPaymentReceipt = mode === 'pay' && stage === 'slip';

  // Accurate calculation that avoids doubling:
  // When in slip mode right after paying, totalReceived = initialReceived + paidNow.
  // Otherwise, use received prop.
  const currentTotalReceived = isPaymentReceipt && paidNow > 0
    ? (initialReceived + paidNow)
    : (received || 0);

  const currentRemaining = totalBill - currentTotalReceived;

  const issueDateStr = formatIssueDate(new Date(), ur);
  const currentTimeStr = formatTime(new Date());

  useEffect(() => {
    if (!isOpen) return;

    setStage(mode === 'pay' ? 'form' : 'slip');
    setAmount('');
    setPaidNow(0);
    setError('');
    setInitialReceived(received);
    setReceiptNumber(
      `RCP-${customerId || '0'}-${Math.floor(Date.now() / 1000).toString().slice(-4)}`
    );

    // Load active bill & bank settings
    if (window.electronAPI) {
      window.electronAPI
        .getBillSettings()
        .then((s) => {
          if (s) setSettings(s);
        })
        .catch(() => {});
    }

    if (autoPrint) {
      setTimeout(() => {
        window.print();
      }, 350);
    }
  }, [isOpen, mode, customerId, customerName, autoPrint]);

  if (!isOpen) return null;

  const entered = parseFloat(amount) || 0;
  const remainingPreview = payableBefore - entered;

  const handlePay = async () => {
    setError('');
    if (!(entered > 0)) {
      setError(ur ? 'درست رقم درج کریں' : 'Enter a valid amount');
      return;
    }
    setBusy(true);
    try {
      await onPay(entered);
      setPaidNow(entered);
      setStage('slip');
    } catch (e: any) {
      setError(e?.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- WhatsApp text builder ---------------- */
  const buildWhatsAppText = () => {
    if (isPaymentReceipt) {
      // Payment Receipt message
      const lines = [
        `*${settings.shop_title}*`,
        ur ? '🌟 *ادائیگی کی تصدیقی رسید (PAYMENT RECEIPT)*' : '🌟 *OFFICIAL PAYMENT RECEIPT*',
        '--------------------------------',
        `${ur ? 'رسید نمبر' : 'Receipt #'}: ${receiptNumber}`,
        `${ur ? 'تاریخ و وقت' : 'Date & Time'}: ${issueDateStr}, ${currentTimeStr}`,
        `${ur ? 'گاہک کا نام' : 'Customer'}: ${customerName}`,
        `${ur ? 'مہینہ' : 'Month'}: ${monthLabel}`,
        '--------------------------------',
        `🧾 *${ur ? 'کل بل بنتا تھا' : 'Total Bill'}: Rs. ${money(totalBill)}*`,
        `💵 *${ur ? 'ابھی ادا شدہ رقم' : 'Amount Paid Now'}: Rs. ${money(paidNow)}*`,
        `${ur ? 'کل وصولی اس ماہ' : 'Total Received This Month'}: Rs. ${money(currentTotalReceived)}`,
        `📌 *${ur ? 'باقی واجب الادا رقم' : 'Remaining Balance Due'}: Rs. ${money(currentRemaining > 0 ? currentRemaining : 0)}*`,
        '--------------------------------',
        currentRemaining <= 0
          ? (ur ? `✓ آپ کا کل بل Rs. ${money(totalBill)} بنتا تھا، جو مکمل ادا ہو چکا ہے۔ کھاتہ مکمل ادا شدہ (Fully Cleared) ہے۔ شکریہ!` : '✓ Bill is fully cleared. Thank you!')
          : (ur ? `⚠️ آپ کا کل بل Rs. ${money(totalBill)} بنتا تھا، آپ نے Rs. ${money(paidNow)} ادا کیا ہے، اور باقی Rs. ${money(currentRemaining)} واجب الادا ہے۔` : `⚠️ Remaining balance due: Rs. ${money(currentRemaining)}`),
        '--------------------------------',
        `*${settings.shop_title}* - ${settings.phone}`,
      ];
      return lines.join('\n');
    }

    // Monthly Bill message
    const billRemaining = totalBill - received;
    const isPaid = billRemaining <= 0 && (totalBill > 0 || received > 0);
    const isPartial = received > 0 && billRemaining > 0;

    const days = Object.keys(dayEntries)
      .map(Number)
      .sort((a, b) => a - b)
      .map((d) => `${d}:${qty(dayEntries[d])}`)
      .join('  ');

    const lines = [
      `*${settings.shop_title}*`,
      ur ? '📋 *ماہانہ دودھ کا بل (MONTHLY BILL)*' : '📋 *MONTHLY MILK BILL*',
      '--------------------------------',
      `${ur ? 'کھاتہ نمبر' : 'Khata #'}: #${customerId || 1}`,
      `${ur ? 'بل بنام' : 'Customer'}: ${customerName}`,
      `${ur ? 'بل ماہ' : 'Month'}: ${monthLabel}`,
      `${ur ? 'تاریخ اجرا' : 'Issue Date'}: ${issueDateStr}`,
      '--------------------------------',
      `🥛 *${ur ? 'کل دودھ' : 'Total Milk'}: ${qty(liters)} Ltr*`,
      `💰 *${ur ? 'ریٹ فی لیٹر' : 'Rate / Ltr'}: Rs. ${rate}/L*`,
      `🧾 ${ur ? 'اس ماہ کا بل' : 'This Month Bill'}: Rs. ${money(bill)}`,
      carry !== 0 ? `⏳ ${ur ? 'سابقہ بقایا' : 'Previous Balance'}: Rs. ${money(carry)}` : '',
      `✨ *${ur ? 'کل بل بنتا تھا' : 'TOTAL BILL'}: Rs. ${money(totalBill)}*`,
      received > 0 ? `💵 ${ur ? 'وصول شدہ رقم' : 'Amount Received'}: Rs. ${money(received)}` : '',
      '--------------------------------',
      isPaid
        ? `✅ *${ur ? 'یہ بل مکمل ادا ہو چکا ہے (FULLY PAID)' : 'FULLY PAID'}*`
        : `📌 *${ur ? 'باقی واجب الادا رقم' : 'REMAINING BALANCE DUE'}: Rs. ${money(billRemaining)}*`,
      '--------------------------------',
      isPaid
        ? (ur ? `✓ آپ کا کل بل Rs. ${money(totalBill)} بنتا تھا، جو مکمل ادا ہو چکا ہے۔ کوئی بقایا واجب الادا نہیں ہے۔ شکریہ!` : '✓ Bill is fully cleared. Thank you!')
        : isPartial
        ? (ur ? `⚠️ آپ کا کل بل Rs. ${money(totalBill)} بنتا تھا، آپ نے Rs. ${money(received)} ادا کیا ہے، اور باقی Rs. ${money(billRemaining)} واجب الادا ہے۔` : `⚠️ Partially paid. Remaining balance: Rs. ${money(billRemaining)}`)
        : (ur ? '⚠️ *نوٹ: بل ہر ماہ کی 5 تاریخ تک ادا کر دیں تاکہ دودھ کی فراہمی بلا تعطل جاری رہ سکے۔*' : 'Note: Please pay by 5th of the month to ensure uninterrupted milk supply.'),
    ].filter(Boolean);

    if (billRemaining > 0) {
      lines.push(
        '',
        `🏦 *${ur ? 'آنلائن ادائیگی کی تفصیلات' : 'Online Bank Transfer Details'}:*`,
        `${ur ? 'بینک کا نام' : 'Bank'}: ${settings.bank_name}`,
        `${ur ? 'اکاؤنٹ ٹائٹل' : 'Title'}: ${settings.account_title}`,
        `${ur ? 'اکاؤنٹ نمبر' : 'Account/IBAN'}: ${settings.account_number}`,
        `📲 *${ur ? 'رقم ٹرانسفر کے بعد سکرین شاٹ اس نمبر پر بھیجیں' : 'Send transfer screenshot to'}: ${settings.owner_name} (${settings.phone})*`
      );
    }

    if (days) {
      lines.push('', `📅 ${ur ? 'روزانہ دودھ کی تفصیل (دن:لیٹر)' : 'Daily Milk Breakdown (day:ltr)'}:`, days);
    }

    lines.push('', ur ? 'خالص دودھ و تازہ دہی کا بااعتماد مرکز • شکریہ!' : 'Pure Milk & Fresh Yogurt Center • Thank you!');
    return lines.join('\n');
  };

  const sendWhatsApp = async () => {
    const number = toWhatsAppNumber(phone || '');
    if (!number) {
      setError(ur ? 'اس گاہک کا درست فون یا واٹس ایپ نمبر موجود نہیں' : 'This customer has no valid WhatsApp number');
      return;
    }
    const text = buildWhatsAppText();
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    if (window.electronAPI) {
      await window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 md:p-3 overflow-y-auto print:static print:bg-white print:p-0">
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-[360px] md:max-w-[380px] w-full overflow-hidden border border-slate-200 flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Top Modal Navigation Header (Hidden in Print) */}
        <div className="bg-brand-600 text-white px-4 py-2.5 flex items-center justify-between shrink-0 print:hidden shadow-xs">
          <div className="flex items-center gap-2">
            {mode === 'pay' && stage === 'form' ? (
              <Wallet className="w-4 h-4 text-emerald-200" />
            ) : isPaymentReceipt ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <Receipt className="w-4 h-4 text-blue-200" />
            )}
            <div>
              <h2 className="text-xs font-black tracking-tight">
                {mode === 'pay' && stage === 'form'
                  ? ur ? 'گاہک سے وصولی درج کریں' : 'Collect Payment'
                  : isPaymentReceipt
                  ? ur ? 'ادائیگی کی رسید' : 'Payment Receipt'
                  : ur ? 'ماہانہ بل سلپ' : 'Monthly Bill Slip'}
              </h2>
              <p className="text-[10px] text-blue-100">
                {customerName} • {monthLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-brand-700/80 text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold print:hidden">
              {error}
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 1: PAYMENT ENTRY FORM                                     */}
          {/* ============================================================== */}
          {mode === 'pay' && stage === 'form' ? (
            <div className="space-y-4">
              {/* Current Status Overview */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">{ur ? 'گاہک' : 'Customer'}</span>
                  <span className="font-extrabold text-slate-800">{customerName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{ur ? 'اس ماہ کا بل' : 'This Month Bill'}</span>
                  <span className="font-bold text-slate-700">Rs. {money(bill)}</span>
                </div>
                {carry !== 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{ur ? 'پچھلا بقایا' : 'Previous Balance'}</span>
                    <span className="font-bold text-amber-700">Rs. {money(carry)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{ur ? 'کل بل بنتا تھا' : 'Total Bill'}</span>
                  <span className="font-black text-brand-700">Rs. {money(totalBill)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{ur ? 'پہلے سے وصول' : 'Already Received'}</span>
                  <span className="font-bold text-emerald-700">Rs. {money(received)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 font-extrabold">
                  <span className="text-slate-800">{ur ? 'کل واجب الادا رقم' : 'Net Payable'}</span>
                  <span className={`text-sm ${payableBefore > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    Rs. {money(payableBefore)}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  {ur ? 'کتنی رقم وصول ہوئی؟ (PKR) *' : 'Amount Received (PKR) *'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePay()}
                    placeholder="0"
                    className="flex-1 px-3.5 py-2.5 rounded-2xl border border-slate-200 text-base font-black focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-brand-700"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.max(0, Math.round(payableBefore))))}
                    className="px-4 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-black hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200 shadow-2xs"
                  >
                    {ur ? 'پوری رقم' : 'Full'}
                  </button>
                </div>

                {entered > 0 && (
                  <p
                    className={`text-[11px] font-bold mt-1.5 ${
                      remainingPreview > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {remainingPreview > 0
                      ? ur
                        ? `بقایا Rs. ${money(remainingPreview)} واجب الادا رہے گا`
                        : `Rs. ${money(remainingPreview)} will remain due`
                      : remainingPreview < 0
                      ? ur
                        ? `Rs. ${money(-remainingPreview)} پیشگی ایڈوانس جمع ہوگا`
                        : `Rs. ${money(-remainingPreview)} advance balance`
                      : ur
                      ? '✓ مکمل ادائیگی (کھاتہ مکمل کلیئر ہو جائے گا)'
                      : '✓ Fully Paid (Account will be cleared)'}
                  </p>
                )}
              </div>

              <button
                onClick={handlePay}
                disabled={busy}
                className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black text-sm shadow-md transition-all cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{busy ? 'محفوظ ہو رہا ہے...' : ur ? 'وصولی محفوظ کریں' : 'CONFIRM PAYMENT'}</span>
              </button>
            </div>
          ) : isPaymentReceipt ? (
            /* ============================================================== */
            /* VIEW 2: ULTRA-MODERN COMPACT PAYMENT RECEIPT (وصولی کی رسید)     */
            /* ============================================================== */
            <div className="space-y-2">
              <ModernReceiptCard
                receiptNumber={receiptNumber}
                customerName={customerName}
                phone={phone}
                monthLabel={monthLabel}
                issueDateStr={issueDateStr}
                currentTimeStr={currentTimeStr}
                rate={rate}
                liters={liters}
                carry={carry}
                totalBill={totalBill}
                paidNow={paidNow}
                totalReceived={currentTotalReceived}
                remaining={currentRemaining}
                settings={settings}
                ur={ur}
              />

              {/* Actions Toolbar */}
              <div className="grid grid-cols-2 gap-2 print:hidden pt-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs shadow transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{ur ? 'پرنٹ رسید' : 'Print Slip'}</span>
                </button>
                <button
                  type="button"
                  onClick={sendWhatsApp}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs shadow transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{ur ? 'واٹس ایپ' : 'WhatsApp'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer print:hidden transition-colors"
              >
                {ur ? 'بند کریں' : 'Close'}
              </button>
            </div>
          ) : (
            /* ============================================================== */
            /* VIEW 3: ULTRA-MODERN COMPACT BILL SLIP (ماہانہ بل سلپ)          */
            /* ============================================================== */
            <div className="space-y-2">
              <ModernBillCard
                customerId={customerId}
                customerName={customerName}
                phone={phone}
                monthLabel={monthLabel}
                issueDateStr={issueDateStr}
                rate={rate}
                liters={liters}
                bill={bill}
                carry={carry}
                received={received}
                payable={totalBill - (received || 0)}
                settings={settings}
                ur={ur}
              />

              {/* Actions Toolbar */}
              <div className="grid grid-cols-2 gap-2 print:hidden pt-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs shadow transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{ur ? 'پرنٹ بل' : 'Print Bill'}</span>
                </button>
                <button
                  type="button"
                  onClick={sendWhatsApp}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs shadow transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{ur ? 'واٹس ایپ' : 'WhatsApp'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer print:hidden transition-colors"
              >
                {ur ? 'بند کریں' : 'Close'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
