import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, Footprints, CalendarDays, Send, FileText, X, Printer } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { MonthlyRecordCustomer, MonthlyRecordRow, SaleItem, BillSettings } from '../types/electron';
import { ModernBillCard } from './ModernBillCard';

type Tab = 'walkin' | 'monthly';

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
        setSales(s);
        setMonthly(m);
        if (bs) setBillSettings(bs);
      } catch (err) {
        console.error('Failed to load records:', err);
      }
    })();
  }, []);

  const q = search.trim().toLowerCase();

  const walkIn = useMemo(
    () => sales.filter((s) => !q || (s.customer_name || '').toLowerCase().includes(q)),
    [sales, q]
  );
  const walkInTotals = useMemo(() => {
    let liters = 0, amount = 0, paid = 0;
    for (const s of walkIn) {
      liters += s.quantity;
      amount += s.total_amount || 0;
      if (s.payment_status === 'Paid') paid += s.total_amount || 0;
    }
    return { liters, amount, paid, due: amount - paid };
  }, [walkIn]);

  const allMonths = useMemo(() => {
    const set = new Set<string>();
    for (const c of monthly) for (const r of c.rows) set.add(r.month);
    return Array.from(set).sort().reverse();
  }, [monthly]);

  // Base name/phone filtered list, before the month filter narrows totals/rows
  const nameFiltered = useMemo(
    () => monthly.filter((c) => c.monthCount > 0 && (!q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q))),
    [monthly, q]
  );

  // When a specific month is chosen, show only customers with a row that month,
  // and shrink their totals/rows down to just that month.
  const customers = useMemo(() => {
    if (monthFilter === 'All') return nameFiltered;
    return nameFiltered
      .map((c) => {
        const rows = c.rows.filter((r) => r.month === monthFilter);
        if (rows.length === 0) return null;
        const r = rows[0];
        return { ...c, rows, monthCount: 1, totalLiters: r.liters, totalBilled: r.bill, totalPaid: r.paid, balance: r.balance };
      })
      .filter((c): c is MonthlyRecordCustomer => c !== null);
  }, [nameFiltered, monthFilter]);

  const monthlyTotals = useMemo(() => {
    let billed = 0, paid = 0, balance = 0;
    for (const c of customers) {
      billed += c.totalBilled;
      paid += c.totalPaid;
      balance += c.balance;
    }
    return { billed, paid, balance };
  }, [customers]);

  const sendBillWhatsApp = async (customer: MonthlyRecordCustomer, row: MonthlyRecordRow) => {
    const n = waNumber(customer.phone);
    if (!n) return alert(ur ? 'اس گاہک کا واٹس ایپ نمبر موجود نہیں' : 'This customer has no WhatsApp number');
    const lines = [
      `*${billSettings?.shop_title || 'قاری ظفر اقبال ملک شاپ'}*`,
      `*MONTHLY BILL*`,
      `Month: ${monthLabel(row.month, ur)}`,
      `Customer: ${customer.name}`,
      '------------------------',
      `Total milk: ${qty(row.liters)} ltr`,
      `Rate: Rs. ${row.rate}/ltr`,
      `This month bill: Rs. ${money(row.bill)}`,
      `Paid: Rs. ${money(row.paid)}`,
      '------------------------',
      `*Balance due: Rs. ${money(row.balance)}*`,
    ];
    if (row.balance > 0 && billSettings?.bank_name && billSettings?.account_no) {
      lines.push('------------------------');
      lines.push('*Online Bank Transfer:*');
      lines.push(`Bank: ${billSettings.bank_name}`);
      lines.push(`Title: ${billSettings.account_title || ''}`);
      lines.push(`A/C: ${billSettings.account_no}`);
    }
    lines.push('');
    lines.push(ur ? 'شکریہ!' : 'Thank you!');
    const url = `https://wa.me/${n}?text=${encodeURIComponent(lines.join('\n'))}`;
    if (window.electronAPI) await window.electronAPI.openExternal(url);
    else window.open(url, '_blank');
  };

  const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
    <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-3">
      <div className="text-[11px] font-semibold text-slate-400">{label}</div>
      <div className={`text-lg font-extrabold ${tone || 'text-slate-800'}`}>{value}</div>
    </div>
  );

  return (
    <div className="space-y-4 pb-10 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-1.5">
          <button
            onClick={() => setTab('monthly')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold ${
              tab === 'monthly' ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            {ur ? 'ماہانہ گاہک' : 'Monthly Customers'}
          </button>
          <button
            onClick={() => setTab('walkin')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold ${
              tab === 'walkin' ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Footprints className="w-4 h-4" />
            {ur ? 'واک اِن گاہک' : 'Walk-in Customers'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'monthly' && (
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="All">{ur ? 'تمام مہینے' : 'All Months'}</option>
              {allMonths.map((m) => (
                <option key={m} value={m}>{monthLabel(m, ur)}</option>
              ))}
            </select>
          )}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ur ? 'نام سے تلاش' : 'Search by name...'}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full md:w-60"
            />
          </div>
        </div>
      </div>

      {tab === 'monthly' ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={ur ? 'گاہک' : 'Customers'} value={String(customers.length)} />
            <Stat label={ur ? 'کل بل' : 'Total Billed'} value={`Rs. ${money(monthlyTotals.billed)}`} />
            <Stat label={ur ? 'کل ادا شدہ' : 'Total Paid'} value={`Rs. ${money(monthlyTotals.paid)}`} tone="text-emerald-600" />
            <Stat
              label={ur ? 'کل بقایا' : 'Total Balance'}
              value={`Rs. ${money(monthlyTotals.balance)}`}
              tone={monthlyTotals.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="w-8 px-3 py-3" />
                    <th className="px-3 py-3 font-bold">{ur ? 'گاہک' : 'Customer'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'مہینے' : 'Months'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'کل لیٹر' : 'Total Ltr'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'کل بل' : 'Total Bill'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'کل ادا' : 'Total Paid'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'بقایا' : 'Balance'}</th>
                    <th className="px-3 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const isOpen = open === c.id;
                    return (
                      <React.Fragment key={c.id}>
                        <tr
                          onClick={() => setOpen(isOpen ? null : c.id)}
                          className="border-b border-slate-100 cursor-pointer hover:bg-slate-50"
                        >
                          <td className="px-3 py-2.5 text-slate-400">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-800">{c.name}</div>
                            <div className="text-[10px] text-slate-400">{c.phone || '-'}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-600">{c.monthCount}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-600">{qty(c.totalLiters)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{money(c.totalBilled)}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{money(c.totalPaid)}</td>
                          <td className={`px-3 py-2.5 text-right font-bold ${c.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {money(c.balance)}
                          </td>
                          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                            {monthFilter !== 'All' && c.rows[0] && (
                              <button
                                onClick={() => setBillFor({ customer: c, row: c.rows[0] })}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold"
                              >
                                <FileText className="w-3 h-3" />
                                {ur ? 'بل' : 'Bill'}
                              </button>
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-slate-50/60">
                            <td />
                            <td colSpan={7} className="px-3 py-3">
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="text-slate-400">
                                    <th className="text-left py-1 font-semibold">{ur ? 'مہینہ' : 'Month'}</th>
                                    <th className="text-right py-1 font-semibold">{ur ? 'لیٹر' : 'Ltr'}</th>
                                    <th className="text-right py-1 font-semibold">{ur ? 'ریٹ' : 'Rate'}</th>
                                    <th className="text-right py-1 font-semibold">{ur ? 'بل' : 'Bill'}</th>
                                    <th className="text-right py-1 font-semibold">{ur ? 'ادا' : 'Paid'}</th>
                                    <th className="text-right py-1 font-semibold">{ur ? 'بقایا (جمع)' : 'Balance'}</th>
                                    <th className="w-14" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...c.rows].reverse().map((r) => (
                                    <tr key={r.month} className="border-t border-slate-200/70">
                                      <td className="py-1.5 font-bold text-slate-700">{r.month}</td>
                                      <td className="py-1.5 text-right">{qty(r.liters)}</td>
                                      <td className="py-1.5 text-right">{r.rate}</td>
                                      <td className="py-1.5 text-right">{money(r.bill)}</td>
                                      <td className="py-1.5 text-right font-semibold text-emerald-600">{money(r.paid)}</td>
                                      <td className={`py-1.5 text-right font-bold ${r.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {money(r.balance)}
                                      </td>
                                      <td className="py-1.5 text-right">
                                        <button onClick={() => setBillFor({ customer: c, row: r })} className="text-brand-600 hover:text-brand-700">
                                          <FileText className="w-3.5 h-3.5" />
                                        </button>
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
                        {ur ? 'ابھی کوئی ماہانہ ریکارڈ نہیں' : 'No monthly records yet'}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={ur ? 'ریکارڈ' : 'Records'} value={String(walkIn.length)} />
            <Stat label={ur ? 'کل دودھ' : 'Total Milk'} value={`${qty(walkInTotals.liters)} ltr`} />
            <Stat label={ur ? 'ادا شدہ' : 'Paid'} value={`Rs. ${money(walkInTotals.paid)}`} tone="text-emerald-600" />
            <Stat
              label={ur ? 'بقایا' : 'Due'}
              value={`Rs. ${money(walkInTotals.due)}`}
              tone={walkInTotals.due > 0 ? 'text-rose-600' : 'text-emerald-600'}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[65vh]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-bold">{ur ? 'تاریخ' : 'Date'}</th>
                    <th className="px-3 py-3 font-bold">{ur ? 'گاہک' : 'Customer'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'لیٹر' : 'Ltr'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'ریٹ' : 'Rate'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'رقم' : 'Amount'}</th>
                    <th className="px-3 py-3 font-bold text-center">{ur ? 'حالت' : 'Status'}</th>
                    <th className="px-3 py-3 font-bold">{ur ? 'نوٹ' : 'Notes'}</th>
                  </tr>
                </thead>
                <tbody>
                  {walkIn.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-slate-500">{s.date}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-800">{s.customer_name}</td>
                      <td className="px-3 py-2.5 text-right">{qty(s.quantity)}</td>
                      <td className="px-3 py-2.5 text-right">{s.rate}</td>
                      <td className="px-3 py-2.5 text-right font-bold">{money(s.total_amount || 0)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {s.payment_method || (s.payment_status === 'Paid' ? 'Cash' : 'Udhaar')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 truncate max-w-[180px]">{s.notes || '-'}</td>
                    </tr>
                  ))}
                  {walkIn.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        {ur ? 'کوئی واک اِن ریکارڈ نہیں' : 'No walk-in records yet'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {billFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 md:p-3 overflow-y-auto print:static print:bg-white print:p-0">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-[360px] md:max-w-[380px] w-full overflow-hidden border border-slate-200 flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:w-full">
            <div className="bg-brand-600 text-white px-4 py-2.5 flex items-center justify-between no-print shadow-xs">
              <h2 className="text-xs font-black tracking-tight">{ur ? 'ماہانہ بل' : 'Monthly Bill'} • {monthLabel(billFor.row.month, ur)}</h2>
              <button onClick={() => setBillFor(null)} className="p-1 rounded-xl hover:bg-brand-700/80 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
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
                settings={{
                  shop_title: billSettings?.shop_title || 'قاری ظفر اقبال ملک شاپ',
                  owner_name: billSettings?.owner_name || 'حافظ مصعب ظفر',
                  phone: billSettings?.phone || '+92 321 0001168',
                  bank_name: billSettings?.bank_name || 'میزان بینک',
                  account_title: billSettings?.account_title || 'حافظ مصعب ظفر',
                  account_number: billSettings?.account_number || (billSettings as any)?.account_no || '02090111954760',
                }}
                ur={ur}
              />

              <div className="grid grid-cols-2 gap-2 no-print pt-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{ur ? 'پرنٹ بل' : 'Print Bill'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => sendBillWhatsApp(billFor.customer, billFor.row)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{ur ? 'واٹس ایپ' : 'WhatsApp'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setBillFor(null)}
                className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer print:hidden transition-colors"
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
