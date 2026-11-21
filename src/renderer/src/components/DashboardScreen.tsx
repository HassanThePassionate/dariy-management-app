import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Users,
  ShoppingBag,
  CreditCard,
  Plus,
  ArrowRight,
  Database,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Boxes,
  Truck,
  BookOpen,
  Receipt,
  FileText,
  AlertCircle,
  Package,
  Layers,
  Fuel,
  Settings,
  Milk,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { DbInfo, DashboardStats } from '../types/electron';

interface DashboardScreenProps {
  onOpenAddMilk: () => void;
  onNavigate: (page: string, monthKey?: string) => void;
  dbInfo: DbInfo | null;
}

const money = (n: number) => Math.round(n).toLocaleString('en-US');
const qtyFmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onOpenAddMilk,
  onNavigate,
  dbInfo,
}) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  // Compute Current & Previous month keys
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const currentMonthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = `${prevMonthDate.getFullYear()}-${pad(prevMonthDate.getMonth() + 1)}`;

  // Month filter state (Defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  const [stats, setStats] = useState<DashboardStats>({
    totalMilk: 0,
    totalCustomers: 0,
    todaySale: 0,
    monthSale: 0,
    totalDue: 0,
    todayMilk: 0,
    todayPosQty: 0,
    todayKhataQty: 0,
    monthBilled: 0,
    monthCollected: 0,
    todayPurchased: 0,
    todayPurchaseCost: 0,
    monthPurchased: 0,
    monthPurchaseCost: 0,
    stockAvailable: 0,
    stockOpeningToday: 0,
    supplierPayable: 0,
    suppliersCount: 0,
    todayExpenses: 0,
    monthExpenses: 0,
    gheeStock: 0,
    gheeProfit: 0,
    shopperStock: 0,
    activeRate: 240,
    topDue: [],
    recentTransactions: [],
  });

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Load stats from backend with selected month
  const refreshData = useCallback(
    async (monthKeyToFetch?: string) => {
      if (!window.electronAPI) return;
      setIsRefreshing(true);
      try {
        const targetMonth = monthKeyToFetch || selectedMonth;
        const res = await window.electronAPI.getDashboardStats(targetMonth);
        if (res) {
          setStats(res);
          const time = new Date().toLocaleTimeString(ur ? 'ur-PK' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setLastRefreshed(time);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setTimeout(() => setIsRefreshing(false), 250);
      }
    },
    [selectedMonth, ur]
  );

  useEffect(() => {
    refreshData(selectedMonth);

    const handleFocus = () => refreshData(selectedMonth);
    const handleDataChanged = () => refreshData(selectedMonth);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('dairy-data-changed', handleDataChanged);

    const interval = setInterval(() => {
      refreshData(selectedMonth);
    }, 4000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('dairy-data-changed', handleDataChanged);
      clearInterval(interval);
    };
  }, [refreshData, selectedMonth]);

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    refreshData(newMonth);
  };

  // Month labels
  const monthDisplayLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(ur ? 'ur-PK' : 'en-US', { month: 'long', year: 'numeric' });
  }, [selectedMonth, ur]);

  const currentMonthName = useMemo(() => {
    return now.toLocaleDateString(ur ? 'ur-PK' : 'en-US', { month: 'short' });
  }, [now, ur]);

  const prevMonthName = useMemo(() => {
    return prevMonthDate.toLocaleDateString(ur ? 'ur-PK' : 'en-US', { month: 'short' });
  }, [prevMonthDate, ur]);

  const todayDateFormatted = useMemo(() => {
    return now.toLocaleDateString(ur ? 'ur-PK' : 'en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [now, ur]);

  const isCurrentMonthSelected = selectedMonth === currentMonthKey;

  // Monthly Financial Calculations for Profit & Loss
  const monthlyRevenue = Number(stats.monthBilled || stats.monthSale || 0);
  const monthlyPurchaseCost = Number(stats.monthPurchaseCost || 0);
  const monthlyExpenses = Number(stats.monthExpenses || 0);
  const totalMonthlyCost = monthlyPurchaseCost + monthlyExpenses;
  const gheeProfit = Number(stats.gheeProfit || 0);
  const netProfit = monthlyRevenue + gheeProfit - totalMonthlyCost;
  const isProfit = netProfit >= 0;

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto text-slate-100 select-none">
      {/* 1. Header with SQLite Connection, Shop Branding, Rate, Date & Refresh Button (Matching Image 5) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#081028] p-5 rounded-3xl border border-blue-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
        <div>
          {/* Green Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-black text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)] mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>LIVE SQLITE DATABASE CONNECTED</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Qari Zafar Milk Shop
          </h1>
          <p className="text-xs font-semibold text-cyan-300/80 mt-0.5">
            Complete dairy operations, sales, customer ledgers, suppliers and stock live dashboard
          </p>
        </div>

        {/* Right Badges: Milk Rate, Date, Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Milk Rate Badge */}
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#0b1437] border border-blue-500/30 text-cyan-300 text-xs font-black shadow-[0_0_12px_rgba(0,102,255,0.15)]">
            <Milk className="w-4 h-4 text-cyan-400" />
            <span>Milk Rate: Rs. {stats.activeRate || 240}/L</span>
          </div>

          {/* Date Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0b1437] border border-blue-500/30 text-white text-xs font-bold shadow-[0_0_12px_rgba(0,102,255,0.15)]">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{todayDateFormatted}</span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refreshData(selectedMonth)}
            title={ur ? 'تازہ ترین ریکارڈز لائیں' : 'Refresh live data'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black cursor-pointer transition-all shadow-[0_0_15px_rgba(0,128,255,0.35)] active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? '...' : ur ? 'تازہ کریں' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC MONTH FILTER BAR (User Requested: "dashboard ma filter bee day dean a") */}
      <div className="bg-[#081028] p-4 rounded-3xl border border-blue-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/20 text-cyan-400 border border-blue-500/30">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-white flex items-center gap-2">
              <span>{ur ? 'ڈیش بورڈ ڈیٹا فلٹر برائے مہینہ:' : 'Dashboard View Filter by Month:'}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-black text-xs">
                {monthDisplayLabel}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {ur
                ? 'منتخب کردہ مہینے کے مطابق نیچے دیے گئے تمام کارڈز، دودھ کی مقدار، بلنگ اور سیل خودکار اپ ڈیٹ ہوں گے۔'
                : 'All stat cards, sales, milk quantity and billing automatically update to match the selected month.'}
            </div>
          </div>
        </div>

        {/* Quick Month Toggle Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleMonthChange(currentMonthKey)}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold cursor-pointer transition-all border ${
              isCurrentMonthSelected
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(0,128,255,0.4)]'
                : 'bg-[#0c163b] text-slate-300 border-blue-500/30 hover:border-cyan-400/50 hover:text-white'
            }`}
          >
            {ur ? `اس ماہ (${currentMonthName})` : `This Month (${currentMonthName})`}
          </button>

          <button
            type="button"
            onClick={() => handleMonthChange(previousMonthKey)}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold cursor-pointer transition-all border ${
              selectedMonth === previousMonthKey
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(0,128,255,0.4)]'
                : 'bg-[#0c163b] text-slate-300 border-blue-500/30 hover:border-cyan-400/50 hover:text-white'
            }`}
          >
            {ur ? `پچھلا مہینہ (${prevMonthName})` : `Last Month (${prevMonthName})`}
          </button>

          {/* Month Picker for Any Month */}
          <div className="relative">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && handleMonthChange(e.target.value)}
              className="px-3 py-1.5 rounded-2xl bg-[#0c163b] border border-blue-500/30 text-white text-xs font-bold focus:outline-none focus:border-cyan-400 cursor-pointer shadow-xs [color-scheme:dark]"
              title={ur ? 'کوئی بھی مہینہ منتخب کریں' : 'Select any month'}
            />
          </div>
        </div>
      </div>

      {/* 3. Four Top Hero Metric Cards (Clickable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TODAY'S MILK SOLD */}
        <div
          onClick={() => onNavigate('daily-sale')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('daily-sale')}
          className="bg-[#081028] border border-blue-500/25 rounded-3xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.3)] hover:border-blue-400/70 hover:-translate-y-0.5 transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-200/80 uppercase tracking-wider">
              {ur ? 'آج کل فروخت دودھ' : "TODAY'S MILK SOLD"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-cyan-400 flex items-center justify-center">
              <Milk className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-white tracking-tight">
              {qtyFmt(stats.todayMilk || 0)} <span className="text-base font-semibold text-cyan-300">Ltr</span>
            </div>
          </div>
          <div className="text-[11px] text-cyan-300/80 font-medium">
            POS: {qtyFmt(stats.todayPosQty || 0)} L • Khata: {qtyFmt(stats.todayKhataQty || 0)} L
          </div>
        </div>

        {/* Card 2: TODAY'S REVENUE (Informational Only - No navigation on click) */}
        <div
          className="bg-[#081028] border border-emerald-500/25 rounded-3xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.3)] flex flex-col justify-between cursor-default"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              {ur ? 'آج کی کل آمدن' : "TODAY'S REVENUE"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-emerald-400 tracking-tight">
              Rs. {money(stats.todaySale || 0)}
            </div>
          </div>
          <div className="text-[11px] text-emerald-300/80 font-medium flex items-center justify-between flex-wrap gap-1">
            <span>{ur ? 'نقد کاؤنٹر و ڈیلیوری' : 'Cash sales & deliveries'}</span>
            <span className="text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-500/30">
              {ur ? 'ماہانہ:' : 'Mo:'} Rs. {money(stats.monthBilled || 0)}
            </span>
          </div>
        </div>

        {/* Card 3: AVAILABLE STOCK NOW */}
        <div
          onClick={() => onNavigate('daily-stock')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('daily-stock')}
          className="bg-[#081028] border border-amber-500/25 rounded-3xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.3)] hover:border-amber-400/70 hover:-translate-y-0.5 transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              {ur ? 'موجودہ دستیاب اسٹاک' : 'AVAILABLE STOCK NOW'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-amber-300 tracking-tight">
              {qtyFmt(stats.stockAvailable || 0)} <span className="text-base font-semibold text-amber-200">Ltr</span>
            </div>
          </div>
          <div className="text-[11px] text-amber-300/80 font-medium">
            Rs. {money(Math.round((stats.stockAvailable || 0) * (stats.activeRate || 240)))} worth
          </div>
        </div>

        {/* Card 4: TOTAL CUSTOMER DUES */}
        <div
          onClick={() => onNavigate('monthly-khatta', selectedMonth)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('monthly-khatta', selectedMonth)}
          className="bg-[#081028] border border-rose-500/25 rounded-3xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.3)] hover:border-rose-400/70 hover:-translate-y-0.5 transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
              {ur ? 'گاہکوں کا کل بقایا' : 'TOTAL CUSTOMER DUES'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-rose-400 tracking-tight">
              Rs. {money(stats.totalDue || 0)}
            </div>
          </div>
          <div className="text-[11px] text-rose-300/80 font-medium">
            {(stats.topDue?.length || 0)} customers with balance
          </div>
        </div>
      </div>

      {/* 4. Operations & Ledger Overview (With Prominent Monthly Profit / Loss Banner) */}
      <div className="bg-[#081028] rounded-3xl border border-blue-500/20 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.4)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-cyan-400 uppercase tracking-wider">
            {ur ? `ماہانہ آپریشنز، مالی خلاصہ و لیجر: ${monthDisplayLabel}` : `THIS MONTH OPERATIONS, P&L & LEDGER OVERVIEW`}
          </h2>
          <span className="text-[11px] text-slate-400">
            {lastRefreshed ? `Synced: ${lastRefreshed}` : 'Live'}
          </span>
        </div>

        {/* Prominent Monthly Profit / Loss & Financial Health Widget */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isProfit
              ? 'bg-gradient-to-r from-[#051c14] via-[#08281d] to-[#051c14] border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
              : 'bg-gradient-to-r from-[#240810] via-[#2f0b15] to-[#240810] border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.12)]'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isProfit
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                }`}
              >
                {isProfit ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-xs font-black tracking-wider uppercase text-slate-300">
                  {ur ? `ماہانہ تخمینہ نفع / نقصان (${monthDisplayLabel})` : `MONTHLY NET PROFIT / LOSS (${monthDisplayLabel})`}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-2xl font-black ${isProfit ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {isProfit ? `+ Rs. ${money(netProfit)}` : `- Rs. ${money(Math.abs(netProfit))}`}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                      isProfit
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    }`}
                  >
                    {isProfit
                      ? (ur ? 'صافی منافع (Net Profit)' : 'NET PROFIT')
                      : (ur ? 'صافی خسارہ (Net Loss)' : 'NET LOSS')}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial breakdown pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#081028]/80 border border-blue-500/20 rounded-xl px-3 py-2">
                <span className="text-[10px] text-cyan-400 font-bold block">{ur ? 'ماہانہ کل آمدن' : 'Monthly Revenue'}</span>
                <span className="text-sm font-black text-white">Rs. {money(monthlyRevenue)}</span>
              </div>
              <div className="bg-[#081028]/80 border border-blue-500/20 rounded-xl px-3 py-2">
                <span className="text-[10px] text-slate-400 font-bold block">{ur ? 'دودھ خریداری لاگت' : 'Milk Purchase Cost'}</span>
                <span className="text-sm font-black text-rose-300">Rs. {money(monthlyPurchaseCost)}</span>
              </div>
              <div className="bg-[#081028]/80 border border-blue-500/20 rounded-xl px-3 py-2">
                <span className="text-[10px] text-amber-400 font-bold block">{ur ? 'ماہانہ اخراجات' : 'Monthly Expenses'}</span>
                <span className="text-sm font-black text-amber-300">Rs. {money(monthlyExpenses)}</span>
              </div>
              <div className="bg-[#081028]/80 border border-blue-500/20 rounded-xl px-3 py-2">
                <span className="text-[10px] text-emerald-400 font-bold block">{ur ? 'کیش وصولی' : 'Cash Collected'}</span>
                <span className="text-sm font-black text-emerald-300">Rs. {money(stats.monthCollected || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Month Billed -> Monthly Khatta (Selected Month) */}
          <button
            type="button"
            onClick={() => onNavigate('monthly-khatta', selectedMonth)}
            className="text-left bg-[#0c163b] rounded-2xl p-3 border border-blue-500/20 hover:border-cyan-400/70 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <div className="text-[10px] font-bold text-slate-400">{ur ? 'کل بلنگ' : 'Month Billed'}</div>
            <div className="text-base font-black text-white mt-1">
              Rs. {money(stats.monthBilled || 0)}
            </div>
            <div className="text-[10px] text-cyan-400">{qtyFmt(stats.totalMilk || 0)} Ltr • {ur ? 'کھولیں →' : 'Open →'}</div>
          </button>

          {/* Card 2: Month Collected -> All Records (Navigates to All Records) */}
          <button
            type="button"
            onClick={() => onNavigate('all-record')}
            className="text-left bg-[#061e1f] rounded-2xl p-3 border border-emerald-500/20 hover:border-emerald-400/70 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <div className="text-[10px] font-bold text-emerald-400">{ur ? 'کل وصولی' : 'Month Collected'}</div>
            <div className="text-base font-black text-emerald-300 mt-1">
              Rs. {money(stats.monthCollected || 0)}
            </div>
            <div className="text-[10px] text-emerald-400/80">{ur ? 'تمام ریکارڈز دیکھیں →' : 'All Records →'}</div>
          </button>

          {/* Card 3: Supplier Milk (Today) -> Suppliers */}
          <button
            type="button"
            onClick={() => onNavigate('suppliers')}
            className="text-left bg-[#0c163b] rounded-2xl p-3 border border-blue-500/20 hover:border-indigo-400/70 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <div className="text-[10px] font-bold text-slate-400">{ur ? 'سپلائر دودھ (آج)' : 'Supplier Milk (Today)'}</div>
            <div className="text-base font-black text-white mt-1">
              {qtyFmt(stats.todayPurchased || 0)} Ltr
            </div>
            <div className="text-[10px] text-cyan-400">
              Rs. {money(stats.todayPurchaseCost || 0)} →
            </div>
          </button>

          {/* Card 4: Supplier Payable -> Suppliers */}
          <button
            type="button"
            onClick={() => onNavigate('suppliers')}
            className="text-left bg-[#260f17] rounded-2xl p-3 border border-rose-500/20 hover:border-rose-400/70 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <div className="text-[10px] font-bold text-rose-400">{ur ? 'سپلائر واجب الادا' : 'Supplier Payable'}</div>
            <div className="text-base font-black text-rose-300 mt-1">
              Rs. {money(stats.supplierPayable || 0)}
            </div>
            <div className="text-[10px] text-rose-400/80">{stats.suppliersCount || 1} suppliers →</div>
          </button>

          {/* Card 5: Expenses (Today/Mo) -> Expenses & Fleet */}
          <button
            type="button"
            onClick={() => onNavigate('fleet-expenses')}
            className="text-left bg-[#21190a] rounded-2xl p-3 border border-amber-500/20 hover:border-amber-400/70 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <div className="text-[10px] font-bold text-amber-400">{ur ? 'اخراجات (آج/ماہ)' : 'Expenses (Today/Mo)'}</div>
            <div className="text-base font-black text-amber-300 mt-1">
              Rs. {money(stats.todayExpenses || 0)}
            </div>
            <div className="text-[10px] text-amber-400/80">Mo: Rs. {money(stats.monthExpenses || 0)} →</div>
          </button>

          {/* Card 6: Ghee & Shopper -> Ghee Stock */}
          <button
            type="button"
            onClick={() => onNavigate('ghee')}
            className="text-left bg-[#0c163b] rounded-2xl p-3 border border-blue-500/20 hover:border-amber-400/70 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <div className="text-[10px] font-bold text-slate-400">{ur ? 'دیسی گھی و شاپر' : 'Ghee & Shopper'}</div>
            <div className="text-base font-black text-white mt-1">
              {stats.gheeStock || 0} Kg <span className="text-xs font-normal text-slate-400">Ghee</span>
            </div>
            <div className="text-[10px] text-cyan-400">
              {stats.shopperStock || 0} kg Bags • Rs. {money(stats.gheeProfit || 0)} →
            </div>
          </button>
        </div>
      </div>

      {/* 5. 10 Quick Action Launcher Buttons (Exact layout from Image 5 in Dark Mode) */}
      <div className="bg-[#081028] p-5 rounded-3xl border border-blue-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
        <h2 className="text-xs font-black text-cyan-400 uppercase tracking-wider mb-3.5">
          QUICK ACTIONS
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {/* Action 1: Quick Cash Sale */}
          <button
            type="button"
            onClick={() => onNavigate('daily-sale')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-amber-500/25 bg-[#0c163b] hover:bg-amber-600/20 hover:border-amber-400/50 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center mb-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)] group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-amber-300">
              Quick Cash Sale
            </span>
            <span className="text-[10px] text-slate-400">POS Counter</span>
          </button>

          {/* Action 2: Monthly Khatta */}
          <button
            type="button"
            onClick={() => onNavigate('monthly-khatta')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-blue-500/25 bg-[#0c163b] hover:bg-blue-600/20 hover:border-cyan-400/50 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center mb-1.5 shadow-[0_0_12px_rgba(0,128,255,0.3)] group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-cyan-300">
              Monthly Khatta
            </span>
            <span className="text-[10px] text-slate-400">Grid 31 Days</span>
          </button>

          {/* Action 3: Daily Stock */}
          <button
            type="button"
            onClick={() => onNavigate('daily-stock')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-emerald-500/25 bg-[#0c163b] hover:bg-emerald-600/20 hover:border-emerald-400/50 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center mb-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-emerald-300">
              Daily Stock
            </span>
            <span className="text-[10px] text-slate-400">Inward/Outward</span>
          </button>

          {/* Action 4: Suppliers Sheet */}
          <button
            type="button"
            onClick={() => onNavigate('suppliers')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-indigo-500/25 bg-[#0c163b] hover:bg-indigo-600/20 hover:border-indigo-400/50 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mb-1.5 shadow-[0_0_12px_rgba(99,102,241,0.3)] group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-indigo-300">
              Suppliers Sheet
            </span>
            <span className="text-[10px] text-slate-400">Milk purchase</span>
          </button>

          {/* Action 5: Customers */}
          <button
            type="button"
            onClick={() => onNavigate('customers')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-teal-500/25 bg-[#0c163b] hover:bg-teal-600/20 hover:border-teal-400/50 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-[0_0_12px_rgba(20,184,166,0.3)] group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-teal-300">
              Customers
            </span>
            <span className="text-[10px] text-slate-400">{stats.totalCustomers} profiles</span>
          </button>

          {/* Action 6: All Records & Bill */}
          <button
            type="button"
            onClick={() => onNavigate('all-record')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-purple-500/25 bg-[#0c163b] hover:bg-purple-600/20 hover:border-purple-400/50 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center mb-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)] group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-purple-300">
              All Records & Bill
            </span>
            <span className="text-[10px] text-slate-400">Print & Whatsapp</span>
          </button>

          {/* Action 7: Desi Ghee Stock */}
          <button
            type="button"
            onClick={() => onNavigate('ghee')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-amber-500/25 bg-[#0c163b] hover:bg-amber-600/20 hover:border-amber-400/50 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-yellow-500 text-white flex items-center justify-center mb-1.5 shadow-[0_0_12px_rgba(217,119,6,0.3)] group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-amber-300">
              Desi Ghee Stock
            </span>
            <span className="text-[10px] text-slate-400">Store & Profit</span>
          </button>

          {/* Action 8: Shopper Stock */}
          <button
            type="button"
            onClick={() => onNavigate('shopper')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-cyan-500/25 bg-[#0c163b] hover:bg-cyan-600/20 hover:border-cyan-400/50 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-500 text-white flex items-center justify-center mb-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-cyan-300">
              Shopper Stock
            </span>
            <span className="text-[10px] text-slate-400">Sizes & Balances</span>
          </button>

          {/* Action 9: Expenses & Fleet */}
          <button
            type="button"
            onClick={() => onNavigate('fleet-expenses')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-rose-500/25 bg-[#0c163b] hover:bg-rose-600/20 hover:border-rose-400/50 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center mb-1.5 shadow-[0_0_12px_rgba(244,63,94,0.3)] group-hover:scale-105 transition-transform">
              <Fuel className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-rose-300">
              Expenses & Fleet
            </span>
            <span className="text-[10px] text-slate-400">Shop, Tin, Fleet</span>
          </button>

          {/* Action 10: Settings & Backup */}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-500/25 bg-[#0c163b] hover:bg-slate-600/20 hover:border-slate-400/50 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-500 text-white flex items-center justify-center mb-1.5 shadow-[0_0_12px_rgba(100,116,139,0.3)] group-hover:scale-105 transition-transform">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-slate-300">
              Settings & Backup
            </span>
            <span className="text-[10px] text-slate-400">Bank, Rate, DB</span>
          </button>
        </div>
      </div>

      {/* 6. Live Database Status Bar */}
      <div className="bg-[#081028] p-4 rounded-3xl border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-300">Local Database Engine:</span>
          <span className="text-cyan-300 font-mono truncate max-w-md">{dbInfo?.dbPath || 'app_data.db'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>SQLite WAL Mode Active</span>
          <span className="text-slate-600">|</span>
          <span>v{dbInfo?.appVersion || '1.0.0'}</span>
        </div>
      </div>
    </div>
  );
};
