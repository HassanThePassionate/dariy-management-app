import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Boxes,
  Milk,
  Receipt,
  TrendingDown,
  Trash2,
  Clock,
  Sparkles,
  Coins,
  TrendingUp,
  Wallet,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface DailyStockViewProps {
  onNavigate?: (page: string) => void;
}

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

export const DailyStockView: React.FC<DailyStockViewProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [date, setDate] = useState<string>(todayStr());
  const [activeRate, setActiveRate] = useState<number>(240);
  const [yesterdayLeftover, setYesterdayLeftover] = useState<number>(0);
  const [receivedToday, setReceivedToday] = useState<number>(0);
  const [supplierCount, setSupplierCount] = useState<number>(0);
  const [receivedTotalCost, setReceivedTotalCost] = useState<number>(0);
  const [soldToday, setSoldToday] = useState<number>(0);
  const [soldPos, setSoldPos] = useState<number>(0);
  const [soldKhata, setSoldKhata] = useState<number>(0);
  const [soldPosRevenue, setSoldPosRevenue] = useState<number>(0);
  const [soldKhataRevenue, setSoldKhataRevenue] = useState<number>(0);
  const [totalSoldRevenue, setTotalSoldRevenue] = useState<number>(0);
  const [expensesToday, setExpensesToday] = useState<number>(0);
  const [profitToday, setProfitToday] = useState<number>(0);
  const [leftoverTomorrow, setLeftoverTomorrow] = useState<number>(0);

  // History records (14 days)
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');

  // Quick Add Supplier Milk Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supId, setSupId] = useState<number | ''>('');
  const [supLiters, setSupLiters] = useState('');
  const [supRate, setSupRate] = useState('');
  const [supShift, setSupShift] = useState<'Morning' | 'Evening'>('Morning');
  const [isSavingSup, setIsSavingSup] = useState(false);

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        if (window.electronAPI) {
          const list = await window.electronAPI.getSuppliers();
          setSuppliers(list || []);
          if (list && list.length > 0) {
            setSupId(list[0].id);
            setSupRate(String(list[0].default_rate || 200));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchSuppliers();
  }, []);

  const handleSaveSupplierMilk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supId || !window.electronAPI) return;
    const liters = parseFloat(supLiters);
    const rate = parseFloat(supRate);
    if (!(liters > 0) || !(rate > 0)) {
      showToast(ur ? 'درست لیٹر اور ریٹ درج کریں' : 'Please enter valid liters and rate');
      return;
    }

    setIsSavingSup(true);
    try {
      const res = await window.electronAPI.addSupplierPurchase({
        supplierId: Number(supId),
        date,
        liters,
        rate,
        paid: 0,
        notes: `Daily Stock (${supShift})`,
        shift: supShift,
      });

      if (res.success) {
        showToast(ur ? `✓ ${liters} لیٹر دودھ اسٹاک میں شامل ہو گیا!` : `✓ Added ${liters} L milk to stock!`);
        setIsAddModalOpen(false);
        setSupLiters('');
        await loadDay();
        window.dispatchEvent(new Event('dairy-data-changed'));
      } else {
        showToast(res.error || 'Failed to save');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving milk');
    } finally {
      setIsSavingSup(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const shiftDate = (days: number) => {
    const [y, m, d] = date.split('-').map(Number);
    const newDate = new Date(y, m - 1, d + days);
    setDate(
      `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(
        newDate.getDate()
      ).padStart(2, '0')}`
    );
  };

  // Load daily stock data for selected date
  const loadDay = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.getStockDay(date);
      if (res) {
        setActiveRate(res.activeRate || 240);
        setYesterdayLeftover(res.yesterdayLeftover || 0);
        setReceivedToday(res.receivedToday || 0);
        setSupplierCount(res.supplierCount || 0);
        setReceivedTotalCost(res.receivedTotalCost || 0);
        setSoldToday(res.soldToday || 0);
        setSoldPos(res.soldPos || 0);
        setSoldKhata(res.soldKhata || 0);
        setSoldPosRevenue(res.soldPosRevenue || 0);
        setSoldKhataRevenue(res.soldKhataRevenue || 0);
        setTotalSoldRevenue(res.totalSoldRevenue || 0);
        setExpensesToday(res.expensesToday || 0);
        setProfitToday(res.profitToday || 0);
        setLeftoverTomorrow(res.leftoverTomorrow || 0);
      }

      // Load 14 days history
      const hist = await window.electronAPI.getStockHistory(14);
      setHistory(hist || []);
    } catch (err) {
      console.error('Failed to load daily stock:', err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadDay();
    const handleFocus = () => loadDay();
    const handleDataChanged = () => loadDay();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('dairy-data-changed', handleDataChanged);
    const interval = setInterval(loadDay, 2000);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('dairy-data-changed', handleDataChanged);
      clearInterval(interval);
    };
  }, [loadDay]);

  // Available milk calculation
  const totalAvailable = yesterdayLeftover + receivedToday;
  const effectiveTomorrowLeftover = Math.max(
    0,
    Math.round((totalAvailable - soldToday) * 100) / 100
  );
  const tomorrowValue = Math.round(effectiveTomorrowLeftover * activeRate);

  // Delete history entry
  const handleDeleteRecord = async (id: number) => {
    if (!confirm(ur ? 'یہ اسٹاک ریکارڈ حذف کریں؟' : 'Delete this stock record?')) return;
    if (!window.electronAPI) return;
    await window.electronAPI.deleteDailyStockRecord(id);
    showToast(ur ? 'ریکارڈ حذف ہو گیا' : 'Record deleted');
    loadDay();
  };

  // Delete all history records
  const handleDeleteAllRecords = async () => {
    if (
      !confirm(
        ur
          ? 'کیا آپ تمام روزانہ اسٹاک ریکارڈز مستقل طور پر حذف کرنا چاہتے ہیں؟'
          : 'Are you sure you want to permanently delete ALL stock records?'
      )
    )
      return;
    if (!window.electronAPI) return;
    await window.electronAPI.deleteAllDailyStockRecords();
    showToast(ur ? 'تمام اسٹاک ریکارڈز حذف کر دیے گئے' : 'All stock records deleted');
    loadDay();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">
                {ur ? 'روزانہ اسٹاک رجسٹر' : 'Daily Stock Register'}
              </h1>
              <p className="text-xs text-slate-400">
                {ur
                  ? 'دودھ کی خریداری، ترسیل اور باقی اسٹاک بیلنس کا حساب'
                  : 'Track milk procurement, deliveries, and remaining stock balance'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Active Milk Rate Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-brand-700 text-xs font-extrabold">
            <Milk className="w-4 h-4" />
            <span>Active Milk Rate: Rs. {activeRate}/L</span>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1 bg-[#0b1437] border border-blue-500/30 rounded-2xl p-1 shadow-[0_0_12px_rgba(0,102,255,0.15)]">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              title="Previous Day"
              className="p-1.5 rounded-xl hover:bg-blue-600/30 text-cyan-400 hover:text-white cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer [color-scheme:dark]"
              />
              <span className="text-blue-500/40">|</span>
              <span className="text-xs font-bold text-cyan-300 whitespace-nowrap">
                {formatDateDisplay(date, ur)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => shiftDate(1)}
              title="Next Day"
              className="p-1.5 rounded-xl hover:bg-blue-600/30 text-cyan-400 hover:text-white cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {date !== todayStr() && (
              <button
                type="button"
                onClick={() => setDate(todayStr())}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-[10px] font-black cursor-pointer transition-colors ml-1 shadow-xs"
              >
                {ur ? 'آج' : 'Today'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Supplier Auto-Aggregation Notice Banner (Image 6 Dark Theme Fix) */}
      <div className="bg-[#031d1f] border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-black text-emerald-300 flex items-center gap-1.5">
              <span>✓ All supplier milk auto-aggregated ({qtyFmt(receivedToday)} Liters)</span>
            </div>
            <div className="text-xs text-emerald-400/80 mt-0.5">
              Received from {supplierCount} supplier(s) today. Auto-populated into daily stock!
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,128,255,0.4)] cursor-pointer active:scale-95"
          >
            <Boxes className="w-4 h-4" />
            <span>{ur ? 'آج کا سپلائر دودھ شامل کریں' : '+ Add Supplier Milk'}</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('suppliers')}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#0c163b] hover:bg-blue-600/30 border border-blue-500/40 text-cyan-300 text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <span>{ur ? 'سپلائرز شیٹ' : 'View Suppliers'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Daily Stock Auto-Calculation Stream */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-black text-white">
            {ur ? 'روزانہ اسٹاک کا خودکار سلسلہ' : 'Daily Stock Auto-Calculation Stream'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Yesterday Leftover */}
          <div className="bg-[#081028] rounded-2xl border border-blue-500/25 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              {ur ? '1. پچھلا بچا ہوا' : '1. Yesterday Leftover'}
            </div>
            <div className="my-2">
              <div className="text-2xl font-black text-white">
                {qtyFmt(yesterdayLeftover)} L
              </div>
            </div>
            <div className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Auto Carry-Forward</span>
            </div>
          </div>

          {/* 2. Received Today */}
          <div className="bg-[#081028] rounded-2xl border border-emerald-500/25 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
              {ur ? '2. آج موصول ہوا' : '2. Received Today'}
            </div>
            <div className="my-2">
              <div className="text-2xl font-black text-emerald-400">
                {qtyFmt(receivedToday)} L
              </div>
            </div>
            <div className="text-[11px] font-extrabold text-emerald-300">
              Rs. {money(receivedTotalCost || receivedToday * activeRate)}
            </div>
          </div>

          {/* 3. Total Sold */}
          <div className="bg-[#081028] rounded-2xl border border-rose-500/25 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between">
            <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wide">
              {ur ? '3. کل فروخت' : '3. Total Sold'}
            </div>
            <div className="my-2">
              <div className="text-2xl font-black text-rose-400">
                {qtyFmt(soldToday)} L
              </div>
            </div>
            <div className="text-[11px] font-semibold text-rose-300/80">
              From Sales ({qtyFmt(soldPos)} L POS + {qtyFmt(soldKhata)} L Monthly)
            </div>
          </div>

          {/* Leftover Balance for Tomorrow */}
          <div className="bg-gradient-to-br from-[#0c1d54] to-[#081233] border border-cyan-400/40 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,102,255,0.2)] flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-black text-cyan-300 uppercase tracking-wide">
                Leftover Balance for Tomorrow
              </div>
              <div className="text-[10px] text-slate-300 font-semibold mt-0.5">
                Total Available: {qtyFmt(totalAvailable)} L (Rs. {money(totalAvailable * activeRate)})
              </div>
            </div>

            <div className="my-2 flex items-baseline justify-between">
              <div className="text-2xl font-black text-amber-300">
                {qtyFmt(effectiveTomorrowLeftover)} L
              </div>
              <div className="text-sm font-extrabold text-cyan-300">
                Rs. {money(tomorrowValue)}
              </div>
            </div>

            <div className="text-[10px] font-bold text-cyan-300">
              {ur ? 'کل کے لیے دستیاب بیلنس' : 'Ready for next day'}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Financial & Profit Summary */}
      <div className="bg-[#081028] rounded-2xl border border-blue-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-500/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">
                {ur ? 'روزانہ آمدن، اخراجات اور خالص منافع' : 'Daily Revenue, Expenses & Net Profit'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {ur
                  ? 'صبح اور شام کے تمام سپلائرز کی خریداری اور تمام گاہکوں (واک ان + ماہانہ کھاتہ) کی فروخت کی بنیاد پر'
                  : 'Computed live from all supplier procurement (Morning + Evening) and all customer sales (POS + Monthly Khatta)'}
              </p>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-xl text-xs font-black ${
            profitToday >= 0 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950/60 text-rose-400 border border-rose-500/40'
          }`}>
            {profitToday >= 0 ? (ur ? 'منافع بخش دن ✓' : 'Profitable Day ✓') : (ur ? 'نقصان / کمی ⚠' : 'Loss / Deficit ⚠')}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Procurement Cost */}
          <div className="bg-[#0b1437] rounded-xl p-3.5 border border-blue-500/20">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              {ur ? '1. دودھ خریداری خرچ' : '1. Procurement Cost'}
            </div>
            <div className="text-xl font-black text-white mt-1">
              Rs. {money(receivedTotalCost || receivedToday * activeRate)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {qtyFmt(receivedToday)} L @ Rs. {activeRate}/L ({supplierCount} {ur ? 'سپلائرز' : 'Suppliers'})
            </div>
          </div>

          {/* 2. Total Sales Revenue */}
          <div className="bg-[#0b1437] rounded-xl p-3.5 border border-blue-500/20">
            <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide">
              {ur ? '2. دودھ فروخت آمدن' : '2. Sales Revenue'}
            </div>
            <div className="text-xl font-black text-cyan-300 mt-1">
              Rs. {money(totalSoldRevenue)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              POS: Rs. {money(soldPosRevenue)} + {ur ? 'کھاتہ' : 'Khata'}: Rs. {money(soldKhataRevenue)}
            </div>
          </div>

          {/* 3. Daily Expenses */}
          <div className="bg-[#0b1437] rounded-xl p-3.5 border border-blue-500/20">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
              {ur ? '3. دکان کے اخراجات' : '3. Shop Expenses'}
            </div>
            <div className="text-xl font-black text-amber-300 mt-1">
              Rs. {money(expensesToday)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {ur ? 'اس تاریخ کے درج شدہ اخراجات' : 'Total expenses on this date'}
            </div>
          </div>

          {/* 4. Net Daily Profit */}
          <div className={`rounded-xl p-3.5 border ${
            profitToday >= 0
              ? 'bg-[#062420] border-emerald-500/40 text-emerald-300'
              : 'bg-[#280c14] border-rose-500/40 text-rose-300'
          }`}>
            <div className={`text-[11px] font-bold uppercase tracking-wide ${
              profitToday >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {ur ? '4. خالص یومیہ منافع' : '4. Net Daily Profit'}
            </div>
            <div className={`text-2xl font-black mt-1 ${
              profitToday >= 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}>
              Rs. {money(profitToday)}
            </div>
            <div className="text-[10px] font-semibold mt-1 text-slate-300">
              {ur ? '(فروخت آمدن) - (خریداری لاگت) - (اخراجات)' : '(Sales) - (Purchase) - (Expenses)'}
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Daily Stock Status Banner & Live Summary (Image 7 Dark Theme Fix) */}
      <div className="bg-[#08132e] rounded-2xl border border-blue-500/30 shadow-[0_0_25px_rgba(0,102,255,0.15)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-500/20 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]"></span>
              <span>{ur ? 'روزانہ اسٹاک کا لائیو خودکار نظام' : 'Real-Time Auto Stock Stream'}</span>
            </h2>
            <p className="text-xs text-blue-300/80 mt-0.5">
              {ur
                ? `${formatDateDisplay(date, ur)} — سپلائرز کے صبح و شام کے دودھ اور تمام فروخت سے خودکار منسلک (کسی بٹن دبانے کی ضرورت نہیں)`
                : `${formatDateDisplay(date, ur)} — Live linked to supplier morning & evening procurement and sales`}
            </p>
          </div>
          <button
            type="button"
            onClick={loadDay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1437] hover:bg-blue-600/30 border border-blue-500/30 text-cyan-300 hover:text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(0,102,255,0.15)] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>{ur ? 'تازہ کریں (Refresh)' : 'Refresh Live'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Yesterday Leftover Stock (Auto) */}
          <div className="bg-[#0b173d] rounded-xl p-3.5 border border-blue-500/25 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                {ur ? 'پچھلا بچا ہوا اسٹاک' : 'Yesterday Leftover Stock'}
              </label>
              <span className="px-2 py-0.5 rounded-md bg-blue-600/30 text-cyan-300 border border-blue-500/40 text-[10px] font-extrabold">
                Auto
              </span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              {qtyFmt(yesterdayLeftover)} Liters
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {ur ? 'گزشتہ کل کے اختتامی اسٹاک سے خودکار منتقل شدہ' : 'Automatically carried forward from yesterday closing.'}
            </div>
          </div>

          {/* Supplier Milk Received (Auto) */}
          <div className="bg-[#0b173d] rounded-xl p-3.5 border border-emerald-500/25 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-300">
                {ur ? 'آج سپلائر سے موصولہ دودھ' : 'Received from Suppliers'}
              </label>
              <span className="px-2 py-0.5 rounded-md bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold">
                Auto
              </span>
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {qtyFmt(receivedToday)} Liters
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Rs. {money(receivedTotalCost || receivedToday * activeRate)} ({supplierCount} {ur ? 'سپلائرز (صبح و شام)' : 'suppliers (all shifts)'})
            </div>
          </div>

          {/* Leftover Balance for Tomorrow (Auto) */}
          <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-xl p-3.5 shadow-md border border-cyan-400/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-100">
                {ur ? 'کل کے لیے بچا ہوا اسٹاک' : 'Tomorrow Opening Stock'}
              </label>
              <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-extrabold">
                Live Balance
              </span>
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1">
              {qtyFmt(effectiveTomorrowLeftover)} Liters
            </div>
            <div className="text-[11px] text-blue-100 font-bold mt-1">
              Rs. {money(tomorrowValue)} (Total Available: {qtyFmt(totalAvailable)} L)
            </div>
          </div>
        </div>

        <div className="bg-[#031d1f] border border-emerald-500/40 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-300 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {ur
              ? 'سپلائر شیٹ میں درج ہونے والا دودھ (صبح یا شام) اور تمام فروخت بغیر کسی سیو بٹن کے خودکار طور پر یہاں اسٹاک میں شامل ہو رہے ہیں۔'
              : 'All supplier milk (morning or evening) and sales automatically update this stock register live without manual saves.'}
          </span>
        </div>
      </div>

      {/* Recent Stock History (14 days) */}
      <div className="bg-[#081028] rounded-2xl border border-blue-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="p-4 border-b border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-white text-sm">
              {ur ? 'حالیہ اسٹاک ہسٹری' : 'Recent Stock History'}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-cyan-300 border border-blue-500/30 text-[10px] font-extrabold">
              14 days
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {history.length} {ur ? 'ریکارڈز' : 'records'}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[50vh]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#0b1437] z-10 border-b border-blue-500/20">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">{ur ? 'تاریخ' : 'Date'}</th>
                <th className="px-3 py-3 text-right">{ur ? 'پچھلا بچا' : 'Yesterday Leftover'}</th>
                <th className="px-3 py-3 text-right text-emerald-400">{ur ? 'آیا (Received)' : 'Received'}</th>
                <th className="px-3 py-3 text-right text-rose-400">{ur ? 'فروخت (Sold)' : 'Total Sold'}</th>
                <th className="px-3 py-3 text-right text-cyan-300 font-extrabold">{ur ? 'بچا ہوا' : 'Leftover'}</th>
                <th className="px-3 py-3 text-right">{ur ? 'مالیت' : 'Value (PKR)'}</th>
                <th className="px-3 py-3 text-center w-20">{ur ? 'تاریخ منتخب' : 'Select'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/10">
              {history.map((row) => (
                <tr key={row.id || row.date} className="hover:bg-blue-600/10 transition-colors">
                  <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-300 whitespace-nowrap">
                    {qtyFmt(row.yesterday_leftover)} L
                  </td>
                  <td className="px-3 py-3 text-right font-extrabold text-emerald-400 whitespace-nowrap">
                    +{qtyFmt(row.received_today)} L
                  </td>
                  <td className="px-3 py-3 text-right font-extrabold text-rose-400 whitespace-nowrap">
                    -{qtyFmt(row.sold_today)} L
                  </td>
                  <td className="px-3 py-3 text-right font-black text-amber-300 whitespace-nowrap">
                    {qtyFmt(row.leftover_tomorrow)} L
                  </td>
                  <td className="px-3 py-3 text-right font-extrabold text-cyan-300 whitespace-nowrap">
                    Rs. {money(Math.round(row.leftover_tomorrow * (row.rate || 240)))}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setDate(row.date);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      title={ur ? 'اس تاریخ کا اسٹاک دیکھیں' : 'View this date stock'}
                      className="px-2.5 py-1 rounded-lg text-cyan-300 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      {ur ? 'دیکھیں' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}

              {history.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    {ur ? 'کوئی اسٹاک ریکارڈ موجود نہیں ہے' : 'No stock records logged'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Milk Quick Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#081028] border border-blue-500/30 rounded-3xl p-6 w-full max-w-md shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_25px_rgba(0,102,255,0.2)] text-white">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-blue-500/20">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  {ur ? 'آج کا سپلائر دودھ شامل کریں' : 'Receive Supplier Milk'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSupplierMilk} className="space-y-4">
              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {ur ? 'سپلائر منتخب کریں' : 'Select Supplier'}
                </label>
                <select
                  value={supId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSupId(id);
                    const s = suppliers.find((x) => x.id === id);
                    if (s) setSupRate(String(s.default_rate || 200));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c163b] border border-blue-500/30 text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#081028] text-white">
                      {s.name} ({s.phone || 'No phone'}) - Default: Rs. {s.default_rate}
                    </option>
                  ))}
                  {suppliers.length === 0 && (
                    <option value="" disabled className="bg-[#081028] text-slate-400">
                      {ur ? 'کوئی سپلائر موجود نہیں' : 'No suppliers registered'}
                    </option>
                  )}
                </select>
              </div>

              {/* Milk Liters & Rate in Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {ur ? 'دودھ کی مقدار (Ltr)' : 'Milk Quantity (Ltr)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={supLiters}
                    onChange={(e) => setSupLiters(e.target.value)}
                    placeholder="e.g. 50"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c163b] border border-blue-500/30 text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {ur ? 'خریداری ریٹ (فی لٹر)' : 'Rate (per Liter)'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={supRate}
                    onChange={(e) => setSupRate(e.target.value)}
                    placeholder="e.g. 200"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c163b] border border-blue-500/30 text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Shift Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {ur ? 'اوقات (شفٹ)' : 'Shift'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSupShift('Morning')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      supShift === 'Morning'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400 shadow-[0_0_12px_rgba(0,128,255,0.3)]'
                        : 'bg-[#0c163b] text-slate-400 border-blue-500/20 hover:text-white'
                    }`}
                  >
                    ☀️ {ur ? 'صبح (Morning)' : 'Morning'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupShift('Evening')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      supShift === 'Evening'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400 shadow-[0_0_12px_rgba(0,128,255,0.3)]'
                        : 'bg-[#0c163b] text-slate-400 border-blue-500/20 hover:text-white'
                    }`}
                  >
                    🌙 {ur ? 'شام (Evening)' : 'Evening'}
                  </button>
                </div>
              </div>

              {/* Calculated Total */}
              {parseFloat(supLiters) > 0 && parseFloat(supRate) > 0 && (
                <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs flex items-center justify-between font-bold">
                  <span className="text-slate-300">{ur ? 'کل لاگت مالیت:' : 'Total Purchase Value:'}</span>
                  <span className="text-cyan-300 text-sm font-black">
                    Rs. {money(parseFloat(supLiters) * parseFloat(supRate))}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-[#0c163b] hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {ur ? 'منسوخ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingSup}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(0,128,255,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingSup ? 'Saving...' : ur ? 'اسٹاک میں محفوظ کریں' : 'Save to Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
