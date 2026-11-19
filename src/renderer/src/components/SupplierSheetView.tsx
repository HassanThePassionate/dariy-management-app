import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Trash2,
  FileText,
  X,
  Send,
  Printer,
  Wallet,
  CheckCircle2,
  Phone,
  Calendar,
  Building,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { CowLogo } from './CowLogo';

type Sheet = Awaited<ReturnType<NonNullable<Window['electronAPI']>['getSupplierSheet']>>;

const money = (n: number) => Math.round(n).toLocaleString('en-US');
const qty = (n: number) => String(Number(n.toFixed(2)));
const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const todayStr = () => {
  const d = new Date();
  return `${monthOf(d)}-${String(d.getDate()).padStart(2, '0')}`;
};
const waNumber = (raw: string) => {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '92' + d.slice(1);
  return d;
};

interface SupplierSheetViewProps {
  month?: string;
  onMonthChange?: (month: string) => void;
  onUpdate?: () => void;
  onTotalsChange?: (totals: { liters: number; amount: number; paid: number; due: number }) => void;
}

export const SupplierSheetView: React.FC<SupplierSheetViewProps> = ({
  month: controlledMonth,
  onMonthChange,
  onUpdate,
  onTotalsChange,
}) => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [localMonth, setLocalMonth] = useState(monthOf(new Date()));
  const month = controlledMonth || localMonth;
  const [activeShift, setActiveShift] = useState<'Morning' | 'Evening'>('Morning');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [version, setVersion] = useState(0);
  const [bulk, setBulk] = useState(false);
  const [bill, setBill] = useState<number | null>(null);
  const [payFor, setPayFor] = useState<number | null>(null);
  const [billSettings, setBillSettings] = useState({
    shop_title: 'قاری ظفر اقبال ملک شاپ',
    owner_name: 'حافظ مصعب ظفر',
    phone: '+92 321 0001168',
    bank_name: 'میزان بینک',
    account_title: 'حافظ مصعب ظفر',
    account_number: '02090111954760',
  });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingSaves = useRef<Map<string, { supplierId: number; date: string; liters: number; shift: 'Morning' | 'Evening' }>>(new Map());
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => i + 1), [days]);

  const now = new Date();
  const isCurrentMonth = month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayDay = isCurrentMonth ? now.getDate() : -1;

  const load = useCallback(async () => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.getSupplierSheet(month);
    setSheet(res);
    try {
      const s = await window.electronAPI.getBillSettings();
      if (s) setBillSettings(s);
    } catch (_) {}
  }, [month]);

  // Real-time local entries state for both Morning and Evening
  const [entries, setEntries] = useState<{
    Morning: Record<number, Record<number, number>>;
    Evening: Record<number, Record<number, number>>;
  }>({ Morning: {}, Evening: {} });

  // Sync entries from sheet once loaded, preserving any unpersisted in-flight edits
  useEffect(() => {
    const map: {
      Morning: Record<number, Record<number, number>>;
      Evening: Record<number, Record<number, number>>;
    } = { Morning: {}, Evening: {} };

    for (const e of sheet?.entries || []) {
      const sh = (e.shift === 'Evening' ? 'Evening' : 'Morning') as 'Morning' | 'Evening';
      const day = Number(e.date.slice(8));
      (map[sh][e.supplier_id] ||= {})[day] = e.liters;
    }

    // Preserve any in-flight pending saves so sheet reload doesn't overwrite them
    for (const item of pendingSaves.current.values()) {
      const sh = item.shift;
      const day = Number(item.date.slice(8));
      if (item.liters > 0) {
        (map[sh][item.supplierId] ||= {})[day] = item.liters;
      } else if (map[sh][item.supplierId]) {
        delete map[sh][item.supplierId][day];
      }
    }

    setEntries(map);
  }, [sheet]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh sheet when other parts of the app change data
  useEffect(() => {
    const handleDataChange = () => load();
    window.addEventListener('dairy-data-changed', handleDataChange);
    return () => window.removeEventListener('dairy-data-changed', handleDataChange);
  }, [load]);

  const paidMap = useMemo(() => Object.fromEntries((sheet?.paid || []).map((p) => [p.supplier_id, p.amount])), [sheet]);
  const carryMap = useMemo(() => Object.fromEntries((sheet?.carry || []).map((p) => [p.supplier_id, p.amount])), [sheet]);

  const stat = useCallback((id: number) => {
    const mRow = entries.Morning[id] || {};
    const eRow = entries.Evening[id] || {};
    const supplier = sheet?.suppliers.find((s) => s.id === id);
    const rate = Number(supplier?.default_rate) || 0;

    let morningLiters = 0;
    for (const k of Object.keys(mRow)) {
      morningLiters += Number(mRow[+k]) || 0;
    }
    let eveningLiters = 0;
    for (const k of Object.keys(eRow)) {
      eveningLiters += Number(eRow[+k]) || 0;
    }
    const totalLiters = morningLiters + eveningLiters;
    const currentShiftLiters = activeShift === 'Morning' ? morningLiters : eveningLiters;
    const total = Math.round(totalLiters * rate * 100) / 100;
    const paid = paidMap[id] || 0;
    const carry = carryMap[id] || 0;
    return {
      morningLiters,
      eveningLiters,
      currentShiftLiters,
      liters: totalLiters,
      total,
      paid,
      carry,
      due: carry + total - paid,
    };
  }, [entries, sheet, paidMap, carryMap, activeShift]);

  const columnTotals = useMemo(() => {
    const dayLiters: Record<number, number> = {};
    for (let d = 1; d <= days; d++) dayLiters[d] = 0;
    let totalMorningLtr = 0;
    let totalEveningLtr = 0;
    let totalLtr = 0;
    let totalAmount = 0;
    let totalCarry = 0;
    let totalPaid = 0;
    let totalDue = 0;

    const currentShiftEntries = entries[activeShift] || {};

    for (const s of sheet?.suppliers || []) {
      const row = currentShiftEntries[s.id] || {};
      for (let d = 1; d <= days; d++) {
        if (row[d]) {
          dayLiters[d] += row[d];
        }
      }
      const st = stat(s.id);
      totalMorningLtr += st.morningLiters;
      totalEveningLtr += st.eveningLiters;
      totalLtr += st.liters;
      totalAmount += st.total;
      totalCarry += st.carry;
      totalPaid += st.paid;
      totalDue += st.due;
    }

    return {
      dayLiters,
      totalMorningLtr,
      totalEveningLtr,
      totalLtr,
      totalAmount,
      totalCarry,
      totalPaid,
      totalDue,
    };
  }, [sheet, entries, stat, days, activeShift]);

  useEffect(() => {
    onTotalsChange?.({
      liters: columnTotals.totalLtr,
      amount: columnTotals.totalAmount,
      paid: columnTotals.totalPaid,
      due: columnTotals.totalDue,
    });
  }, [columnTotals, onTotalsChange]);

  const flushPendingSaves = useCallback(async () => {
    Object.values(timers.current).forEach((t) => clearTimeout(t));
    timers.current = {};
    if (!window.electronAPI || pendingSaves.current.size === 0) return;
    const items = Array.from(pendingSaves.current.values());
    pendingSaves.current.clear();
    await Promise.all(items.map((item) => window.electronAPI!.setSupplierCell(item)));
    onUpdate?.();
  }, [onUpdate]);

  useEffect(() => {
    return () => {
      flushPendingSaves();
    };
  }, [flushPendingSaves]);

  const persistCell = useCallback(
    (supplierId: number, day: number, liters: number, shiftToSave: 'Morning' | 'Evening') => {
      const dateStr = `${month}-${String(day).padStart(2, '0')}`;
      const key = `${supplierId}-${day}-${shiftToSave}`;
      pendingSaves.current.set(key, { supplierId, date: dateStr, liters, shift: shiftToSave });

      if (timers.current[key]) clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(async () => {
        try {
          if (!window.electronAPI) return;
          const item = pendingSaves.current.get(key);
          if (item) {
            await window.electronAPI.setSupplierCell(item);
            pendingSaves.current.delete(key);
          }
          delete timers.current[key];
          onUpdate?.();
          window.dispatchEvent(new Event('dairy-data-changed'));
        } catch (err) {
          console.error('Failed to save supplier cell:', err);
        }
      }, 75);
    },
    [month, onUpdate]
  );

  const onCell = (supplierId: number, day: number, raw: string, cellShift: 'Morning' | 'Evening') => {
    const liters = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
    setEntries((prev) => {
      const shiftMap = prev[cellShift] || {};
      const row = shiftMap[supplierId] || {};
      if ((row[day] || 0) === liters) return prev;
      const nextRow = { ...row };
      if (liters > 0) nextRow[day] = liters;
      else delete nextRow[day];
      return {
        ...prev,
        [cellShift]: {
          ...shiftMap,
          [supplierId]: nextRow,
        },
      };
    });
    persistCell(supplierId, day, liters, cellShift);
  };

  const onCellBlur = async (supplierId: number, day: number, raw: string, cellShift: 'Morning' | 'Evening') => {
    const liters = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
    const key = `${supplierId}-${day}-${cellShift}`;
    if (timers.current[key]) {
      clearTimeout(timers.current[key]);
      delete timers.current[key];
    }
    pendingSaves.current.delete(key);
    if (window.electronAPI) {
      const dateStr = `${month}-${String(day).padStart(2, '0')}`;
      await window.electronAPI.setSupplierCell({
        supplierId,
        date: dateStr,
        liters,
        shift: cellShift,
      });
      onUpdate?.();
      window.dispatchEvent(new Event('dairy-data-changed'));
    }
  };

  const onPrev = async (supplierId: number, raw: string) => {
    const amount = parseFloat(raw.replace(/[^0-9.\-]/g, '')) || 0;
    if (Math.round(amount) === Math.round(carryMap[supplierId] || 0)) return;
    await window.electronAPI?.setSupplierPrevious({ supplierId, month, amount });
    load();
    onUpdate?.();
    window.dispatchEvent(new Event('dairy-data-changed'));
  };

  const delMonth = async (id: number, name: string) => {
    const shiftLabel = activeShift === 'Morning' ? (ur ? 'صبح' : 'Morning') : (ur ? 'شام' : 'Evening');
    if (!confirm(ur ? `${name} کا ${shiftLabel} کا پورا مہینہ حذف کریں؟` : `Delete the whole ${shiftLabel} month ${month} for ${name}?`)) return;
    await window.electronAPI?.deleteSupplierMonth({ supplierId: id, month, shift: activeShift });
    await load();
    onUpdate?.();
    window.dispatchEvent(new Event('dairy-data-changed'));
  };

  const delSupplier = async (id: number, name: string) => {
    if (!confirm(ur ? `کیا آپ ${name} اور اس کا تمام ریکارڈ (دودھ اور ادائیگیاں) مستقل طور پر حذف کرنا چاہتے ہیں؟` : `Delete supplier ${name} and all their milk & payment records permanently?`)) return;
    await window.electronAPI?.deleteSupplier(id);
    await load();
    onUpdate?.();
    window.dispatchEvent(new Event('dairy-data-changed'));
  };

  const shiftMonth = async (d: number) => {
    await flushPendingSaves();
    const newM = monthOf(new Date(y, m - 1 + d, 1));
    setLocalMonth(newM);
    onMonthChange?.(newM);
  };

  const scrollTable = (dir: 'left' | 'right', distance = 280) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({
        left: dir === 'left' ? -distance : distance,
        behavior: 'smooth',
      });
    }
  };

  const nav = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLInputElement;
    if (t.tagName !== 'INPUT' || !t.dataset.s) {
      if (e.key === 'ArrowRight') {
        scrollTable('right', 250);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        scrollTable('left', 250);
        e.preventDefault();
      }
      return;
    }
    const ids = (sheet?.suppliers || []).map((s) => s.id);
    let r = ids.indexOf(+t.dataset.s!), d = +t.dataset.d!;
    if (e.key === 'ArrowRight') {
      if (d < days) {
        d++;
      } else {
        scrollTable('right', 250);
        return;
      }
    } else if (e.key === 'ArrowLeft') {
      if (d > 1) {
        d--;
      } else {
        scrollTable('left', 250);
        return;
      }
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      r++;
    } else if (e.key === 'ArrowUp') {
      r--;
    } else {
      return;
    }

    const el = document.querySelector<HTMLInputElement>(`input[data-s="${ids[r]}"][data-d="${d}"]`);
    if (el) {
      e.preventDefault();
      el.focus();
      el.select();
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  };

  const th = 'sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-1.5 py-1.5 text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap';
  const billSup = sheet?.suppliers.find((s) => s.id === bill);

  return (
    <div className="space-y-4 pb-10">
      {/* Month & controls toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Shift selector tabs: Morning vs Evening with Liter Badges */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={async () => {
                if (activeShift !== 'Morning') {
                  await flushPendingSaves();
                  setActiveShift('Morning');
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                activeShift === 'Morning'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>☀️</span>
              <span>{ur ? 'صبح (Morning)' : 'Morning'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                activeShift === 'Morning' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {qty(columnTotals.totalMorningLtr)} L
              </span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (activeShift !== 'Evening') {
                  await flushPendingSaves();
                  setActiveShift('Evening');
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                activeShift === 'Evening'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>🌙</span>
              <span>{ur ? 'شام (Evening)' : 'Evening'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                activeShift === 'Evening' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {qty(columnTotals.totalEveningLtr)} L
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5">
            <button onClick={() => shiftMonth(-1)} className="p-1 rounded-lg hover:bg-white cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-bold text-slate-700 px-2">{month}</span>
            <button onClick={() => shiftMonth(1)} className="p-1 rounded-lg hover:bg-white cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {/* Jump to Today Button */}
          {todayDay > 0 && (
            <button
              type="button"
              onClick={() => {
                const el = document.querySelector(`th[data-day="${todayDay}"]`);
                el?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
              }}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-brand-700 rounded-xl text-xs font-extrabold border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>📍</span>
              <span>{ur ? `آج (دن ${todayDay})` : `Today (Day ${todayDay})`}</span>
            </button>
          )}

          {/* Left / Right horizontal scroll buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => scrollTable('left', 350)}
              title={ur ? 'بائیں اسکرول کریں (Left)' : 'Scroll Left'}
              className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>◀</span>
              <span className="text-[10px] hidden md:inline">{ur ? 'بائیں طرف' : 'Left'}</span>
            </button>
            <button
              type="button"
              onClick={() => scrollTable('right', 350)}
              title={ur ? 'دائیں اسکرول کریں (Right)' : 'Scroll Right'}
              className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="text-[10px] hidden md:inline">{ur ? 'دائیں طرف' : 'Right'}</span>
              <span>▶</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => setBulk(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
        >
          <Zap className="w-4 h-4" />
          {ur ? `بیچ انٹری (${activeShift === 'Morning' ? 'صبح' : 'شام'})` : `Bulk Entry (${activeShift})`}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div
          ref={tableContainerRef}
          tabIndex={0}
          dir="ltr"
          className="overflow-auto max-h-[65vh] focus:outline-none"
          onKeyDown={nav}
        >
          <table className="border-separate border-spacing-0" style={{ minWidth: 'max-content' }}>
            <thead>
              <tr>
                <th className={`${th} left-0 z-40 text-center bg-slate-200`} style={{ minWidth: 42, width: 42 }}>#</th>
                <th className={`${th} left-[42px] z-40 text-left`} style={{ minWidth: 165 }}>{ur ? 'سپلائر' : 'Supplier'}</th>
                {dayList.map((d) => (
                  <th
                    key={d}
                    data-day={d}
                    className={`${th} text-center ${d === todayDay ? 'bg-blue-600 text-white font-black z-35' : ''}`}
                    style={{ minWidth: 44 }}
                  >
                    {d === todayDay ? `${d} (آج)` : d}
                  </th>
                ))}
                <th className={`${th} text-right`} style={{ minWidth: 60 }}>{ur ? 'لیٹر' : 'Ltr'}</th>
                <th className={`${th} text-right`} style={{ minWidth: 80 }}>{ur ? 'رقم' : 'Amount'}</th>
                <th className={`${th} text-right bg-amber-50`} style={{ minWidth: 80 }}>{ur ? 'پچھلا' : 'Previous'}</th>
                <th className={`${th} text-right`} style={{ minWidth: 80 }}>{ur ? 'ادا' : 'Paid'}</th>
                <th className={`${th} text-right`} style={{ minWidth: 86 }}>{ur ? 'باقی' : 'Due'}</th>
                <th className={`${th} text-center`} style={{ minWidth: 180 }}>{ur ? 'اختیارات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {sheet?.suppliers.map((s, idx) => {
                const st = stat(s.id);
                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-brand-50/30 transition-colors">
                    <td className="sticky left-0 z-20 bg-slate-100 border-r border-slate-200 px-1 py-1.5 text-center font-black text-[11px] text-slate-600" style={{ minWidth: 42, width: 42 }}>
                      #{idx + 1}
                    </td>
                    <td className="sticky left-[42px] z-20 bg-white border-r border-slate-200 px-2.5 py-1.5" style={{ minWidth: 165 }}>
                      <div className="font-bold text-[12px] text-slate-800 truncate">{s.name}</div>
                      <div className="text-[10px] text-slate-400">{s.phone || '-'} • Rs.{s.default_rate}</div>
                    </td>
                    {dayList.map((d) => {
                      const val = entries[activeShift]?.[s.id]?.[d] || 0;
                      return (
                        <td key={d} className={`border-r border-slate-100 p-0 ${d === todayDay ? 'bg-blue-50/40' : ''}`}>
                          <input
                            key={`${s.id}-${d}-${activeShift}`}
                            data-s={s.id}
                            data-d={d}
                            type="text"
                            inputMode="decimal"
                            defaultValue={val > 0 ? qty(val) : ''}
                            onChange={(e) => onCell(s.id, d, e.target.value, activeShift)}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                              e.target.value = v > 0 ? qty(v) : '';
                              onCellBlur(s.id, d, e.target.value, activeShift);
                            }}
                            className={`w-full h-7 text-center text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 ${
                              d === todayDay
                                ? 'bg-blue-50/80 font-bold border-x border-blue-200'
                                : val > 0
                                ? 'bg-emerald-50 text-emerald-800 font-bold'
                                : 'bg-transparent'
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-1.5 text-right text-[11px] font-bold bg-slate-50">
                      <div title={`صبح: ${st.morningLiters}L | شام: ${st.eveningLiters}L`}>
                        {qty(st.liters)}
                      </div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        {activeShift === 'Morning' ? `صبح: ${st.morningLiters}L` : `شام: ${st.eveningLiters}L`}
                      </div>
                    </td>
                    <td className="px-1.5 text-right text-[11px] font-semibold bg-slate-50">
                      <div>Rs. {money(st.total)}</div>
                      {st.morningLiters > 0 && st.eveningLiters > 0 && (
                        <div className="text-[9px] text-emerald-600 font-bold">دونوں وقت</div>
                      )}
                    </td>
                    <td className="p-0 bg-amber-50/60">
                      <input
                        key={`p-${version}-${s.id}`}
                        defaultValue={st.carry ? String(Math.round(st.carry)) : ''}
                        onBlur={(e) => onPrev(s.id, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        className="w-full h-8 text-right pr-1.5 text-[11px] font-bold text-amber-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
                      />
                    </td>
                    <td className="px-1.5 text-right text-[11px] font-bold text-emerald-600">{money(st.paid)}</td>
                    <td className={`px-1.5 text-right text-[11px] font-bold ${st.due > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{money(st.due)}</td>
                    <td className="px-1.5">
                      <div className="flex items-center justify-center gap-1">
                        {st.due <= 0 && (st.total > 0 || st.carry > 0 || st.paid > 0) ? (
                          <span
                            className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-0.5 border border-emerald-300 select-none whitespace-nowrap shadow-2xs"
                            title={ur ? 'مکمل ادا شدہ' : 'Fully Paid'}
                          >
                            ✓ Paid
                          </span>
                        ) : (
                          <button
                            onClick={() => setPayFor(s.id)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => setBill(s.id)}
                          className="px-2 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Bill
                        </button>
                        <button
                          onClick={() => {
                            setBill(s.id);
                            setTimeout(() => window.print(), 350);
                          }}
                          title={ur ? 'بل پرنٹ کریں' : 'Print Bill'}
                          className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print</span>
                        </button>
                        <button
                          onClick={() => delSupplier(s.id, s.name)}
                          title={ur ? 'سپلائر اور تمام ریکارڈ حذف کریں' : 'Delete Supplier & All Records'}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sheet && sheet.suppliers.length === 0 && (
                <tr><td colSpan={days + 8} className="py-12 text-center text-xs text-slate-400">{ur ? 'پہلے سپلائر شامل کریں' : 'Add suppliers first'}</td></tr>
              )}
            </tbody>
            {sheet && sheet.suppliers.length > 0 && (
              <tfoot className="sticky bottom-0 z-30 bg-slate-100 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] font-bold text-xs">
                <tr className="border-t-2 border-slate-300">
                  <td colSpan={2} className="sticky left-0 z-40 bg-slate-200 border-r border-slate-300 px-2.5 py-2 text-left font-black text-slate-800" style={{ minWidth: 207 }}>
                    {ur ? 'کل ٹوٹل (گرینڈ ٹوٹل)' : 'Grand Total'}
                  </td>
                  {dayList.map((d) => (
                    <td key={d} className="border-r border-slate-200 px-0 py-1.5 text-center text-[10px] font-black text-slate-700 bg-slate-100" style={{ minWidth: 42 }}>
                      {columnTotals.dayLiters[d] > 0 ? qty(columnTotals.dayLiters[d]) : ''}
                    </td>
                  ))}
                  <td className="bg-slate-200 border-l border-r border-slate-300 px-1.5 py-2 text-right text-[11px] font-black text-brand-900 whitespace-nowrap" style={{ minWidth: 60 }}>
                    {qty(columnTotals.totalLtr)}
                  </td>
                  <td className="bg-slate-200 border-r border-slate-300 px-1.5 py-2 text-right text-[11px] font-black text-slate-900 whitespace-nowrap" style={{ minWidth: 80 }}>
                    {money(columnTotals.totalAmount)}
                  </td>
                  <td className="bg-amber-100/70 border-r border-slate-300 px-1.5 py-2 text-right text-[11px] font-black text-amber-900 whitespace-nowrap" style={{ minWidth: 80 }}>
                    {money(columnTotals.totalCarry)}
                  </td>
                  <td className="bg-emerald-100/70 border-r border-slate-300 px-1.5 py-2 text-right text-[11px] font-black text-emerald-900 whitespace-nowrap" style={{ minWidth: 80 }}>
                    {money(columnTotals.totalPaid)}
                  </td>
                  <td className={`border-r border-slate-300 px-1.5 py-2 text-right text-[11px] font-black whitespace-nowrap ${columnTotals.totalDue > 0 ? 'bg-rose-100 text-rose-900' : 'bg-emerald-100 text-emerald-900'}`} style={{ minWidth: 86 }}>
                    {money(columnTotals.totalDue)}
                  </td>
                  <td className="bg-slate-200 px-2 py-2 text-center text-[10px] font-bold text-slate-500" style={{ minWidth: 180 }}>
                    ✓ {sheet?.suppliers.length || 0} {ur ? 'سپلائرز' : 'suppliers'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {bulk && sheet && (
        <BulkModal
          ur={ur}
          suppliers={sheet.suppliers}
          days={days}
          shift={activeShift}
          onClose={() => setBulk(false)}
          onApply={async (p) => {
            await window.electronAPI?.bulkFillSupplier({ ...p, month, shift: activeShift });
            setBulk(false);
            load();
            onUpdate?.();
          }}
        />
      )}

      {billSup && sheet && (
        <BillModal
          ur={ur}
          month={month}
          shift={activeShift}
          supplier={billSup}
          settings={billSettings}
          stat={stat(billSup.id)}
          rows={dayList
            .map((d) => {
              const ml = entries.Morning[billSup.id]?.[d] || 0;
              const el = entries.Evening[billSup.id]?.[d] || 0;
              const totalD = ml + el;
              return {
                day: d,
                morningLiters: ml,
                eveningLiters: el,
                liters: totalD,
                total: Math.round(totalD * Number(billSup.default_rate) * 100) / 100,
              };
            })
            .filter((r) => r.liters > 0)}
          onClose={() => setBill(null)}
        />
      )}

      {payFor !== null && sheet && (
        <PayModal
          ur={ur}
          supplier={sheet.suppliers.find((s) => s.id === payFor)}
          settings={billSettings}
          due={stat(payFor).due}
          month={month}
          onClose={() => setPayFor(null)}
          onPay={async (amount) => {
            await window.electronAPI?.addSupplierPayment({ supplierId: payFor, date: todayStr().startsWith(month) ? todayStr() : `${month}-01`, amount });
            load();
            onUpdate?.();
          }}
        />
      )}
    </div>
  );
};

const Shell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 md:p-3 print:static print:bg-white print:p-0">
    <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-[360px] md:max-w-[380px] w-full overflow-hidden max-h-[96vh] flex flex-col print:shadow-none print:max-h-none">
      <div className="bg-brand-600 text-white px-4 py-2.5 flex items-center justify-between print:hidden shadow-xs">
        <h2 className="text-xs font-black tracking-tight">{title}</h2>
        <button onClick={onClose} className="p-1 rounded-xl hover:bg-brand-700/80 cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-3 space-y-2 overflow-y-auto">{children}</div>
    </div>
  </div>
);

const PayModal: React.FC<{
  ur: boolean;
  supplier: { id: number; name: string; phone: string } | undefined;
  settings: { shop_title: string; owner_name: string; phone: string };
  due: number;
  month: string;
  onClose: () => void;
  onPay: (a: number) => Promise<void>;
}> = ({ ur, supplier, settings, due, month, onClose, onPay }) => {
  const [amt, setAmt] = useState('');
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<{
    receiptNo: string;
    amountPaid: number;
    prevDue: number;
    remainingDue: number;
    time: string;
  } | null>(null);

  const n = parseFloat(amt) || 0;
  const supName = supplier?.name || '';
  const supPhone = supplier?.phone || '';

  const handlePay = async () => {
    if (n <= 0) return;
    setSaving(true);
    try {
      await onPay(n);
      const remaining = Math.max(0, due - n);
      setReceipt({
        receiptNo: `SUP-REC-${Date.now().toString().slice(-6)}`,
        amountPaid: n,
        prevDue: due,
        remainingDue: remaining,
        time: new Date().toLocaleString(ur ? 'ur-PK' : 'en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      });
    } catch (e) {
      alert('Error saving payment');
    } finally {
      setSaving(false);
    }
  };

  const shareReceiptWhatsApp = async () => {
    if (!receipt) return;
    const cleanNum = waNumber(supPhone);
    if (!cleanNum) {
      alert(ur ? 'واٹس ایپ نمبر درج نہیں ہے' : 'No phone number available for WhatsApp');
      return;
    }
    const msg = [
      `🥛 *${settings.shop_title || 'قاری ظفر اقبال ملک شاپ'}*`,
      `📄 *ادائیگی کی تصدیقی رسید (Payment Slip)*`,
      `──────────────────`,
      `👤 *سپلائر نام:* ${supName}`,
      `🔢 *رسید نمبر:* ${receipt.receiptNo}`,
      `📅 *تاریخ و وقت:* ${receipt.time}`,
      `──────────────────`,
      `💵 *ادا شدہ رقم:* Rs. ${money(receipt.amountPaid)}`,
      `📊 *سابقہ واجب الادا:* Rs. ${money(receipt.prevDue)}`,
      `⚖️ *بقایا رقم:* Rs. ${money(receipt.remainingDue)}`,
      `──────────────────`,
      `✓ ادائیگی کی وصولی درج کر لی گئی ہے۔ شکریہ!`,
      `📞 رابطہ: ${settings.phone || '+92 321 0001168'}`,
    ].join('\n');

    const url = `https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`;
    if (window.electronAPI) await window.electronAPI.openExternal(url);
    else window.open(url, '_blank');
  };

  if (receipt) {
    return (
      <Shell title={ur ? 'ادائیگی کی رسید' : 'Payment Slip'} onClose={onClose}>
        <div id="supplier-receipt-slip" className="w-full bg-white border border-blue-500/30 rounded-2xl p-2.5 shadow-md space-y-2 text-slate-800 text-xs">
          <div className="bg-gradient-to-br from-[#1B44C8] via-[#153bb8] to-[#102A7D] text-white rounded-xl p-2 relative overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white p-0.5 border border-blue-300 shadow-2xs shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, minWidth: 40, minHeight: 40 }}>
                  <CowLogo variant="white" size={32} className="w-8 h-8 object-contain" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-amber-200 tracking-tight truncate leading-tight">{settings.shop_title}</h4>
                  <p className="text-[9px] text-blue-100 font-medium truncate leading-tight">سپلائر ادائیگی رسید</p>
                </div>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500 text-white font-black uppercase shadow-2xs">
                PAID ✓
              </span>
            </div>
            <div className="mt-1 pt-1 border-t border-blue-400/30 flex items-center justify-between text-[9px] text-blue-100 font-mono">
              <span>رسید: {receipt.receiptNo}</span>
              <span>{settings.phone}</span>
            </div>
          </div>

          <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl px-2 py-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
            <div className="flex items-center gap-1 truncate">
              <span className="text-slate-400 shrink-0 font-medium">{ur ? 'سپلائر' : 'Supplier'}:</span>
              <span className="font-black text-slate-800 truncate">{supName}</span>
            </div>
            <div className="flex items-center gap-1 justify-end truncate text-slate-500">
              <span className="text-slate-400 shrink-0 font-medium">{ur ? 'فون' : 'Phone'}:</span>
              <span className="font-mono">{supPhone || '-'}</span>
            </div>
            <div className="col-span-2 flex items-center gap-1 truncate text-slate-500 text-[9px]">
              <span className="text-slate-400 shrink-0 font-medium">{ur ? 'وقت' : 'Time'}:</span>
              <span>{receipt.time}</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#1B44C8] to-[#102A7D] text-white rounded-xl p-2.5 text-center shadow-2xs">
            <div className="text-[9.5px] font-bold text-blue-100 uppercase tracking-wider">{ur ? 'ادا شدہ رقم' : 'Amount Paid'}</div>
            <div className="text-xl font-black text-amber-300 mt-0.5">Rs. {money(receipt.amountPaid)}</div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="bg-white rounded-xl p-2 border border-slate-200 text-center shadow-2xs">
              <div className="text-[9px] text-slate-400 font-bold">{ur ? 'سابقہ رقم' : 'Prev Due'}</div>
              <div className="text-xs font-black text-slate-700">Rs. {money(receipt.prevDue)}</div>
            </div>
            <div className="bg-white rounded-xl p-2 border border-slate-200 text-center shadow-2xs">
              <div className="text-[9px] text-slate-400 font-bold">{ur ? 'بقایا واجب الادا' : 'Remaining'}</div>
              <div className={`text-xs font-black ${receipt.remainingDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                Rs. {money(receipt.remainingDue)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{ur ? 'پرنٹ رسید' : 'Print Slip'}</span>
          </button>
          <button
            onClick={shareReceiptWhatsApp}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{ur ? 'واٹس ایپ' : 'WhatsApp'}</span>
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={`${ur ? 'ادائیگی' : 'Pay'} • ${supName}`} onClose={onClose}>
      <div className="text-xs text-slate-500">{ur ? 'کل باقی' : 'Total due'}: <b className="text-rose-600">Rs. {money(due)}</b></div>
      <div className="flex gap-2">
        <input
          autoFocus
          type="number"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          placeholder={ur ? 'کتنی رقم دی؟' : 'Amount paid'}
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={() => setAmt(String(Math.max(0, Math.round(due))))}
          className="px-3 rounded-xl bg-blue-50 text-brand-700 text-xs font-bold hover:bg-blue-100 cursor-pointer"
        >
          {ur ? 'پوری' : 'Full'}
        </button>
      </div>
      {n > 0 && (
        <p className="text-[11px] font-semibold text-rose-600">
          {due - n > 0 ? `Rs. ${money(due - n)} ${ur ? 'اگلے مہینے میں شامل' : 'carries over'}` : ur ? 'مکمل ادائیگی' : 'Fully paid'}
        </p>
      )}
      <button
        disabled={!(n > 0) || saving}
        onClick={handlePay}
        className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm disabled:opacity-50 cursor-pointer shadow-md transition-colors"
      >
        {saving ? (ur ? 'محفوظ ہو رہا ہے...' : 'Saving...') : (ur ? 'ادائیگی محفوظ کریں' : 'CONFIRM PAYMENT')}
      </button>
    </Shell>
  );
};

const BillModal: React.FC<{
  ur: boolean;
  month: string;
  shift: 'Morning' | 'Evening';
  supplier: { id: number; name: string; phone: string; default_rate: number };
  settings: { shop_title: string; owner_name: string; phone: string };
  stat: {
    liters: number;
    total: number;
    paid: number;
    carry: number;
    due: number;
    morningLiters?: number;
    eveningLiters?: number;
  };
  rows: { day: number; liters: number; total: number; morningLiters?: number; eveningLiters?: number }[];
  onClose: () => void;
}> = ({ ur, month, shift, supplier, settings, stat, rows, onClose }) => {
  const shiftText = shift === 'Morning' ? 'صبح (Morning)' : 'شام (Evening)';
  const text = () => [
    `🥛 *${settings.shop_title || 'قاری ظفر اقبال ملک شاپ'}*`,
    `📄 *سپلائر دودھ کا بل*`,
    `──────────────────`,
    `👤 *سپلائر:* ${supplier.name}`,
    `📅 *ماہ:* ${month}`,
    `──────────────────`,
    `☀️ *صبح کا دودھ:* ${qty(stat.morningLiters || 0)} لیٹر`,
    `🌙 *شام کا دودھ:* ${qty(stat.eveningLiters || 0)} لیٹر`,
    `🥛 *کل دودھ:* ${qty(stat.liters)} لیٹر`,
    `💵 *ریٹ:* Rs. ${supplier.default_rate}/L`,
    `💰 *اس ماہ کی رقم:* Rs. ${money(stat.total)}`,
    `📊 *سابقہ بقایا:* Rs. ${money(stat.carry)}`,
    `✓ *ادا شدہ رقم:* Rs. ${money(stat.paid)}`,
    `──────────────────`,
    `⭐ *کل واجب الادا:* Rs. ${money(stat.due)}`,
    `──────────────────`,
    `📞 رابطہ: ${settings.phone || '+92 321 0001168'}`,
  ].join('\n');

  const send = async () => {
    const n = waNumber(supplier.phone);
    if (!n) return alert(ur ? 'واٹس ایپ نمبر موجود نہیں' : 'No WhatsApp number for this supplier');
    const url = `https://wa.me/${n}?text=${encodeURIComponent(text())}`;
    if (window.electronAPI) await window.electronAPI.openExternal(url);
    else window.open(url, '_blank');
  };

  return (
    <Shell title={`${ur ? 'سپلائر بل' : 'Supplier Bill'} • ${month}`} onClose={onClose}>
      <div
        id="print-bill"
        className="printable-bill w-full bg-white border border-blue-500/30 rounded-2xl p-2.5 shadow-md space-y-2 text-slate-800 text-xs print:border-none print:shadow-none print:p-0"
      >
        {/* Header: Royal Blue Brand Strip */}
        <div className="bg-gradient-to-br from-[#1B44C8] via-[#153bb8] to-[#102A7D] text-white rounded-xl p-2 relative overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white p-0.5 border border-blue-300 shadow-2xs shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, minWidth: 40, minHeight: 40 }}>
                <CowLogo variant="white" size={32} className="w-8 h-8 object-contain" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-black text-amber-200 tracking-tight truncate leading-tight">
                  {settings.shop_title || 'قاری ظفر اقبال ملک شاپ'}
                </h2>
                <p className="text-[9px] text-blue-100 font-medium truncate leading-tight">
                  سپلائر ماہانہ بل (صبح و شام)
                </p>
              </div>
            </div>

            <div className="bg-black/30 border border-blue-300/40 px-2 py-1 rounded-lg text-center shrink-0">
              <div className="text-[8px] text-blue-200 uppercase font-bold leading-none">ماہانہ بل</div>
              <div className="text-xs font-black text-amber-300 leading-tight mt-0.5">
                {month}
              </div>
            </div>
          </div>

          <div className="mt-1 pt-1 border-t border-blue-400/30 flex items-center justify-between text-[9px] text-blue-100 font-medium">
            <span>{settings.owner_name}</span>
            <span className="font-mono text-amber-100">{settings.phone}</span>
          </div>
        </div>

        {/* Supplier Meta */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl px-2 py-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
          <div className="flex items-center gap-1 truncate">
            <span className="text-slate-400 shrink-0 font-medium">سپلائر:</span>
            <span className="font-black text-slate-800 truncate">{supplier.name}</span>
          </div>
          <div className="flex items-center gap-1 justify-end truncate">
            <span className="text-slate-400 shrink-0 font-medium">ریٹ:</span>
            <span className="font-black text-brand-700">Rs. {supplier.default_rate}/L</span>
          </div>
          <div className="flex items-center gap-1 truncate text-slate-500">
            <span className="text-slate-400 shrink-0 font-medium">صبح / شام:</span>
            <span className="font-bold text-slate-800">
              ☀️ {qty(stat.morningLiters || 0)}L • 🌙 {qty(stat.eveningLiters || 0)}L
            </span>
          </div>
          <div className="flex items-center gap-1 justify-end truncate text-slate-500">
            <span className="text-slate-400 shrink-0 font-medium">کل دودھ:</span>
            <span className="font-black text-brand-700">{qty(stat.liters)} L</span>
          </div>
        </div>

        {/* Calculation breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-2 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100 font-bold">
            <span className="text-slate-800 font-black">اس ماہ کی رقم:</span>
            <span className="font-black text-slate-900">Rs. {money(stat.total)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-800">
            <span className="text-slate-500 font-medium">سابقہ بقایا (Previous):</span>
            <span>Rs. {money(stat.carry)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700">
            <span className="text-slate-500 font-medium">ادا شدہ رقم (Paid):</span>
            <span>- Rs. {money(stat.paid)}</span>
          </div>

          {/* Grand Total */}
          <div className="bg-gradient-to-r from-[#1B44C8] to-[#102A7D] text-white rounded-lg px-2.5 py-1.5 flex items-center justify-between shadow-2xs mt-1">
            <div>
              <div className="text-[9px] font-bold text-blue-200 leading-tight">کل واجب الادا رقم</div>
              <div className="text-[8px] text-blue-100/80 leading-none">Total Due</div>
            </div>
            <div className="text-base font-black text-amber-300 tracking-tight">
              Rs. {money(stat.due)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-0.5">
          <p className="text-[8px] text-slate-400 font-medium">
            کمپیوٹرائزڈ ڈیری کھاتہ مینجمنٹ سسٹم • خودکار بل
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow cursor-pointer transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{ur ? 'پرنٹ بل' : 'Print Bill'}</span>
        </button>
        <button
          onClick={send}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow cursor-pointer transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{ur ? 'واٹس ایپ' : 'WhatsApp'}</span>
        </button>
      </div>
    </Shell>
  );
};

const BulkModal: React.FC<{
  ur: boolean;
  suppliers: { id: number; name: string }[];
  days: number;
  shift: 'Morning' | 'Evening';
  onClose: () => void;
  onApply: (p: { supplierIds: number[]; fromDay: number; toDay: number; liters: number; rate?: number; shift: string }) => void;
}> = ({ ur, suppliers, days, shift, onClose, onApply }) => {
  const [ids, setIds] = useState<number[]>(suppliers.map((s) => s.id));
  const [liters, setLiters] = useState('');
  const [rate, setRate] = useState('');
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState(String(days));
  const ok = ids.length > 0 && parseFloat(liters) > 0;
  const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm';
  const shiftLabel = shift === 'Morning' ? (ur ? 'صبح (Morning)' : 'Morning') : (ur ? 'شام (Evening)' : 'Evening');

  return (
    <Shell title={`${ur ? 'پورے مہینے کی انٹری' : 'Bulk Entry'} • ${shiftLabel}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" step="0.5" placeholder={ur ? 'روزانہ لیٹر' : 'Liters / day'} value={liters} onChange={(e) => setLiters(e.target.value)} className={inp} />
        <input type="number" placeholder={ur ? 'ریٹ (خالی = عام ریٹ)' : 'Rate (blank = usual)'} value={rate} onChange={(e) => setRate(e.target.value)} className={inp} />
        <input type="number" min={1} max={days} value={from} onChange={(e) => setFrom(e.target.value)} className={inp} />
        <input type="number" min={1} max={days} value={to} onChange={(e) => setTo(e.target.value)} className={inp} />
      </div>
      <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y">
        {suppliers.map((s) => (
          <label key={s.id} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50">
            <input type="checkbox" checked={ids.includes(s.id)} onChange={() => setIds((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))} />
            {s.name}
          </label>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">{ur ? `موجودہ ${shiftLabel} کے اندراجات تبدیل ہو جائیں گے۔` : `Existing ${shift} entries will be overwritten.`}</p>
      <button
        disabled={!ok}
        onClick={() => onApply({ supplierIds: ids, fromDay: +from, toDay: +to, liters: parseFloat(liters), rate: parseFloat(rate) || undefined, shift })}
        className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm disabled:opacity-50 cursor-pointer transition-colors"
      >
        {ur ? 'لاگو کریں' : 'APPLY'}
      </button>
    </Shell>
  );
};
