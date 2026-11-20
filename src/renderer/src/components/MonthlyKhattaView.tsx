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
  Send,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Loader2,
  X,
  QrCode,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  KhataCustomer,
  WhatsAppWebStatus,
  WhatsAppQueueProgress,
  BillSettings,
} from '../types/electron';
import { BulkEntryModal } from './BulkEntryModal';
import { KhataPayBillModal } from './KhataPayBillModal';
import { WhatsAppQrModal } from './WhatsAppQrModal';

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

const normalizeDigits = (str: string): string => {
  const map: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  return (str || '').replace(/[۰-۹٠-٩]/g, (d) => map[d] || d);
};

const isValidPhone = (phone?: string): boolean => {
  if (!phone) return false;
  const clean = normalizeDigits(String(phone)).replace(/\D/g, '');
  return clean.length >= 10 && clean.length <= 15;
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
  isHighlighted?: boolean;
  waBillStatus?: { status: string; sentAt?: string };
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
    isHighlighted,
    waBillStatus,
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
      <tr
        id={`row-customer-${customer.id}`}
        className={`group border-b border-slate-100 last:border-b-0 transition-all duration-300 ${
          isHighlighted
            ? 'bg-rose-500/20 ring-2 ring-rose-500 ring-inset shadow-[0_0_15px_rgba(244,63,94,0.4)]'
            : 'hover:bg-brand-50/30'
        }`}
      >
        {/* Sticky name with customer number */}
        <td
          className={`sticky left-0 z-20 border-r border-slate-200 px-2.5 py-1.5 transition-colors duration-300 ${
            isHighlighted ? 'bg-rose-100/90' : 'bg-white group-hover:bg-brand-50/60'
          }`}
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
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="text-[10px] text-slate-400 truncate pl-0.5">
              {customer.phone || '-'}
              {customer.shift ? ` • ${customer.shift === 'Evening' ? 'Evening' : customer.shift === 'Both' ? 'Both' : 'Morning'}` : ''}
            </span>
            {waBillStatus?.status === 'sent' && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[9.5px] font-black"
                title={waBillStatus.sentAt ? `ارسال شدہ: ${new Date(waBillStatus.sentAt).toLocaleString()}` : 'بل کامیابی سے واٹس ایپ پر بھیج دیا گیا ہے'}
              >
                ✓ {language === 'ur' ? 'بل ارسال شدہ' : 'Bill Sent'}
              </span>
            )}
            {waBillStatus?.status === 'queued' && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 border border-cyan-500/30 text-[9.5px] font-black animate-pulse"
                title="بل قطار میں ہے، جلد بھیجا جائے گا"
              >
                ⏳ {language === 'ur' ? 'قطار میں' : 'Queued'}
              </span>
            )}
            {waBillStatus?.status === 'failed' && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 border border-rose-500/30 text-[9.5px] font-black"
                title="بل ارسال نہیں ہو سکا"
              >
                ❌ {language === 'ur' ? 'ناکام' : 'Failed'}
              </span>
            )}
          </div>
        </td>

        {/* Sticky rate */}
        <td
          className={`sticky z-20 border-r border-slate-200 px-1.5 py-1.5 text-right text-[11px] font-bold text-brand-700 transition-colors duration-300 ${
            isHighlighted ? 'bg-rose-100/90' : 'bg-white group-hover:bg-brand-50/60'
          }`}
          style={{ left: NAME_COL_WIDTH, minWidth: RATE_COL_WIDTH, width: RATE_COL_WIDTH }}
        >
          {rate}
        </td>

        {/* Day cells */}
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const value = rowEntries[day];
          const isZero = Number(value) === 0;
          const isWeekend = weekdays[day - 1] === 'Sun';

          return (
            <td
              key={day}
              className={`px-0 py-0 border-r border-slate-100/50 text-center ${
                isWeekend ? 'bg-rose-500/10' : ''
              }`}
              style={{ minWidth: DAY_COL_WIDTH, width: DAY_COL_WIDTH }}
            >
              <input
                key={`${version}-${day}`}
                type="text"
                inputMode="decimal"
                defaultValue={isZero ? '✕' : (value ? formatQty(value) : '')}
                data-r={customer.id}
                data-d={day}
                data-month={monthKey}
                onChange={(e) => onCellChange(customer.id, day, e.target.value)}
                onFocus={(e) => {
                  if (e.target.value === '✕' || e.target.value === '0') {
                    e.target.select();
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value.trim().toLowerCase();
                  if (val === '0' || val === 'x' || val === '✕') {
                    e.target.value = '✕';
                  } else {
                    const v = parseNumber(val);
                    e.target.value = v > 0 ? formatQty(v) : '';
                  }
                }}
                className={`w-full h-7 text-center text-[11px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 transition-colors ${
                  isZero
                    ? '!bg-rose-600/25 !text-rose-400 !border !border-rose-500/60 font-black shadow-[inset_0_0_8px_rgba(244,63,94,0.3)]'
                    : value
                    ? '!bg-emerald-600/20 !text-emerald-300 font-bold !border !border-emerald-500/30'
                    : 'bg-transparent text-slate-300 hover:bg-white/5'
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

  // WhatsApp & Safe Queue State
  const [waStatus, setWaStatus] = useState<WhatsAppWebStatus | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isConnectingWa, setIsConnectingWa] = useState<boolean>(false);
  const [queueStatus, setQueueStatus] = useState<WhatsAppQueueProgress | null>(null);
  const [waBillStatusMap, setWaBillStatusMap] = useState<Record<number, { status: string; sentAt?: string }>>({});
  const [highlightCustomerId, setHighlightCustomerId] = useState<number | null>(null);
  const [showSendAllModal, setShowSendAllModal] = useState<boolean>(false);
  const [billSettings, setBillSettings] = useState<BillSettings | null>(null);

  const refreshBillStatusMap = useCallback(async (targetMonthKey: string) => {
    if (window.electronAPI?.getWhatsAppBillStatusMap) {
      try {
        const map = await window.electronAPI.getWhatsAppBillStatusMap(targetMonthKey);
        if (map) setWaBillStatusMap(map);
      } catch {}
    }
  }, []);

  const formatCountdown = (seconds?: number) => {
    if (typeof seconds !== 'number' || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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

      // Sync queue status and bill delivery status map for loaded month
      window.electronAPI
        .getWhatsAppQueueStatus(key)
        .then((q) => {
          if (q) setQueueStatus(q);
        })
        .catch(() => {});

      refreshBillStatusMap(key);
    } catch (err) {
      console.error('Failed to load khata month:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshBillStatusMap]);

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

  // WhatsApp listeners & status sync
  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI
      .getWhatsAppStatus()
      .then((s) => {
        if (s) {
          setWaStatus(s);
          if (s.qrCodeDataUrl) setQrCodeData(s.qrCodeDataUrl);
        }
      })
      .catch(() => {});

    window.electronAPI
      .getWhatsAppQueueStatus(monthKey)
      .then((q) => {
        if (q) setQueueStatus(q);
      })
      .catch(() => {});

    window.electronAPI
      .getBillSettings()
      .then((bs) => {
        if (bs) setBillSettings(bs);
      })
      .catch(() => {});

    const unsubQR = window.electronAPI.onWhatsAppQR((qr) => {
      setQrCodeData(qr);
      setIsConnectingWa(false);
    });

    const unsubStatus = window.electronAPI.onWhatsAppStatus((status) => {
      setWaStatus(status);
      if (status.qrCodeDataUrl) {
        setQrCodeData(status.qrCodeDataUrl);
      } else if (status.connected) {
        setQrCodeData(null);
        showToast(language === 'ur' ? 'واٹس ایپ منسلک ہو گیا ہے!' : 'WhatsApp Connected!');
      }
      setIsConnectingWa(status.connecting);
    });

    const unsubQueue = window.electronAPI.onWhatsAppQueueProgress((progress) => {
      setQueueStatus(progress);
      refreshBillStatusMap(monthKey);
    });

    return () => {
      unsubQR?.();
      unsubStatus?.();
      unsubQueue?.();
    };
  }, [language]);

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

  const scrollToCustomer = useCallback(
    (customerId: number) => {
      // If customer is hidden by filter or search, reset them
      const isCurrentlyVisible = visibleCustomers.some((c) => c.id === customerId);
      if (!isCurrentlyVisible) {
        setSearchQuery('');
        setFilterTab('all');
        setShiftFilter('all');
      }
      setHighlightCustomerId(customerId);
      setTimeout(() => {
        const rowEl = document.getElementById(`row-customer-${customerId}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 60);
      setTimeout(() => {
        setHighlightCustomerId((prev) => (prev === customerId ? null : prev));
      }, 4500);
    },
    [visibleCustomers]
  );

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
    (customerId: number, day: number, qty: number, timerKey: string, cleared: boolean = false) => {
      if (saveTimers.current[timerKey]) clearTimeout(saveTimers.current[timerKey]);
      saveTimers.current[timerKey] = setTimeout(async () => {
        try {
          if (window.electronAPI) {
            const date = `${monthKey}-${String(day).padStart(2, '0')}`;
            await window.electronAPI.setKhataEntry({ customerId, date, quantity: qty, cleared });
          }
        } catch (err) {
          console.error('Failed to save khata entry:', err);
          showToast('Could not save entry');
        }
      }, 250);
    },
    [monthKey]
  );

  const handleCellChange = useCallback(
    (customerId: number, day: number, raw: string) => {
      const trimmed = raw.trim().toLowerCase();

      // If empty string -> completely clear entry
      if (trimmed === '') {
        setEntries((prev) => {
          const currentRow = prev[customerId] || {};
          const nextRow = { ...currentRow };
          delete nextRow[day];
          return { ...prev, [customerId]: nextRow };
        });
        persistEntry(customerId, day, 0, `${customerId}-${day}`, true);
        return;
      }

      // If user typed 0 or x or X or ✕ -> treat as ZERO / Cross (Red box)
      if (trimmed === '0' || trimmed === 'x' || trimmed === '✕') {
        setEntries((prev) => {
          const currentRow = prev[customerId] || {};
          const nextRow = { ...currentRow, [day]: 0 };
          return { ...prev, [customerId]: nextRow };
        });
        persistEntry(customerId, day, 0, `${customerId}-${day}`, false);
        return;
      }

      const cleaned = raw.replace(/[^0-9.]/g, '');
      const qty = parseNumber(cleaned);

      setEntries((prev) => {
        const currentRow = prev[customerId] || {};
        if ((currentRow[day] || 0) === qty) return prev;
        const nextRow = { ...currentRow };
        if (qty > 0) nextRow[day] = qty;
        else nextRow[day] = 0;
        return { ...prev, [customerId]: nextRow };
      });

      persistEntry(customerId, day, qty, `${customerId}-${day}`, false);
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

  // Eligible customers with valid phone numbers for Send All
  const eligibleCustomers = useMemo(() => {
    return customers.filter((c) => {
      const s = rowStats[c.id];
      const bal = s ? s.balance : 0;
      const lit = s ? s.liters : 0;
      return isValidPhone(c.phone) && c.whatsapp_consent !== false && (bal > 0 || lit > 0);
    });
  }, [customers, rowStats]);

  const handleConnectWhatsApp = async (force = false) => {
    if (!window.electronAPI) return;
    setIsConnectingWa(true);
    setShowQrModal(true);
    try {
      const res = await window.electronAPI.connectWhatsApp(force);
      if (res?.qrCodeDataUrl) {
        setQrCodeData(res.qrCodeDataUrl);
      }
    } catch (err) {
      console.error('Failed to initiate WhatsApp connection:', err);
    } finally {
      setIsConnectingWa(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.disconnectWhatsApp();
      setWaStatus(null);
      setQrCodeData(null);
      showToast(language === 'ur' ? 'واٹس ایپ منقطع کر دیا گیا' : 'WhatsApp Disconnected');
    } catch (err) {
      console.error('Failed to disconnect WhatsApp:', err);
    }
  };

  const handleStartSendAllQueue = async () => {
    if (!window.electronAPI) return;
    if (!waStatus?.connected) {
      setShowSendAllModal(false);
      setShowQrModal(true);
      if (!qrCodeData) handleConnectWhatsApp();
      return;
    }

    setShowSendAllModal(false);

    if (eligibleCustomers.length === 0) {
      showToast(
        language === 'ur'
          ? 'اس مہینے کوئی اہل گاہک موجود نہیں ہے (جن کا درست فون نمبر ہو)'
          : 'No eligible customers for this month'
      );
      return;
    }

    const payloads = eligibleCustomers.map((c) => {
      const s = rowStats[c.id] || { liters: 0, bill: 0, balance: 0 };
      return {
        customerId: c.id,
        customerName: c.name,
        phone: c.phone,
        billMonth: monthKey,
        monthLabel: monthLabel,
        liters: s.liters,
        rate: Number(c.default_rate) || 240,
        billAmount: s.bill,
        carry: carry[c.id] || 0,
        received: received[c.id] || 0,
        payable: s.balance,
        accountNumber: billSettings?.account_number || '02090111954760',
        whatsappConsent: c.whatsapp_consent !== false,
      };
    });

    try {
      const res = await window.electronAPI.enqueueWhatsAppBills({
        items: payloads,
        speedPreset: 'safe_10m',
        force: false,
      });

      showToast(
        language === 'ur'
          ? `${res.enqueued} گاہکوں کے بل محفوظ قطار (Queue) میں شامل ہو گئے ہیں!`
          : `${res.enqueued} bills added to safe queue!`
      );

      const qStat = await window.electronAPI.getWhatsAppQueueStatus(monthKey);
      setQueueStatus(qStat);
    } catch (err: any) {
      console.error('Failed to enqueue bills:', err);
      showToast(language === 'ur' ? 'بل قطار میں شامل کرنے میں خرابی ہوئی' : 'Failed to enqueue bills');
    }
  };

  const handlePauseQueue = async () => {
    await window.electronAPI?.pauseWhatsAppQueue();
    const qStat = await window.electronAPI?.getWhatsAppQueueStatus(monthKey);
    if (qStat) setQueueStatus(qStat);
    showToast(language === 'ur' ? 'قطار روک دی گئی ہے' : 'Queue paused');
  };

  const handleResumeQueue = async () => {
    await window.electronAPI?.resumeWhatsAppQueue({ month: monthKey });
    const qStat = await window.electronAPI?.getWhatsAppQueueStatus(monthKey);
    if (qStat) setQueueStatus(qStat);
    showToast(language === 'ur' ? 'قطار جاری کر دی گئی ہے' : 'Queue resumed');
  };

  const handleRetryFailedQueue = async () => {
    await window.electronAPI?.retryFailedWhatsAppQueue({ month: monthKey });
    const qStat = await window.electronAPI?.getWhatsAppQueueStatus(monthKey);
    if (qStat) setQueueStatus(qStat);
    showToast(language === 'ur' ? 'ناکام پیغامات کو دوبارہ قطار میں لگا دیا گیا' : 'Retrying failed bills');
  };

  const handleClearFailedQueue = async () => {
    if (!confirm(language === 'ur' ? 'کیا آپ تمام ناکام بلز کا ریکارڈ صاف کرنا چاہتے ہیں؟' : 'Clear all failed bill records?')) return;
    await window.electronAPI?.clearFailedWhatsAppQueue({ month: monthKey });
    const qStat = await window.electronAPI?.getWhatsAppQueueStatus(monthKey);
    if (qStat) setQueueStatus(qStat);
    showToast(language === 'ur' ? 'تمام ناکام بلز کا ریکارڈ صاف کر دیا گیا' : 'Failed records cleared');
  };

  const handleClearQueueItem = async (customerId: number) => {
    await window.electronAPI?.clearWhatsAppQueueItem({ customerId, month: monthKey });
    const qStat = await window.electronAPI?.getWhatsAppQueueStatus(monthKey);
    if (qStat) setQueueStatus(qStat);
    showToast(language === 'ur' ? 'گاہک کا ریکارڈ قطار سے ہٹا دیا گیا' : 'Customer removed from queue');
  };

  const handleCancelQueue = async () => {
    if (
      !confirm(
        language === 'ur'
          ? 'کیا آپ واقعی اس مہینے کی تمام قطار (باقی و ناکام تمام بلز) منسوخ اور صاف کرنا چاہتے ہیں؟'
          : 'Cancel queue and clear all pending & failed bills for this month?'
      )
    )
      return;
    await window.electronAPI?.clearWhatsAppQueue({ month: monthKey, scope: 'all' });
    const qStat = await window.electronAPI?.getWhatsAppQueueStatus(monthKey);
    if (qStat) setQueueStatus(qStat);
    showToast(language === 'ur' ? 'تمام قطار صاف کر دی گئی' : 'Queue cleared');
  };

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

            {/* Prominent Send All Bills via WhatsApp Safe Queue Button */}
            <button
              type="button"
              disabled={queueStatus?.isRunning}
              onClick={() => {
                if (queueStatus?.isRunning) return;
                setShowSendAllModal(true);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-black shadow-xs transition-all ${
                queueStatus?.isRunning
                  ? 'bg-slate-700/60 text-slate-400 cursor-not-allowed border border-slate-600/40'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 cursor-pointer shadow-md'
              }`}
              title={
                queueStatus?.isRunning
                  ? (language === 'ur' ? 'قطار پہلے سے جاری ہے... مکمل ہونے تک نئی قطار شروع نہیں کی جا سکتی' : 'Queue is already running...')
                  : (language === 'ur' ? 'اس مہینے کے تمام گاہکوں کو بل بھیجیں' : 'Send all bills for this month')
              }
            >
              <Send className="w-4 h-4" />
              <span>
                {queueStatus?.isRunning
                  ? (language === 'ur' ? 'قطار جاری ہے...' : 'Queue Running...')
                  : (language === 'ur' ? 'تمام بل بھیجیں (Send All)' : 'Send All Bills')}
              </span>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-blue-500/20 pt-3">
          {/* Shift selector pills */}
          <div className="flex items-center gap-1 bg-[#091438] border border-blue-500/30 p-1 rounded-xl shadow-[0_0_12px_rgba(0,102,255,0.15)]">
            <span className="text-[10px] font-extrabold text-slate-300 px-2 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
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
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(0,102,255,0.4)]'
                      : 'text-slate-300 hover:text-white hover:bg-blue-600/20'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3 text-amber-400" />}
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
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(0,102,255,0.4)]'
                      : 'bg-[#0b1437] border border-blue-500/20 text-slate-300 hover:text-white hover:bg-blue-600/20'
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

      {/* Live WhatsApp Queue Status Banner */}
      {queueStatus && queueStatus.total > 0 && (
        <div className="bg-gradient-to-r from-[#091a38] via-[#0b2548] to-[#091a38] rounded-2xl border border-cyan-500/40 p-4 shadow-[0_0_20px_rgba(6,182,212,0.2)] text-white space-y-3">
          {/* Top Row: Icon, Title, Counts & Action Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
                  queueStatus.isRunning
                    ? 'bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : queueStatus.isPaused
                    ? 'bg-amber-500/20 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : queueStatus.queued > 0
                    ? 'bg-blue-500/20 border-blue-400/50'
                    : 'bg-emerald-500/20 border-emerald-400/50'
                }`}
              >
                {queueStatus.isRunning ? (
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                ) : queueStatus.isPaused ? (
                  <Pause className="w-5 h-5 text-amber-400" />
                ) : queueStatus.queued === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Play className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm text-white">
                    {language === 'ur' ? 'محفوظ واٹس ایپ قطار (Safe Queue)' : 'WhatsApp Safe Queue'}
                  </span>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                      queueStatus.isRunning
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                        : queueStatus.isPaused
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : queueStatus.queued === 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}
                  >
                    {queueStatus.isRunning
                      ? language === 'ur'
                        ? 'جاری ہے...'
                        : 'Running'
                      : queueStatus.isPaused
                      ? language === 'ur'
                        ? 'روکا گیا ہے'
                        : 'Paused'
                      : queueStatus.queued === 0
                      ? language === 'ur'
                        ? 'تمام بل ارسال ہو چکے ہیں'
                        : 'Completed'
                      : language === 'ur'
                      ? 'انتظار میں (جاری رکھیں)'
                      : 'Ready to Resume'}
                  </span>
                </div>

                {/* Counts: Sent, Remaining/Queued, Failed */}
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="text-emerald-400 font-bold">✓ {queueStatus?.sent ?? 0}</span>
                    <span>/ {queueStatus?.total ?? 0}</span>
                    <span className="text-slate-400">({language === 'ur' ? 'بھیجے گئے' : 'Sent'})</span>
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="text-cyan-400 font-bold">{queueStatus?.queued ?? 0}</span>
                    <span className="text-slate-400">({language === 'ur' ? 'باقی ہیں' : 'Remaining'})</span>
                  </span>
                  {(queueStatus?.failed ?? 0) > 0 && (
                    <>
                      <span className="text-slate-500">•</span>
                      <span className="flex items-center gap-1 font-semibold text-rose-400">
                        <span className="font-bold">❌ {queueStatus?.failed ?? 0}</span>
                        <span className="text-rose-300">({language === 'ur' ? 'ناکام' : 'Failed'})</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {queueStatus.isRunning ? (
                <button
                  type="button"
                  onClick={handlePauseQueue}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{language === 'ur' ? 'روکیں (Pause)' : 'Pause'}</span>
                </button>
              ) : queueStatus.isPaused || queueStatus.queued > 0 ? (
                <button
                  type="button"
                  onClick={handleResumeQueue}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-500/50 text-emerald-300 text-xs font-black cursor-pointer transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{language === 'ur' ? 'جاری رکھیں (Resume)' : 'Resume'}</span>
                </button>
              ) : null}

              {queueStatus.failed > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleRetryFailedQueue}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{language === 'ur' ? 'ناکام دوبارہ بھیجیں' : 'Retry Failed'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearFailedQueue}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'ur' ? 'ناکام صاف کریں' : 'Clear Failed'}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleCancelQueue}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                title={language === 'ur' ? 'اس مہینے کے تمام باقی و ناکام بلز کی قطار صاف کریں' : 'Clear all queue'}
              >
                <X className="w-3.5 h-3.5" />
                <span>{language === 'ur' ? 'مکمل قطار صاف کریں (Clear All)' : 'Clear All'}</span>
              </button>
            </div>
          </div>

          {/* Live countdown & next recipient banner strip */}
          {queueStatus.queued > 0 && (
            <div className="bg-[#051126] border border-cyan-500/25 rounded-xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-slate-300">
                  {language === 'ur' ? 'اگلا بل ارسال ہونے میں باقی وقت:' : 'Next bill dispatch in:'}
                </span>
                <span className="font-mono font-black text-cyan-300 text-sm px-2.5 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-500/40 shadow-xs">
                  {queueStatus.isRunning
                    ? formatCountdown(queueStatus.nextSendInSeconds)
                    : queueStatus.isPaused
                    ? language === 'ur'
                      ? 'روکا گیا ہے'
                      : 'Paused'
                    : '00:00'}
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  (~10 {language === 'ur' ? 'منٹ سیف وقفہ' : 'min safe pacing'})
                </span>
              </div>

              {(queueStatus.currentCustomerName || queueStatus.nextCustomerName) && (
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-slate-400">
                    {language === 'ur' ? 'اگلا گاہک:' : 'Next Customer:'}
                  </span>
                  <span className="font-bold text-white px-2 py-0.5 rounded-md bg-blue-950/70 border border-blue-500/40">
                    {queueStatus.currentCustomerName || queueStatus.nextCustomerName}
                    {(queueStatus.currentCustomerPhone || queueStatus.nextCustomerPhone) && (
                      <span className="font-mono text-cyan-300 text-[11px] ml-1">
                        ({queueStatus.currentCustomerPhone || queueStatus.nextCustomerPhone})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Failed items list with click-to-scroll & clear */}
          {queueStatus.failed > 0 && queueStatus.failedItems && queueStatus.failedItems.length > 0 && (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    {language === 'ur'
                      ? 'جن گاہکوں کو بل نہیں گیا (نام پر کلک کریں تاکہ جدول میں اس گاہک پر اسکرول ہو سکے):'
                      : 'Failed deliveries (click name to scroll to customer in table):'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearFailedQueue}
                  className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-rose-600/40 hover:bg-rose-600/60 border border-rose-400/50 text-rose-100 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                  title={language === 'ur' ? 'تمام فیلڈ ریکارڈز ختم کریں' : 'Clear all failed records'}
                >
                  {language === 'ur' ? '🗑️ تمام ناکام صاف کریں' : 'Clear All Failed'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-0.5">
                {queueStatus.failedItems.map((f) => (
                  <div
                    key={`${f.customerId}-${f.phone}`}
                    className="flex items-center rounded-lg bg-rose-500/20 hover:bg-rose-500/25 border border-rose-400/50 text-rose-200 text-xs font-bold overflow-hidden transition-all shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => scrollToCustomer(f.customerId)}
                      title={f.errorMessage ? `Error: ${f.errorMessage}` : (language === 'ur' ? 'اس گاہک پر جائیں' : 'Scroll to customer')}
                      className="px-2.5 py-1 hover:bg-rose-500/30 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <span>❌ {f.customerName}</span>
                      <span className="font-mono text-[10px] text-rose-300">({f.phone})</span>
                      <span className="text-[10px] text-cyan-300 underline font-normal ml-0.5">
                        {language === 'ur' ? 'دیکھیں ↗' : 'View ↗'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearQueueItem(f.customerId)}
                      title={language === 'ur' ? 'اس گاہک کو ناکام فہرست سے ہٹائیں' : 'Dismiss this failed customer'}
                      className="px-2 py-1.5 bg-rose-950/40 hover:bg-rose-600/70 text-rose-300 hover:text-white border-l border-rose-400/40 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
                    isHighlighted={highlightCustomerId === c.id}
                    waBillStatus={waBillStatusMap[c.id]}
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
        monthKey={monthKey}
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

      {/* Send All Confirmation Modal */}
      {showSendAllModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#081028] border-2 border-emerald-400 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-[0_0_40px_rgba(16,185,129,0.35)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
                <Send className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">
                  {language === 'ur' ? 'تمام گاہکوں کو بل بھیجیں؟' : 'Send All Bills via WhatsApp?'}
                </h3>
                <p className="text-xs text-emerald-300">
                  {monthLabel} • {eligibleCustomers.length} {language === 'ur' ? 'اہل گاہک' : 'Eligible Customers'}
                </p>
              </div>
            </div>

            <div className="bg-[#0c163b] rounded-2xl border border-blue-500/20 p-4 space-y-2 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-center justify-between font-bold text-white pb-2 border-b border-blue-500/20">
                <span>{language === 'ur' ? 'منتخب مہینہ:' : 'Selected Month:'}</span>
                <span className="text-cyan-300">{monthLabel}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-white pb-2 border-b border-blue-500/20">
                <span>{language === 'ur' ? 'اہل گاہک (درست فون نمبر):' : 'Eligible Customers:'}</span>
                <span className="text-emerald-400 font-mono text-sm">{eligibleCustomers.length}</span>
              </div>
              <p className="text-[11.5px] text-slate-400 pt-1">
                🛡️ <b>{language === 'ur' ? 'محفوظ رفتار کی یقین دہانی:' : 'Safe Queue Protection:'}</b>{' '}
                {language === 'ur'
                  ? 'پیغامات بغیر اکاؤنٹ بین کے خطرے کے محفوظ رفتار (تقریباً 10 منٹ فی میسج) کے ساتھ قطار میں بھیجے جائیں گے، اور صرف بل کی خوبصورت تصویر جائے گی (کوئی لمبا میسج نہیں)۔'
                  : 'Bills will be sent safely spaced (~10 minutes apart) to protect your WhatsApp account. Only the bill image is sent.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSendAllModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                {language === 'ur' ? 'منسوخ کریں' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleStartSendAllQueue}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg cursor-pointer transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{language === 'ur' ? '🚀 بھیجنا شروع کریں' : 'Start Queue'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp QR Modal */}
      <WhatsAppQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        waStatus={waStatus}
        qrCodeData={qrCodeData}
        isConnecting={isConnectingWa}
        onRefresh={() => handleConnectWhatsApp(true)}
        onDisconnect={handleDisconnectWhatsApp}
      />
    </div>
  );
};
