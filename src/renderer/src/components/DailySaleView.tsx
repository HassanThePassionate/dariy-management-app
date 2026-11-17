import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Zap,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  Plus,
  Minus,
  X,
  Milk,
  Receipt,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { SaleItem } from '../types/electron';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateDisplay = (dateString: string, ur: boolean) => {
  try {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(ur ? 'ur-PK' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const money = (n: number) => Math.round(n).toLocaleString('en-US');
const qtyFmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

const PRESET_QUANTITIES = [0.5, 1, 1.5, 2, 2.5, 3, 5];

export const DailySaleView: React.FC = () => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [date, setDate] = useState<string>(todayStr());
  const [liters, setLiters] = useState<string>('2.5');
  const [rate, setRate] = useState<string>('240');
  const [customerName, setCustomerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Udhaar'>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<string>('');

  // Editing state
  const [editingSale, setEditingSale] = useState<{
    id: number;
    date: string;
    customer_name: string;
    quantity: string;
    rate: string;
    payment_method: string;
    notes: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // Fetch active milk rate from pricing/settings
  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI
      .getPricing()
      .then((p) => {
        if (p?.active_rate && p.active_rate > 0) {
          setRate(String(p.active_rate));
        } else {
          window.electronAPI
            ?.getSettings()
            .then((s) => {
              if (s?.default_rate) setRate(String(s.default_rate));
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Load sales for chosen date
  const load = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const data = await window.electronAPI.getPosSales(date);
      setSales(data || []);
    } catch (err) {
      console.error('Failed to load POS sales:', err);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const qty = parseFloat(liters) || 0;
  const rateNum = parseFloat(rate) || 0;
  const totalAmount = Math.round(qty * rateNum);

  const shiftDate = (days: number) => {
    const [y, m, d] = date.split('-').map(Number);
    const newDate = new Date(y, m - 1, d + days);
    setDate(
      `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(
        newDate.getDate()
      ).padStart(2, '0')}`
    );
  };

  const bumpQty = (delta: number) => {
    const next = Math.max(0.25, qty + delta);
    setLiters(qtyFmt(next));
  };

  // 1-Click Quick Sale Submission
  const handleSaveSale = async () => {
    setError('');
    if (!(qty > 0)) {
      setError(ur ? 'براہ کرم درست مقدار منتخب کریں' : 'Please select a valid milk quantity');
      return;
    }
    if (!(rateNum > 0)) {
      setError(ur ? 'براہ کرم درست ریٹ درج کریں' : 'Please enter a valid rate');
      return;
    }
    if (!window.electronAPI) return;

    setBusy(true);
    try {
      const defaultName =
        ur ? 'کاؤنٹر / واک ان گاہک (Walk-in Cash)' : 'کاؤنٹر / واک ان گاہک (Walk-in Cash)';
      const finalName = customerName.trim() || defaultName;

      const res = await window.electronAPI.addPosSale({
        date,
        customerName: finalName,
        quantity: qty,
        rate: rateNum,
        paymentMethod,
        notes: notes.trim(),
      });

      if (!res.success) throw new Error(res.error || 'Failed to save sale');

      showToast(
        ur
          ? `⚡ ${qtyFmt(qty)} L دودھ کی نقد سیل محفوظ ہو گئی!`
          : `⚡ ${qtyFmt(qty)} L Cash sale saved successfully!`
      );

      // Reset form options
      setCustomerName('');
      setNotes('');
      setPaymentMethod('Cash');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not save sale');
    } finally {
      setBusy(false);
    }
  };

  // Delete POS sale
  const handleDeleteSale = async (id: number) => {
    const msg = ur ? 'کیا آپ یہ سیل حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this sale?';
    if (!confirm(msg)) return;
    if (!window.electronAPI) return;

    try {
      await window.electronAPI.deletePosSale(id);
      showToast(ur ? 'سیل حذف ہو گئی' : 'Sale deleted');
      await load();
    } catch (err) {
      console.error('Failed to delete sale:', err);
    }
  };

  // Quick mark paid for Udhaar
  const handleMarkPaid = async (id: number) => {
    if (!window.electronAPI) return;
    await window.electronAPI.markPosPaid(id, 'Cash');
    showToast(ur ? 'نقد وصولی درج ہو گئی' : 'Marked as Paid (Cash)');
    await load();
  };

  // Save Edit Sale
  const handleSaveEdit = async () => {
    if (!editingSale || !window.electronAPI) return;
    const eq = parseFloat(editingSale.quantity) || 0;
    const er = parseFloat(editingSale.rate) || 0;
    if (eq <= 0) {
      alert(ur ? 'درست مقدار درج کریں' : 'Please enter valid quantity');
      return;
    }
    if (er <= 0) {
      alert(ur ? 'درست ریٹ درج کریں' : 'Please enter valid rate');
      return;
    }

    try {
      await window.electronAPI.updatePosSale({
        id: editingSale.id,
        date: editingSale.date,
        customerName: editingSale.customer_name,
        quantity: eq,
        rate: er,
        paymentMethod: editingSale.payment_method,
        notes: editingSale.notes,
      });
      setEditingSale(null);
      showToast(ur ? 'سیل اپڈیٹ ہو گئی' : 'Sale updated successfully');
      await load();
    } catch (err) {
      console.error('Failed to update sale:', err);
    }
  };

  // Summary calculation for selected date
  const summary = useMemo(() => {
    let totalLtr = 0;
    let totalRs = 0;
    let paidRs = 0;
    let paidCount = 0;
    let udhaarRs = 0;
    let udhaarCount = 0;

    for (const s of sales) {
      totalLtr += s.quantity;
      const amt = s.total_amount || 0;
      totalRs += amt;
      if (s.payment_status === 'Paid' || s.payment_method === 'Cash') {
        paidRs += amt;
        paidCount++;
      } else {
        udhaarRs += amt;
        udhaarCount++;
      }
    }

    return {
      liters: totalLtr,
      total: totalRs,
      paidAmount: paidRs,
      paidCount,
      udhaarAmount: udhaarRs,
      udhaarCount,
      count: sales.length,
    };
  }, [sales]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold text-slate-800">
                {ur ? 'روزانہ فوری کاؤنٹر سیل' : 'Daily Quick Cash Sales'}
              </h1>
              <p className="text-[11px] text-slate-400">
                {ur
                  ? 'واک ان گاہکوں کے لیے فوری کاؤنٹر نقد سیل اور آج کی فروخت کا لاگ'
                  : "Instant counter cash sales for walk-in customers and today's deliveries log"}
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            title="Previous Day"
            className="p-1.5 rounded-xl hover:bg-white text-slate-600 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            />
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-brand-700 whitespace-nowrap">
              {formatDateDisplay(date, ur)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => shiftDate(1)}
            title="Next Day"
            className="p-1.5 rounded-xl hover:bg-white text-slate-600 cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {date !== todayStr() && (
            <button
              type="button"
              onClick={() => setDate(todayStr())}
              className="px-2.5 py-1 rounded-xl bg-brand-600 text-white text-[10px] font-bold hover:bg-brand-700 cursor-pointer transition-colors"
            >
              {ur ? 'آج' : 'Today'}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Panel (POS Form) & Right Panel (Sales Log Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Panel: ⚡ Quick Counter Cash Sale */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <h2 className="text-sm font-extrabold text-slate-800">
                    {ur ? 'فوری کاؤنٹر نقد سیل' : 'Quick Counter Cash Sale'}
                  </h2>
                </div>
                {/* Active Milk Rate badge */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-100 text-brand-700 text-[11px] font-bold">
                  <Milk className="w-3.5 h-3.5" />
                  <span>
                    Milk (Rs. {rate}/L)
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {ur
                  ? 'صرف مقدار پر کلک کریں اور 1 کلک میں نقد سیل محفوظ کریں'
                  : 'Just select quantity and save cash sale in 1 click'}
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Preset Quantity Buttons */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                {ur ? 'دودھ کی مقدار منتخب کریں:' : 'Select Milk Quantity:'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_QUANTITIES.map((q) => {
                  const isSelected = qty === q;
                  const itemPrice = Math.round(q * rateNum);
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setLiters(String(q))}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-brand-600 border-brand-600 text-white shadow-md scale-102 ring-2 ring-brand-300'
                          : 'bg-slate-50 border-slate-200 hover:bg-brand-50/50 hover:border-brand-200 text-slate-800'
                      }`}
                    >
                      <span className={`text-sm font-extrabold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {q} L
                      </span>
                      <span
                        className={`text-[10px] font-semibold mt-0.5 ${
                          isSelected ? 'text-brand-100' : 'text-slate-500'
                        }`}
                      >
                        Rs. {money(itemPrice)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Qty & Rate row */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {ur ? 'مخصوص مقدار (Custom Qty):' : 'Custom Qty:'}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => bumpQty(-0.5)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.25"
                      min="0.1"
                      value={liters}
                      onChange={(e) => setLiters(e.target.value)}
                      className="w-full text-center py-2 px-1 rounded-xl border border-slate-200 text-sm font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      ltr
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => bumpQty(0.5)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {ur ? 'ریٹ فی لیٹر (Rate):' : 'Rate / Liter:'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-sm font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                    PKR
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method (Cash or Udhaar) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-600">{ur ? 'ادائیگی کا طریقہ:' : 'Payment Mode:'}</span>
                <span className="text-[10px] font-medium text-slate-400">
                  {paymentMethod === 'Cash' ? (ur ? 'نقد وصول شدہ' : 'Paid in Cash') : ur ? 'کھاتہ / ادھار' : 'Udhaar'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'Cash'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{ur ? '💵 کیش (Cash)' : '💵 Cash'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Udhaar')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'Udhaar'
                      ? 'bg-rose-600 border-rose-600 text-white shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{ur ? '📑 ادھار (Udhaar)' : '📑 Udhaar'}</span>
                </button>
              </div>
            </div>

            {/* Optional Customer Name & Note */}
            <div className="space-y-2">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={ur ? 'گاہک کا نام (اختیاری - ڈیفالٹ: واک اِن)' : 'Customer name (optional - default: Walk-in)'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={ur ? 'اضافی نوٹ (اختیاری)' : 'Notes / Remarks (optional)'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Cash Total Card */}
            <div className="rounded-2xl bg-slate-900 text-white p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">
                  {ur ? 'کل نقد رقم' : 'Cash Total:'}
                </span>
                <span className="text-xs text-slate-300">
                  {qtyFmt(qty)} ltr × Rs. {rateNum}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-400">
                Rs. {money(totalAmount)}
              </div>
            </div>

            {/* ⚡ Save Cash Sale Button */}
            <button
              type="button"
              onClick={handleSaveSale}
              disabled={busy}
              className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              <Zap className="w-5 h-5 fill-white text-white" />
              <span>
                {busy
                  ? ur
                    ? 'محفوظ ہو رہا ہے...'
                    : 'Saving...'
                  : ur
                  ? `⚡ ${qtyFmt(qty)} لیٹر دودھ کی نقد سیل محفوظ کریں`
                  : `⚡ Save ${qtyFmt(qty)} L Milk Cash Sale`}
              </span>
            </button>
          </div>
        </div>

        {/* Right Panel: Today's Sales Log & Table */}
        <div className="lg:col-span-7 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                {ur ? 'کل فروخت (Total)' : 'Total'}
              </div>
              <div className="text-xl font-extrabold text-slate-800 mt-1">
                {qtyFmt(summary.liters)} L · <span className="text-brand-700">Rs. {money(summary.total)}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {formatDateDisplay(date, ur)}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                {ur ? 'آج کے اندراجات (Today’s entries):' : "Today's entries:"}
              </div>
              <div className="text-xl font-extrabold text-emerald-600 mt-1">
                {summary.paidCount} Paid <span className="text-slate-800">= Rs. {money(summary.paidAmount)}</span>
              </div>
              {summary.udhaarCount > 0 ? (
                <div className="text-[11px] text-rose-600 font-bold mt-0.5">
                  {summary.udhaarCount} Udhaar = Rs. {money(summary.udhaarAmount)}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {ur ? 'تمام ادائیگیاں کیش ہیں' : 'All transactions paid in cash'}
                </div>
              )}
            </div>
          </div>

          {/* Sales Table with Edit & Delete */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  {ur ? 'آج کی فروخت' : "Today's Sales"}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {formatDateDisplay(date, ur)} • {sales.length} {ur ? 'اندراجات' : 'entries'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[58vh]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">{ur ? 'گاہک (Customers)' : 'Customers'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'لیٹر (Liters)' : 'Liters'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'رقم (Amount)' : 'Amount'}</th>
                    <th className="px-3 py-3 text-center">{ur ? 'حالت (Status)' : 'Status'}</th>
                    <th className="px-4 py-3 text-center w-24">{ur ? 'اختیارات (Actions)' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((s) => {
                    const isPaid = s.payment_status === 'Paid' || s.payment_method === 'Cash';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">
                            {s.customer_name || (ur ? 'کاؤنٹر / واک ان گاہک (Walk-in Cash)' : 'Walk-in Cash')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Rs. {s.rate}/L {s.notes ? `• ${s.notes}` : ''}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-right font-extrabold text-brand-700 whitespace-nowrap">
                          {qtyFmt(s.quantity)} L
                        </td>

                        <td className="px-3 py-3 text-right font-extrabold text-slate-800 whitespace-nowrap">
                          Rs. {money(s.total_amount || 0)}
                        </td>

                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Paid CASH
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Due UDHAAR
                            </span>
                          )}
                        </td>

                        {/* Actions: Edit and Delete */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(s.id)}
                                title={ur ? 'نقد وصول درج کریں' : 'Mark as Paid'}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() =>
                                setEditingSale({
                                  id: s.id,
                                  date: s.date,
                                  customer_name: s.customer_name || 'کاؤنٹر / واک ان گاہک (Walk-in Cash)',
                                  quantity: String(s.quantity),
                                  rate: String(s.rate),
                                  payment_method: s.payment_method || 'Cash',
                                  notes: s.notes || '',
                                })
                              }
                              title={ur ? 'تبدیل کریں (Edit)' : 'Edit Sale'}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 cursor-pointer transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSale(s.id)}
                              title={ur ? 'حذف کریں (Delete)' : 'Delete Sale'}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        {ur
                          ? 'اس دن کی کوئی کاؤنٹر سیل درج نہیں ہے'
                          : 'No quick cash sales recorded for this date.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-sm">
                {ur ? 'سیل تبدیل کریں (Edit Sale)' : 'Edit Sale Entry'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  {ur ? 'تاریخ' : 'Date'}
                </label>
                <input
                  type="date"
                  value={editingSale.date}
                  onChange={(e) => setEditingSale({ ...editingSale, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  {ur ? 'گاہک کا نام' : 'Customer Name'}
                </label>
                <input
                  type="text"
                  value={editingSale.customer_name}
                  onChange={(e) => setEditingSale({ ...editingSale, customer_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    {ur ? 'مقدار (Liters)' : 'Quantity (Liters)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={editingSale.quantity}
                    onChange={(e) => setEditingSale({ ...editingSale, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    {ur ? 'ریٹ فی لیٹر' : 'Rate / Liter'}
                  </label>
                  <input
                    type="number"
                    value={editingSale.rate}
                    onChange={(e) => setEditingSale({ ...editingSale, rate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  {ur ? 'ادائیگی کی حالت' : 'Payment Method'}
                </label>
                <select
                  value={editingSale.payment_method}
                  onChange={(e) => setEditingSale({ ...editingSale, payment_method: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="Cash">Cash (نقد وصول شدہ)</option>
                  <option value="Udhaar">Udhaar (ادھار / باقی)</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="JazzCash">JazzCash</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  {ur ? 'نوٹ' : 'Note'}
                </label>
                <input
                  type="text"
                  value={editingSale.notes}
                  onChange={(e) => setEditingSale({ ...editingSale, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Calculated Total preview */}
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700">
                <span>{ur ? 'کل رقم:' : 'Total Amount:'}</span>
                <span className="text-brand-700 font-extrabold text-sm">
                  Rs. {money((parseFloat(editingSale.quantity) || 0) * (parseFloat(editingSale.rate) || 0))}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                {ur ? 'منسوخ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs cursor-pointer shadow-2xs"
              >
                {ur ? 'تبدیلی محفوظ کریں' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
