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
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(loadDay, 4000);
    return () => {
      window.removeEventListener('focus', handleFocus);
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
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              title="Previous Day"
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="w-4 h-4 text-brand-600" />
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
                className="px-2.5 py-1 rounded-xl bg-brand-600 text-white text-[10px] font-bold hover:bg-brand-700 cursor-pointer transition-colors ml-1"
              >
                {ur ? 'آج' : 'Today'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Supplier Auto-Aggregation Notice Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
              <span>✓ All supplier milk auto-aggregated ({qtyFmt(receivedToday)} Liters)</span>
            </div>
            <div className="text-[11px] text-emerald-800 mt-0.5">
              Received from {supplierCount} supplier(s) today. Auto-populated into daily stock!
            </div>
          </div>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('suppliers')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <span>{ur ? 'سپلائرز دیکھیں' : 'View Suppliers'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Daily Stock Auto-Calculation Stream */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-extrabold text-slate-800">
            {ur ? 'روزانہ اسٹاک کا خودکار سلسلہ' : 'Daily Stock Auto-Calculation Stream'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Yesterday Leftover */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              {ur ? '1. پچھلا بچا ہوا' : '1. Yesterday Leftover'}
            </div>
            <div className="my-2">
              <div className="text-2xl font-black text-slate-800">
                {qtyFmt(yesterdayLeftover)} L
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Auto Carry-Forward</span>
            </div>
          </div>

          {/* 2. Received Today */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">
              {ur ? '2. آج موصول ہوا' : '2. Received Today'}
            </div>
            <div className="my-2">
              <div className="text-2xl font-black text-emerald-600">
                {qtyFmt(receivedToday)} L
              </div>
            </div>
            <div className="text-[11px] font-extrabold text-slate-700">
              Rs. {money(receivedTotalCost || receivedToday * activeRate)}
            </div>
          </div>

          {/* 3. Total Sold */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
            <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wide">
              {ur ? '3. کل فروخت' : '3. Total Sold'}
            </div>
            <div className="my-2">
              <div className="text-2xl font-black text-rose-600">
                {qtyFmt(soldToday)} L
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-500">
              From Sales ({qtyFmt(soldPos)} L POS + {qtyFmt(soldKhata)} L Monthly)
            </div>
          </div>

          {/* Leftover Balance for Tomorrow */}
          <div className="bg-gradient-to-br from-brand-50 to-blue-50 border border-brand-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-brand-700 uppercase tracking-wide">
                Leftover Balance for Tomorrow
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                Total Available: {qtyFmt(totalAvailable)} L (Rs. {money(totalAvailable * activeRate)})
              </div>
            </div>

            <div className="my-2 flex items-baseline justify-between">
              <div className="text-2xl font-black text-brand-800">
                {qtyFmt(effectiveTomorrowLeftover)} L
              </div>
              <div className="text-sm font-extrabold text-brand-700">
                Rs. {money(tomorrowValue)}
              </div>
            </div>

            <div className="text-[10px] font-bold text-brand-600">
              {ur ? 'کل کے لیے دستیاب بیلنس' : 'Ready for next day'}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Financial & Profit Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">
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
            profitToday >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {profitToday >= 0 ? (ur ? 'منافع بخش دن ✓' : 'Profitable Day ✓') : (ur ? 'نقصان / کمی ⚠' : 'Loss / Deficit ⚠')}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Procurement Cost */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {ur ? '1. دودھ خریداری خرچ' : '1. Procurement Cost'}
            </div>
            <div className="text-xl font-black text-slate-800 mt-1">
              Rs. {money(receivedTotalCost || receivedToday * activeRate)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {qtyFmt(receivedToday)} L @ Rs. {activeRate}/L ({supplierCount} {ur ? 'سپلائرز' : 'Suppliers'})
            </div>
          </div>

          {/* 2. Total Sales Revenue */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
              {ur ? '2. دودھ فروخت آمدن' : '2. Sales Revenue'}
            </div>
            <div className="text-xl font-black text-blue-700 mt-1">
              Rs. {money(totalSoldRevenue)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              POS: Rs. {money(soldPosRevenue)} + {ur ? 'کھاتہ' : 'Khata'}: Rs. {money(soldKhataRevenue)}
            </div>
          </div>

          {/* 3. Daily Expenses */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
              {ur ? '3. دکان کے اخراجات' : '3. Shop Expenses'}
            </div>
            <div className="text-xl font-black text-amber-700 mt-1">
              Rs. {money(expensesToday)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {ur ? 'اس تاریخ کے درج شدہ اخراجات' : 'Total expenses on this date'}
            </div>
          </div>

          {/* 4. Net Daily Profit */}
          <div className={`rounded-xl p-3.5 border ${
            profitToday >= 0
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
              : 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-200'
          }`}>
            <div className={`text-[11px] font-bold uppercase tracking-wide ${
              profitToday >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {ur ? '4. خالص یومیہ منافع' : '4. Net Daily Profit'}
            </div>
            <div className={`text-2xl font-black mt-1 ${
              profitToday >= 0 ? 'text-emerald-800' : 'text-rose-800'
            }`}>
              Rs. {money(profitToday)}
            </div>
            <div className={`text-[10px] font-semibold mt-1 ${
              profitToday >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {ur ? '(فروخت آمدن) - (خریداری لاگت) - (اخراجات)' : '(Sales) - (Purchase) - (Expenses)'}
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Daily Stock Status Banner & Live Summary */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 rounded-2xl border border-blue-200/80 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{ur ? 'روزانہ اسٹاک کا لائیو خودکار نظام' : 'Real-Time Auto Stock Stream'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {ur
                ? `${formatDateDisplay(date, ur)} — سپلائرز کے صبح و شام کے دودھ اور تمام فروخت سے خودکار منسلک (کسی بٹن دبانے کی ضرورت نہیں)`
                : `${formatDateDisplay(date, ur)} — Live linked to supplier morning & evening procurement and sales`}
            </p>
          </div>
          <button
            type="button"
            onClick={loadDay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-600" />
            <span>{ur ? 'تازہ کریں (Refresh)' : 'Refresh Live'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Yesterday Leftover Stock (Auto) */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                {ur ? 'پچھلا بچا ہوا اسٹاک' : 'Yesterday Leftover Stock'}
              </label>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-brand-700 text-[10px] font-extrabold">
                Auto
              </span>
            </div>
            <div className="text-xl font-black text-slate-800 mt-1">
              {qtyFmt(yesterdayLeftover)} Liters
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {ur ? 'گزشتہ کل کے اختتامی اسٹاک سے خودکار منتقل شدہ' : 'Automatically carried forward from yesterday closing.'}
            </div>
          </div>

          {/* Supplier Milk Received (Auto) */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                {ur ? 'آج سپلائر سے موصولہ دودھ' : 'Received from Suppliers'}
              </label>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                Auto
              </span>
            </div>
            <div className="text-xl font-black text-emerald-700 mt-1">
              {qtyFmt(receivedToday)} Liters
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Rs. {money(receivedTotalCost || receivedToday * activeRate)} ({supplierCount} {ur ? 'سپلائرز (صبح و شام)' : 'suppliers (all shifts)'})
            </div>
          </div>

          {/* Leftover Balance for Tomorrow (Auto) */}
          <div className="bg-gradient-to-br from-brand-600 to-indigo-700 text-white rounded-xl p-3.5 shadow-md">
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

        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-900 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {ur
              ? 'سپلائر شیٹ میں درج ہونے والا دودھ (صبح یا شام) اور تمام فروخت بغیر کسی سیو بٹن کے خودکار طور پر یہاں اسٹاک میں شامل ہو رہے ہیں۔'
              : 'All supplier milk (morning or evening) and sales automatically update this stock register live without manual saves.'}
          </span>
        </div>
      </div>

      {/* Recent Stock History (14 days) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-800 text-sm">
              {ur ? 'حالیہ اسٹاک ہسٹری' : 'Recent Stock History'}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold">
              14 days
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {history.length} {ur ? 'ریکارڈز' : 'records'}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[50vh]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">{ur ? 'تاریخ' : 'Date'}</th>
                <th className="px-3 py-3 text-right">{ur ? 'پچھلا بچا' : 'Yesterday Leftover'}</th>
                <th className="px-3 py-3 text-right text-emerald-700">{ur ? 'آیا (Received)' : 'Received'}</th>
                <th className="px-3 py-3 text-right text-rose-700">{ur ? 'فروخت (Sold)' : 'Total Sold'}</th>
                <th className="px-3 py-3 text-right text-brand-800 font-extrabold">{ur ? 'بچا ہوا' : 'Leftover'}</th>
                <th className="px-3 py-3 text-right">{ur ? 'مالیت' : 'Value (PKR)'}</th>
                <th className="px-3 py-3 text-center w-20">{ur ? 'تاریخ منتخب' : 'Select'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((row) => (
                <tr key={row.id || row.date} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">
                    {qtyFmt(row.yesterday_leftover)} L
                  </td>
                  <td className="px-3 py-3 text-right font-extrabold text-emerald-600 whitespace-nowrap">
                    +{qtyFmt(row.received_today)} L
                  </td>
                  <td className="px-3 py-3 text-right font-extrabold text-rose-600 whitespace-nowrap">
                    -{qtyFmt(row.sold_today)} L
                  </td>
                  <td className="px-3 py-3 text-right font-black text-brand-700 whitespace-nowrap">
                    {qtyFmt(row.leftover_tomorrow)} L
                  </td>
                  <td className="px-3 py-3 text-right font-extrabold text-slate-800 whitespace-nowrap">
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
                      className="px-2 py-1 rounded-lg text-brand-700 bg-brand-50 hover:bg-brand-100 text-[10px] font-bold cursor-pointer transition-colors"
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
    </div>
  );
};
