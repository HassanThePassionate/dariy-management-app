import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Trash2,
  Pencil,
  X,
  Save,
  CheckCircle2,
  Package,
  Layers,
  Filter,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type Txn = {
  id: number;
  type: 'Inward' | 'Outward';
  quantity: number;
  rate: number;
  total: number;
  payment: 'Cash' | 'Udhaar';
  party?: string;
  date: string;
  notes?: string;
  sizes?: string;
};

const money = (n: number) => Math.round(n).toLocaleString('en-US');
const qty = (n: number) => String(Number(n.toFixed(2)));
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface StockLedgerViewProps {
  title: string;
  subtitle: string;
  unit: string; // 'Kg'
  sizeOptions?: string[];
  getAll: () => Promise<Txn[]>;
  addTxn: (t: any) => Promise<{ success: boolean; error?: string }>;
  updateTxn?: (id: number, t: any) => Promise<{ success: boolean; error?: string }>;
  deleteTxn: (id: number) => Promise<{ success: boolean }>;
  quickQtys?: string[];
}

export const StockLedgerView: React.FC<StockLedgerViewProps> = ({
  title,
  subtitle,
  unit,
  sizeOptions,
  getAll,
  addTxn,
  updateTxn,
  deleteTxn,
  quickQtys = ['0.5', '1', '2', '5', '10'],
}) => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [list, setList] = useState<Txn[]>([]);
  const [type, setType] = useState<'Inward' | 'Outward'>('Inward');
  const [payment, setPayment] = useState<'Cash' | 'Udhaar'>('Cash');
  const [sizes, setSizes] = useState<string[]>([]);
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [party, setParty] = useState('');
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'All' | 'Cash' | 'Udhaar'>('All');
  const [sizeFilter, setSizeFilter] = useState('All');
  const [error, setError] = useState('');

  // Edit Modal State
  const [editItem, setEditItem] = useState<Txn | null>(null);
  const [editType, setEditType] = useState<'Inward' | 'Outward'>('Inward');
  const [editPayment, setEditPayment] = useState<'Cash' | 'Udhaar'>('Cash');
  const [editSizes, setEditSizes] = useState<string[]>([]);
  const [editQuantity, setEditQuantity] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editParty, setEditParty] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = async () => setList(await getAll());
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    let inQty = 0, inCost = 0, outQty = 0, outRev = 0, udhaar = 0;
    for (const t of list) {
      if (t.type === 'Inward') { inQty += t.quantity; inCost += t.total; }
      else { outQty += t.quantity; outRev += t.total; }
      if (t.payment === 'Udhaar') udhaar += t.total;
    }
    const stock = Math.max(0, inQty - outQty);
    const avgBuy = inQty > 0 ? inCost / inQty : 0;
    const profit = outRev - outQty * avgBuy;
    return { inQty, inCost, outQty, outRev, stock, avgBuy, udhaar, profit };
  }, [list]);

  // Size-wise breakdown for Shoppers
  const sizeStats = useMemo(() => {
    if (!sizeOptions || sizeOptions.length === 0) return [];
    return sizeOptions.map((sz) => {
      let inQty = 0, inCost = 0, outQty = 0, outRev = 0;
      for (const t of list) {
        const tSizes = (t.sizes || '').split(',').map((s) => s.trim()).filter(Boolean);
        if (tSizes.includes(sz)) {
          if (t.type === 'Inward') {
            inQty += t.quantity;
            inCost += t.total;
          } else {
            outQty += t.quantity;
            outRev += t.total;
          }
        }
      }
      const available = Math.max(0, inQty - outQty);
      const avgRate = inQty > 0 ? Math.round(inCost / inQty) : 0;
      const stockWorth = Math.round(available * avgRate);
      return {
        size: sz,
        inQty,
        inCost,
        avgRate,
        outQty,
        outRev,
        available,
        stockWorth,
      };
    });
  }, [list, sizeOptions]);

  const filtered = list.filter((t) => {
    if (filter !== 'All' && t.payment !== filter) return false;
    if (sizeOptions && sizeFilter !== 'All' && !(t.sizes || '').split(',').includes(sizeFilter)) return false;
    return true;
  });

  const total = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);

  const submit = async () => {
    setError('');
    const q = parseFloat(quantity), r = parseFloat(rate);
    if (!(q > 0)) return setError(ur ? 'مقدار لکھیں' : 'Enter quantity');
    if (!(r >= 0)) return setError(ur ? 'ریٹ لکھیں' : 'Enter rate');

    // Strict Outward Stock Validation (prevent selling when stock is finished)
    if (type === 'Outward') {
      if (sizeOptions && sizeOptions.length > 0) {
        if (sizes.length === 0) {
          return setError(ur ? 'فروخت / استعمال کے لیے سائز منتخب کریں' : 'Please select size for outward sale');
        }
        for (const sz of sizes) {
          const szStat = sizeStats.find((s) => s.size === sz);
          const avail = szStat ? szStat.available : 0;
          if (avail <= 0) {
            return setError(
              ur
                ? `آپ کا سائز (${sz}) کا سٹاک ختم ہے! پہلے سٹاک شامل کریں۔`
                : `Size (${sz}) is out of stock! Please add stock first.`
            );
          }
          if (q > avail) {
            return setError(
              ur
                ? `سائز (${sz}) کا دستیاب سٹاک صرف ${avail} ${unit} ہے۔ آپ ${q} ${unit} فروخت نہیں کر سکتے۔`
                : `Available stock for size (${sz}) is only ${avail} ${unit}. You cannot outward ${q} ${unit}.`
            );
          }
        }
      } else {
        if (stats.stock <= 0) {
          return setError(
            ur
              ? 'موجودہ سٹاک ختم ہے! فروخت کرنے سے پہلے خریداری (Inward) درج کریں۔'
              : 'Stock is finished! Please add inward stock first.'
          );
        }
        if (q > stats.stock) {
          return setError(
            ur
              ? `دستیاب سٹاک صرف ${stats.stock} ${unit} ہے۔ آپ ${q} ${unit} فروخت نہیں کر سکتے۔`
              : `Available stock is only ${stats.stock} ${unit}. You cannot outward ${q} ${unit}.`
          );
        }
      }
    }

    const res = await addTxn({
      type,
      quantity: q,
      rate: r,
      payment,
      party,
      date,
      notes,
      sizes: sizeOptions ? sizes : undefined,
    });
    if (!res.success) return setError(res.error || 'Failed');
    setQuantity('');
    setRate('');
    setParty('');
    setNotes('');
    setSizes([]);
    load();
  };

  const openEdit = (t: Txn) => {
    setEditItem(t);
    setEditType(t.type);
    setEditPayment(t.payment);
    setEditSizes((t.sizes || '').split(',').filter(Boolean));
    setEditQuantity(String(t.quantity));
    setEditRate(String(t.rate));
    setEditParty(t.party || '');
    setEditDate(t.date);
    setEditNotes(t.notes || '');
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editItem || !updateTxn) return;
    setEditError('');
    const q = parseFloat(editQuantity), r = parseFloat(editRate);
    if (!(q > 0)) return setEditError(ur ? 'درست مقدار درج کریں' : 'Enter valid quantity');
    if (!(r >= 0)) return setEditError(ur ? 'درست ریٹ درج کریں' : 'Enter valid rate');

    // Strict Outward Stock Validation for Edit
    if (editType === 'Outward') {
      if (sizeOptions && sizeOptions.length > 0) {
        if (editSizes.length === 0) {
          return setEditError(ur ? 'فروخت کے لیے سائز منتخب کریں' : 'Please select size for outward sale');
        }
        for (const sz of editSizes) {
          const szStat = sizeStats.find((s) => s.size === sz);
          const prevQtyForThisSz =
            editItem.type === 'Outward' && (editItem.sizes || '').split(',').map((s) => s.trim()).includes(sz)
              ? editItem.quantity
              : 0;
          const avail = (szStat ? szStat.available : 0) + prevQtyForThisSz;
          if (avail <= 0) {
            return setEditError(
              ur
                ? `آپ کا سائز (${sz}) کا سٹاک ختم ہے! پہلے سٹاک شامل کریں۔`
                : `Size (${sz}) is out of stock! Please add stock first.`
            );
          }
          if (q > avail) {
            return setEditError(
              ur
                ? `سائز (${sz}) کا دستیاب سٹاک صرف ${avail} ${unit} ہے۔ آپ ${q} ${unit} فروخت نہیں کر سکتے۔`
                : `Available stock for size (${sz}) is only ${avail} ${unit}. You cannot outward ${q} ${unit}.`
            );
          }
        }
      }
    }

    setEditSaving(true);
    try {
      const res = await updateTxn(editItem.id, {
        type: editType,
        quantity: q,
        rate: r,
        payment: editPayment,
        party: editParty,
        date: editDate,
        notes: editNotes,
        sizes: sizeOptions ? editSizes : undefined,
      });
      if (res && res.success) {
        setEditItem(null);
        load();
      } else {
        setEditError(res?.error || 'Failed to update transaction');
      }
    } catch (e: any) {
      setEditError(e.message || 'Error updating transaction');
    } finally {
      setEditSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm(ur ? 'یہ اندراج حذف کریں؟' : 'Delete this entry?')) return;
    await deleteTxn(id);
    load();
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500';

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          [ur ? 'خریدا (اندر)' : 'Purchased Inward', `${qty(stats.inQty)} ${unit}`, `${ur ? 'کل خرچ' : 'Total Cost'}: Rs. ${money(stats.inCost)}`, 'text-slate-800'],
          [ur ? 'بیچا (باہر)' : 'Sold / Outward', `${qty(stats.outQty)} ${unit}`, `${ur ? 'کل آمدن' : 'Total Revenue'}: Rs. ${money(stats.outRev)}`, 'text-slate-800'],
          [ur ? 'موجود اسٹاک' : 'Current Stock', `${qty(stats.stock)} ${unit}`, `${ur ? 'اوسط ریٹ' : 'Avg Rate'}: Rs. ${money(stats.avgBuy)}/${unit}`, 'text-emerald-600'],
          [ur ? 'ادھار' : 'Udhaar', `Rs. ${money(stats.udhaar)}`, ur ? 'وصول کرنا ہے' : 'Receivable credit', 'text-rose-600'],
          [ur ? 'خالص منافع' : 'Net Profit', `Rs. ${money(stats.profit)}`, ur ? 'بکے ہوئے مال پر منافع' : 'Profit on sold goods', stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'],
        ].map(([l, v, sub, c]) => (
          <div key={l as string} className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-400">{l}</div>
            <div className={`text-lg font-extrabold ${c}`}>{v}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Shopper Stock-by-Size Inventory Breakdown (When sizes exist) */}
      {sizeOptions && sizeOptions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-brand-600">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  {ur ? 'شاپرز سائز وار انوینٹری اسٹاک اور خریداری' : 'Shopper Bags Stock by Size Breakdown'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {ur
                    ? 'ہر سائز کا خریدا گیا مال، اوسط ریٹ، استعمال/فروخت، اور موجود بیلنس'
                    : 'Breakdown of purchase cost, average rate, usage, and available stock balance per size'}
                </p>
              </div>
            </div>

            {sizeFilter !== 'All' && (
              <button
                onClick={() => setSizeFilter('All')}
                className="px-2.5 py-1 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors cursor-pointer"
              >
                {ur ? 'تمام سائز دکھائیں' : 'Clear Size Filter'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {sizeStats.map((item) => {
              const isSelected = sizeFilter === item.size;
              const hasStock = item.available > 0;
              return (
                <div
                  key={item.size}
                  onClick={() => setSizeFilter(isSelected ? 'All' : item.size)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                      {item.size}
                    </span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        hasStock ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {hasStock ? 'موجود' : 'ختم'}
                    </span>
                  </div>

                  <div className="mt-1">
                    <div className="text-[10px] text-slate-400 font-semibold">{ur ? 'موجود اسٹاک' : 'In Stock'}</div>
                    <div className="text-base font-black text-emerald-700">
                      {item.available} {unit}
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 text-[10px] space-y-0.5">
                    <div className="flex justify-between text-slate-600">
                      <span>{ur ? 'خریدا:' : 'Bought:'}</span>
                      <span className="font-bold">{item.inQty} {unit}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>{ur ? 'خرچ:' : 'Cost:'}</span>
                      <span className="font-bold">Rs. {money(item.inCost)}</span>
                    </div>
                    {item.avgRate > 0 && (
                      <div className="flex justify-between text-slate-500 text-[9px]">
                        <span>{ur ? 'اوسط ریٹ:' : 'Avg Rate:'}</span>
                        <span className="font-mono">Rs. {item.avgRate}/{unit}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500 text-[9px]">
                      <span>{ur ? 'استعمال:' : 'Used:'}</span>
                      <span>{item.outQty} {unit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Add Transaction Form & Transactions List */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Log Transaction Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 self-start shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800">{ur ? 'لین دین درج کریں' : 'Log Transaction'}</h3>
          {error && <div className="p-2 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">{error}</div>}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType('Inward')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                type === 'Inward' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" /> {ur ? 'خریداری (اندر)' : 'Purchase (Inward)'}
            </button>
            <button
              onClick={() => setType('Outward')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                type === 'Outward' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" /> {ur ? 'فروخت / استعمال' : 'Sale / Used (Outward)'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">{ur ? 'ادائیگی کی حالت' : 'Payment Status'}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPayment('Cash')}
                className={`py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                  payment === 'Cash' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                💵 {ur ? 'کیش' : 'Cash'}
              </button>
              <button
                onClick={() => setPayment('Udhaar')}
                className={`py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                  payment === 'Udhaar' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                📑 {ur ? 'ادھار' : 'Udhaar'}
              </button>
            </div>
          </div>

          {sizeOptions && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{ur ? 'سائز منتخب کریں' : 'Select Sizes'}</label>
              <div className="flex flex-wrap gap-1.5">
                {sizeOptions.map((sz) => {
                  const szStat = sizeStats.find((s) => s.size === sz);
                  const isOutOfStock = type === 'Outward' && (szStat ? szStat.available <= 0 : true);
                  const isSelected = sizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        if (isOutOfStock) {
                          setError(
                            ur
                              ? `سائز ${sz} کا سٹاک ختم ہے! فروخت کرنے سے پہلے سٹاک شامل کریں۔`
                              : `Size ${sz} is out of stock! Please add stock first.`
                          );
                          return;
                        }
                        setError('');
                        setSizes((p) => (p.includes(sz) ? p.filter((x) => x !== sz) : [...p, sz]));
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                        isOutOfStock
                          ? 'bg-slate-100 text-slate-400 border-dashed border-slate-300 opacity-75'
                          : isSelected
                          ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300'
                      }`}
                    >
                      <span>{sz}</span>
                      {type === 'Outward' && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-black ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOutOfStock ? (ur ? 'ختم' : 'Out') : `${szStat?.available || 0} ${unit}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? `مقدار (${unit})` : `Quantity in ${unit}`} *</label>
            <div className="flex gap-1.5 mb-1.5 flex-wrap">
              {quickQtys.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {q} {unit}
                </button>
              ))}
            </div>
            <input
              type="number"
              step="0.5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={ur ? 'مثلاً 1 یا 2.5' : 'e.g. 1 or 2.5'}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? `ریٹ فی ${unit}` : `Rate per ${unit} (PKR)`} *</label>
            <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="1800" className={inputCls} />
          </div>

          <div className="text-xs text-slate-500">
            {ur ? 'کل رقم' : 'Total Amount'}: <b className="text-slate-800">Rs. {money(total)}</b>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'سپلائر / پارٹی کا نام' : 'Supplier / Party Name'}</label>
            <input value={party} onChange={(e) => setParty(e.target.value)} placeholder={ur ? 'مثلاً ملک سلیم' : 'e.g. Malik Saleem, Haji Nazir'} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'تاریخ' : 'Date'} *</label>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'نوٹ' : 'Note / Remarks'}</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={ur ? 'اضافی تفصیل' : 'Details / Remarks'} className={inputCls} />
          </div>

          <button onClick={submit} className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm cursor-pointer transition-colors shadow-2xs">
            {type === 'Inward' ? (ur ? 'خریداری محفوظ کریں' : 'Save Inward Purchase') : ur ? 'فروخت / استعمال محفوظ کریں' : 'Save Outward Sale'}
          </button>
        </div>

        {/* Transactions List */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 overflow-hidden self-start shadow-2xs">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-800">
              {ur ? 'لین دین' : 'Transactions'} ({filtered.length})
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['All', 'Cash', 'Udhaar'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                    filter === f ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f === 'All' ? (ur ? 'سب' : 'All') : f}
                </button>
              ))}
              {sizeOptions && (
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-50 border border-slate-200 cursor-pointer"
                >
                  <option value="All">{ur ? 'تمام سائز' : 'All Sizes'}</option>
                  {sizeOptions.map((sz) => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 text-xs hover:bg-slate-50/70 transition-colors">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                    <span className={t.type === 'Inward' ? 'text-emerald-600 font-bold' : 'text-brand-600 font-bold'}>
                      {t.type === 'Inward' ? '📥' : '📤'}
                    </span>
                    <span>{qty(t.quantity)} {unit} × {t.rate}</span>
                    {t.sizes && (
                      <span className="text-[10px] font-mono bg-blue-50 text-brand-700 px-1.5 py-0.5 rounded border border-blue-100">
                        {t.sizes}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {t.date} • {t.party || '-'} {t.notes ? `• ${t.notes}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                      t.payment === 'Udhaar' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {t.payment}
                  </span>
                  <b className="text-slate-800 text-xs">Rs. {money(t.total)}</b>

                  {/* Edit Pencil Button */}
                  {updateTxn && (
                    <button
                      onClick={() => openEdit(t)}
                      title={ur ? 'تبدیل کریں' : 'Edit Transaction'}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete Trash Button */}
                  <button
                    onClick={() => remove(t.id)}
                    title={ur ? 'حذف کریں' : 'Delete Transaction'}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400">
                {ur ? 'کوئی ریکارڈ موجود نہیں ہے' : 'No transaction records found'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-brand-600 rounded-xl">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {ur ? 'لین دین تبدیل کریں (Edit Transaction)' : 'Edit Transaction'}
                  </h3>
                  <p className="text-[11px] text-slate-400">ID #{editItem.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
                {editError}
              </div>
            )}

            <div className="space-y-3 max-h-[70vh] overflow-y-auto px-0.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditType('Inward')}
                  className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                    editType === 'Inward' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {ur ? '📥 خریداری (Inward)' : '📥 Inward'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('Outward')}
                  className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                    editType === 'Outward' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {ur ? '📤 فروخت (Outward)' : '📤 Outward'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'ادائیگی کی حالت' : 'Payment'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPayment('Cash')}
                    className={`py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                      editPayment === 'Cash' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPayment('Udhaar')}
                    className={`py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                      editPayment === 'Udhaar' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    📑 Udhaar
                  </button>
                </div>
              </div>

              {sizeOptions && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'سائز' : 'Sizes'}</label>
                  <div className="flex flex-wrap gap-1">
                    {sizeOptions.map((sz) => {
                      const szStat = sizeStats.find((s) => s.size === sz);
                      const prevQtyForThisSz =
                        editItem?.type === 'Outward' && (editItem.sizes || '').split(',').map((s) => s.trim()).includes(sz)
                          ? editItem.quantity
                          : 0;
                      const avail = (szStat ? szStat.available : 0) + prevQtyForThisSz;
                      const isOutOfStock = editType === 'Outward' && avail <= 0;
                      const isSelected = editSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            if (isOutOfStock) {
                              setEditError(
                                ur
                                  ? `سائز ${sz} کا سٹاک ختم ہے! پہلے سٹاک شامل کریں۔`
                                  : `Size ${sz} is out of stock! Please add stock first.`
                              );
                              return;
                            }
                            setEditError('');
                            setEditSizes((p) => (p.includes(sz) ? p.filter((x) => x !== sz) : [...p, sz]));
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-slate-100 text-slate-400 border-dashed border-slate-300 opacity-75'
                              : isSelected
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <span>{sz}</span>
                          {editType === 'Outward' && (
                            <span
                              className={`text-[8.5px] px-1 py-0.2 rounded font-black ${
                                isOutOfStock ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isOutOfStock ? (ur ? 'ختم' : 'Out') : `${avail} ${unit}`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? `مقدار (${unit})` : `Qty (${unit})`}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'ریٹ (PKR)' : 'Rate (PKR)'}</label>
                  <input
                    type="number"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex justify-between">
                <span>{ur ? 'کل رقم:' : 'Total Amount:'}</span>
                <span className="text-brand-700">
                  Rs. {money((parseFloat(editQuantity) || 0) * (parseFloat(editRate) || 0))}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'پارٹی / سپلائر' : 'Party / Name'}</label>
                <input
                  type="text"
                  value={editParty}
                  onChange={(e) => setEditParty(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'تاریخ' : 'Date'}</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => e.target.value && setEditDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'نوٹ' : 'Note'}</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={saveEdit}
                disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Save className="w-4 h-4" />
                <span>{editSaving ? (ur ? 'محفوظ ہو رہا ہے...' : 'Saving...') : ur ? 'تبدیلیاں محفوظ کریں' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                {ur ? 'منسوخ' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
