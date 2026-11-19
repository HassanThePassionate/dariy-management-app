import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
  Phone,
  Search,
  CheckCheck,
  Pause,
  Play,
  RotateCcw,
  Check,
  X,
  ShieldCheck,
  Building,
  Flame,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  MonthlyRecordCustomer,
  MonthlyRecordRow,
  BillSettings,
  WhatsAppCloudStatus,
  WhatsAppBillLog,
} from '../types/electron';
import { ModernBillCard } from './ModernBillCard';

export const WhatsAppBillingView: React.FC = () => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [customers, setCustomers] = useState<MonthlyRecordCustomer[]>([]);
  const [billSettings, setBillSettings] = useState<BillSettings | null>(null);
  const [cloudStatus, setCloudStatus] = useState<WhatsAppCloudStatus | null>(null);
  const [logs, setLogs] = useState<WhatsAppBillLog[]>([]);

  // Selected Month
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'sent' | 'failed' | 'missing-phone'>('all');

  // Preview Bill Modal State
  const [previewCustomer, setPreviewCustomer] = useState<{
    customer: MonthlyRecordCustomer;
    row: MonthlyRecordRow;
  } | null>(null);

  // Batch Sending Queue State
  const [isQueueRunning, setIsQueueRunning] = useState<boolean>(false);
  const [isQueuePaused, setIsQueuePaused] = useState<boolean>(false);
  const [queueProgress, setQueueProgress] = useState<{
    total: number;
    current: number;
    sent: number;
    failed: number;
    skipped: number;
  }>({ total: 0, current: 0, sent: 0, failed: 0, skipped: 0 });

  // Load Data
  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const [recList, bSettings, waStatus, waLogs] = await Promise.all([
        window.electronAPI.getMonthlyRecords(),
        window.electronAPI.getBillSettings(),
        window.electronAPI.getWhatsAppCloudStatus(),
        window.electronAPI.getWhatsAppLogs(selectedMonth),
      ]);

      setCustomers(recList || []);
      setBillSettings(bSettings);
      setCloudStatus(waStatus);
      setLogs(waLogs || []);
    } catch (err) {
      console.error('Failed to load WhatsApp billing data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Available Months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(defaultMonth);
    for (const c of customers) {
      for (const r of c.rows || []) {
        if (r.month) set.add(r.month);
      }
    }
    return Array.from(set).sort().reverse();
  }, [customers, defaultMonth]);

  // Valid WhatsApp phone validator
  const isValidPhone = (phone?: string): boolean => {
    if (!phone) return false;
    const clean = phone.replace(/\D/g, '');
    return clean.length >= 10 && clean.length <= 15;
  };

  // Map of logs for the selected month by customerId
  const logsMap = useMemo(() => {
    const map = new Map<number, WhatsAppBillLog>();
    for (const l of logs) {
      if (l.customer_id) {
        map.set(l.customer_id, l);
      }
    }
    return map;
  }, [logs]);

  // Process item bills for selected month
  const billItems = useMemo(() => {
    return customers.map((c) => {
      const row = (c.rows || []).find((r) => r.month === selectedMonth) || {
        month: selectedMonth,
        liters: 0,
        rate: 240,
        bill: 0,
        paid: 0,
        balance: c.balance || 0,
      };

      const hasPhone = isValidPhone(c.phone);
      const log = logsMap.get(c.id);

      let status: 'sent' | 'delivered' | 'read' | 'failed' | 'missing-phone' | 'opted-out' | 'pending' = 'pending';
      if (!hasPhone) {
        status = 'missing-phone';
      } else if (c.whatsapp_consent === false) {
        status = 'opted-out';
      } else if (log) {
        status = log.status as any;
      }

      return {
        customer: c,
        row,
        hasPhone,
        status,
        log,
      };
    });
  }, [customers, selectedMonth, logsMap]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let validPhoneCount = 0;
    let missingPhoneCount = 0;
    let sentCount = 0;
    let deliveredCount = 0;
    let readCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    for (const item of billItems) {
      if (!item.hasPhone) missingPhoneCount++;
      else validPhoneCount++;

      if (item.status === 'sent') sentCount++;
      else if (item.status === 'delivered') deliveredCount++;
      else if (item.status === 'read') readCount++;
      else if (item.status === 'failed') failedCount++;
      else if (item.status === 'pending') pendingCount++;
    }

    return {
      total: billItems.length,
      validPhoneCount,
      missingPhoneCount,
      alreadySent: sentCount + deliveredCount + readCount,
      pendingCount,
      failedCount,
    };
  }, [billItems]);

  // Filtered Bill Items
  const filteredItems = useMemo(() => {
    return billItems.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.customer.name.toLowerCase().includes(q) ||
        (item.customer.phone && item.customer.phone.includes(q));

      if (!matchSearch) return false;

      if (statusFilter === 'pending') return item.status === 'pending';
      if (statusFilter === 'sent') return ['sent', 'delivered', 'read'].includes(item.status);
      if (statusFilter === 'failed') return item.status === 'failed';
      if (statusFilter === 'missing-phone') return !item.hasPhone;

      return true;
    });
  }, [billItems, searchQuery, statusFilter]);

  // Toggle Customer WhatsApp Consent
  const toggleConsent = async (customerId: number, currentConsent: boolean) => {
    if (!window.electronAPI) return;
    const newConsent = !currentConsent;
    await window.electronAPI.setWhatsAppConsent({ customerId, consent: newConsent });
    // Update local state
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, whatsapp_consent: newConsent } : c))
    );
  };

  // Dispatch Single Bill
  const handleSendSingleBill = async (item: typeof billItems[0], force: boolean = false) => {
    if (!window.electronAPI) return;
    if (!item.hasPhone) {
      alert(ur ? 'اس گاہک کا موبائل نمبر درست نہیں ہے!' : 'Customer has no valid WhatsApp number!');
      return;
    }

    const payload = {
      customerId: item.customer.id,
      customerName: item.customer.name,
      phone: item.customer.phone,
      billMonth: selectedMonth,
      monthLabel: selectedMonth,
      liters: item.row.liters,
      rate: item.row.rate,
      billAmount: item.row.bill,
      carry: 0,
      received: item.row.paid,
      payable: item.row.balance,
      whatsappConsent: item.customer.whatsapp_consent !== false,
    };

    try {
      const res = await window.electronAPI.sendWhatsAppSingleBill({
        item: payload,
        settings: billSettings,
        force,
      });

      if (res.success) {
        await loadData();
      } else if (res.duplicate) {
        if (confirm(ur ? 'یہ بل پہلے بھیجا جا چکا ہے۔ کیا آپ دوبارہ بھیجنا چاہتے ہیں؟' : 'This bill was already sent. Do you want to force resend?')) {
          await handleSendSingleBill(item, true);
        }
      } else {
        alert(res.error || (ur ? 'بل بھیجنے میں خرابی پیش آگئی' : 'Failed to send WhatsApp bill'));
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Dispatch error');
    }
  };

  // Batch Send All Bills
  const handleSendAllBills = async () => {
    const eligibleBills = billItems.filter(
      (b) =>
        b.hasPhone &&
        b.customer.whatsapp_consent !== false &&
        !['sent', 'delivered', 'read'].includes(b.status)
    );

    if (eligibleBills.length === 0) {
      alert(ur ? 'بھیجنے کے لیے کوئی نیا بل موجود نہیں ہے۔' : 'No pending eligible bills to send.');
      return;
    }

    const confirmMsg = ur
      ? `کیا آپ واقعی ${eligibleBills.length} گاہکوں کو ${selectedMonth} کا بل واٹس ایپ پر بھیجنا چاہتے ہیں؟`
      : `Are you sure you want to send bills to ${eligibleBills.length} customers for ${selectedMonth}?`;

    if (!confirm(confirmMsg)) return;

    setIsQueueRunning(true);
    setIsQueuePaused(false);
    setQueueProgress({
      total: eligibleBills.length,
      current: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });

    for (let i = 0; i < eligibleBills.length; i++) {
      const item = eligibleBills[i];

      const payload = {
        customerId: item.customer.id,
        customerName: item.customer.name,
        phone: item.customer.phone,
        billMonth: selectedMonth,
        monthLabel: selectedMonth,
        liters: item.row.liters,
        rate: item.row.rate,
        billAmount: item.row.bill,
        carry: 0,
        received: item.row.paid,
        payable: item.row.balance,
        whatsappConsent: true,
      };

      try {
        const res = await window.electronAPI!.sendWhatsAppSingleBill({
          item: payload,
          settings: billSettings,
        });

        setQueueProgress((prev) => ({
          ...prev,
          current: i + 1,
          sent: res.success ? prev.sent + 1 : prev.sent,
          failed: !res.success ? prev.failed + 1 : prev.failed,
        }));
      } catch {
        setQueueProgress((prev) => ({
          ...prev,
          current: i + 1,
          failed: prev.failed + 1,
        }));
      }

      // Small throttle delay
      await new Promise((r) => setTimeout(r, 250));
    }

    setIsQueueRunning(false);
    await loadData();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200" dir={ur ? 'rtl' : 'ltr'}>
      {/* Top Banner & Month Selector */}
      <div className="bg-[#081028] border border-blue-500/20 rounded-3xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              {ur ? 'واٹس ایپ ماہانہ بل ترسیل' : 'WhatsApp Monthly Bills'}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                Meta Cloud API
              </span>
            </h1>
            <p className="text-xs text-slate-300">
              {ur
                ? 'تمام گاہکوں کو آفیشل واٹس ایپ کلاؤڈ API کے ذریعے یوٹیلٹی ٹیمپلیٹ میں بل تصویر ارسال کریں'
                : 'Send approved Utility template bills with high-resolution bill card images via official Meta API'}
            </p>
          </div>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-[#050d24] border border-cyan-500/40 rounded-2xl px-3 py-1.5 shadow-inner">
            <span className="text-xs text-cyan-300 font-bold">{ur ? 'مہینہ:' : 'Month:'}</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-sm outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-[#081028] text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadData}
            className="p-2.5 rounded-2xl bg-[#0b1437] hover:bg-slate-800 border border-blue-500/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={ur ? 'ریفریش کریں' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={handleSendAllBills}
            disabled={isQueueRunning || metrics.pendingCount === 0}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{ur ? 'تمام بل ارسال کریں (Send All)' : 'Send All Bills'}</span>
          </button>
        </div>
      </div>

      {/* Meta API Status Bar */}
      {cloudStatus && (
        <div className="p-3.5 rounded-2xl bg-[#06143c] border border-cyan-400/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  cloudStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className={cloudStatus.connected ? 'text-emerald-300' : 'text-amber-300'}>
                {cloudStatus.connected
                  ? ur
                    ? 'Meta کلاؤڈ API منسلک ہے'
                    : 'Meta Cloud API Connected'
                  : ur
                  ? 'کلاؤڈ API کریڈینشلز درکار ہیں'
                  : 'API Credentials Required'}
              </span>
            </span>

            {cloudStatus.displayPhoneNumber && (
              <span className="text-slate-300 font-mono">
                {ur ? 'نمبر:' : 'Number:'} {cloudStatus.displayPhoneNumber}
              </span>
            )}
            {cloudStatus.verifiedName && (
              <span className="text-cyan-300 font-bold">({cloudStatus.verifiedName})</span>
            )}
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
            <span>
              {ur ? 'ٹیمپلیٹ اسٹیٹس:' : 'Template:'}{' '}
              <span className="text-emerald-400 font-bold uppercase">
                {cloudStatus.templateStatus || 'APPROVED'}
              </span>
            </span>
            {cloudStatus.qualityRating && (
              <span>
                {ur ? 'کوالٹی:' : 'Quality:'}{' '}
                <span className="text-cyan-300 font-bold">{cloudStatus.qualityRating}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-[#081028] border border-blue-500/20 rounded-2xl p-3 shadow-md">
          <div className="text-[11px] text-slate-400 font-medium">{ur ? 'کل گاہک' : 'Total Customers'}</div>
          <div className="text-2xl font-black text-white mt-1">{metrics.total}</div>
        </div>

        <div className="bg-[#081028] border border-blue-500/20 rounded-2xl p-3 shadow-md">
          <div className="text-[11px] text-emerald-400 font-medium">{ur ? 'درست فون نمبر' : 'Valid WhatsApp'}</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{metrics.validPhoneCount}</div>
        </div>

        <div className="bg-[#081028] border border-blue-500/20 rounded-2xl p-3 shadow-md">
          <div className="text-[11px] text-amber-400 font-medium">{ur ? 'بغیر نمبر کے' : 'Missing Phones'}</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{metrics.missingPhoneCount}</div>
        </div>

        <div className="bg-[#081028] border border-blue-500/20 rounded-2xl p-3 shadow-md">
          <div className="text-[11px] text-cyan-400 font-medium">{ur ? 'بھیجے جا چکے' : 'Already Sent'}</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">{metrics.alreadySent}</div>
        </div>

        <div className="bg-[#081028] border border-blue-500/20 rounded-2xl p-3 shadow-md">
          <div className="text-[11px] text-yellow-400 font-medium">{ur ? 'باقی بل' : 'Pending Bills'}</div>
          <div className="text-2xl font-black text-yellow-400 mt-1">{metrics.pendingCount}</div>
        </div>

        <div className="bg-[#081028] border border-blue-500/20 rounded-2xl p-3 shadow-md">
          <div className="text-[11px] text-rose-400 font-medium">{ur ? 'ناکام ترسیل' : 'Failed'}</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{metrics.failedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#081028] p-3 rounded-2xl border border-blue-500/20">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={ur ? 'گاہک کا نام یا فون نمبر تلاش کریں...' : 'Search customer or phone...'}
            className="w-full bg-[#050d24] border border-blue-500/20 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold overflow-x-auto w-full md:w-auto">
          {(['all', 'pending', 'sent', 'failed', 'missing-phone'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer capitalize ${
                statusFilter === filter
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'bg-[#050d24] text-slate-400 hover:text-white'
              }`}
            >
              {filter === 'all'
                ? ur
                  ? 'سب'
                  : 'All'
                : filter === 'pending'
                ? ur
                  ? 'باقی'
                  : 'Pending'
                : filter === 'sent'
                ? ur
                  ? 'ارسال شدہ'
                  : 'Sent'
                : filter === 'failed'
                ? ur
                  ? 'ناکام'
                  : 'Failed'
                : ur
                ? 'بغیر نمبر'
                : 'No Phone'}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-[#081028] rounded-3xl border border-blue-500/20 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#060e28] text-slate-300 font-bold border-b border-blue-500/20">
              <tr>
                <th className="p-3 text-center w-12">#</th>
                <th className="p-3">{ur ? 'گاہک' : 'Customer'}</th>
                <th className="p-3">{ur ? 'واٹس ایپ نمبر' : 'WhatsApp Number'}</th>
                <th className="p-3 text-center">{ur ? 'کل دودھ (L)' : 'Milk (L)'}</th>
                <th className="p-3 text-center">{ur ? 'ریٹ' : 'Rate'}</th>
                <th className="p-3 text-center">{ur ? 'بل رقم' : 'Bill'}</th>
                <th className="p-3 text-center">{ur ? 'کل واجب الادا' : 'Balance Due'}</th>
                <th className="p-3 text-center">{ur ? 'رضامندی (Consent)' : 'Consent'}</th>
                <th className="p-3 text-center">{ur ? 'اسٹیٹس' : 'Status'}</th>
                <th className="p-3 text-center">{ur ? 'ایکشن' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/10">
              {filteredItems.map((item, idx) => (
                <tr key={item.customer.id} className="hover:bg-blue-900/10 transition-colors">
                  <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-bold text-white">
                    <div>{item.customer.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{item.customer.address}</div>
                  </td>
                  <td className="p-3 font-mono">
                    {item.customer.phone ? (
                      <span className={item.hasPhone ? 'text-slate-200' : 'text-amber-400'}>
                        {item.customer.phone}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">{ur ? 'کوئی نمبر نہیں' : 'No number'}</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-bold text-cyan-300 font-mono">
                    {item.row.liters || 0} L
                  </td>
                  <td className="p-3 text-center font-mono text-slate-300">Rs. {item.row.rate}</td>
                  <td className="p-3 text-center font-mono text-slate-200">
                    Rs. {Math.round(item.row.bill).toLocaleString()}
                  </td>
                  <td className="p-3 text-center font-bold font-mono text-rose-300">
                    Rs. {Math.round(item.row.balance).toLocaleString()}
                  </td>
                  {/* WhatsApp Consent Toggle */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleConsent(item.customer.id, item.customer.whatsapp_consent !== false)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                        item.customer.whatsapp_consent !== false
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {item.customer.whatsapp_consent !== false ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3" /> Opt-In
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <X className="w-3 h-3" /> Opt-Out
                        </span>
                      )}
                    </button>
                  </td>
                  {/* Status Badge */}
                  <td className="p-3 text-center">
                    {item.status === 'read' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-400" /> Read
                      </span>
                    ) : item.status === 'delivered' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Delivered
                      </span>
                    ) : item.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        <Check className="w-3.5 h-3.5 text-blue-400" /> Sent
                      </span>
                    ) : item.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40" title={item.log?.error_message}>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Failed
                      </span>
                    ) : item.status === 'missing-phone' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                        No Phone
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </td>
                  {/* Action Buttons */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setPreviewCustomer({ customer: item.customer, row: item.row })}
                        className="p-1.5 rounded-lg bg-[#050d24] hover:bg-blue-600/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                        title={ur ? 'بل دیکھیں' : 'Preview Bill'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleSendSingleBill(item)}
                        disabled={!item.hasPhone || item.customer.whatsapp_consent === false}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          item.status === 'failed'
                            ? 'bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border-rose-500/40'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                        title={item.status === 'failed' ? (ur ? 'دوبارہ بھیجیں' : 'Retry') : (ur ? 'واٹس ایپ پر بھیجیں' : 'Send Bill')}
                      >
                        {item.status === 'failed' ? (
                          <RotateCcw className="w-3.5 h-3.5" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Preview Modal */}
      {previewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-[#050d24] rounded-3xl border border-cyan-500/40 max-w-[460px] w-full p-4 overflow-hidden shadow-2xl flex flex-col items-center">
            <div className="w-full flex justify-between items-center pb-3 border-b border-blue-500/20 text-white mb-3">
              <h3 className="font-bold text-sm">
                {ur ? 'ماہانہ بل پیش نظارہ' : 'Monthly Bill Preview'}
              </h3>
              <button
                onClick={() => setPreviewCustomer(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ModernBillCard
              customerId={previewCustomer.customer.id}
              customerName={previewCustomer.customer.name}
              phone={previewCustomer.customer.phone}
              monthLabel={previewCustomer.row.month}
              issueDateStr={new Date().toLocaleDateString(ur ? 'ur-PK' : 'en-GB')}
              rate={previewCustomer.row.rate}
              liters={previewCustomer.row.liters}
              bill={previewCustomer.row.bill}
              carry={0}
              received={previewCustomer.row.paid}
              payable={previewCustomer.row.balance}
              settings={
                billSettings || {
                  shop_title: 'قاری ظفر اقبال ملک شاپ',
                  owner_name: 'حافظ مصعب ظفر',
                  phone: '+92 321 0001168',
                  bank_name: 'میزان بینک',
                  account_title: 'حافظ مصعب ظفر',
                  account_number: '02090111954760',
                }
              }
              ur={ur}
            />

            <div className="w-full pt-4 flex gap-2">
              <button
                onClick={() => setPreviewCustomer(null)}
                className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
              >
                {ur ? 'بند کریں' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sending Queue Progress Overlay */}
      {isQueueRunning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#050d24] border-2 border-emerald-500/60 rounded-3xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(16,185,129,0.3)] text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                <Send className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-base">{ur ? 'بل ترسیل جاری ہے...' : 'Sending WhatsApp Bills...'}</h3>
                <p className="text-xs text-slate-400">
                  {ur ? 'کنٹرولڈ رفتار سے بل ارسال کیے جا رہے ہیں' : 'Sending via rate-limited queue'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono font-bold text-slate-300">
                <span>
                  {queueProgress.current} / {queueProgress.total}
                </span>
                <span>
                  {Math.round((queueProgress.current / Math.max(1, queueProgress.total)) * 100)}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/40 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((queueProgress.current / Math.max(1, queueProgress.total)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold pt-2">
              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                {ur ? 'کامیاب:' : 'Sent:'} {queueProgress.sent}
              </div>
              <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
                {ur ? 'ناکام:' : 'Failed:'} {queueProgress.failed}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
