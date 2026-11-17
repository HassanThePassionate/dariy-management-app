import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Users,
  Receipt,
  Wallet,
  AlertCircle,
  Zap,
  BookOpen,
  Trash2,
  Printer,
  Sun,
  Moon,
  Clock,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { KhataCustomer } from '../types/electron';
import { BulkEntryModal } from './BulkEntryModal';
import { KhataPayBillModal } from './KhataPayBillModal';

type FilterTab = 'all' | 'due' | 'paid' | 'empty';
type ShiftFilter = 'all' | 'Morning' | 'Evening' | 'Both';

// entries: customerId -> { dayOfMonth -> liters }
type EntryMap = Record<number, Record<number, number>>;
type ReceivedMap = Record<number, number>;

const DAY_COL_WIDTH = 46;
const NAME_COL_WIDTH = 200;
const RATE_COL_WIDTH = 74;

const toMonthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const EMPTY_ROW: Record<number, number> = {};

const daysInMonthOf = (monthKey: string) => {
  if (!monthKey || typeof monthKey !== 'string') return 30;
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
};

const parseNumber = (raw: string | number | undefined | null) => {
  if (raw === undefined || raw === null || raw === '') return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : 0;
  const clean = String(raw).replace(/,/g, '').trim();
  const n = parseFloat(clean);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const formatMoney = (value: number | undefined | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const formatQty = (value: number | undefined | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
};

interface KhataRowProps {
  customer: KhataCustomer;
  customerNumber: number;
  monthKey: string;
  totalDays: number;
  weekdays: string[];
  rowEntries: Record<number, number>;
  received: number;
  carry: number;
  version: number;
  onCellChange: (customerId: number, day: number, raw: string) => void;
  onReceivedChange: (customerId: number, raw: string) => void;
  onPay: (customerId: number) => void;
  onBill: (customerId: number) => void;
  onPrint?: (customerId: number) => void;
  onDelete: (customerId: number) => void;
  onPrevChange: (customerId: number, raw: string) => void;
}

const KhataRow = React.memo<KhataRowProps>(
  ({
    customer,
    customerNumber,
    monthKey,
    totalDays,
    weekdays,
    rowEntries,
    received,
    carry,
    version,
    onCellChange,
    onReceivedChange,
    onPay,
    onBill,
    onPrint,
    onDelete,
    onPrevChange,
  }) => {
    const { language } = useLanguage();
    const totalLiters = useMemo(() => {
      let sum = 0;
      for (let d = 1; d <= totalDays; d++) {
        sum += rowEntries[d] || 0;
      }
      return sum;
    }, [rowEntries, totalDays]);

    const rate = Number(customer.default_rate) || 0;
    const bill = totalLiters * rate;
    const balance = carry + bill - received;

    return (
      <tr className="group border-b border-slate-100 last:border-b-0 hover:bg-brand-50/30">
        {/* Sticky name with customer number */}
        <td
          className="sticky left-0 z-20 bg-white group-hover:bg-brand-50/60 border-r border-slate-200 px-2.5 py-1.5"
          style={{ minWidth: NAME_COL_WIDTH, width: NAME_COL_WIDTH }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              title={`Customer #${customerNumber}`}
              className="shrink-0 px-1.5 py-0.5 rounded-md bg-slate-100 group-hover:bg-brand-100 text-slate-700 group-hover:text-brand-800 text-[10px] font-mono font-bold border border-slate-200 group-hover:border-brand-300"
            >
              #{customerNumber}
            </span>
            <div className="font-bold text-[12px] text-slate-800 truncate" title={customer.name}>
              {customer.name}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 truncate pl-0.5 mt-0.5">
            {customer.phone || '-'}
            {customer.shift ? ` • ${customer.shift === 'Evening' ? 'Evening' : customer.shift === 'Both' ? 'Both' : 'Morning'}` : ''}
          </div>
        </td>

        {/* Sticky rate */}
        <td
          className="sticky z-20 bg-white group-hover:bg-brand-50/60 border-r border-slate-200 px-1.5 py-1.5 text-right text-[11px] font-bold text-brand-700"
          style={{ left: NAME_COL_WIDTH, minWidth: RATE_COL_WIDTH, width: RATE_COL_WIDTH }}
        >
          {rate}
        </td>

        {/* Day cells */}
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const value = rowEntries[day];
          const isWeekend = weekdays[day - 1] === 'Sun';

          return (
            <td
              key={day}
              className={`px-0 py-0 border-r border-slate-100 text-center ${
                isWeekend ? 'bg-rose-50/40' : ''
              }`}
              style={{ minWidth: DAY_COL_WIDTH, width: DAY_COL_WIDTH }}
            >
              <input
                key={`${version}-${day}`}
                type="text"
                inputMode="decimal"
                defaultValue={value ? formatQty(value) : ''}
                data-r={customer.id}
                data-d={day}
                data-month={monthKey}
                onChange={(e) => onCellChange(customer.id, day, e.target.value)}
                onBlur={(e) => {
                  const v = parseNumber(e.target.value);
                  e.target.value = v > 0 ? formatQty(v) : '';
                }}
                className={`w-full h-7 text-center text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 focus:bg-white ${
                  value
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-transparent text-slate-700 hover:bg-slate-50'
                }`}
              />
            </td>
          );
        })}

        {/* Total liters - naturally placed after Day 30/31 */}
        <td
          className="bg-slate-50 border-l border-r border-slate-200 px-2 py-1.5 text-right text-[11px] font-bold text-slate-700 whitespace-nowrap"
          style={{ minWidth: 70, width: 70 }}
        >
          {formatQty(totalLiters)}
        </td>

        {/* Total bill */}
        <td
          className="bg-slate-50 border-r border-slate-200 px-2 py-1.5 text-right text-[11px] font-semibold text-slate-700 whitespace-nowrap"
          style={{ minWidth: 95, width: 95 }}
        >
          {formatMoney(bill)}
        </td>

        {/* Previous balance carried in */}
        <td
          className="bg-amber-50/60 border-r border-slate-200 px-0 py-0"
          style={{ minWidth: 85, width: 85 }}
        >
          <input
            key={`prev-${version}`}
            type="text"
            inputMode="decimal"
            data-r={customer.id}
            data-col="prev"
            title="Previous arrears (editable)"
            defaultValue={carry ? String(Math.round(carry)) : ''}
            onFocus={(e) => {
              const num = parseNumber(e.target.value);
              e.target.value = num > 0 ? String(Math.round(num)) : '';
            }}
            onBlur={(e) => {
              const v = parseNumber(e.target.value);
              e.target.value = v > 0 ? String(Math.round(v)) : '';
              onPrevChange(customer.id, String(v));
            }}
            className={`w-full h-9 text-right pr-2 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 bg-transparent ${
              carry > 0 ? 'text-amber-700' : 'text-slate-500'
            }`}
          />
        </td>

        {/* Received (editable) */}
        <td
          className="bg-white border-r border-slate-200 px-0 py-0"
          style={{ minWidth: 95, width: 95 }}
        >
          <input
            key={`recv-${version}`}
            type="text"
            inputMode="decimal"
            data-r={customer.id}
            data-col="recv"
            defaultValue={received ? formatMoney(received) : ''}
            onFocus={(e) => {
              const num = parseNumber(e.target.value);
              e.target.value = num > 0 ? String(num) : '';
            }}
            onChange={(e) => onReceivedChange(customer.id, e.target.value)}
            onBlur={(e) => {
              const v = parseNumber(e.target.value);
              e.target.value = v > 0 ? formatMoney(v) : '';
              onReceivedChange(customer.id, String(v));
            }}
            className="w-full h-9 text-right pr-2 text-[11px] font-bold text-brand-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 bg-transparent"
          />
        </td>

        {/* Balance due */}
        <td
          className={`border-r border-slate-200 px-2 py-1.5 text-right text-[11px] font-bold whitespace-nowrap ${
            balance > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
          }`}
          style={{ minWidth: 95, width: 95 }}
        >
          {formatMoney(balance)}
        </td>

        {/* Actions */}
        <td
          className="bg-white group-hover:bg-brand-50/60 px-2 py-1"
          style={{ minWidth: 190, width: 190 }}
        >
          <div className="flex items-center justify-center gap-1">
            {balance <= 0 && (bill > 0 || carry > 0 || received > 0) ? (
              <button
                type="button"
                onClick={() => onBill(customer.id)}
                className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-extrabold flex items-center gap-0.5 border border-emerald-300 cursor-pointer transition-colors whitespace-nowrap shadow-2xs"
                title={language === 'ur' ? 'کھاتہ مکمل ادا شدہ (بل دیکھنے کے لیے کلک کریں)' : 'Fully Paid (Click to view bill)'}
              >
                ✓ Paid
              </button>
            ) : (
              <button
                onClick={() => onPay(customer.id)}
                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
              >
                Pay
              </button>
            )}
            <button
              onClick={() => onBill(customer.id)}
              className="px-2 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold cursor-pointer transition-colors"
            >
              Bill
            </button>
            <button
              onClick={() => (onPrint ? onPrint(customer.id) : onBill(customer.id))}
              title="بل پرنٹ کریں (Print Bill)"
              className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
            >
              <Printer className="w-3 h-3" />
              <span>Print</span>
            </button>
            <button
              onClick={() => onDelete(customer.id)}
              title="Delete this month's khatta"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }
);

KhataRow.displayName = 'KhataRow';

export const MonthlyKhattaView: React.FC = () => {
  const { t, language } = useLanguage();

  const [monthKey, setMonthKey] = useState<string>(() => toMonthKey(new Date()));
  const [customers, setCustomers] = useState<KhataCustomer[]>([]);
  const [entries, setEntries] = useState<EntryMap>({});
  const [received, setReceived] = useState<ReceivedMap>({});
  const [carry, setCarry] = useState<ReceivedMap>({});
  const [payModal, setPayModal] = useState<{ id: number; mode: 'pay' | 'bill'; autoPrint?: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [toast, setToast] = useState('');

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const totalDays = useMemo(() => daysInMonthOf(monthKey), [monthKey]);

  const weekdays = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number);
    return Array.from({ length: totalDays }, (_, i) =>
      new Date(y, m - 1, i + 1).toLocaleDateString('en-US', { weekday: 'short' })
    );
  }, [monthKey, totalDays]);

  const dayNumbers = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => i + 1),
    [totalDays]
  );

  const monthLabel = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-GB', {
      month: 'long',
      year: 'numeric',
    });
  }, [monthKey, language]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  /* ---------------- data loading ---------------- */

  const loadMonth = useCallback(async (key: string) => {
    setLoading(true);
    try {
      if (!window.electronAPI) {
        setCustomers([]);
        setEntries({});
        setReceived({});
        return;
      }

      const data = await window.electronAPI.getKhataMonth(key);

      const entryMap: EntryMap = {};
      for (const e of data.entries) {
        const day = Number(e.entry_date.slice(8, 10));
        if (!entryMap[e.customer_id]) entryMap[e.customer_id] = {};
        entryMap[e.customer_id][day] = e.quantity;
      }

      const receivedMap: ReceivedMap = {};
      for (const r of data.received) {
        receivedMap[r.customer_id] = r.amount;
      }

      setCustomers(data.customers || []);
      setEntries(entryMap);
      setReceived(receivedMap);
      const carryMap: ReceivedMap = {};
      for (const c of data.carry || []) carryMap[c.customer_id] = c.amount;
      setCarry(carryMap);
      setVersion((v) => v + 1);
    } catch (err) {
      console.error('Failed to load khata month:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonth(monthKey);
  }, [monthKey, loadMonth]);

  // Clear pending save timers on unmount
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  /* ---------------- per-row derived data ---------------- */

  const rowStats = useMemo(() => {
    const map: Record<number, { liters: number; bill: number; balance: number; hasData: boolean }> = {};
    for (const c of customers) {
      if (!c || !c.id) continue;
      const row = entries[c.id] || {};
      let liters = 0;
      let hasData = false;
      for (const k of Object.keys(row)) {
        const v = Number(row[Number(k)]) || 0;
        if (v > 0) {
          liters += v;
          hasData = true;
        }
      }
      const bill = liters * (Number(c.default_rate) || 0);
      const rcvd = Number(received[c.id]) || 0;
      const prev = Number(carry[c.id]) || 0;
      map[c.id] = { liters, bill, balance: prev + bill - rcvd, hasData };
    }
    return map;
  }, [customers, entries, received, carry]);

  const visibleCustomers = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();

    return customers.filter((c) => {
      if (!c) return false;

      // 1. Search Query Filter
      if (q) {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const phoneMatch = c.phone ? String(c.phone).includes(q) : false;
        if (!nameMatch && !phoneMatch) return false;
      }

      // 2. Shift Filter (Morning / Evening / Both)
      if (shiftFilter === 'Morning') {
        const s = c.shift || 'Morning';
        if (s !== 'Morning' && s !== 'Both') return false;
      } else if (shiftFilter === 'Evening') {
        const s = c.shift || 'Morning';
        if (s !== 'Evening' && s !== 'Both') return false;
      } else if (shiftFilter === 'Both') {
        if (c.shift !== 'Both') return false;
      }

      // 3. Status Filter (All / Due / Paid / Empty)
      const s = rowStats[c.id];
      if (!s) return false;

      switch (filterTab) {
        case 'due':
          return s.balance > 0;
        case 'paid':
          return s.balance <= 0 && s.liters > 0;
        case 'empty':
          return !s.hasData;
        default:
          return true;
      }
    });
  }, [customers, searchQuery, filterTab, shiftFilter, rowStats]);

  // Summary cards dynamically reflect the filtered shift and customers
  const summary = useMemo(() => {
    let totalBilled = 0;
    let totalCollected = 0;
    let totalPending = 0;
    for (const c of visibleCustomers) {
      if (!c || !c.id) continue;
      const s = rowStats[c.id];
      if (!s) continue;
      totalBilled += Number(s.bill) || 0;
      totalCollected += Number(received[c.id]) || 0;
      totalPending += Number(s.balance) || 0; // includes balance carried from earlier months
    }
    return {
      totalCustomers: visibleCustomers.length,
      totalBilled,
      totalCollected,
      totalPending,
    };
  }, [visibleCustomers, rowStats, received]);

  // Column-by-column totals for the table tfoot
  const columnTotals = useMemo(() => {
    const dayLiters: Record<number, number> = {};
    for (let d = 1; d <= totalDays; d++) dayLiters[d] = 0;

    let totalLtr = 0;
    let totalBill = 0;
    let totalCarry = 0;
    let totalRecv = 0;
    let totalBal = 0;

    for (const c of visibleCustomers) {
      const row = entries[c.id] || {};
      for (let d = 1; d <= totalDays; d++) {
        const q = Number(row[d]) || 0;
        dayLiters[d] += q;
        totalLtr += q;
      }
      const s = rowStats[c.id];
      if (s) {
        totalBill += Number(s.bill) || 0;
        totalBal += Number(s.balance) || 0;
      }
      totalCarry += Number(carry[c.id]) || 0;
      totalRecv += Number(received[c.id]) || 0;
    }

    return {
      dayLiters,
      totalLtr,
      totalBill,
      totalCarry,
      totalRecv,
      totalBal,
    };
  }, [visibleCustomers, entries, totalDays, rowStats, carry, received]);

  /* ---------------- editing ---------------- */

  const persistEntry = useCallback(
    (customerId: number, day: number, qty: number, timerKey: string) => {
      if (saveTimers.current[timerKey]) clearTimeout(saveTimers.current[timerKey]);
      saveTimers.current[timerKey] = setTimeout(async () => {
        try {
          if (window.electronAPI) {
            const date = `${monthKey}-${String(day).padStart(2, '0')}`;
            await window.electronAPI.setKhataEntry({ customerId, date, quantity: qty });
          }
        } catch (err) {
          console.error('Failed to save khata entry:', err);
          showToast('Could not save entry');
        }
      }, 350);
    },
    [monthKey]
  );

  const handleCellChange = useCallback(
    (customerId: number, day: number, raw: string) => {
      const cleaned = raw.replace(/[^0-9.]/g, '');
      const qty = parseNumber(cleaned);

      setEntries((prev) => {
        const currentRow = prev[customerId] || {};
        if ((currentRow[day] || 0) === qty) return prev;
        const nextRow = { ...currentRow };
        if (qty > 0) nextRow[day] = qty;
        else delete nextRow[day];
        return { ...prev, [customerId]: nextRow };
      });

      persistEntry(customerId, day, qty, `${customerId}-${day}`);
    },
    [persistEntry]
  );

  const handleReceivedChange = useCallback((customerId: number, raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const amount = parseNumber(cleaned);

    setReceived((prev) => ({ ...prev, [customerId]: amount }));

    const key = `recv-${customerId}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      try {
        if (window.electronAPI) {
          await window.electronAPI.setKhataReceived({ customerId, month: monthKey, amount });
        }
      } catch (err) {
        console.error('Failed to save received amount:', err);
      }
    }, 350);
  }, [monthKey]);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const scrollTable = (dir: 'left' | 'right', distance = 280) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({
        left: dir === 'left' ? -distance : distance,
        behavior: 'smooth',
      });
    }
  };

  /* ---------------- keyboard navigation ---------------- */

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // If focused on the table container itself or non-input, allow arrow scrolling on X and Y
    if (target.tagName !== 'INPUT') {
      if (e.key === 'ArrowRight') {
        scrollTable('right', 250);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        scrollTable('left', 250);
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (tableContainerRef.current) tableContainerRef.current.scrollTop += 120;
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        if (tableContainerRef.current) tableContainerRef.current.scrollTop -= 120;
        e.preventDefault();
      }
      return;
    }

    const input = target as HTMLInputElement;
    const rowId = input.dataset.r;
    const colAttr = input.dataset.col;
    const dayAttr = input.dataset.d;
    if (!rowId) return;

    const rowIds = visibleCustomers.map((c) => c.id);
    const rowIdx = rowIds.indexOf(Number(rowId));
    if (rowIdx === -1) return;

    const focusAndScroll = (el: HTMLInputElement | null) => {
      if (!el) return false;
      el.focus();
      el.select();

      const container = tableContainerRef.current;
      if (!container) {
        el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
        return true;
      }

      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      // Horizontal (X-Axis): account for sticky left columns (Customer name + Rate = 274px)
      const stickyLeftWidth = NAME_COL_WIDTH + RATE_COL_WIDTH; // 200 + 74 = 274px
      const visibleLeft = containerRect.left + stickyLeftWidth;
      const visibleRight = containerRect.right - 10;

      if (elRect.left < visibleLeft) {
        // Obscured by sticky columns or off-screen to the left -> scroll left
        const diff = visibleLeft - elRect.left + 24;
        container.scrollLeft = Math.max(0, container.scrollLeft - diff);
      } else if (elRect.right > visibleRight) {
        // Off-screen to the right -> scroll right
        const diff = elRect.right - visibleRight + 24;
        container.scrollLeft += diff;
      }

      // Vertical (Y-Axis): account for sticky header (thead)
      const thead = container.querySelector('thead');
      const stickyHeaderHeight = thead ? thead.offsetHeight : 42;
      const visibleTop = containerRect.top + stickyHeaderHeight;
      const visibleBottom = containerRect.bottom - 12;

      if (elRect.top < visibleTop) {
        // Under sticky header -> scroll up
        const diff = visibleTop - elRect.top + 12;
        container.scrollTop = Math.max(0, container.scrollTop - diff);
      } else if (elRect.bottom > visibleBottom) {
        // Below container bottom -> scroll down
        const diff = elRect.bottom - visibleBottom + 12;
        container.scrollTop += diff;
      }

      return true;
    };

    const focusDay = (r: number, d: number) => {
      if (r < 0 || r >= rowIds.length || d < 1 || d > totalDays) return false;
      const el = document.querySelector<HTMLInputElement>(
        `input[data-r="${rowIds[r]}"][data-d="${d}"]`
      );
      return focusAndScroll(el);
    };

    const focusCol = (r: number, col: 'prev' | 'recv') => {
      if (r < 0 || r >= rowIds.length) return false;
      const el = document.querySelector<HTMLInputElement>(
        `input[data-r="${rowIds[r]}"][data-col="${col}"]`
      );
      return focusAndScroll(el);
    };

    // Case 1: Active on Day input (1..totalDays)
    if (dayAttr) {
      const day = Number(dayAttr);
      switch (e.key) {
        case 'ArrowRight':
          if (day < totalDays) {
            if (focusDay(rowIdx, day + 1)) e.preventDefault();
          } else {
            // Day 30/31 -> navigate smoothly into Previous input
            if (focusCol(rowIdx, 'prev')) {
              e.preventDefault();
            } else {
              scrollTable('right', 250);
            }
          }
          break;
        case 'ArrowLeft':
          if (day > 1) {
            if (focusDay(rowIdx, day - 1)) e.preventDefault();
          } else {
            // Day 1 -> scroll left to customer name & rate
            if (tableContainerRef.current) tableContainerRef.current.scrollLeft = 0;
            e.preventDefault();
          }
          break;
        case 'ArrowDown':
        case 'Enter':
          if (focusDay(rowIdx + 1, day)) e.preventDefault();
          break;
        case 'ArrowUp':
          if (focusDay(rowIdx - 1, day)) e.preventDefault();
          break;
        default:
          break;
      }
      return;
    }

    // Case 2: Active on Previous input
    if (colAttr === 'prev') {
      switch (e.key) {
        case 'ArrowRight':
          if (focusCol(rowIdx, 'recv')) e.preventDefault();
          break;
        case 'ArrowLeft':
          if (focusDay(rowIdx, totalDays)) e.preventDefault();
          break;
        case 'ArrowDown':
        case 'Enter':
          if (focusCol(rowIdx + 1, 'prev')) e.preventDefault();
          break;
        case 'ArrowUp':
          if (focusCol(rowIdx - 1, 'prev')) e.preventDefault();
          break;
        default:
          break;
      }
      return;
    }

    // Case 3: Active on Received input
    if (colAttr === 'recv') {
      switch (e.key) {
        case 'ArrowRight':
          scrollTable('right', 200);
          break;
        case 'ArrowLeft':
          if (focusCol(rowIdx, 'prev')) e.preventDefault();
          break;
        case 'ArrowDown':
        case 'Enter':
          if (focusCol(rowIdx + 1, 'recv')) e.preventDefault();
          break;
        case 'ArrowUp':
          if (focusCol(rowIdx - 1, 'recv')) e.preventDefault();
          break;
        default:
          break;
      }
      return;
    }
  };

  /* ---------------- pay / bill / delete ---------------- */

  const openPay = useCallback((id: number) => setPayModal({ id, mode: 'pay' }), []);
  const openBill = useCallback((id: number) => setPayModal({ id, mode: 'bill' }), []);
  const openPrint = useCallback((id: number) => setPayModal({ id, mode: 'bill', autoPrint: true }), []);

  const handlePayConfirm = async (customerId: number, amount: number) => {
    if (!window.electronAPI) return;
    const total = (received[customerId] || 0) + amount;
    const res = await window.electronAPI.setKhataReceived({ customerId, month: monthKey, amount: total });
    if (!res?.success) throw new Error(res?.error || 'Could not save payment');
    setReceived((prev) => ({ ...prev, [customerId]: total }));
    setVersion((v) => v + 1);
  };

  const handleDeleteMonth = useCallback(
    async (customerId: number) => {
      const c = customers.find((x) => x.id === customerId);
      const msg =
        language === 'ur'
          ? `${c?.name} کا ${monthLabel} کا پورا کھاتہ حذف کریں؟ (دودھ کی تمام انٹریاں اور وصولی)`
          : `Delete the whole ${monthLabel} khatta of ${c?.name}? (all milk entries and received amount)`;
      if (!confirm(msg)) return;
      if (!window.electronAPI) return;
      await window.electronAPI.deleteKhataCustomerMonth({ customerId, month: monthKey });
      await loadMonth(monthKey);
      showToast(language === 'ur' ? 'کھاتہ حذف ہو گیا' : 'Khatta deleted');
    },
    [customers, language, monthLabel, monthKey, loadMonth]
  );

  const handlePrevChange = useCallback(
    async (customerId: number, raw: string) => {
      if (!window.electronAPI) return;
      const cleaned = raw.replace(/[^0-9.\-]/g, '');
      const n = parseFloat(cleaned);
      const amount = Number.isFinite(n) ? n : 0;
      if (Math.round(amount) === Math.round(carry[customerId] || 0)) return;
      await window.electronAPI.setKhataPrevious({ customerId, month: monthKey, amount });
      setCarry((prev) => ({ ...prev, [customerId]: amount }));
      setVersion((v) => v + 1);
    },
    [carry, monthKey]
  );

  const payCustomer = payModal ? customers.find((c) => c.id === payModal.id) : undefined;
  const payStats = payCustomer ? rowStats[payCustomer.id] : undefined;

  /* ---------------- bulk entry ---------------- */

  const handleBulkApply = async (payload: {
    customerIds: number[];
    fromDay: number;
    toDay: number;
    quantity: number;
  }) => {
    if (!window.electronAPI) return;

    const res = await window.electronAPI.bulkFillKhata({
      customerIds: payload.customerIds,
      month: monthKey,
      fromDay: payload.fromDay,
      toDay: payload.toDay,
      quantity: payload.quantity,
    });

    if (!res?.success) throw new Error(res?.error || 'Bulk fill failed');

    // Optimistically update local state
    setEntries((prev) => {
      const next: EntryMap = { ...prev };
      for (const id of payload.customerIds) {
        const row = { ...(next[id] || {}) };
        for (let d = payload.fromDay; d <= Math.min(payload.toDay, totalDays); d++) {
          row[d] = payload.quantity;
        }
        next[id] = row;
      }
      return next;
    });
    setVersion((v) => v + 1);
    showToast(
      language === 'ur'
        ? `${res.updated} خانے بھر دیے گئے`
        : `${res.updated} cells filled`
    );
  };

  /* ---------------- export ---------------- */

  const buildExportRows = () => {
    const header = [
      'Customer',
      'Phone',
      'Rate',
      ...dayNumbers.map((d) => String(d)),
      'Total Ltr',
      'Total Bill',
      'Received',
      'Balance Due',
    ];

    const rows = visibleCustomers.map((c) => {
      const s = rowStats[c.id];
      const row = entries[c.id] || {};
      return [
        c.name,
        c.phone || '',
        String(c.default_rate || 0),
        ...dayNumbers.map((d) => (row[d] ? formatQty(row[d]) : '')),
        formatQty(s.liters),
        formatMoney(s.bill),
        formatMoney(received[c.id] || 0),
        formatMoney(s.balance),
      ];
    });

    return { header, rows };
  };

  const handleExport = (format: 'csv' | 'txt') => {
    const { header, rows } = buildExportRows();
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

    let content: string;
    let mime: string;

    if (format === 'csv') {
      content = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
      mime = 'text/csv;charset=utf-8;';
    } else {
      const widths = header.map((h, i) =>
        Math.max(h.length, ...rows.map((r) => String(r[i]).length)) + 2
      );
      const line = (cells: string[]) =>
        cells.map((cell, i) => String(cell).padEnd(widths[i])).join('');
      content = [
        `${language === 'ur' ? 'ماہانہ کھاتہ' : 'Monthly Khatta'} - ${monthLabel}`,
        '',
        line(header),
        line(widths.map((w) => '-'.repeat(w))),
        ...rows.map(line),
      ].join('\n');
      mime = 'text/plain;charset=utf-8;';
    }

    const blob = new Blob(['﻿' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khata-${monthKey}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
  };

  /* ---------------- month navigation ---------------- */

  const shiftMonth = (delta: number) => {
    const [y, m] = monthKey.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthKey(toMonthKey(d));
  };

  const today = new Date();
  const todayKey = toMonthKey(today);
  const todayDay = todayKey === monthKey ? today.getDate() : -1;

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: t.all, count: customers.length },
    {
      id: 'due',
      label: t.withDue,
      count: customers.filter((c) => (rowStats[c.id]?.balance || 0) > 0).length,
    },
    {
      id: 'paid',
      label: t.fullyPaid,
      count: customers.filter((c) => {
        const s = rowStats[c.id];
        return !!s && s.balance <= 0 && s.liters > 0;
      }).length,
    },
    {
      id: 'empty',
      label: t.emptyCustomers,
      count: customers.filter((c) => !rowStats[c.id]?.hasData).length,
    },
  ];

  return (
    <div className="space-y-4 pb-10">
      {/* 1. Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-[#f0f7ff] border border-blue-100 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-slate-800 leading-tight">
              {summary.totalCustomers}
            </div>
            <div className="text-[11px] font-semibold text-slate-500">{t.totalCustomers}</div>
          </div>
        </div>

        <div className="bg-[#fff7ed] border border-amber-100 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-slate-800 leading-tight">
              {t.currencyRs} {formatMoney(summary.totalBilled)}
            </div>
            <div className="text-[11px] font-semibold text-slate-500">{t.totalBilled}</div>
          </div>
        </div>

        <div className="bg-[#f0fdf4] border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-slate-800 leading-tight">
              {t.currencyRs} {formatMoney(summary.totalCollected)}
            </div>
            <div className="text-[11px] font-semibold text-slate-500">{t.totalCollected}</div>
          </div>
        </div>

        <div className="bg-[#faf5ff] border border-purple-100 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div
              className={`text-lg font-extrabold leading-tight ${
                summary.totalPending > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {t.currencyRs} {formatMoney(summary.totalPending)}
            </div>
            <div className="text-[11px] font-semibold text-slate-500">{t.totalPending}</div>
          </div>
        </div>
      </div>

      {/* 2. Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-600 shrink-0" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">{monthLabel}</h2>

            <div className="flex items-center gap-1 ml-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5">
              <button
                onClick={() => shiftMonth(-1)}
                className="p-1 rounded-lg text-slate-500 hover:bg-white hover:text-brand-600 transition-colors"
                title={t.selectMonth}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="month"
                value={monthKey}
                onChange={(e) => e.target.value && setMonthKey(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer"
              />
              <button
                onClick={() => shiftMonth(1)}
                className="p-1 rounded-lg text-slate-500 hover:bg-white hover:text-brand-600 transition-colors"
                title={t.selectMonth}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${t.search}...`}
                className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-full sm:w-56"
              />
            </div>

            <button
              onClick={() => setIsBulkOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>{t.bulkEntry}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsExportOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t.exportLabel}</span>
              </button>
              {isExportOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsExportOpen(false)} />
                  <div className="absolute right-0 mt-1.5 z-40 w-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {t.exportCsv}
                    </button>
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 border-t border-slate-100"
                    >
                      {t.exportTxt}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filter and Shift Selection Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          {/* Shift selector pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <span className="text-[10px] font-extrabold text-slate-500 px-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{language === 'ur' ? 'شفٹ:' : 'Shift:'}</span>
            </span>
            {([
              { id: 'all', label: language === 'ur' ? 'تمام' : 'All', icon: null },
              { id: 'Morning', label: language === 'ur' ? 'صبح' : 'Morning', icon: Sun },
              { id: 'Evening', label: language === 'ur' ? 'شام' : 'Evening', icon: Moon },
              { id: 'Both', label: language === 'ur' ? 'دونوں وقت' : 'Both', icon: null },
            ] as const).map((s) => {
              const active = shiftFilter === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShiftFilter(s.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    active
                      ? 'bg-brand-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {tabs.map((tab) => {
              const active = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                      active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline mr-1">
              {visibleCustomers.length} / {customers.length} {language === 'ur' ? 'گاہک' : 'customers'}
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => scrollTable('left', 350)}
                title={language === 'ur' ? 'بائیں اسکرول کریں (Left)' : 'Scroll Left (Day 1..15)'}
                className="px-2.5 py-1 bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-md text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>◀</span>
                <span className="text-[10px] hidden md:inline">{language === 'ur' ? 'بائیں طرف' : 'Scroll Left'}</span>
              </button>
              <button
                type="button"
                onClick={() => scrollTable('right', 350)}
                title={language === 'ur' ? 'دائیں اسکرول کریں (Right - ٹوٹل، بل و بقایا)' : 'Scroll Right (Total, Bill & Balance)'}
                className="px-2.5 py-1 bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-md text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="text-[10px] hidden md:inline">{language === 'ur' ? 'دائیں (ٹوٹل و بل)' : 'Scroll Right'}</span>
                <span>▶</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Spreadsheet grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div
          ref={tableContainerRef}
          tabIndex={0}
          dir="ltr"
          className="overflow-auto max-h-[65vh] focus:outline-none"
          onKeyDown={handleGridKeyDown}
        >
          <table className="border-separate border-spacing-0" style={{ minWidth: 'max-content' }}>
            <thead>
              <tr>
                <th
                  className="sticky top-0 left-0 z-40 bg-slate-100 border-b border-r border-slate-200 px-2.5 py-1.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500"
                  style={{ minWidth: NAME_COL_WIDTH, width: NAME_COL_WIDTH }}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-slate-400 font-bold">#</span>
                    <span className="text-slate-300">/</span>
                    <span>{t.customer}</span>
                  </div>
                </th>
                <th
                  className="sticky top-0 z-40 bg-slate-100 border-b border-r border-slate-200 px-1.5 py-1.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500"
                  style={{ left: NAME_COL_WIDTH, minWidth: RATE_COL_WIDTH, width: RATE_COL_WIDTH }}
                >
                  {t.ratePerLtr}
                </th>

                {dayNumbers.map((day) => {
                  const wd = weekdays[day - 1];
                  const isToday = day === todayDay;
                  const isWeekend = wd === 'Sun';
                  return (
                    <th
                      key={day}
                      className={`sticky top-0 z-30 border-b border-r border-slate-200 px-0 py-1 text-center ${
                        isToday ? 'bg-brand-100' : isWeekend ? 'bg-rose-50' : 'bg-slate-100'
                      }`}
                      style={{ minWidth: DAY_COL_WIDTH, width: DAY_COL_WIDTH }}
                    >
                      <div className={`text-[11px] font-extrabold leading-tight ${
                        isToday ? 'text-brand-700' : 'text-slate-700'
                      }`}>
                        {day}
                      </div>
                      <div className="text-[9px] font-semibold text-slate-400 leading-tight">{wd}</div>
                    </th>
                  );
                })}

                {/* Summary columns - naturally positioned directly after Day 30/31 */}
                <th
                  className="sticky top-0 z-30 bg-slate-100 border-b border-l border-slate-200 px-2 py-1.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap"
                  style={{ minWidth: 70, width: 70 }}
                >
                  {t.totalLiters}
                </th>
                <th
                  className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-1.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap"
                  style={{ minWidth: 95, width: 95 }}
                >
                  {t.totalBill}
                </th>
                <th
                  className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-1.5 text-right text-[10px] font-bold uppercase tracking-wide text-amber-700 whitespace-nowrap"
                  style={{ minWidth: 85, width: 85 }}
                >
                  {language === 'ur' ? 'پچھلا' : 'Previous'}
                </th>
                <th
                  className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-1.5 text-right text-[10px] font-bold uppercase tracking-wide text-brand-700 whitespace-nowrap"
                  style={{ minWidth: 95, width: 95 }}
                >
                  {t.received}
                </th>
                <th
                  className="sticky top-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-2 py-1.5 text-right text-[10px] font-bold uppercase tracking-wide text-rose-700 whitespace-nowrap"
                  style={{ minWidth: 95, width: 95 }}
                >
                  {t.balanceDue}
                </th>
                <th
                  className="sticky top-0 z-30 bg-slate-100 border-b border-slate-200 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap"
                  style={{ minWidth: 190, width: 190 }}
                >
                  {t.actions}
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleCustomers.map((c) => {
                const customerNumber = customers.findIndex((x) => x.id === c.id) + 1;
                return (
                  <KhataRow
                    key={c.id}
                    customer={c}
                    customerNumber={customerNumber}
                    monthKey={monthKey}
                    totalDays={totalDays}
                    weekdays={weekdays}
                    rowEntries={entries[c.id] || EMPTY_ROW}
                    received={received[c.id] || 0}
                    carry={carry[c.id] || 0}
                    version={version}
                    onCellChange={handleCellChange}
                    onReceivedChange={handleReceivedChange}
                    onPay={openPay}
                    onBill={openBill}
                    onPrint={openPrint}
                    onDelete={handleDeleteMonth}
                    onPrevChange={handlePrevChange}
                  />
                );
              })}

              {visibleCustomers.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={totalDays + 8}
                    className="px-4 py-12 text-center text-xs text-slate-400"
                  >
                    {t.noKhataRows}
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer: Real-time Shift Totals */}
            <tfoot>
              <tr className="bg-slate-100 font-extrabold text-slate-800 border-t-2 border-slate-300">
                <td
                  className="sticky left-0 z-20 bg-slate-200 border-r border-slate-300 px-2.5 py-2 text-xs font-black text-slate-900"
                  style={{ minWidth: NAME_COL_WIDTH, width: NAME_COL_WIDTH }}
                >
                  <div className="flex items-center justify-between">
                    <span>{language === 'ur' ? 'ٹوٹل' : 'Total'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-800 font-bold">
                      {shiftFilter === 'Morning'
                        ? language === 'ur' ? 'صبح' : 'Morning'
                        : shiftFilter === 'Evening'
                        ? language === 'ur' ? 'شام' : 'Evening'
                        : shiftFilter === 'Both'
                        ? language === 'ur' ? 'دونوں' : 'Both'
                        : language === 'ur' ? 'تمام' : 'All'}
                    </span>
                  </div>
                </td>
                <td
                  className="sticky z-20 bg-slate-200 border-r border-slate-300 px-1.5 py-2 text-right text-[11px] font-bold text-slate-500"
                  style={{ left: NAME_COL_WIDTH, minWidth: RATE_COL_WIDTH, width: RATE_COL_WIDTH }}
                >
                  —
                </td>

                {dayNumbers.map((day) => (
                  <td
                    key={day}
                    className="border-r border-slate-200 px-0 py-1.5 text-center text-[10px] font-black text-slate-700 bg-slate-100"
                    style={{ minWidth: DAY_COL_WIDTH, width: DAY_COL_WIDTH }}
                  >
                    {columnTotals.dayLiters[day] > 0 ? formatQty(columnTotals.dayLiters[day]) : ''}
                  </td>
                ))}

                <td
                  className="bg-slate-200 border-l border-r border-slate-300 px-2 py-2 text-right text-[11px] font-black text-brand-900 whitespace-nowrap"
                  style={{ minWidth: 70, width: 70 }}
                >
                  {formatQty(columnTotals.totalLtr)}
                </td>
                <td
                  className="bg-slate-200 border-r border-slate-300 px-2 py-2 text-right text-[11px] font-black text-slate-900 whitespace-nowrap"
                  style={{ minWidth: 95, width: 95 }}
                >
                  {formatMoney(columnTotals.totalBill)}
                </td>
                <td
                  className="bg-amber-100/70 border-r border-slate-300 px-2 py-2 text-right text-[11px] font-black text-amber-900 whitespace-nowrap"
                  style={{ minWidth: 85, width: 85 }}
                >
                  {formatMoney(columnTotals.totalCarry)}
                </td>
                <td
                  className="bg-emerald-100/70 border-r border-slate-300 px-2 py-2 text-right text-[11px] font-black text-emerald-900 whitespace-nowrap"
                  style={{ minWidth: 95, width: 95 }}
                >
                  {formatMoney(columnTotals.totalRecv)}
                </td>
                <td
                  className={`border-r border-slate-300 px-2 py-2 text-right text-[11px] font-black whitespace-nowrap ${
                    columnTotals.totalBal > 0 ? 'bg-rose-100 text-rose-900' : 'bg-emerald-100 text-emerald-900'
                  }`}
                  style={{ minWidth: 95, width: 95 }}
                >
                  {formatMoney(columnTotals.totalBal)}
                </td>
                <td
                  className="bg-slate-200 px-2 py-2 text-center text-[10px] font-bold text-slate-500"
                  style={{ minWidth: 190, width: 190 }}
                >
                  ✓ {visibleCustomers.length} {language === 'ur' ? 'کھاتے' : 'rows'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend / hint bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-200" />
              {language === 'ur' ? 'درج شدہ' : 'Filled'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-white border border-slate-200" />
              {language === 'ur' ? 'خالی' : 'Empty'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-50 border border-rose-200" />
              {language === 'ur' ? 'اتوار' : 'Sunday'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {language === 'ur'
              ? 'Arrow keys سے حرکت کریں • Enter اگلی قطار • Tab اگلا دن'
              : 'Arrows to move • Enter next row • Tab next day'}
          </span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg">
          {toast}
        </div>
      )}

      <KhataPayBillModal
        isOpen={!!payCustomer && !!payStats}
        mode={payModal?.mode || 'bill'}
        customerId={payCustomer?.id}
        customerName={payCustomer?.name || ''}
        phone={payCustomer?.phone || ''}
        monthLabel={monthLabel}
        rate={Number(payCustomer?.default_rate) || 0}
        liters={payStats?.liters || 0}
        bill={payStats?.bill || 0}
        carry={payCustomer ? carry[payCustomer.id] || 0 : 0}
        received={payCustomer ? received[payCustomer.id] || 0 : 0}
        dayEntries={payCustomer ? entries[payCustomer.id] || EMPTY_ROW : EMPTY_ROW}
        onPay={(amount) => handlePayConfirm(payCustomer!.id, amount)}
        onClose={() => setPayModal(null)}
        autoPrint={payModal?.autoPrint}
      />

      <BulkEntryModal
        isOpen={isBulkOpen}
        customers={customers}
        daysInMonth={totalDays}
        monthLabel={monthLabel}
        onClose={() => setIsBulkOpen(false)}
        onApply={handleBulkApply}
      />
    </div>
  );
};
