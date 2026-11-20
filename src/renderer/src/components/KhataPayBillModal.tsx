import React, { useEffect, useState } from 'react';
import {
  X,
  Send,
  Wallet,
  CheckCircle2,
  Printer,
  Receipt,
  FileText,
  CreditCard,
  Save,
  Check,
  Loader2,
  AlertCircle,
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
  monthKey?: string;
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
  monthKey,
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
  const [activeTab, setActiveTab] = useState<'bill' | 'receipt'>('bill');
  const [amount, setAmount] = useState('');
  const [paidNow, setPaidNow] = useState(0);
  const [initialReceived, setInitialReceived] = useState(received);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [sendingWa, setSendingWa] = useState(false);
  const [waSuccess, setWaSuccess] = useState(false);

  // Live bill & bank settings
  const [settings, setSettings] = useState<BillSettings>({
    shop_title: 'قاری ظفر ملک شاپ',
    owner_name: 'حافظ مصعب ظفر',
    phone: '+92 321 0001168',
    bank_name: 'میزان بینک',
    account_title: 'حافظ مصعب ظفر',
    account_number: '02090111954760',
  });

  // Account Number & Bank quick editing
  const [showAccountEditor, setShowAccountEditor] = useState(false);
  const [editBankName, setEditBankName] = useState(settings.bank_name);
  const [editAccountTitle, setEditAccountTitle] = useState(settings.account_title);
  const [editAccountNumber, setEditAccountNumber] = useState(settings.account_number);
  const [savedBadge, setSavedBadge] = useState(false);

  const totalBill = (carry || 0) + (bill || 0);
  const payableBefore = Math.max(0, totalBill - (received || 0));

  const isPaymentReceipt = mode === 'pay' && stage === 'slip';

  const currentTotalReceived =
    isPaymentReceipt && paidNow > 0 ? initialReceived + paidNow : received || 0;

  const currentRemaining = totalBill - currentTotalReceived;

  const issueDateStr = formatIssueDate(new Date(), ur);
  const currentTimeStr = formatTime(new Date());

  useEffect(() => {
    if (!isOpen) return;

    setStage(mode === 'pay' ? 'form' : 'slip');
    setActiveTab(mode === 'pay' ? 'receipt' : 'bill');
    setAmount('');
    setPaidNow(0);
    setError('');
    setShowAccountEditor(false);
    setSavedBadge(false);
    setInitialReceived(received);
    setReceiptNumber(
      `RCP-${customerId || '0'}-${Math.floor(Date.now() / 1000).toString().slice(-4)}`
    );

    // Load active bill & bank settings
    if (window.electronAPI) {
      window.electronAPI
        .getBillSettings()
        .then((s) => {
          if (s) {
            const resolved = {
              shop_title: s.shop_title || 'قاری ظفر ملک شاپ',
              owner_name: s.owner_name || 'حافظ مصعب ظفر',
              phone: s.phone || '+92 321 0001168',
              bank_name: s.bank_name || 'میزان بینک',
              account_title: s.account_title || 'حافظ مصعب ظفر',
              account_number: s.account_number || '02090111954760',
            };
            setSettings(resolved);
            setEditBankName(resolved.bank_name);
            setEditAccountTitle(resolved.account_title);
            setEditAccountNumber(resolved.account_number);
          }
        })
        .catch(() => {});
    }

    if (autoPrint) {
      setTimeout(() => {
        window.print();
      }, 400);
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
      setActiveTab('receipt');
    } catch (e: any) {
      setError(e?.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  };

  const saveCustomAccount = async () => {
    const updated = {
      ...settings,
      bank_name: editBankName.trim() || settings.bank_name,
      account_title: editAccountTitle.trim() || settings.account_title,
      account_number: editAccountNumber.trim() || settings.account_number,
    };
    setSettings(updated);
    if (window.electronAPI?.saveBillSettings) {
      try {
        await window.electronAPI.saveBillSettings(updated);
        setSavedBadge(true);
        setTimeout(() => setSavedBadge(false), 2500);
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }
  };

  /* ---------------- WhatsApp text builder ---------------- */
  const buildWhatsAppText = () => {
    if (activeTab === 'receipt' || isPaymentReceipt) {
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
        `💵 *${ur ? 'ابھی ادا شدہ رقم' : 'Amount Paid Now'}: Rs. ${money(paidNow > 0 ? paidNow : currentTotalReceived)}*`,
        `${ur ? 'کل وصولی اس ماہ' : 'Total Received This Month'}: Rs. ${money(currentTotalReceived)}`,
        `📌 *${ur ? 'باقی واجب الادا رقم' : 'Remaining Balance Due'}: Rs. ${money(currentRemaining > 0 ? currentRemaining : 0)}*`,
        '--------------------------------',
        currentRemaining <= 0
          ? ur
            ? `✓ آپ کا کل بل Rs. ${money(totalBill)} بنتا تھا، جو مکمل ادا ہو چکا ہے۔ کھاتہ مکمل کلیئر ہے۔ شکریہ!`
            : '✓ Bill is fully cleared. Thank you!'
          : ur
          ? `⚠️ آپ کا کل بل Rs. ${money(totalBill)} بنتا تھا، آپ نے Rs. ${money(paidNow > 0 ? paidNow : currentTotalReceived)} ادا کیا ہے، اور باقی Rs. ${money(currentRemaining)} واجب الادا ہے۔`
          : `⚠️ Remaining balance due: Rs. ${money(currentRemaining)}`,
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
      `${ur ? 'بل نمبر' : 'Bill #'}: #${customerId || 1}`,
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
        ? ur
          ? `✓ آپ کا کل بل Rs. ${money(totalBill)} بنتا تھا، جو مکمل ادا ہو چکا ہے۔ کوئی بقایا واجب الادا نہیں ہے۔ شکریہ!`
          : '✓ Bill is fully cleared. Thank you!'
        : isPartial
        ? ur
          ? `⚠️ آپ کا کل بل Rs. ${money(totalBill)} بنتا تھا، آپ نے Rs. ${money(received)} ادا کیا ہے، اور باقی Rs. ${money(billRemaining)} واجب الادا ہے۔`
          : `⚠️ Partially paid. Remaining balance: Rs. ${money(billRemaining)}`
        : ur
        ? '⚠️ *نوٹ: بل ہر ماہ کی 5 تاریخ تک ادا کر دیں تاکہ دودھ کی فراہمی بلا تعطل جاری رہ سکے۔*'
        : 'Note: Please pay by 5th of the month to ensure uninterrupted milk supply.',
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
    setError('');
    setWaSuccess(false);

    const urduDigits: Record<string, string> = {
      '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
      '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    };
    const normalized = (phone || '').replace(/[۰-۹٠-٩]/g, (d) => urduDigits[d] || d);
    const clean = normalized.replace(/\D/g, '');
    if (clean.length < 10) {
      setError(ur ? 'اس گاہک کا درست فون یا واٹس ایپ نمبر موجود نہیں ہے' : 'This customer has no valid WhatsApp number');
      return;
    }

    if (!window.electronAPI) return;

    try {
      const waStatus = await window.electronAPI.getWhatsAppStatus();
      if (!waStatus?.connected) {
        setError(
          ur
            ? 'واٹس ایپ منسلک نہیں ہے! براہ کرم پہلے اوپر ہیڈر سے واٹس ایپ QR کوڈ اسکین کر کے منسلک کریں'
            : 'WhatsApp is not connected. Please scan QR code in the header first.'
        );
        return;
      }

      setSendingWa(true);

      const payload = {
        customerId: customerId || 0,
        customerName: customerName,
        phone: phone,
        billMonth: monthKey || monthLabel,
        monthLabel: monthLabel,
        liters: liters,
        rate: rate,
        billAmount: bill,
        carry: carry || 0,
        received: currentTotalReceived,
        payable: currentRemaining > 0 ? currentRemaining : 0,
        accountNumber: settings.account_number || '02090111954760',
        whatsappConsent: true,
      };

      const res = await window.electronAPI.sendSingleBillDirect({
        item: payload,
        settings: settings,
      });

      if (res?.success) {
        setWaSuccess(true);
        setTimeout(() => setWaSuccess(false), 5000);
      } else {
        setError(ur ? `بل نہیں بھیجا جا سکا: ${res?.error || 'خرابی'}` : `Failed: ${res?.error || 'Error'}`);
      }
    } catch (err: any) {
      console.error('Error sending WhatsApp bill:', err);
      setError(ur ? 'واٹس ایپ پر بل بھیجنے میں خرابی ہوئی' : 'Failed to send WhatsApp message');
    } finally {
      setSendingWa(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 md:p-4 overflow-y-auto print:static print:bg-white print:p-0">
      {/* Expanded Width Modal Container (Spacious and Premium) */}
      <div className="bg-[#081028] text-white rounded-3xl shadow-2xl max-w-[820px] w-full overflow-hidden border border-emerald-500/40 flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:w-full print:bg-white print:text-black">
        {/* Top Modal Navigation Header (Hidden in Print) */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0 print:hidden shadow-sm border-b border-emerald-600/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white/10 border border-white/20">
              {mode === 'pay' && stage === 'form' ? (
                <Wallet className="w-5 h-5 text-emerald-300" />
              ) : activeTab === 'receipt' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              ) : (
                <Receipt className="w-5 h-5 text-teal-300" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">
                {mode === 'pay' && stage === 'form'
                  ? ur ? 'گاہک سے وصولی درج کریں' : 'Collect Payment'
                  : activeTab === 'receipt'
                  ? ur ? 'وصولی کی رسید (Receiving Slip)' : 'Payment Receipt'
                  : ur ? 'دودھ کا بل (Milk Bill)' : 'Monthly Milk Bill'}
              </h2>
              <p className="text-xs text-emerald-200">
                {customerName} • {monthLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher between Bill and Receipt when in slip stage */}
            {stage === 'slip' && (
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('bill')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'bill'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{ur ? 'بل (Bill)' : 'Bill'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('receipt')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'receipt'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{ur ? 'رسید (Receipt)' : 'Receipt'}</span>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3 md:p-5 space-y-4 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
          {error && (
            <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold print:hidden">
              {error}
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 1: PAYMENT ENTRY FORM                                     */}
          {/* ============================================================== */}
          {mode === 'pay' && stage === 'form' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Left Column: Input and actions */}
              <div className="space-y-4 bg-[#0c163b] p-5 rounded-2xl border border-blue-500/20 shadow-md">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-200">
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
                      className="flex-1 px-4 py-2.5 rounded-2xl border border-blue-500/40 bg-[#081028] text-lg font-black text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => setAmount(String(Math.max(0, Math.round(payableBefore))))}
                      className="px-4 rounded-2xl bg-emerald-600/30 text-emerald-300 text-xs font-black hover:bg-emerald-600/50 transition-colors cursor-pointer border border-emerald-500/40"
                    >
                      {ur ? 'مکمل رقم' : 'Full'}
                    </button>
                  </div>

                  {entered > 0 && (
                    <p
                      className={`text-xs font-bold mt-2 ${
                        remainingPreview > 0 ? 'text-amber-400' : 'text-emerald-400'
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
                        ? '✓ مکمل ادائیگی (کھاتہ کلیئر ہو جائے گا)'
                        : '✓ Fully Paid (Account cleared)'}
                    </p>
                  )}
                </div>

                <button
                  onClick={handlePay}
                  disabled={busy}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg transition-all cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{busy ? 'محفوظ ہو رہا ہے...' : ur ? 'وصولی محفوظ کریں' : 'CONFIRM PAYMENT'}</span>
                </button>
              </div>

              {/* Right Column: Status Breakdown */}
              <div className="rounded-2xl bg-[#0c163b] border border-blue-500/20 p-5 space-y-3 shadow-md">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-blue-500/20">
                  <span className="text-slate-400">{ur ? 'گاہک کا نام' : 'Customer'}</span>
                  <span className="font-extrabold text-white text-sm">{customerName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{ur ? 'اس ماہ کا بل' : 'This Month Bill'}</span>
                  <span className="font-bold text-slate-200">Rs. {money(bill)}</span>
                </div>
                {carry !== 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{ur ? 'پچھلا بقایا' : 'Previous Balance'}</span>
                    <span className="font-bold text-amber-400">Rs. {money(carry)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{ur ? 'کل بل بنتا تھا' : 'Total Bill'}</span>
                  <span className="font-black text-emerald-400">Rs. {money(totalBill)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{ur ? 'پہلے سے وصول شدہ' : 'Already Received'}</span>
                  <span className="font-bold text-teal-300">Rs. {money(received)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2.5 border-t border-blue-500/20 font-extrabold">
                  <span className="text-white">{ur ? 'کل واجب الادا رقم' : 'Net Payable'}</span>
                  <span className={`text-base font-black ${payableBefore > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    Rs. {money(payableBefore)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* VIEW 2: BILL & RECEIPT SHEET PRESENTATION                      */
            /* ============================================================== */
            <div className="space-y-4 flex flex-col items-center w-full">
              {/* Account Number & Bank Settings Quick Editor (No-Print) */}
              <div className="w-full no-print bg-[#0c163b] border border-emerald-500/30 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowAccountEditor(!showAccountEditor)}
                    className="flex items-center gap-2 text-xs font-bold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>
                      {ur
                        ? 'اکاؤنٹ نمبر اور بینک تفصیلات تبدیل کریں (Click to Edit Bank/Account)'
                        : 'Edit Account & Bank Details'}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-300 border border-emerald-500/30">
                      {showAccountEditor ? 'بند کریں' : 'تبدیل کریں ✏️'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>اکاؤنٹ نمبر:</span>
                    <b className="font-mono text-emerald-400">{settings.account_number}</b>
                  </div>
                </div>

                {showAccountEditor && (
                  <div className="pt-2 border-t border-blue-500/20 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {ur ? 'اکاؤنٹ نمبر / IBAN:' : 'Account Number:'}
                      </label>
                      <input
                        type="text"
                        value={editAccountNumber}
                        onChange={(e) => {
                          setEditAccountNumber(e.target.value);
                          setSettings({ ...settings, account_number: e.target.value });
                        }}
                        dir="ltr"
                        placeholder="02090111954760"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#081028] border border-blue-500/40 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {ur ? 'بینک کا نام / ایزی پیسہ:' : 'Bank Name:'}
                      </label>
                      <input
                        type="text"
                        value={editBankName}
                        onChange={(e) => {
                          setEditBankName(e.target.value);
                          setSettings({ ...settings, bank_name: e.target.value });
                        }}
                        placeholder="میزان بینک / EasyPaisa"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#081028] border border-blue-500/40 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {ur ? 'اکاؤنٹ ٹائٹل:' : 'Account Title:'}
                      </label>
                      <input
                        type="text"
                        value={editAccountTitle}
                        onChange={(e) => {
                          setEditAccountTitle(e.target.value);
                          setSettings({ ...settings, account_title: e.target.value });
                        }}
                        placeholder="حافظ مصعب ظفر"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#081028] border border-blue-500/40 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={saveCustomAccount}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors"
                      >
                        {savedBadge ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        <span>{savedBadge ? (ur ? 'محفوظ ہو گیا!' : 'Saved!') : (ur ? 'محفوظ کریں' : 'Save')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* The Live Document: ModernBillCard or ModernReceiptCard */}
              <div className="w-full flex justify-center overflow-x-auto">
                {activeTab === 'bill' ? (
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
                    accountNumber={settings.account_number}
                    bankName={settings.bank_name}
                    accountTitle={settings.account_title}
                    ur={ur}
                    onEditAccount={() => setShowAccountEditor(true)}
                  />
                ) : (
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
                    accountNumber={settings.account_number}
                    bankName={settings.bank_name}
                    accountTitle={settings.account_title}
                    ur={ur}
                    onEditAccount={() => setShowAccountEditor(true)}
                  />
                )}
              </div>

              {/* Success Notification */}
              {waSuccess && (
                <div className="w-full p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {ur
                      ? 'بل کی تصویر گاہک کے واٹس ایپ پر کامیابی سے بھیج دی گئی ہے!'
                      : 'Bill image sent to customer via WhatsApp!'}
                  </span>
                </div>
              )}

              {/* Actions Toolbar (Hidden in Print) */}
              <div className="grid grid-cols-2 gap-3 no-print w-full pt-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {activeTab === 'bill'
                      ? ur ? 'پرنٹ بل (Print Bill)' : 'Print Bill'
                      : ur ? 'پرنٹ رسید (Print Receipt)' : 'Print Slip'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={sendWhatsApp}
                  disabled={sendingWa}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {sendingWa ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : waSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>
                    {sendingWa
                      ? ur ? 'بل بھیجا جا رہا ہے...' : 'Sending...'
                      : waSuccess
                      ? ur ? 'بھیج دیا گیا! ✓' : 'Sent! ✓'
                      : ur ? '📱 واٹس ایپ پر تصویر بھیجیں' : 'Send WhatsApp Image'}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl bg-[#0c163b] hover:bg-slate-800 border border-blue-500/20 text-slate-300 text-xs font-bold cursor-pointer print:hidden transition-colors"
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
