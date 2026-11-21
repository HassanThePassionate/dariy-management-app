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
  QrCode,
  Trash2,
  Zap,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Sliders,
  Info,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  MonthlyRecordCustomer,
  MonthlyRecordRow,
  BillSettings,
  WhatsAppWebStatus,
  WhatsAppQueueProgress,
} from '../types/electron';
import { ModernBillCard } from './ModernBillCard';
import { buildUrduBillMessage } from '../../../main/whatsapp/messageTemplates';
import { computeNetUnpaidBreakdown } from '../utils/billingMath';

export const WhatsAppBillingView: React.FC = () => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  // Data Loading State
  const [loading, setLoading] = useState<boolean>(true);
  const [customers, setCustomers] = useState<MonthlyRecordCustomer[]>([]);
  const [billSettings, setBillSettings] = useState<BillSettings | null>(null);

  // WhatsApp Connection & QR State
  const [waStatus, setWaStatus] = useState<WhatsAppWebStatus | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Queue State
  const [queueStatus, setQueueStatus] = useState<WhatsAppQueueProgress | null>(null);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [speedPreset, setSpeedPreset] = useState<string>('safe_10m');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Month Selection
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  // Selection & Filters
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Preview Bill Modal
  const [previewCustomer, setPreviewCustomer] = useState<{
    customer: MonthlyRecordCustomer;
    row: MonthlyRecordRow;
  } | null>(null);

  // Single Bill Sending state
  const [sendingSingleId, setSendingSingleId] = useState<number | null>(null);

  // 1. Load Initial Data
  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const [recList, bSettings, curWaStatus, qStatus, qList] = await Promise.all([
        window.electronAPI.getMonthlyRecords(),
        window.electronAPI.getBillSettings(),
        window.electronAPI.getWhatsAppStatus(),
        window.electronAPI.getWhatsAppQueueStatus(),
        window.electronAPI.getWhatsAppQueueItems(selectedMonth),
      ]);

      setCustomers(recList || []);
      setBillSettings(bSettings);
      setWaStatus(curWaStatus);
      if (curWaStatus?.qrCodeDataUrl) {
        setQrCodeData(curWaStatus.qrCodeDataUrl);
      }
      setQueueStatus(qStatus);
      setQueueItems(qList || []);
    } catch (err) {
      console.error('[WhatsAppBillingView] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Real-time IPC Listeners
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubQR = window.electronAPI.onWhatsAppQR((qr) => {
      setQrCodeData(qr);
      setIsConnecting(false);
    });

    const unsubStatus = window.electronAPI.onWhatsAppStatus((status) => {
      setWaStatus(status);
      if (status.qrCodeDataUrl) {
        setQrCodeData(status.qrCodeDataUrl);
      } else if (status.connected) {
        setQrCodeData(null);
      }
      setIsConnecting(status.connecting);
    });

    const unsubProgress = window.electronAPI.onWhatsAppQueueProgress((progress) => {
      setQueueStatus(progress);
      // Reload queue items to reflect new statuses (sent, delivered, failed)
      window.electronAPI?.getWhatsAppQueueItems(selectedMonth).then((items) => {
        setQueueItems(items || []);
      });
    });

    return () => {
      unsubQR?.();
      unsubStatus?.();
      unsubProgress?.();
    };
  }, [selectedMonth]);

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

  // Map of queue items for the selected month by customerId
  const queueMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const item of queueItems) {
      if (item.customer_id) {
        map.set(item.customer_id, item);
      }
    }
    return map;
  }, [queueItems]);

  // Combined Bill Items
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
      const qItem = queueMap.get(c.id);

      let status: 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'missing-phone' | 'opted-out' = 'pending';
      if (!hasPhone) {
        status = 'missing-phone';
      } else if (c.whatsapp_consent === false) {
        status = 'opted-out';
      } else if (qItem) {
        status = qItem.status;
      }

      return {
        customer: c,
        row,
        hasPhone,
        status,
        qItem,
      };
    });
  }, [customers, selectedMonth, queueMap]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let validPhoneCount = 0;
    let missingPhoneCount = 0;
    let queuedCount = 0;
    let sendingCount = 0;
    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    for (const item of billItems) {
      if (!item.hasPhone) missingPhoneCount++;
      else validPhoneCount++;

      if (item.status === 'queued') queuedCount++;
      else if (item.status === 'sending') sendingCount++;
      else if (item.status === 'sent') sentCount++;
      else if (item.status === 'delivered' || item.status === 'read') deliveredCount++;
      else if (item.status === 'failed') failedCount++;
      else if (item.status === 'pending') pendingCount++;
    }

    return {
      total: billItems.length,
      validPhoneCount,
      missingPhoneCount,
      queuedCount,
      sendingCount,
      sentCount,
      deliveredCount,
      failedCount,
      pendingCount,
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
      if (statusFilter === 'queued') return item.status === 'queued';
      if (statusFilter === 'sending') return item.status === 'sending';
      if (statusFilter === 'sent') return item.status === 'sent';
      if (statusFilter === 'delivered') return ['delivered', 'read'].includes(item.status);
      if (statusFilter === 'failed') return item.status === 'failed';
      if (statusFilter === 'missing-phone') return !item.hasPhone;

      return true;
    });
  }, [billItems, searchQuery, statusFilter]);

  // Eligible bills for sending
  const eligibleBills = useMemo(() => {
    return billItems.filter(
      (b) =>
        b.hasPhone &&
        b.customer.whatsapp_consent !== false &&
        !['sent', 'delivered', 'read', 'queued', 'sending'].includes(b.status)
    );
  }, [billItems]);

  // Multi-Selection Logic
  const handleToggleSelect = (customerId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const isAllSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => !item.hasPhone || selectedIds.has(item.customer.id));

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allValid = new Set<number>();
      for (const item of filteredItems) {
        if (item.hasPhone && item.customer.whatsapp_consent !== false) {
          allValid.add(item.customer.id);
        }
      }
      setSelectedIds(allValid);
    }
  };

  // WhatsApp Connect / Disconnect Handlers
  const handleConnectWhatsApp = async () => {
    if (!window.electronAPI) return;
    setIsConnecting(true);
    setShowQrModal(true);
    try {
      const status = await window.electronAPI.connectWhatsApp();
      setWaStatus(status);
      if (status?.qrCodeDataUrl) {
        setQrCodeData(status.qrCodeDataUrl);
      }
    } catch (err) {
      console.error('Failed to trigger WhatsApp connect:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.electronAPI) return;
    if (
      !confirm(
        ur
          ? 'کیا آپ واقعی اس ڈیوائس سے واٹس ایپ منقطع (Disconnect) کرنا چاہتے ہیں؟'
          : 'Are you sure you want to disconnect WhatsApp from this computer?'
      )
    )
      return;

    try {
      const status = await window.electronAPI.disconnectWhatsApp();
      setWaStatus(status);
      setQrCodeData(null);
      setShowQrModal(false);
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  // Toggle Customer WhatsApp Consent
  const toggleConsent = async (customerId: number, currentConsent: boolean) => {
    if (!window.electronAPI) return;
    const newConsent = !currentConsent;
    await window.electronAPI.setWhatsAppConsent({ customerId, consent: newConsent });
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, whatsapp_consent: newConsent } : c))
    );
  };

  // Dispatch Single Bill Directly
  const handleSendSingleBillDirect = async (item: typeof billItems[0]) => {
    if (!window.electronAPI) return;
    if (!waStatus?.connected) {
      setShowQrModal(true);
      return;
    }
    if (!item.hasPhone) {
      alert(ur ? 'اس گاہک کا موبائل نمبر درست نہیں ہے!' : 'Customer has no valid WhatsApp number!');
      return;
    }

    setSendingSingleId(item.customer.id);

    const rowCarry = item.row.carry ?? Math.max(0, (item.row.balance || 0) + (item.row.paid || 0) - (item.row.bill || 0));
    const netBill = computeNetUnpaidBreakdown({
      liters: item.row.liters,
      rate: item.row.rate,
      bill: item.row.bill,
      carry: rowCarry,
      alreadyPaid: item.row.paid,
    });

    const payload = {
      customerId: item.customer.id,
      customerName: item.customer.name,
      phone: item.customer.phone,
      billMonth: selectedMonth,
      monthLabel: selectedMonth,
      liters: netBill.liters,
      rate: item.row.rate,
      billAmount: netBill.bill,
      carry: netBill.carry,
      received: netBill.received,
      payable: netBill.payable,
      accountNumber: billSettings?.account_number || '02090111954760',
      whatsappConsent: item.customer.whatsapp_consent !== false,
    };

    try {
      const res = await window.electronAPI.sendSingleBillDirect({
        item: payload,
        settings: billSettings,
      });

      if (res.success) {
        await loadData();
      } else {
        alert(res.error || (ur ? 'بل بھیجنے میں خرابی پیش آگئی' : 'Failed to send WhatsApp bill'));
      }
    } catch (err: any) {
      alert(err.message || 'Dispatch error');
    } finally {
      setSendingSingleId(null);
    }
  };

  // Enqueue Selected Bills or All Pending Bills
  const handleOpenSendAllModal = () => {
    if (!waStatus?.connected) {
      setShowQrModal(true);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmEnqueue = async () => {
    if (!window.electronAPI) return;

    // Pick selected contacts if any selected, otherwise all eligible
    const targetBills =
      selectedIds.size > 0
        ? billItems.filter((b) => selectedIds.has(b.customer.id) && b.hasPhone)
        : eligibleBills;

    if (targetBills.length === 0) {
      alert(ur ? 'بھیجنے کے لیے کوئی گاہک منتخب نہیں ہے۔' : 'No customers selected to send.');
      return;
    }

    const payloads = targetBills.map((b) => {
      const rowCarry = b.row.carry ?? Math.max(0, (b.row.balance || 0) + (b.row.paid || 0) - (b.row.bill || 0));
      const netBill = computeNetUnpaidBreakdown({
        liters: b.row.liters,
        rate: b.row.rate,
        bill: b.row.bill,
        carry: rowCarry,
        alreadyPaid: b.row.paid,
      });
      return {
        customerId: b.customer.id,
        customerName: b.customer.name,
        phone: b.customer.phone,
        billMonth: selectedMonth,
        monthLabel: selectedMonth,
        liters: netBill.liters,
        rate: b.row.rate,
        billAmount: netBill.bill,
        carry: netBill.carry,
        received: netBill.received,
        payable: netBill.payable,
        accountNumber: billSettings?.account_number || '02090111954760',
        whatsappConsent: b.customer.whatsapp_consent !== false,
      };
    });

    try {
      const res = await window.electronAPI.enqueueWhatsAppBills({
        items: payloads,
        speedPreset: speedPreset,
        force: false,
      });

      setShowConfirmModal(false);
      setSelectedIds(new Set());
      await loadData();

      alert(
        ur
          ? `کامیابی! ${res.enqueued} گاہکوں کے بل قطار (Queue) میں شامل ہو گئے ہیں اور محفوظ رفتار سے بھیجے جا رہے ہیں۔`
          : `Success! ${res.enqueued} bills enqueued and sending safely in the background.`
      );
    } catch (err: any) {
      alert(err.message || 'Enqueue error');
    }
  };

  // Queue Control Handlers
  const handlePauseQueue = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.pauseWhatsAppQueue();
    await loadData();
  };

  const handleResumeQueue = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.resumeWhatsAppQueue();
    await loadData();
  };

  const handleClearQueue = async () => {
    if (!window.electronAPI) return;
    if (
      !confirm(
        ur
          ? 'کیا آپ واقعی موجودہ قطار سے تمام زیر التواء بل منسوخ کرنا چاہتے ہیں؟'
          : 'Are you sure you want to clear all remaining queued messages?'
      )
    )
      return;

    await window.electronAPI.clearWhatsAppQueue({ month: selectedMonth });
    await loadData();
  };

  const handleRetryFailed = async () => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.retryFailedWhatsAppQueue({ month: selectedMonth });
    alert(
      ur
        ? `${res.retried} ناکام پیغامات کو دوبارہ قطار میں شامل کر دیا گیا ہے۔`
        : `${res.retried} failed messages re-enqueued.`
    );
    await loadData();
  };

  // Format Countdown Seconds to MM:SS
  const formatCountdown = (totalSec: number) => {
    if (totalSec <= 0) return '00:00';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const targetCountForSendAll =
    selectedIds.size > 0 ? selectedIds.size : eligibleBills.length;

  return (
    <div className="space-y-5 animate-in fade-in duration-200" dir={ur ? 'rtl' : 'ltr'}>
      {/* 1. Header & Primary Action Bar */}
      <div className="bg-[#081028] border border-blue-500/20 rounded-3xl p-5 shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Title & Branding */}
        <div className="flex items-center gap-3.5 w-full lg:w-auto">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)] shrink-0">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              {ur ? 'واٹس ایپ بلنگ و میسجنگ سسٹم' : 'WhatsApp Billing & Queue'}
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {ur ? 'کیو آر کنکشن' : 'QR Linked'}
              </span>
            </h1>
            <p className="text-xs text-slate-300">
              {ur
                ? 'اپنے موبائل سے کیو آر کوڈ اسکین کر کے منسلک کریں اور محفوظ رفتار سے خودکار بل تصویر ارسال کریں'
                : 'Connect via QR scan and dispatch monthly bill image cards through safe anti-ban rate limiting'}
            </p>
          </div>
        </div>

        {/* Action Controls & Send All Button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-[#050d24] border border-cyan-500/40 rounded-2xl px-3 py-1.5 shadow-inner">
            <span className="text-xs text-cyan-300 font-bold">{ur ? 'مہینہ:' : 'Month:'}</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-xs outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-[#081028] text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* WhatsApp Connection Button */}
          <button
            onClick={() => setShowQrModal(true)}
            className={`px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${
              waStatus?.connected
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/40 animate-pulse'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>
              {waStatus?.connected
                ? `${ur ? 'منسلک:' : 'Connected:'} ${waStatus.phone || 'WhatsApp'}`
                : ur
                ? 'واٹس ایپ جوڑیں (QR)'
                : 'Link WhatsApp (QR)'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                waStatus?.connected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            className="p-2.5 rounded-2xl bg-[#0b1437] hover:bg-slate-800 border border-blue-500/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={ur ? 'ریفریش کریں' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* PROMINENT SEND ALL BUTTON */}
          <button
            onClick={handleOpenSendAllModal}
            disabled={targetCountForSendAll === 0}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs transition-all shadow-[0_0_25px_rgba(16,185,129,0.45)] hover:shadow-[0_0_35px_rgba(16,185,129,0.65)] hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
          >
            <Send className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>
              {ur
                ? `تمام بل بھیجیں (${targetCountForSendAll} گاہک)`
                : `Send All (${targetCountForSendAll} Bills)`}
            </span>
          </button>
        </div>
      </div>

      {/* 2. LIVE QUEUE PROGRESS BANNER (Shows when queue is running or has items) */}
      {queueStatus && (queueStatus.isRunning || queueStatus.queued > 0 || queueStatus.isPaused) && (
        <div className="bg-gradient-to-r from-[#041d24] via-[#062c35] to-[#041d24] border-2 border-emerald-500/50 rounded-3xl p-5 shadow-[0_0_35px_rgba(16,185,129,0.25)] text-white space-y-4 animate-in fade-in">
          {/* Top Bar of Queue Banner */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                {queueStatus.isPaused ? (
                  <Pause className="w-5 h-5 text-amber-400" />
                ) : (
                  <Send className="w-5 h-5 animate-pulse text-emerald-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-white">
                    {queueStatus.isPaused
                      ? ur
                        ? 'قطار روکی ہوئی ہے (Queue Paused)'
                        : 'Queue Paused'
                      : ur
                      ? 'بلوں کی ترسیل جاری ہے (Queue Active)'
                      : 'Sending Bills via Safe Queue'}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      queueStatus.isPaused
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    }`}
                  >
                    {queueStatus.isPaused ? (ur ? 'روکا ہوا' : 'Paused') : (ur ? 'فعال' : 'Active')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {ur
                    ? 'اینٹی بین پروٹیکشن: ہر 10 منٹ بعد 1 پیغام قدرتی رفتار سے روانہ ہو رہا ہے'
                    : 'Safe anti-ban pacing: 1 message sent every ~10 minutes'}
                </p>
              </div>
            </div>

            {/* Queue Action Controls */}
            <div className="flex items-center gap-2">
              {queueStatus.isPaused ? (
                <button
                  onClick={handleResumeQueue}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{ur ? 'جاری رکھیں (Resume)' : 'Resume'}</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseQueue}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>{ur ? 'روکیں (Pause)' : 'Pause'}</span>
                </button>
              )}

              {queueStatus.failed > 0 && (
                <button
                  onClick={handleRetryFailed}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title={ur ? 'تمام ناکام پیغامات دوبارہ بھیجیں' : 'Retry all failed'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{ur ? `ناکام (${queueStatus.failed}) دوبارہ` : `Retry (${queueStatus.failed})`}</span>
                </button>
              )}

              <button
                onClick={handleClearQueue}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
                title={ur ? 'باقی قطار ختم کریں' : 'Clear remaining queue'}
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{ur ? 'قطار ختم کریں' : 'Clear Queue'}</span>
              </button>
            </div>
          </div>

          {/* Progress Bar & Countdown Info */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between text-xs font-mono font-bold text-slate-200">
              <span className="flex items-center gap-2">
                <span>
                  {ur ? 'پیش رفت:' : 'Progress:'}{' '}
                  <span className="text-emerald-400 font-black">
                    {queueStatus.sent + queueStatus.delivered}
                  </span>{' '}
                  / {queueStatus.total} بل
                </span>
                {queueStatus.currentCustomerName && (
                  <span className="text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md font-sans">
                    {ur ? 'بھیجا جا رہا ہے:' : 'Sending:'} {queueStatus.currentCustomerName}
                  </span>
                )}
              </span>

              {queueStatus.isRunning && queueStatus.nextSendInSeconds > 0 && (
                <span className="flex items-center gap-1.5 text-amber-300 bg-amber-950/40 border border-amber-500/40 px-2.5 py-1 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>
                    {ur ? 'اگلا پیغام:' : 'Next send in:'}{' '}
                    <span className="font-mono font-black text-amber-200">
                      {formatCountdown(queueStatus.nextSendInSeconds)}
                    </span>
                  </span>
                </span>
              )}
            </div>

            {/* Visual Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/40 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((queueStatus.sent + queueStatus.delivered) /
                        Math.max(1, queueStatus.total)) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Status Breakdown Counters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1 text-center font-bold text-xs">
            <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300">
              {ur ? 'قطار میں (Queued):' : 'Queued:'} {queueStatus.queued}
            </div>
            <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
              {ur ? 'بھیجے گئے (Sent ✓):' : 'Sent:'} {queueStatus.sent}
            </div>
            <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
              {ur ? 'پہنچ گئے (Delivered ✓✓):' : 'Delivered:'} {queueStatus.delivered}
            </div>
            <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
              {ur ? 'ناکام (Failed ✗):' : 'Failed:'} {queueStatus.failed}
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
              {ur ? 'تخمینہ وقت:' : 'Est. Time:'} ~{Math.round(queueStatus.estimatedCompletionMinutes / 60)} {ur ? 'گھنٹے' : 'hrs'}
            </div>
          </div>
        </div>
      )}

      {/* 3. KPI Metric Summary Cards */}
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
          <div className="text-[11px] text-amber-400 font-medium">{ur ? 'قطار میں' : 'In Queue'}</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{metrics.queuedCount}</div>
        </div>

        <div className="bg-[#081028] border border-blue-500/20 rounded-2xl p-3 shadow-md">
          <div className="text-[11px] text-cyan-400 font-medium">{ur ? 'بھیجے جا چکے' : 'Sent & Delivered'}</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            {metrics.sentCount + metrics.deliveredCount}
          </div>
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

      {/* 4. Filter and Search Bar */}
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
          {[
            { id: 'all', label: ur ? 'سب' : 'All' },
            { id: 'pending', label: ur ? 'زیر التواء' : 'Pending' },
            { id: 'queued', label: ur ? 'قطار میں' : 'Queued' },
            { id: 'sent', label: ur ? 'ارسال شدہ' : 'Sent' },
            { id: 'delivered', label: ur ? 'پہنچ گیا' : 'Delivered' },
            { id: 'failed', label: ur ? 'ناکام' : 'Failed' },
            { id: 'missing-phone', label: ur ? 'بغیر نمبر' : 'No Phone' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer capitalize shrink-0 ${
                statusFilter === f.id
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'bg-[#050d24] text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Customer Bills Table with Multi-Select and Live Tracking */}
      <div className="bg-[#081028] rounded-3xl border border-blue-500/20 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#060e28] text-slate-300 font-bold border-b border-blue-500/20">
              <tr>
                <th className="p-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAllToggle}
                    className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                    title={ur ? 'تمام منتخب کریں' : 'Select All'}
                  />
                </th>
                <th className="p-3 text-center w-12">#</th>
                <th className="p-3">{ur ? 'گاہک کا نام و تفصیل' : 'Customer'}</th>
                <th className="p-3">{ur ? 'واٹس ایپ نمبر' : 'WhatsApp Number'}</th>
                <th className="p-3 text-center">{ur ? 'کل دودھ (L)' : 'Milk (L)'}</th>
                <th className="p-3 text-center">{ur ? 'ریٹ' : 'Rate'}</th>
                <th className="p-3 text-center">{ur ? 'بل رقم' : 'Bill'}</th>
                <th className="p-3 text-center">{ur ? 'کل واجب الادا' : 'Balance Due'}</th>
                <th className="p-3 text-center">{ur ? 'رضامندی' : 'Consent'}</th>
                <th className="p-3 text-center">{ur ? 'اسٹیٹس' : 'Status'}</th>
                <th className="p-3 text-center">{ur ? 'ایکشن' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/10">
              {filteredItems.map((item, idx) => {
                const isSelected = selectedIds.has(item.customer.id);
                const isSendingNow = sendingSingleId === item.customer.id;

                return (
                  <tr
                    key={item.customer.id}
                    className={`hover:bg-blue-900/15 transition-colors ${
                      isSelected ? 'bg-emerald-950/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!item.hasPhone || item.customer.whatsapp_consent === false}
                        onChange={() => handleToggleSelect(item.customer.id)}
                        className="w-4 h-4 rounded cursor-pointer accent-emerald-500 disabled:opacity-30"
                      />
                    </td>

                    <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>

                    <td className="p-3 font-bold text-white">
                      <div>{item.customer.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {item.customer.address || `اکاؤنٹ #${item.customer.id}`}
                      </div>
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
                        onClick={() =>
                          toggleConsent(item.customer.id, item.customer.whatsapp_consent !== false)
                        }
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                          item.customer.whatsapp_consent !== false
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {item.customer.whatsapp_consent !== false ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Opt-In
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <X className="w-2.5 h-2.5" /> Opt-Out
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Delivery Status Badge */}
                    <td className="p-3 text-center">
                      {item.status === 'read' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{ur ? 'پڑھ لیا ✓✓' : 'Read'}</span>
                        </span>
                      ) : item.status === 'delivered' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{ur ? 'پہنچ گیا ✓✓' : 'Delivered'}</span>
                        </span>
                      ) : item.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          <Check className="w-3.5 h-3.5 text-blue-400" />
                          <span>{ur ? 'بھیج دیا گیا ✓' : 'Sent'}</span>
                        </span>
                      ) : item.status === 'sending' || isSendingNow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                          <span>{ur ? 'بھیجا جا رہا ہے...' : 'Sending...'}</span>
                        </span>
                      ) : item.status === 'queued' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{ur ? 'قطار میں' : 'Queued'}</span>
                        </span>
                      ) : item.status === 'failed' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          title={item.qItem?.error_message || 'Delivery error'}
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>{ur ? 'ناکام' : 'Failed'}</span>
                        </span>
                      ) : item.status === 'missing-phone' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                          {ur ? 'بغیر نمبر' : 'No Phone'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                          <Clock className="w-3 h-3" />
                          <span>{ur ? 'زیر التواء' : 'Pending'}</span>
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Preview Bill */}
                        <button
                          onClick={() =>
                            setPreviewCustomer({ customer: item.customer, row: item.row })
                          }
                          className="p-1.5 rounded-lg bg-[#050d24] hover:bg-blue-600/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                          title={ur ? 'بل دیکھیں' : 'Preview Bill'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Direct Send Now Button */}
                        <button
                          onClick={() => handleSendSingleBillDirect(item)}
                          disabled={
                            !item.hasPhone ||
                            item.customer.whatsapp_consent === false ||
                            isSendingNow
                          }
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            item.status === 'failed'
                              ? 'bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border-rose-500/40'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border-emerald-500/40'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                          title={
                            item.status === 'failed'
                              ? ur
                                ? 'دوبارہ ابھی بھیجیں'
                                : 'Retry Send'
                              : ur
                              ? 'ابھی واٹس ایپ کریں'
                              : 'Send Now'
                          }
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. WHATSAPP QR CODE CONNECTION MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#050d24] border-2 border-emerald-500/60 rounded-3xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(16,185,129,0.35)] text-white space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {ur ? 'واٹس ایپ کیو آر کوڈ کنکشن' : 'WhatsApp QR Code Link'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {ur
                      ? 'موبائل سے اسکین کر کے سسٹم سے براہِ راست میسج بھیجیں'
                      : 'Scan QR with your phone to enable instant system dispatch'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Connection State Display */}
            {waStatus?.connected ? (
              // Connected Screen
              <div className="space-y-4 text-center py-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-emerald-300">
                    {ur ? 'واٹس ایپ کامیابی سے منسلک ہے!' : 'WhatsApp Successfully Connected!'}
                  </h4>
                  <p className="text-sm font-mono text-white mt-1">
                    {waStatus.phone} ({waStatus.name || 'قاری ظفر ملک شاپ'})
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {ur
                      ? 'آپ کا اکاؤنٹ سسٹم کے ساتھ جڑا ہوا ہے۔ تمام بل اور تصاویر اس نمبر سے جائیں گی۔'
                      : 'Your device is linked. Bills will be dispatched from this WhatsApp account.'}
                  </p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    {ur ? 'ٹھیک ہے (Done)' : 'Done'}
                  </button>
                  <button
                    onClick={handleDisconnectWhatsApp}
                    className="py-2.5 px-4 rounded-2xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {ur ? 'منقطع کریں (Disconnect)' : 'Disconnect'}
                  </button>
                </div>
              </div>
            ) : (
              // QR Code Scanning Screen
              <div className="space-y-4">
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner mx-auto w-64 h-64 border-2 border-emerald-400">
                  {qrCodeData ? (
                    <img
                      src={qrCodeData}
                      alt="WhatsApp QR Code"
                      className="w-56 h-56 object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-800">
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                      <span className="text-xs font-bold text-slate-600">
                        {ur ? 'کیو آر کوڈ لوڈ ہو رہا ہے...' : 'Generating QR Code...'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="bg-[#081230] p-3.5 rounded-2xl border border-blue-500/20 text-xs space-y-2">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <span>{ur ? 'کنیکٹ کرنے کا طریقہ کار:' : 'How to connect:'}</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                    <li>{ur ? 'اپنے فون پر واٹس ایپ کھولیں۔' : 'Open WhatsApp on your phone'}</li>
                    <li>
                      {ur
                        ? 'مینیو (⋮) یا سیٹنگز (Settings) پر ٹیپ کریں۔'
                        : 'Tap Menu (⋮) or Settings'}
                    </li>
                    <li>
                      {ur
                        ? 'لنکڈ ڈیوائسز (Linked Devices) منتخب کریں۔'
                        : 'Select Linked Devices'}
                    </li>
                    <li>
                      {ur
                        ? '"Link a Device" پر کلک کر کے یہ کوڈ اسکین کریں۔'
                        : 'Tap "Link a Device" and scan this QR code'}
                    </li>
                  </ol>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={handleConnectWhatsApp}
                    disabled={isConnecting}
                    className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                    <span>{ur ? 'نیا QR کوڈ حاصل کریں' : 'Refresh QR Code'}</span>
                  </button>
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="py-2.5 px-4 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
                  >
                    {ur ? 'بند کریں' : 'Close'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. SAFE QUEUE CONFIRMATION MODAL (Send All) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#050d24] border-2 border-emerald-500/60 rounded-3xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(16,185,129,0.35)] text-white space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-emerald-500/20">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg">
                  {ur ? 'بلوں کی قطار شروع کریں (Confirm Queue)' : 'Start Dispatch Queue'}
                </h3>
                <p className="text-xs text-slate-300">
                  {ur
                    ? 'تمام منتخب گاہکوں کو خودکار قطار کے ذریعے محفوظ رفتار سے بھیجیں'
                    : 'Dispatch selected bills smoothly through safe anti-ban rate limiting'}
                </p>
              </div>
            </div>

            {/* Summary Highlights */}
            <div className="bg-[#081230] p-4 rounded-2xl border border-blue-500/20 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{ur ? 'کل وصول کنندگان:' : 'Recipients:'}</span>
                <span className="text-emerald-300 font-black font-mono text-sm">
                  {targetCountForSendAll} {ur ? 'گاہک' : 'Customers'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{ur ? 'ماہانہ بل:' : 'Bill Month:'}</span>
                <span className="text-cyan-300 font-bold font-mono">{selectedMonth}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{ur ? 'پیغام کا طریقہ:' : 'Format:'}</span>
                <span className="text-emerald-300 font-bold">
                  {ur ? 'صرف ایچ ڈی بل کارڈ تصویر (بغیر لمبا میسج)' : 'Only HD Bill Card Image'}
                </span>
              </div>
            </div>

            {/* Speed Preset Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>{ur ? 'ترسیل کی رفتار کا انتخاب (Speed Preset):' : 'Select Queue Speed:'}</span>
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSpeedPreset('safe_10m')}
                  className={`p-3 rounded-2xl border text-right cursor-pointer transition-all ${
                    speedPreset === 'safe_10m'
                      ? 'bg-emerald-950/50 border-emerald-400 text-white shadow-md'
                      : 'bg-[#081230] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-black text-emerald-300">
                    {ur ? 'محفوظ ترین (تجویز کردہ)' : 'Ultra-Safe (Recommended)'}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1">
                    {ur
                      ? 'ہر ~10 منٹ بعد 1 بل (200 بل 1.5 دن میں) - زیرو بین رسک'
                      : '1 msg / 10 mins (200 bills in ~1.5 days)'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSpeedPreset('safe_6m')}
                  className={`p-3 rounded-2xl border text-right cursor-pointer transition-all ${
                    speedPreset === 'safe_6m'
                      ? 'bg-emerald-950/50 border-emerald-400 text-white shadow-md'
                      : 'bg-[#081230] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-black text-cyan-300">
                    {ur ? 'معیاری رفتار (10 فی گھنٹہ)' : 'Standard (10 msgs/hr)'}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1">
                    {ur ? 'ہر ~6 منٹ بعد 1 بل (200 بل ~20 گھنٹے میں)' : '1 msg / 6 mins (~20 hours total)'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSpeedPreset('moderate')}
                  className={`p-3 rounded-2xl border text-right cursor-pointer transition-all ${
                    speedPreset === 'moderate'
                      ? 'bg-emerald-950/50 border-emerald-400 text-white shadow-md'
                      : 'bg-[#081230] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-black text-amber-300">
                    {ur ? 'معتدل رفتار (Moderate)' : 'Moderate'}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1">
                    {ur ? 'ہر ~3.5 منٹ بعد 1 بل (200 بل ~12 گھنٹے میں)' : '1 msg / 3.5 mins (~12 hours total)'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSpeedPreset('test')}
                  className={`p-3 rounded-2xl border text-right cursor-pointer transition-all ${
                    speedPreset === 'test'
                      ? 'bg-emerald-950/50 border-emerald-400 text-white shadow-md'
                      : 'bg-[#081230] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-black text-rose-300">
                    {ur ? 'ٹیسٹ موڈ (فوری چیک)' : 'Test Mode'}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1">
                    {ur ? 'ہر 20 سیکنڈ بعد (صرف ٹیسٹنگ کے لیے)' : '1 msg / 20 seconds (Testing only)'}
                  </div>
                </button>
              </div>
            </div>

            {/* Anti-Ban Assurance Box */}
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-200">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                {ur
                  ? 'یہ سسٹم واٹس ایپ کے اسپام رولز کو مدنظر رکھتے ہوئے پیغامات کے درمیان قدرتی وقفہ (Jitter) اور ٹائپنگ اسٹیٹس شامل کرتا ہے تاکہ آپ کا اکاؤنٹ محفوظ رہے۔'
                  : 'System uses human-like pauses and typing indicators to adhere to WhatsApp usage policies and protect your account.'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmEnqueue}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg cursor-pointer"
              >
                {ur ? 'ابھی قطار شروع کریں (Start Queue)' : 'Start Queue'}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="py-3 px-5 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
              >
                {ur ? 'منسوخ کریں' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. BILL PREVIEW MODAL */}
      {previewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-4 overflow-y-auto">
          <div className="bg-[#050d24] rounded-3xl border-2 border-emerald-500/50 max-w-[820px] w-full p-4 md:p-5 overflow-hidden shadow-2xl flex flex-col items-center space-y-4">
            <div className="w-full flex justify-between items-center pb-3 border-b border-emerald-500/20 text-white">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm">
                  {ur ? 'ماہانہ بل کارڈ تصویر پیش نظارہ' : 'Monthly Bill Image Preview'}
                </h3>
              </div>
              <button
                onClick={() => setPreviewCustomer(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Card Render */}
            <div className="w-full flex justify-center overflow-x-auto py-2">
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
                    shop_title: 'قاری ظفر ملک شاپ',
                    owner_name: 'حافظ مصعب ظفر',
                    phone: '+92 321 0001168',
                    bank_name: 'میزان بینک',
                    account_title: 'حافظ مصعب ظفر',
                    account_number: '02090111954760',
                  }
                }
                accountNumber={billSettings?.account_number || '02090111954760'}
                bankName={billSettings?.bank_name || 'میزان بینک'}
                accountTitle={billSettings?.account_title || 'حافظ مصعب ظفر'}
                ur={ur}
              />
            </div>

            {/* Modal Actions */}
            <div className="w-full flex gap-3 pt-2">
              <button
                onClick={async () => {
                  const item = billItems.find((b) => b.customer.id === previewCustomer.customer.id);
                  if (item) {
                    await handleSendSingleBillDirect(item);
                    setPreviewCustomer(null);
                  }
                }}
                disabled={!isValidPhone(previewCustomer.customer.phone)}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                <span>{ur ? 'یہ بل تصویر ابھی واٹس ایپ کریں' : 'Send This Bill Image Now'}</span>
              </button>
              <button
                onClick={() => setPreviewCustomer(null)}
                className="py-2.5 px-6 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
              >
                {ur ? 'بند کریں' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
