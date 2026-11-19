import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Footprints,
  CalendarDays,
  Send,
  FileText,
  X,
  Printer,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { MonthlyRecordCustomer, MonthlyRecordRow, SaleItem, BillSettings } from '../types/electron';
import { ModernBillCard } from './ModernBillCard';
import { ModernReceiptCard } from './ModernReceiptCard';

type Tab = 'monthly' | 'walkin';

const money = (n: number) => Math.round(n).toLocaleString('en-US');
const qty = (n: number) => String(Number(n.toFixed(2)));

const waNumber = (raw: string) => {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '92' + d.slice(1);
  return d;
};

const monthLabel = (m: string, ur: boolean) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString(ur ? 'ur-PK' : 'en-GB', { month: 'long', year: 'numeric' });
};

export const AllRecordsView: React.FC = () => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [tab, setTab] = useState<Tab>('monthly');
  const [search, setSearch] = useState('');
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRecordCustomer[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [monthFilter, setMonthFilter] = useState('All');
  const [billFor, setBillFor] = useState<{ customer: MonthlyRecordCustomer; row: MonthlyRecordRow } | null>(null);
  const [cardMode, setCardMode] = useState<'bill' | 'receipt'>('bill');
  const [billSettings, setBillSettings] = useState<BillSettings | null>(null);

  useEffect(() => {
    (async () => {
      if (!window.electronAPI) return;
      try {
        const [s, m, bs] = await Promise.all([
          window.electronAPI.getPosSales(),
          window.electronAPI.getMonthlyRecords(),
          window.electronAPI.getBillSettings().catch(() => null),
        ]);
        setSales(s || []);
        setMonthly(m || []);
        if (bs) setBillSettings(bs);
      } catch (err) {
        console.error('Failed to load records:', err);
      }
    })();
  }, []);

  const q = search.trim().toLowerCase();

  // Distinct months across both monthly customers and walk-in sales
  const allMonths = useMemo(() => {
    const set = new Set<string>();
    for (const c of monthly) for (const r of c.rows) if (r.month) set.add(r.month);
    for (const s of sales) if (s.date && s.date.length >= 7) set.add(s.date.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [monthly, sales]);

  // Walk-in filtered by search and month
  const walkIn = useMemo(() => {
    return sales.filter((s) => {
      const matchQuery = !q || (s.customer_name || '').toLowerCase().includes(q);
      const matchMonth = monthFilter === 'All' || (s.date && s.date.startsWith(monthFilter));
      return matchQuery && matchMonth;
    });
  }, [sales, q, monthFilter]);

  const walkInTotals = useMemo(() => {
    let liters = 0, amount = 0, paid = 0;
    for (const s of walkIn) {
      liters += s.quantity || 0;
      amount += s.total_amount || 0;
      if (s.payment_status === 'Paid') paid += s.total_amount || 0;
    }
    return { liters, amount, paid, due: amount - paid };
  }, [walkIn]);

  // Base name/phone filtered list
  const nameFiltered = useMemo(
    () => monthly.filter((c) => c.monthCount > 0 && (!q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q))),
    [monthly, q]
  );

  // When a specific month is chosen, filter rows down to that month
  const customers = useMemo(() => {
    if (monthFilter === 'All') return nameFiltered;
    return nameFiltered
      .map((c) => {
        const rows = c.rows.filter((r) => r.month === monthFilter);
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          ...c,
          rows,
          monthCount: 1,
          totalLiters: r.liters,
          totalBilled: r.bill,
          totalPaid: r.paid,
          balance: r.balance,
        };
      })
      .filter((c): c is MonthlyRecordCustomer => c !== null);
  }, [nameFiltered, monthFilter]);

  const monthlyTotals = useMemo(() => {
    let billed = 0, paid = 0, balance = 0;
    for (const c of customers) {
      billed += c.totalBilled || 0;
      paid += c.totalPaid || 0;
      balance += c.balance || 0;
    }
    return { billed, paid, balance };
  }, [customers]);

  const sendBillWhatsApp = async (customer: MonthlyRecordCustomer, row: MonthlyRecordRow, mode: 'bill' | 'receipt') => {
    const n = waNumber(customer.phone);
    if (!n) return alert(ur ? 'اس گاہک کا واٹس ایپ نمبر موجود نہیں' : 'This customer has no WhatsApp number');

    const lines = [
      `*${billSettings?.shop_title || 'قاری ظفر اقبال ملک شاپ'}*`,
      mode === 'bill' ? `*ماہانہ دودھ بل (MONTHLY BILL)*` : `*ادائیگی کی تصدیقی رسید (PAYMENT RECEIPT)*`,
      `مہینہ (Month): ${monthLabel(row.month, ur)}`,
      `گاہک (Customer): ${customer.name}`,
      '------------------------',
      `کل دودھ (Total milk): ${qty(row.liters)} لیٹر`,
      `ریٹ (Rate): Rs. ${row.rate}/L`,
      `کل رقم (Bill Amount): Rs. ${money(row.bill)}`,
      `ادا شدہ رقم (Paid): Rs. ${money(row.paid)}`,
      '------------------------',
      `*باقی رقم (Balance due): Rs. ${money(row.balance)}*`,
    ];

    if (mode === 'bill' && row.balance > 0 && billSettings?.bank_name) {
      lines.push('------------------------');
      lines.push('*آن لائن بینک ٹرانسفر (Online Transfer):*');
      lines.push(`Bank: ${billSettings.bank_name}`);
      lines.push(`Title: ${billSettings.account_title || 'Hafiz Musab Zafar'}`);
      lines.push(`A/C: ${billSettings.account_number || (billSettings as any)?.account_no || '0210-1234567890'}`);
      lines.push('بل ہر ماہ کی 5 تاریخ تک ادا کریں۔ شکریہ!');
    } else {
      lines.push('');
      lines.push('ادائیگی کا شکریہ! (Thank You)');
    }

    const url = `https://wa.me/${n}?text=${encodeURIComponent(lines.join('\n'))}`;
    if (window.electronAPI) await window.electronAPI.openExternal(url);
    else window.open(url, '_blank');
  };

  const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
    <div className="bg-[#0b1437] rounded-2xl border border-blue-500/20 px-4 py-3 shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
      <div className="text-[11px] font-bold text-slate-400">{label}</div>
      <div className={`text-lg font-black ${tone || 'text-white'} mt-0.5`}>{value}</div>
    </div>
  );

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto text-slate-100 select-none">
      {/* Top Header Card with Tabs & Month Filter */}
      <div className="bg-[#081028] rounded-3xl border border-blue-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.35)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tab Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('monthly')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer transition-all border ${
              tab === 'monthly'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(0,128,255,0.4)]'
                : 'bg-[#0c163b] text-slate-300 border-blue-500/30 hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>{ur ? 'ماہانہ گاہک' : 'Monthly Customers'}</span>
          </button>
          <button
            onClick={() => setTab('walkin')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer transition-all border ${
              tab === 'walkin'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(0,128,255,0.4)]'
                : 'bg-[#0c163b] text-slate-300 border-blue-500/30 hover:text-white'
            }`}
          >
            <Footprints className="w-4 h-4" />
            <span>{ur ? 'واک اِن گاہک' : 'Walk-in Customers'}</span>
          </button>
        </div>

        {/* Right: Month Selector & Search Filter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Prominent Month Selector */}
          <div className="flex items-center gap-1.5 bg-[#0c163b] border border-blue-500/30 rounded-2xl px-3 py-1.5 shadow-[0_0_10px_rgba(0,102,255,0.15)]">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer [color-scheme:dark]"
            >
              <option value="All" className="bg-[#0b1437] text-white">
                {ur ? 'تمام مہینے (All Months)' : 'All Months'}
              </option>
              {allMonths.map((m) => (
                <option key={m} value={m} className="bg-[#0b1437] text-white">
                  {monthLabel(m, ur)}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-cyan-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ur ? 'نام یا فون سے تلاش کریں...' : 'Search by name/phone...'}
              className="pl-9 pr-3 py-2 text-xs rounded-2xl bg-[#0c163b] border border-blue-500/30 text-white focus:outline-none focus:border-cyan-400 w-full md:w-56"
            />
          </div>
        </div>
      </div>

      {tab === 'monthly' ? (
        <>
          {/* Top Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={ur ? 'گاہک' : 'Customers'} value={String(customers.length)} />
            <Stat label={ur ? 'کل بل' : 'Total Billed'} value={`Rs. ${money(monthlyTotals.billed)}`} />
            <Stat label={ur ? 'کل ادا شدہ' : 'Total Paid'} value={`Rs. ${money(monthlyTotals.paid)}`} tone="text-emerald-400" />
            <Stat
              label={ur ? 'کل بقایا' : 'Total Balance'}
              value={`Rs. ${money(monthlyTotals.balance)}`}
              tone={monthlyTotals.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}
            />
          </div>

          {/* Monthly Customers Table */}
          <div className="bg-[#081028] rounded-3xl border border-blue-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0b1437] border-b border-blue-500/20 text-[11px] uppercase tracking-wider text-slate-300 font-extrabold">
                    <th className="w-8 px-3 py-3" />
                    <th className="px-3 py-3">{ur ? 'گاہک' : 'Customer'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'مہینے' : 'Months'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'کل لیٹر' : 'Total Ltr'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'کل بل' : 'Total Bill'}</th>
                    <th className="px-3 py-3 text-right text-emerald-400">{ur ? 'کل ادا' : 'Total Paid'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'بقایا' : 'Balance'}</th>
                    <th className="px-3 py-3 text-center w-36">{ur ? 'ایکشنز' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/10">
                  {customers.map((c) => {
                    const isOpen = open === c.id;
                    const primaryRow = c.rows[0];
                    return (
                      <React.Fragment key={c.id}>
                        <tr
                          onClick={() => setOpen(isOpen ? null : c.id)}
                          className="hover:bg-blue-600/10 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-3 text-cyan-400">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-black text-white text-sm">{c.name}</div>
                            <div className="text-[10px] text-cyan-300/80 font-mono" dir="ltr">{c.phone || '-'}</div>
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-300">{c.monthCount}</td>
                          <td className="px-3 py-3 text-right font-black text-cyan-300">{qty(c.totalLiters)} L</td>
                          <td className="px-3 py-3 text-right font-black text-white">Rs. {money(c.totalBilled)}</td>
                          <td className="px-3 py-3 text-right font-black text-emerald-400">Rs. {money(c.totalPaid)}</td>
                          <td className={`px-3 py-3 text-right font-black ${c.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            Rs. {money(c.balance)}
                          </td>
                          <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {primaryRow && (
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Bill Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCardMode('bill');
                                    setBillFor({ customer: c, row: primaryRow });
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600/30 hover:bg-blue-600 border border-blue-400/40 text-cyan-300 hover:text-white text-[11px] font-bold cursor-pointer transition-all shadow-xs"
                                  title="View Bill"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>{ur ? 'بل' : 'Bill'}</span>
                                </button>

                                {/* Receipt Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCardMode('receipt');
                                    setBillFor({ customer: c, row: primaryRow });
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-400/40 text-emerald-300 hover:text-white text-[11px] font-bold cursor-pointer transition-all shadow-xs"
                                  title="View Receiving Receipt"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{ur ? 'رسید' : 'Receipt'}</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {isOpen && (
                          <tr className="bg-[#0b1437]/50">
                            <td />
                            <td colSpan={7} className="px-4 py-3">
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="text-slate-400 border-b border-blue-500/20">
                                    <th className="text-left py-1.5 font-bold">{ur ? 'مہینہ' : 'Month'}</th>
                                    <th className="text-right py-1.5 font-bold">{ur ? 'لیٹر' : 'Ltr'}</th>
                                    <th className="text-right py-1.5 font-bold">{ur ? 'ریٹ' : 'Rate'}</th>
                                    <th className="text-right py-1.5 font-bold">{ur ? 'بل' : 'Bill'}</th>
                                    <th className="text-right py-1.5 font-bold text-emerald-400">{ur ? 'ادا' : 'Paid'}</th>
                                    <th className="text-right py-1.5 font-bold">{ur ? 'بقایا' : 'Balance'}</th>
                                    <th className="w-24 text-center py-1.5">{ur ? 'کارڈ' : 'Card'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...c.rows].reverse().map((r) => (
                                    <tr key={r.month} className="border-t border-blue-500/10 hover:bg-blue-600/10">
                                      <td className="py-2 font-black text-cyan-300">{r.month}</td>
                                      <td className="py-2 text-right">{qty(r.liters)} L</td>
                                      <td className="py-2 text-right">Rs. {r.rate}</td>
                                      <td className="py-2 text-right font-black text-white">Rs. {money(r.bill)}</td>
                                      <td className="py-2 text-right font-black text-emerald-400">Rs. {money(r.paid)}</td>
                                      <td className={`py-2 text-right font-black ${r.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        Rs. {money(r.balance)}
                                      </td>
                                      <td className="py-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            onClick={() => {
                                              setCardMode('bill');
                                              setBillFor({ customer: c, row: r });
                                            }}
                                            className="p-1 rounded-lg hover:bg-blue-600/30 text-cyan-400 hover:text-white"
                                            title="Bill"
                                          >
                                            <FileText className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setCardMode('receipt');
                                              setBillFor({ customer: c, row: r });
                                            }}
                                            className="p-1 rounded-lg hover:bg-emerald-600/30 text-emerald-400 hover:text-white"
                                            title="Receipt"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        {ur ? 'اس فلٹر کے لیے کوئی ماہانہ ریکارڈ موجود نہیں' : 'No monthly records found for this filter'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Walk-in Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={ur ? 'ریکارڈ' : 'Records'} value={String(walkIn.length)} />
            <Stat label={ur ? 'کل دودھ' : 'Total Milk'} value={`${qty(walkInTotals.liters)} Ltr`} />
            <Stat label={ur ? 'ادا شدہ' : 'Paid'} value={`Rs. ${money(walkInTotals.paid)}`} tone="text-emerald-400" />
            <Stat
              label={ur ? 'بقایا' : 'Due'}
              value={`Rs. ${money(walkInTotals.due)}`}
              tone={walkInTotals.due > 0 ? 'text-rose-400' : 'text-emerald-400'}
            />
          </div>

          {/* Walk-in Sales Table */}
          <div className="bg-[#081028] rounded-3xl border border-blue-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="overflow-x-auto max-h-[65vh]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0b1437] border-b border-blue-500/20 text-[11px] uppercase tracking-wider text-slate-300 font-extrabold z-10">
                  <tr>
                    <th className="px-4 py-3">{ur ? 'تاریخ' : 'Date'}</th>
                    <th className="px-3 py-3">{ur ? 'گاہک' : 'Customer'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'لیٹر' : 'Ltr'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'ریٹ' : 'Rate'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'رقم' : 'Amount'}</th>
                    <th className="px-3 py-3 text-center">{ur ? 'حالت' : 'Status'}</th>
                    <th className="px-3 py-3">{ur ? 'نوٹ' : 'Notes'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/10">
                  {walkIn.map((s) => (
                    <tr key={s.id} className="hover:bg-blue-600/10 transition-colors">
                      <td className="px-4 py-3 text-slate-300 font-mono">{s.date}</td>
                      <td className="px-3 py-3 font-black text-white">{s.customer_name || 'Walk-in'}</td>
                      <td className="px-3 py-3 text-right font-black text-cyan-300">{qty(s.quantity)} L</td>
                      <td className="px-3 py-3 text-right text-slate-300">Rs. {s.rate}</td>
                      <td className="px-3 py-3 text-right font-black text-white">Rs. {money(s.total_amount || 0)}</td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            s.payment_status === 'Paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {s.payment_method || (s.payment_status === 'Paid' ? 'Cash' : 'Udhaar')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-400 truncate max-w-[180px]">{s.notes || '-'}</td>
                    </tr>
                  ))}
                  {walkIn.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        {ur ? 'اس فلٹر کے لیے کوئی واک اِن ریکارڈ موجود نہیں' : 'No walk-in records found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Bill & Receiving Receipt Modal with Tabs */}
      {billFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 md:p-3 overflow-y-auto print:static print:bg-transparent print:p-0">
          <div className="bg-[#050d24] rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(0,150,255,0.25)] max-w-[460px] w-full overflow-hidden border border-cyan-500/40 flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:w-full">
            {/* Modal Header & Mode Switcher */}
            <div className="bg-[#081028] text-white px-4 py-3 flex items-center justify-between no-print border-b border-blue-500/20">
              {/* Toggle Bill vs Receiving */}
              <div className="flex items-center gap-1 bg-[#0b1437] p-1 rounded-2xl border border-blue-500/30">
                <button
                  type="button"
                  onClick={() => setCardMode('bill')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cardMode === 'bill'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{ur ? 'بل (Bill)' : 'Bill'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCardMode('receipt')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cardMode === 'receipt'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{ur ? 'ادائیگی کی رسید' : 'Receipt'}</span>
                </button>
              </div>

              <button
                onClick={() => setBillFor(null)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-rose-600/40 text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Either ModernBillCard or ModernReceiptCard */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1 print:p-0 print:overflow-visible flex flex-col items-center">
              {cardMode === 'bill' ? (
                <ModernBillCard
                  customerId={billFor.customer.id}
                  customerName={billFor.customer.name}
                  phone={billFor.customer.phone}
                  monthLabel={monthLabel(billFor.row.month, ur)}
                  issueDateStr={new Date().toLocaleDateString(ur ? 'ur-PK' : 'en-GB')}
                  rate={billFor.row.rate}
                  liters={billFor.row.liters}
                  bill={billFor.row.bill}
                  carry={0}
                  received={billFor.row.paid}
                  payable={billFor.row.balance}
                  billNo={billFor.customer.id || '28'}
                  settings={{
                    shop_title: billSettings?.shop_title || 'قاری ظفر اقبال ملک شاپ',
                    owner_name: billSettings?.owner_name || 'حافظ مصعب ظفر',
                    phone: billSettings?.phone || '0300-1234567',
                    bank_name: billSettings?.bank_name || 'Faysal Bank',
                    account_title: billSettings?.account_title || 'Hafiz Musab Zafar',
                    account_number: billSettings?.account_number || (billSettings as any)?.account_no || '0210-1234567890',
                  }}
                  ur={ur}
                />
              ) : (
                <ModernReceiptCard
                  receiptNumber={String(billFor.customer.id || '28')}
                  customerName={billFor.customer.name}
                  phone={billFor.customer.phone}
                  monthLabel={monthLabel(billFor.row.month, ur)}
                  issueDateStr={new Date().toLocaleDateString(ur ? 'ur-PK' : 'en-GB')}
                  rate={billFor.row.rate}
                  liters={billFor.row.liters}
                  totalBill={billFor.row.bill}
                  paidNow={billFor.row.paid}
                  totalReceived={billFor.row.paid}
                  remaining={billFor.row.balance}
                  settings={{
                    shop_title: billSettings?.shop_title || 'قاری ظفر اقبال ملک شاپ',
                    owner_name: billSettings?.owner_name || 'حافظ مصعب ظفر',
                    phone: billSettings?.phone || '0300-1234567',
                  }}
                  ur={ur}
                />
              )}

              {/* Action Buttons: Print, WhatsApp, Close */}
              <div className="grid grid-cols-2 gap-2.5 no-print w-full pt-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-[0_0_15px_rgba(0,102,255,0.35)] cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{cardMode === 'bill' ? (ur ? 'پرنٹ بل' : 'Print Bill') : (ur ? 'پرنٹ رسید' : 'Print Receipt')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => sendBillWhatsApp(billFor.customer, billFor.row, cardMode)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-[0_0_15px_rgba(16,185,129,0.35)] cursor-pointer transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{ur ? 'واٹس ایپ' : 'WhatsApp'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setBillFor(null)}
                className="w-full py-2 rounded-2xl bg-[#0b1437] hover:bg-slate-800 border border-blue-500/20 text-slate-300 text-xs font-bold cursor-pointer print:hidden transition-colors"
              >
                {ur ? 'بند کریں' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
