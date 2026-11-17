import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Users,
  ShoppingBag,
  CreditCard,
  Plus,
  ArrowRight,
  Database,
  CheckCircle2,
  FolderOpen,
  Sparkles,
  RefreshCw,
  Boxes,
  Truck,
  BookOpen,
  Wallet,
  Clock,
  TrendingUp,
  Receipt,
  FileText,
  AlertCircle,
  Package,
  Layers,
  Fuel,
  Settings,
  Milk,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { DbInfo, DashboardStats } from '../types/electron';

interface DashboardScreenProps {
  onOpenAddMilk: () => void;
  onNavigate: (page: string) => void;
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

  const [stats, setStats] = useState<DashboardStats>({
    totalMilk: 0,
    totalCustomers: 0,
    todaySale: 0,
    totalDue: 0,
    todayMilk: 0,
    todayPosQty: 0,
    todayKhataQty: 0,
    monthBilled: 0,
    monthCollected: 0,
    todayPurchased: 0,
    todayPurchaseCost: 0,
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

  // Fetch real-time live stats from SQLite database via IPC
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (window.electronAPI) {
        const liveStats = await window.electronAPI.getDashboardStats();
        if (liveStats) {
          setStats(liveStats);
        }
      }
      const now = new Date();
      setLastRefreshed(
        now.toLocaleTimeString(ur ? 'ur-PK' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }, [ur]);

  useEffect(() => {
    refreshData();
    // Auto-sync when window gains focus or every 15 seconds
    const onFocus = () => refreshData();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(refreshData, 15000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [refreshData]);

  const todayDateFormatted = new Date().toLocaleDateString(ur ? 'ur-PK' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* 1. Top Header & Sync Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              {ur ? 'ڈیٹابیس لائیو منسلک (Database Synced)' : 'Live SQLite Database Connected'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mt-0.5">
            {t.shopName}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {ur
              ? 'روزانہ کاؤنٹر سیل، گاہک کھاتہ، سپلائرز، اسٹاک اور نفع و نقصان کا لائیو کنٹرول'
              : 'Complete dairy operations, sales, customer ledgers, suppliers and stock live dashboard'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {/* Active Milk Rate */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-brand-700 text-xs font-black">
            <Milk className="w-4 h-4 text-brand-600" />
            <span>Milk Rate: Rs. {stats.activeRate || 240}/L</span>
          </div>

          {/* Date Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold">
            <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
            <span>{todayDateFormatted}</span>
          </div>

          {/* Real-time Refresh Button */}
          <button
            type="button"
            onClick={refreshData}
            title={ur ? 'تازہ ترین ریکارڈز لائیں' : 'Refresh live data from database'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? (ur ? 'مطابقت...' : 'Syncing...') : ur ? 'تازہ کریں' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. Four Primary Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Milk Sold */}
        <div className="bg-[#f0f7ff] border border-blue-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Milk className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {ur ? 'آج کل فروخت دودھ' : "Today's Milk Sold"}
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {qtyFmt(stats.todayMilk || 0)} <span className="text-sm font-bold text-slate-600">{t.ltr}</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">
              {ur ? 'کاؤنٹر:' : 'POS:'} {qtyFmt(stats.todayPosQty || 0)} L • {ur ? 'کھاتہ:' : 'Khata:'} {qtyFmt(stats.todayKhataQty || 0)} L
            </div>
          </div>
        </div>

        {/* Metric 2: Today's Total Revenue */}
        <div className="bg-[#f0fdf4] border border-emerald-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
              {ur ? 'آج کی کل سیل / آمدن' : "Today's Revenue"}
            </div>
            <div className="text-2xl font-black text-emerald-700 tracking-tight mt-0.5">
              Rs. {money(stats.todaySale || 0)}
            </div>
            <div className="text-[10px] font-semibold text-emerald-800/80 mt-0.5">
              {ur ? 'کیش سیل و آج کی ترسیل' : 'Cash sales & deliveries'}
            </div>
          </div>
        </div>

        {/* Metric 3: Current Milk Stock Available */}
        <div className="bg-[#fff7ed] border border-amber-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Boxes className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
              {ur ? 'موجودہ دستیاب اسٹاک' : 'Available Stock Now'}
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {qtyFmt(stats.stockAvailable || 0)} <span className="text-sm font-bold text-slate-600">{t.ltr}</span>
            </div>
            <div className="text-[10px] font-semibold text-amber-800/80 mt-0.5">
              Rs. {money((stats.stockAvailable || 0) * (stats.activeRate || 240))} {ur ? 'مالیت' : 'worth'}
            </div>
          </div>
        </div>

        {/* Metric 4: Customer Dues (Total Receivable) */}
        <div className="bg-[#faf5ff] border border-purple-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wide">
              {ur ? 'گاہکوں سے کل بقایا' : 'Total Customer Dues'}
            </div>
            <div className={`text-2xl font-black tracking-tight mt-0.5 ${stats.totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              Rs. {money(stats.totalDue || 0)}
            </div>
            <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
              {(stats.topDue || []).length} {ur ? 'گاہکوں کے ذمہ باقی' : 'customers with balance'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Shop Operations & Performance Stream (Real data across all modules) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {ur ? 'اس ماہ کی مجموعی کارکردگی و اسٹاک' : 'This Month Operations & Ledger Overview'}
          </h2>
          <span className="text-[11px] text-slate-400">
            {ur ? 'آخری مطابقت:' : 'Synced:'} {lastRefreshed || 'Live'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Month Billed */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
            <div className="text-[10px] font-bold text-slate-500">{ur ? 'اس ماہ کل بلنگ' : 'Month Billed'}</div>
            <div className="text-base font-extrabold text-slate-800 mt-1">
              Rs. {money(stats.monthBilled || 0)}
            </div>
            <div className="text-[10px] text-slate-400">{qtyFmt(stats.totalMilk || 0)} {t.ltr}</div>
          </div>

          {/* Month Collected */}
          <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
            <div className="text-[10px] font-bold text-emerald-800">{ur ? 'اس ماہ کل وصولی' : 'Month Collected'}</div>
            <div className="text-base font-extrabold text-emerald-700 mt-1">
              Rs. {money(stats.monthCollected || 0)}
            </div>
            <div className="text-[10px] text-emerald-600/80">{ur ? 'نقد و بینک' : 'Cash & Transfer'}</div>
          </div>

          {/* Supplier Purchased */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
            <div className="text-[10px] font-bold text-slate-500">{ur ? 'سپلائر دودھ (آج)' : 'Supplier Milk (Today)'}</div>
            <div className="text-base font-extrabold text-slate-800 mt-1">
              {qtyFmt(stats.todayPurchased || 0)} {t.ltr}
            </div>
            <div className="text-[10px] text-slate-400">Rs. {money(stats.todayPurchaseCost || 0)}</div>
          </div>

          {/* Supplier Payable */}
          <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-100">
            <div className="text-[10px] font-bold text-rose-800">{ur ? 'سپلائرز کو دینا ہے' : 'Supplier Payable'}</div>
            <div className="text-base font-extrabold text-rose-600 mt-1">
              Rs. {money(stats.supplierPayable || 0)}
            </div>
            <div className="text-[10px] text-rose-500/80">{stats.suppliersCount || 1} {ur ? 'سپلائر' : 'suppliers'}</div>
          </div>

          {/* Daily & Monthly Expenses */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
            <div className="text-[10px] font-bold text-slate-500">{ur ? 'اخراجات (آج/ماہ)' : 'Expenses (Today/Mo)'}</div>
            <div className="text-base font-extrabold text-slate-800 mt-1">
              Rs. {money(stats.todayExpenses || 0)}
            </div>
            <div className="text-[10px] text-slate-400">Mo: Rs. {money(stats.monthExpenses || 0)}</div>
          </div>

          {/* Desi Ghee & Shopper Stock */}
          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100">
            <div className="text-[10px] font-bold text-amber-800">{ur ? 'دیسی گھی و شاپر' : 'Ghee & Shopper'}</div>
            <div className="text-base font-extrabold text-amber-800 mt-1">
              {stats.gheeStock || 0} Kg <span className="text-xs font-normal text-slate-500">Ghee</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {stats.shopperStock || 0} Kg {ur ? 'شاپر' : 'Bags'} • Rs. {money(stats.gheeProfit || 0)} {ur ? 'نفع' : 'profit'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Quick Action Shortcuts (Direct 1-Click Launchers) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          {t.quickActions}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {/* Action 1: Quick Counter Cash Sale */}
          <button
            type="button"
            onClick={() => onNavigate('daily-sale')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 group-hover:text-amber-800">
              {ur ? 'فوری کاؤنٹر سیل' : 'Quick Cash Sale'}
            </span>
            <span className="text-[10px] text-slate-400">POS Counter</span>
          </button>

          {/* Action 2: Monthly Khatta */}
          <button
            type="button"
            onClick={() => onNavigate('monthly-khatta')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 group-hover:text-brand-800">
              {ur ? 'ماہانہ کھاتہ' : 'Monthly Khatta'}
            </span>
            <span className="text-[10px] text-slate-400">Grid 31 Days</span>
          </button>

          {/* Action 3: Daily Stock Register */}
          <button
            type="button"
            onClick={() => onNavigate('daily-stock')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-800">
              {ur ? 'ڈیلی اسٹاک رجسٹر' : 'Daily Stock'}
            </span>
            <span className="text-[10px] text-slate-400">Inward/Outward</span>
          </button>

          {/* Action 4: Suppliers Sheet */}
          <button
            type="button"
            onClick={() => onNavigate('suppliers')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 group-hover:text-indigo-800">
              {ur ? 'سپلائرز شیٹ' : 'Suppliers Sheet'}
            </span>
            <span className="text-[10px] text-slate-400">Milk purchases</span>
          </button>

          {/* Action 5: Customers */}
          <button
            type="button"
            onClick={() => onNavigate('customers')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-100/60 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 group-hover:text-teal-800">
              {ur ? 'گاہکوں کے کھاتے' : 'Customers'}
            </span>
            <span className="text-[10px] text-slate-400">{stats.totalCustomers} profiles</span>
          </button>

          {/* Action 6: All Records & Bills */}
          <button
            type="button"
            onClick={() => onNavigate('all-record')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 group-hover:text-purple-800">
              {ur ? 'تمام ریکارڈز و بل' : 'All Records & Bill'}
            </span>
            <span className="text-[10px] text-slate-400">Print & WhatsApp</span>
          </button>

          {/* Action 7: Desi Ghee Stock */}
          <button
            type="button"
            onClick={() => onNavigate('ghee')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-yellow-200 bg-yellow-50/50 hover:bg-yellow-100/60 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-500 text-white flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 group-hover:text-yellow-800">
              {ur ? 'دیسی گھی اسٹاک' : 'Desi Ghee Stock'}
            </span>
            <span className="text-[10px] text-slate-400">Stock & Profit</span>
          </button>

          {/* Action 8: Shopper Bags Stock */}
          <button
            type="button"
            onClick={() => onNavigate('shopper')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/50 hover:bg-cyan-100/60 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 group-hover:text-cyan-800">
              {ur ? 'شاپر و پیکنگ' : 'Shopper Stock'}
            </span>
            <span className="text-[10px] text-slate-400">Sizes & Balances</span>
          </button>

          {/* Action 9: Daily Expenses & Fleet */}
          <button
            type="button"
            onClick={() => onNavigate('fleet-expenses')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <Fuel className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 group-hover:text-rose-800">
              {ur ? 'اخراجات و فلیٹ' : 'Expenses & Fleet'}
            </span>
            <span className="text-[10px] text-slate-400">Shop, Till, Fleet</span>
          </button>

          {/* Action 10: Settings & Backup */}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 group-hover:text-slate-900">
              {ur ? 'سیٹنگز و بیک اپ' : 'Settings & Backup'}
            </span>
            <span className="text-[10px] text-slate-400">Bank, Rate, DB</span>
          </button>
        </div>
      </div>

      {/* Bottom DB & System Status Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{ur ? 'ڈیٹا بیس سسٹم: منسلک و فعال' : 'Database Status: Connected & Synced'}</span>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-[11px] text-slate-400">
            {dbInfo?.dbPath ? dbInfo.dbPath.split('\\').pop() : 'app_data.db'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          {lastRefreshed ? `${ur ? 'آخری اپ ڈیٹ:' : 'Last Updated:'} ${lastRefreshed}` : ''}
        </div>
      </div>
    </div>
  );
};
