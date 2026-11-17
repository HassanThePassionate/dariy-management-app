import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowLeft, Truck, X, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { SupplierItem } from '../types/electron';
import { SupplierSheetView } from './SupplierSheetView';

const money = (n: number) => Math.round(n).toLocaleString('en-US');
const qty = (n: number) => String(Number(n.toFixed(2)));
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

type Ledger = Awaited<ReturnType<NonNullable<Window['electronAPI']>['getSupplierLedger']>>;

export const SuppliersView: React.FC = () => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [tab, setTab] = useState<'list' | 'sheet'>('list');
  const [month, setMonth] = useState(monthOf(new Date()));
  const [list, setList] = useState<SupplierItem[]>([]);
  const [detail, setDetail] = useState<SupplierItem | null>(null);
  const [ledger, setLedger] = useState<Ledger>({ purchases: [], payments: [] });
  const [form, setForm] = useState<{ id?: number; name: string; phone: string; rate: string } | null>(null);

  // Bulk selection
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);

  // purchase + payment inputs
  const [pDate, setPDate] = useState(todayStr());
  const [pLiters, setPLiters] = useState('');
  const [pRate, setPRate] = useState('');
  const [pPaid, setPPaid] = useState('');
  const [yAmount, setYAmount] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!window.electronAPI) return;
    const rows = await window.electronAPI.getSuppliers(month);
    setList(rows);
    setDetail((d) => (d ? rows.find((r) => r.id === d.id) || null : d));
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const loadLedger = useCallback(async (id: number) => {
    if (window.electronAPI) setLedger(await window.electronAPI.getSupplierLedger(id));
  }, []);

  useEffect(() => {
    if (detail) loadLedger(detail.id);
  }, [detail?.id, loadLedger]);

  const refresh = async () => {
    await load();
    if (detail) await loadLedger(detail.id);
  };

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    setMonth(monthOf(new Date(y, m - 1 + delta, 1)));
  };

  const totals = useMemo(() => {
    const t = { liters: 0, amount: 0, paid: 0, due: 0 };
    for (const s of list) {
      t.liters += s.month_liters;
      t.amount += s.month_amount;
      t.paid += s.month_paid;
      t.due += s.total_amount - s.total_paid;
    }
    return t;
  }, [list]);

  const saveSupplier = async () => {
    if (!form || !window.electronAPI) return;
    if (!form.name.trim()) return setError(ur ? 'نام لکھیں' : 'Enter name');
    const payload = { name: form.name, phone: form.phone, default_rate: parseFloat(form.rate) || 0 };
    const res = form.id
      ? await window.electronAPI.updateSupplier({ id: form.id, ...payload })
      : await window.electronAPI.addSupplier(payload);
    if (!res.success) return setError(res.error || 'Failed');
    setForm(null);
    setError('');
    load();
  };

  const removeSupplier = async (s: SupplierItem) => {
    if (!confirm(ur ? `${s.name} اور اس کا سارا ریکارڈ حذف کریں؟` : `Delete ${s.name} and all its records?`)) return;
    await window.electronAPI?.deleteSupplier(s.id);
    setSelectedSupplierIds((prev) => prev.filter((id) => id !== s.id));
    if (detail?.id === s.id) setDetail(null);
    load();
  };

  const bulkDeleteSuppliers = async () => {
    if (selectedSupplierIds.length === 0 || !window.electronAPI) return;
    const msg = ur
      ? `کیا آپ واقعی منتخب کردہ ${selectedSupplierIds.length} سپلائرز اور ان کا تمام ریکارڈ حذف کرنا چاہتے ہیں؟`
      : `Are you sure you want to delete ${selectedSupplierIds.length} selected suppliers and all their records?`;
    if (!confirm(msg)) return;

    await window.electronAPI.deleteSuppliers(selectedSupplierIds);
    if (detail && selectedSupplierIds.includes(detail.id)) {
      setDetail(null);
    }
    setSelectedSupplierIds([]);
    load();
  };

  const addPurchase = async () => {
    if (!detail || !window.electronAPI) return;
    setError('');
    const liters = parseFloat(pLiters);
    const rate = parseFloat(pRate || String(detail.default_rate));
    if (!(liters > 0) || !(rate > 0)) return setError(ur ? 'درست لیٹر اور ریٹ لکھیں' : 'Enter valid liters & rate');
    const paid = parseFloat(pPaid) || 0;
    const res = await window.electronAPI.addSupplierPurchase({
      supplierId: detail.id,
      date: pDate,
      liters,
      rate,
      paid,
    });
    if (!res.success) return setError(res.error || 'Failed');
    setPLiters('');
    setPPaid('');
    refresh();
  };

  const addPayment = async () => {
    if (!detail || !window.electronAPI) return;
    setError('');
    const amt = parseFloat(yAmount);
    if (!(amt > 0)) return setError(ur ? 'درست رقم لکھیں' : 'Enter valid amount');
    const res = await window.electronAPI.addSupplierPayment({
      supplierId: detail.id,
      date: todayStr(),
      amount: amt,
    });
    if (!res.success) return setError(res.error || 'Failed');
    setYAmount('');
    refresh();
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500';

  /* ---------------- supplier detail view ---------------- */
  if (detail) {
    const due = detail.total_amount - detail.total_paid;
    return (
      <div className="max-w-5xl mx-auto space-y-4 pb-10">
        <button
          onClick={() => setDetail(null)}
          className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {ur ? 'واپس فہرست' : 'Back to list'}
        </button>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <h2 className="text-lg font-bold text-slate-800">{detail.name}</h2>
          <div className="text-xs text-slate-400">{detail.phone || '-'}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              [ur ? 'کل دودھ لیا' : 'Total milk taken', `${qty(detail.total_liters)} ltr`, 'text-slate-800'],
              [ur ? 'کل رقم' : 'Total amount', `Rs. ${money(detail.total_amount)}`, 'text-slate-800'],
              [ur ? 'ہم نے دیے' : 'We paid', `Rs. ${money(detail.total_paid)}`, 'text-emerald-600'],
              [ur ? 'ابھی دینے ہیں' : 'Still to pay', `Rs. ${money(due)}`, due > 0 ? 'text-rose-600' : 'text-emerald-600'],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="text-[10px] font-semibold text-slate-400">{l}</div>
                <div className={`text-base font-extrabold ${c}`}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {error && <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* purchase */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">{ur ? 'دودھ خریدا' : 'Add milk purchase'}</h3>
            <input type="date" value={pDate} onChange={(e) => e.target.value && setPDate(e.target.value)} className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.5" placeholder={ur ? 'لیٹر' : 'Liters'} value={pLiters} onChange={(e) => setPLiters(e.target.value)} className={inputCls} />
              <input type="number" placeholder={`${ur ? 'ریٹ' : 'Rate'} (${detail.default_rate || 0})`} value={pRate} onChange={(e) => setPRate(e.target.value)} className={inputCls} />
            </div>
            <input type="number" placeholder={ur ? 'ابھی ادا کیا (اختیاری)' : 'Paid now (optional)'} value={pPaid} onChange={(e) => setPPaid(e.target.value)} className={inputCls} />
            <div className="text-xs text-slate-500">
              {ur ? 'کل' : 'Total'}: <b>Rs. {money((parseFloat(pLiters) || 0) * (parseFloat(pRate || String(detail.default_rate)) || 0))}</b>
            </div>
            <button onClick={addPurchase} className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold cursor-pointer">
              {ur ? 'محفوظ کریں' : 'SAVE PURCHASE'}
            </button>
          </div>

          {/* payment */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">{ur ? 'سپلائر کو ادائیگی' : 'Pay supplier'}</h3>
            <div className="text-xs text-slate-500">
              {ur ? 'باقی' : 'Remaining'}: <b className={due > 0 ? 'text-rose-600' : 'text-emerald-600'}>Rs. {money(due)}</b>
            </div>
            <div className="flex gap-2">
              <input type="number" placeholder={ur ? 'رقم' : 'Amount'} value={yAmount} onChange={(e) => setYAmount(e.target.value)} className={inputCls} />
              <button onClick={() => setYAmount(String(Math.max(0, Math.round(due))))} className="px-3 rounded-xl bg-brand-50 text-brand-700 text-xs font-bold hover:bg-brand-100 cursor-pointer">
                {ur ? 'پوری' : 'Full'}
              </button>
            </div>
            <button onClick={() => addPayment()} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer">
              {ur ? 'ادائیگی محفوظ کریں' : 'SAVE PAYMENT'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 text-xs font-bold text-slate-600">{ur ? 'خریداریاں' : 'Purchases'}</div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {ledger.purchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-700">{p.date}</div>
                    <div className="text-slate-400">{qty(p.liters)} ltr × {p.rate}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <b>{money(p.total)}</b>
                    <button onClick={async () => { await window.electronAPI?.deleteSupplierPurchase(p.id); refresh(); }} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {ledger.purchases.length === 0 && <div className="p-6 text-center text-xs text-slate-400">—</div>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 text-xs font-bold text-slate-600">{ur ? 'ادائیگیاں' : 'Payments'}</div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {ledger.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2 text-xs">
                  <div className="font-bold text-slate-700">{p.date}</div>
                  <div className="flex items-center gap-2">
                    <b className="text-emerald-600">{money(p.amount)}</b>
                    <button onClick={async () => { await window.electronAPI?.deleteSupplierPayment(p.id); refresh(); }} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {ledger.payments.length === 0 && <div className="p-6 text-center text-xs text-slate-400">—</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const allSelected = list.length > 0 && selectedSupplierIds.length === list.length;

  /* ---------------- main views ---------------- */
  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-10">
      {/* Top tabs */}
      <div className="flex gap-1.5">
        {([['list', ur ? 'سپلائرز فہرست' : 'Suppliers'], ['sheet', ur ? 'ماہانہ شیٹ' : 'Monthly Sheet']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              load();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              tab === id
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary cards: Shown for BOTH tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          [ur ? 'اس ماہ دودھ' : 'Milk this month', `${qty(totals.liters)} ltr`, 'text-slate-800'],
          [ur ? 'اس ماہ خریداری' : 'Purchased', `Rs. ${money(totals.amount)}`, 'text-slate-800'],
          [ur ? 'اس ماہ ادا' : 'Paid this month', `Rs. ${money(totals.paid)}`, 'text-emerald-600'],
          [ur ? 'کل دینا ہے' : 'Total payable', `Rs. ${money(totals.due)}`, totals.due > 0 ? 'text-rose-600' : 'text-emerald-600'],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-400">{l}</div>
            <div className={`text-lg font-extrabold ${c}`}>{v}</div>
          </div>
        ))}
      </div>

      {tab === 'sheet' ? (
        <SupplierSheetView
          month={month}
          onMonthChange={(m) => {
            setMonth(m);
            load();
          }}
          onUpdate={load}
        />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-800">{ur ? 'سپلائرز' : 'Suppliers'}</h2>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 ml-2">
                <button onClick={() => shiftMonth(-1)} className="p-1 rounded-lg hover:bg-white cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-[11px] font-bold text-slate-600 px-1">{month}</span>
                <button onClick={() => shiftMonth(1)} className="p-1 rounded-lg hover:bg-white cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedSupplierIds.length > 0 && (
                <button
                  onClick={bulkDeleteSuppliers}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{ur ? `منتخب حذف کریں (${selectedSupplierIds.length})` : `Delete Selected (${selectedSupplierIds.length})`}</span>
                </button>
              )}
              <button
                onClick={() => { setError(''); setForm({ name: '', phone: '', rate: '' }); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                {ur ? 'نیا سپلائر' : 'Add Supplier'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSupplierIds(list.map((s) => s.id));
                          } else {
                            setSelectedSupplierIds([]);
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3 font-bold">{ur ? 'سپلائر' : 'Supplier'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'اس ماہ لیٹر' : 'Month Ltr'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'اس ماہ رقم' : 'Month Amount'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'اس ماہ ادا' : 'Month Paid'}</th>
                    <th className="px-3 py-3 font-bold text-right">{ur ? 'کل باقی' : 'Total Due'}</th>
                    <th className="px-3 py-3 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => {
                    const due = s.total_amount - s.total_paid;
                    const isSelected = selectedSupplierIds.includes(s.id);
                    return (
                      <tr
                        key={s.id}
                        onClick={() => { setError(''); setDetail(s); setPRate(''); }}
                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-brand-50/40' : ''
                        }`}
                      >
                        <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) {
                                setSelectedSupplierIds((prev) => [...prev, s.id]);
                              } else {
                                setSelectedSupplierIds((prev) => prev.filter((id) => id !== s.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-bold text-slate-800">{s.name}</div>
                          <div className="text-[10px] text-slate-400">{s.phone || '-'}</div>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">{qty(s.month_liters)}</td>
                        <td className="px-3 py-3 text-right font-semibold">{money(s.month_amount)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-emerald-600">{money(s.month_paid)}</td>
                        <td className={`px-3 py-3 text-right font-bold ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{money(due)}</td>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => { setError(''); setForm({ id: s.id, name: s.name, phone: s.phone || '', rate: String(s.default_rate || '') }); }}
                              title={ur ? 'ترمیم کریں' : 'Edit'}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 cursor-pointer transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeSupplier(s)}
                              title={ur ? 'حذف کریں' : 'Delete'}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {list.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">{ur ? 'ابھی کوئی سپلائر نہیں' : 'No suppliers yet'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-brand-600 text-white px-5 py-3.5 flex items-center justify-between">
              <h2 className="text-sm font-bold">{form.id ? (ur ? 'سپلائر میں ترمیم' : 'Edit Supplier') : ur ? 'نیا سپلائر' : 'Add Supplier'}</h2>
              <button onClick={() => setForm(null)} className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              {error && <div className="p-2 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">{error}</div>}
              <input autoFocus placeholder={ur ? 'نام' : 'Name'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              <input placeholder={ur ? 'فون' : 'Phone'} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
              <input type="number" placeholder={ur ? 'عام ریٹ فی لیٹر' : 'Usual rate per liter'} value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className={inputCls} />
              <button onClick={saveSupplier} className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm cursor-pointer shadow-xs">
                {ur ? 'محفوظ کریں' : 'SAVE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
