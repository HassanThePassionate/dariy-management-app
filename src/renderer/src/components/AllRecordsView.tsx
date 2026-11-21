import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Footprints,
  CalendarDays,
  Send,
  FileText,
  X,
  Printer,
  CheckCircle2,
  Filter,
  CreditCard,
  Save,
  Check,
  QrCode,
  AlertCircle,
  Loader2,
  Edit,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  MonthlyRecordCustomer,
  MonthlyRecordRow,
  SaleItem,
  BillSettings,
  WhatsAppWebStatus,
} from '../types/electron';
import { ModernBillCard } from './ModernBillCard';
import { ModernReceiptCard } from './ModernReceiptCard';
import { WhatsAppQrModal } from './WhatsAppQrModal';
import { computeNetUnpaidBreakdown } from '../utils/billingMath';

type Tab = 'monthly' | 'walkin';

const money = (n: number) => Math.round(n).toLocaleString('en-US');
const qty = (n: number) => String(Number(n.toFixed(2)));

const waNumber = (raw: string) => {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '92' + d.slice(1);
  return d;
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

const monthLabel = (m: string, ur: boolean) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString(ur ? 'ur-PK' : 'en-GB', { month: 'long', year: 'numeric' });
};

export const AllRecordsView: React.FC = () => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [tab, setTab] = useState<Tab>('monthly');
  const [search, setSearch] = useState('');
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRecordCustomer[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [monthFilter, setMonthFilter] = useState('All');
  const [billFor, setBillFor] = useState<{ customer: MonthlyRecordCustomer; row: MonthlyRecordRow } | null>(null);
  const [cardMode, setCardMode] = useState<'bill' | 'receipt'>('bill');
  const [billSettings, setBillSettings] = useState<BillSettings | null>(null);
  const [showAccountEditor, setShowAccountEditor] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

  // WhatsApp Baileys State
  const [waStatus, setWaStatus] = useState<WhatsAppWebStatus | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isConnectingWa, setIsConnectingWa] = useState<boolean>(false);

  // Single WhatsApp sending state
  const [sendingSingleId, setSendingSingleId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Editing Month Record State
  const [editingRecord, setEditingRecord] = useState<{
    customerId: number;
    customerName: string;
    month: string;
    liters: number;
    rate: number;
    paid: number;
    carry: number;
  } | null>(null);
  const [editLiters, setEditLiters] = useState<string>('0');
  const [editRate, setEditRate] = useState<string>('0');
  const [editPaid, setEditPaid] = useState<string>('0');
  const [editCarry, setEditCarry] = useState<string>('0');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const openEditModal = (customer: MonthlyRecordCustomer, row: MonthlyRecordRow) => {
    setEditingRecord({
      customerId: customer.id,
      customerName: customer.name,
      month: row.month,
      liters: row.liters,
      rate: row.rate,
      paid: row.paid,
      carry: row.carry ?? 0,
    });
    setEditLiters(String(row.liters));
    setEditRate(String(row.rate));
    setEditPaid(String(row.paid));
    setEditCarry(String(row.carry ?? 0));
  };

  const handleSaveMonthlyEdit = async () => {
    if (!editingRecord || !window.electronAPI) return;
    setIsSavingEdit(true);
    try {
      const { customerId, month } = editingRecord;
      const newLiters = Number(editLiters);
      const newRate = Number(editRate);
      const newPaid = Number(editPaid);
      const newCarry = Number(editCarry);

      // 1. If liters changed, update month liters
      if (Number.isFinite(newLiters) && newLiters >= 0 && Math.abs(newLiters - editingRecord.liters) > 0.001) {
        if (window.electronAPI.setKhataMonthLiters) {
          await window.electronAPI.setKhataMonthLiters({ customerId, month, liters: newLiters });
        }
      }

      // 2. If rate changed, update customer month rate
      if (Number.isFinite(newRate) && newRate > 0) {
        if (window.electronAPI.setKhataRate) {
          await window.electronAPI.setKhataRate({ customerId, month, rate: newRate });
        }
      }

      // 3. Update paid amount
      if (Number.isFinite(newPaid)) {
        await window.electronAPI.setKhataReceived({ customerId, month, amount: newPaid });
      }

      // 4. Update previous arrears / opening override if modified
      if (Number.isFinite(newCarry)) {
        await window.electronAPI.setKhataPrevious({ customerId, month, amount: newCarry });
      }

      showToast('success', ur ? 'ماہانہ ریکارڈ کامیابی کے ساتھ اپ ڈیٹ ہو گیا ہے' : 'Monthly record updated successfully');
      setEditingRecord(null);
      await loadInitialData();
      window.dispatchEvent(new Event('dairy-data-changed'));
    } catch (err: any) {
      console.error('Failed to update monthly record:', err);
      showToast('error', err?.message || (ur ? 'اپ ڈیٹ کرنے میں خرابی پیش آئی' : 'Failed to update record'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const saveCustomAccount = async () => {
    if (!billSettings) return;
    try {
      await window.electronAPI.saveBillSettings(billSettings);
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2500);
      showToast('success', ur ? 'بینک اکاؤنٹ تفصیلات محفوظ ہو گئیں' : 'Account details saved');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast('error', ur ? 'سیٹنگز محفوظ کرنے میں غلطی ہوئی' : 'Failed to save settings');
    }
  };

  // 1. Initial Data Loading
  const loadInitialData = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const [s, m, bs, curWa] = await Promise.all([
        window.electronAPI.getPosSales(),
        window.electronAPI.getMonthlyRecords(),
        window.electronAPI.getBillSettings().catch(() => null),
        window.electronAPI.getWhatsAppStatus().catch(() => null),
      ]);
      setSales(s || []);
      setMonthly(m || []);
      if (bs) setBillSettings(bs);
      if (curWa) {
        setWaStatus(curWa);
        if (curWa.qrCodeDataUrl) setQrCodeData(curWa.qrCodeDataUrl);
      }
    } catch (err) {
      console.error('Failed to load records:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Real-time WhatsApp IPC Listeners
  useEffect(() => {
    if (!window.electronAPI) return;

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
        showToast('success', ur ? 'واٹس ایپ کامیابی کے ساتھ منسلک ہو گیا ہے!' : 'WhatsApp Connected!');
      }
      setIsConnectingWa(status.connecting);
    });

    return () => {
      unsubQR?.();
      unsubStatus?.();
    };
  }, [ur]);

  // Connect WhatsApp handler
  const handleConnectWhatsApp = async (force = false) => {
    if (!window.electronAPI) return;
    setIsConnectingWa(true);
    setShowQrModal(true);
    try {
      const res = await window.electronAPI.connectWhatsApp({ force });
      if (res?.qrCodeDataUrl) {
        setQrCodeData(res.qrCodeDataUrl);
      }
      if (res?.connected) {
        setWaStatus(res);
        setQrCodeData(null);
      }
    } catch (err) {
      console.error('Failed to initiate WhatsApp connection:', err);
      showToast('error', ur ? 'کنیکشن شروع کرنے میں مسئلہ پیش آیا' : 'Failed to connect');
    } finally {
      setIsConnectingWa(false);
    }
  };

  // Disconnect WhatsApp handler
  const handleDisconnectWhatsApp = async () => {
    if (!window.electronAPI) return;
    if (!confirm(ur ? 'کیا آپ واقعی واٹس ایپ منقطع کرنا چاہتے ہیں؟' : 'Disconnect WhatsApp?')) return;
    try {
      await window.electronAPI.disconnectWhatsApp();
      setWaStatus({ connected: false, connecting: false });
      setQrCodeData(null);
      showToast('info', ur ? 'واٹس ایپ منقطع کر دیا گیا ہے' : 'WhatsApp Disconnected');
    } catch (err) {
      console.error('Failed to disconnect WhatsApp:', err);
    }
  };

  const q = search.trim().toLowerCase();

  // Distinct months across both monthly customers and walk-in sales
  const allMonths = useMemo(() => {
    const set = new Set<string>();
    for (const c of monthly) for (const r of c.rows) if (r.month) set.add(r.month);
    for (const s of sales) if (s.date && s.date.length >= 7) set.add(s.date.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [monthly, sales]);

  // Walk-in filtered by search and month
  const walkIn = useMemo(() => {
    return sales.filter((s) => {
      const matchQuery = !q || (s.customer_name || '').toLowerCase().includes(q);
      const matchMonth = monthFilter === 'All' || (s.date && s.date.startsWith(monthFilter));
      return matchQuery && matchMonth;
    });
  }, [sales, q, monthFilter]);

  const walkInTotals = useMemo(() => {
    let liters = 0, amount = 0, paid = 0;
    for (const s of walkIn) {
      liters += s.quantity || 0;
      amount += s.total_amount || 0;
      if (s.payment_status === 'Paid') paid += s.total_amount || 0;
    }
    return { liters, amount, paid, due: amount - paid };
  }, [walkIn]);

  // Base name/phone filtered list
  const nameFiltered = useMemo(
    () => monthly.filter((c) => c.monthCount > 0 && (!q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q))),
    [monthly, q]
  );

  // When a specific month is chosen, filter rows down to that month
  const customers = useMemo(() => {
    if (monthFilter === 'All') return nameFiltered;
    return nameFiltered
      .map((c) => {
        const rows = c.rows.filter((r) => r.month === monthFilter);
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
          ...c,
          rows,
          monthCount: 1,
          totalLiters: r.liters,
          totalBilled: r.bill,
          totalPaid: r.paid,
          balance: r.balance,
        };
      })
      .filter((c): c is MonthlyRecordCustomer => c !== null);
  }, [nameFiltered, monthFilter]);

  const monthlyTotals = useMemo(() => {
    let billed = 0, paid = 0, balance = 0;
    for (const c of customers) {
      billed += c.totalBilled || 0;
      paid += c.totalPaid || 0;
      balance += c.balance || 0;
    }
    return { billed, paid, balance };
  }, [customers]);

  // Current active month string for batch operations
  const activeMonthStr = useMemo(() => {
    if (monthFilter !== 'All') return monthFilter;
    if (allMonths.length > 0) return allMonths[0];
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  }, [monthFilter, allMonths]);

  // 3. Dispatch Single Bill Image Immediately via WhatsApp
  const handleSendBillImageNow = async (customer: MonthlyRecordCustomer, row: MonthlyRecordRow) => {
    if (!window.electronAPI) return;

    if (!waStatus?.connected) {
      setShowQrModal(true);
      if (!qrCodeData && !waStatus?.connecting) handleConnectWhatsApp();
      return;
    }

    if (!isValidPhone(customer.phone)) {
      alert(ur ? 'اس گاہک کا موبائل نمبر درست نہیں ہے!' : 'Customer has no valid WhatsApp number!');
      return;
    }

    setSendingSingleId(customer.id);

    const rowCarry = row.carry ?? Math.max(0, (row.balance || 0) + (row.paid || 0) - (row.bill || 0));
    const netBill = computeNetUnpaidBreakdown({
      liters: row.liters,
      rate: row.rate,
      bill: row.bill,
      carry: rowCarry,
      alreadyPaid: row.paid,
    });

    const payload = {
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      billMonth: row.month,
      monthLabel: monthLabel(row.month, ur),
      liters: netBill.liters,
      rate: row.rate,
      billAmount: netBill.bill,
      carry: netBill.carry,
      received: netBill.received,
      payable: netBill.payable,
      accountNumber: billSettings?.account_number || '02090111954760',
      whatsappConsent: customer.whatsapp_consent !== false,
    };

    try {
      const res =
        billFor && cardMode === 'receipt'
          ? await window.electronAPI.sendReceiptDirect({
              item: {
                customerId: customer.id,
                receiptNumber: String(customer.id || '28'),
                customerName: customer.name,
                phone: customer.phone,
                billMonth: row.month,
                monthLabel: monthLabel(row.month, ur),
                liters: row.liters,
                rate: row.rate,
                billAmount: row.bill,
                carry: rowCarry,
                paidNow: row.paid,
                totalReceived: row.paid,
                remaining: Math.max(0, row.balance),
              },
              settings: billSettings,
            })
          : await window.electronAPI.sendSingleBillDirect({
              item: payload,
              settings: billSettings,
            });

      if (res.success) {
        showToast(
          'success',
          ur
            ? cardMode === 'receipt' && billFor
              ? `رسید کی تصویر ${customer.name} کو واٹس ایپ پر بھیج دی گئی ہے!`
              : `بل کی تصویر ${customer.name} کو واٹس ایپ پر بھیج دی گئی ہے!`
            : cardMode === 'receipt' && billFor
            ? `Receipt image sent to ${customer.name}!`
            : `Bill image sent to ${customer.name}!`
        );
      } else {
        showToast('error', ur ? `بھیجا نہیں جا سکا: ${res.error}` : `Failed: ${res.error}`);
      }
    } catch (err: any) {
      console.error('Failed to send bill:', err);
      showToast('error', ur ? 'میسج بھیجنے میں خرابی ہوئی' : 'Error sending message');
    } finally {
      setSendingSingleId(null);
    }
  };

  const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
    <div className="bg-[#0b1437] rounded-2xl border border-blue-500/20 px-4 py-3 shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
      <div className="text-[11px] font-bold text-slate-400">{label}</div>
      <div className={`text-lg font-black ${tone || 'text-white'} mt-0.5`}>{value}</div>
    </div>
  );

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto text-slate-100 select-none">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-400 text-rose-200'
              : 'bg-cyan-950/90 border-cyan-400 text-cyan-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="font-bold text-xs">{toast.text}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card with Tabs, WhatsApp QR Scanner, Send All & Month Filter */}
      <div className="bg-[#081028] rounded-3xl border border-blue-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.35)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tab Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('monthly')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer transition-all border ${
              tab === 'monthly'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(0,128,255,0.4)]'
                : 'bg-[#0c163b] text-slate-300 border-blue-500/30 hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>{ur ? 'ماہانہ گاہک' : 'Monthly Customers'}</span>
          </button>
          <button
            onClick={() => setTab('walkin')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer transition-all border ${
              tab === 'walkin'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(0,128,255,0.4)]'
                : 'bg-[#0c163b] text-slate-300 border-blue-500/30 hover:text-white'
            }`}
          >
            <Footprints className="w-4 h-4" />
            <span>{ur ? 'واک اِن گاہک' : 'Walk-in Customers'}</span>
          </button>
        </div>

        {/* Center / Right: WhatsApp Connection & Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Prominent WhatsApp Connection Button / Status Badge */}
          {waStatus?.connected ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#092c23] border border-emerald-400/50 text-emerald-300 text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {ur
                  ? `واٹس ایپ منسلک ہے (${waStatus.phoneNumber || '03204815221'})`
                  : `WhatsApp Connected (${waStatus.phoneNumber || 'Active'})`}
              </span>
              <button
                type="button"
                onClick={handleDisconnectWhatsApp}
                title={ur ? 'واٹس ایپ منقطع کریں' : 'Disconnect WhatsApp'}
                className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnectWhatsApp}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/25 via-emerald-500/20 to-cyan-500/25 border-2 border-amber-400 hover:border-amber-300 text-amber-300 hover:text-white font-black text-xs shadow-[0_0_20px_rgba(251,191,36,0.35)] animate-pulse hover:animate-none cursor-pointer transition-all"
              title="Click to view QR code and connect your WhatsApp"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>{ur ? '📱 واٹس ایپ QR کوڈ اسکین کریں' : 'Scan WhatsApp QR'}</span>
            </button>
          )}

          {/* Prominent Month Selector */}
          <div className="flex items-center gap-1.5 bg-[#0c163b] border border-blue-500/30 rounded-2xl px-3 py-1.5 shadow-[0_0_10px_rgba(0,102,255,0.15)]">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer [color-scheme:dark]"
            >
              <option value="All" className="bg-[#0b1437] text-white">
                {ur ? 'تمام مہینے (All Months)' : 'All Months'}
              </option>
              {allMonths.map((m) => (
                <option key={m} value={m} className="bg-[#0b1437] text-white">
                  {monthLabel(m, ur)}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-cyan-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ur ? 'نام یا فون سے تلاش کریں...' : 'Search by name/phone...'}
              className="pl-9 pr-3 py-2 text-xs rounded-2xl bg-[#0c163b] border border-blue-500/30 text-white focus:outline-none focus:border-cyan-400 w-full md:w-48"
            />
          </div>
        </div>
      </div>

      {tab === 'monthly' ? (
        <>
          {/* Top Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={ur ? 'گاہک' : 'Customers'} value={String(customers.length)} />
            <Stat label={ur ? 'کل بل' : 'Total Billed'} value={`Rs. ${money(monthlyTotals.billed)}`} />
            <Stat label={ur ? 'کل ادا شدہ' : 'Total Paid'} value={`Rs. ${money(monthlyTotals.paid)}`} tone="text-emerald-400" />
            <Stat
              label={ur ? 'کل بقایا' : 'Total Balance'}
              value={`Rs. ${money(monthlyTotals.balance)}`}
              tone={monthlyTotals.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}
            />
          </div>

          {/* Monthly Customers Table */}
          <div className="bg-[#081028] rounded-3xl border border-blue-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0b1437] border-b border-blue-500/20 text-[11px] uppercase tracking-wider text-slate-300 font-extrabold">
                    <th className="w-8 px-3 py-3" />
                    <th className="px-3 py-3">{ur ? 'گاہک' : 'Customer'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'مہینے' : 'Months'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'کل لیٹر' : 'Total Ltr'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'کل بل' : 'Total Bill'}</th>
                    <th className="px-3 py-3 text-right text-emerald-400">{ur ? 'کل ادا' : 'Total Paid'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'بقایا' : 'Balance'}</th>
                    <th className="px-3 py-3 text-center w-52">{ur ? 'ایکشنز' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/10">
                  {customers.map((c) => {
                    const isOpen = open === c.id;
                    const primaryRow = c.rows[0];
                    return (
                      <React.Fragment key={c.id}>
                        <tr
                          onClick={() => setOpen(isOpen ? null : c.id)}
                          className="hover:bg-blue-600/10 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-3 text-cyan-400">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-black text-white text-sm">{c.name}</div>
                            <div className="text-[10px] text-cyan-300/80 font-mono" dir="ltr">{c.phone || '-'}</div>
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-300">{c.monthCount}</td>
                          <td className="px-3 py-3 text-right font-black text-cyan-300">{qty(c.totalLiters)} L</td>
                          <td className="px-3 py-3 text-right font-black text-white">Rs. {money(c.totalBilled)}</td>
                          <td className="px-3 py-3 text-right font-black text-emerald-400">Rs. {money(c.totalPaid)}</td>
                          <td className={`px-3 py-3 text-right font-black ${c.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            Rs. {money(c.balance)}
                          </td>
                          <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {primaryRow && (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCardMode('bill');
                                    setBillFor({ customer: c, row: primaryRow });
                                  }}
                                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-cyan-400/50 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                                  title={ur ? 'بل دیکھیں' : 'View Bill'}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>{ur ? 'بل دیکھیں' : 'View Bill'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(c, primaryRow)}
                                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border border-amber-400/50 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                                  title={ur ? 'ترمیم کریں' : 'Edit Record'}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>{ur ? 'ترمیم' : 'Edit'}</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {isOpen && (
                          <tr className="bg-[#0b1437]/50">
                            <td />
                            <td colSpan={7} className="px-4 py-3">
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="text-slate-400 border-b border-blue-500/20">
                                    <th className="text-left py-1.5 font-bold">{ur ? 'مہینہ' : 'Month'}</th>
                                    <th className="text-right py-1.5 font-bold">{ur ? 'لیٹر' : 'Ltr'}</th>
                                    <th className="text-right py-1.5 font-bold">{ur ? 'ریٹ' : 'Rate'}</th>
                                    <th className="text-right py-1.5 font-bold">{ur ? 'بل' : 'Bill'}</th>
                                    <th className="text-right py-1.5 font-bold text-emerald-400">{ur ? 'ادا' : 'Paid'}</th>
                                    <th className="text-right py-1.5 font-bold">{ur ? 'بقایا' : 'Balance'}</th>
                                    <th className="w-48 text-center py-1.5">{ur ? 'ایکشنز' : 'Actions'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...c.rows].reverse().map((r) => (
                                    <tr key={r.month} className="border-t border-blue-500/10 hover:bg-blue-600/10">
                                      <td className="py-2 font-black text-cyan-300">{r.month}</td>
                                      <td className="py-2 text-right">{qty(r.liters)} L</td>
                                      <td className="py-2 text-right">Rs. {r.rate}</td>
                                      <td className="py-2 text-right font-black text-white">Rs. {money(r.bill)}</td>
                                      <td className="py-2 text-right font-black text-emerald-400">Rs. {money(r.paid)}</td>
                                      <td className={`py-2 text-right font-black ${r.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        Rs. {money(r.balance)}
                                      </td>
                                      <td className="py-2 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCardMode('bill');
                                              setBillFor({ customer: c, row: r });
                                            }}
                                            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-cyan-400/50 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                                            title={ur ? 'بل دیکھیں' : 'View Bill'}
                                          >
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>{ur ? 'بل دیکھیں' : 'View Bill'}</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => openEditModal(c, r)}
                                            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border border-amber-400/50 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                                            title={ur ? 'ترمیم کریں' : 'Edit Record'}
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                            <span>{ur ? 'ترمیم' : 'Edit'}</span>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Walk-in Customers Section */
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={ur ? 'سیلز کی تعداد' : 'Total Sales'} value={String(walkIn.length)} />
            <Stat label={ur ? 'کل لیٹر دودھ' : 'Total Liters'} value={`${qty(walkInTotals.liters)} L`} />
            <Stat label={ur ? 'کل رقم' : 'Total Amount'} value={`Rs. ${money(walkInTotals.amount)}`} />
            <Stat
              label={ur ? 'باقی رقم' : 'Pending Due'}
              value={`Rs. ${money(walkInTotals.due)}`}
              tone={walkInTotals.due > 0 ? 'text-rose-400' : 'text-emerald-400'}
            />
          </div>

          <div className="bg-[#081028] rounded-3xl border border-blue-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0b1437] border-b border-blue-500/20 text-[11px] uppercase tracking-wider text-slate-300 font-extrabold">
                    <th className="px-3 py-3">{ur ? 'تاریخ' : 'Date'}</th>
                    <th className="px-3 py-3">{ur ? 'گاہک' : 'Customer'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'مقدار' : 'Quantity'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'ریٹ' : 'Rate'}</th>
                    <th className="px-3 py-3 text-right">{ur ? 'کل رقم' : 'Total'}</th>
                    <th className="px-3 py-3 text-center">{ur ? 'حالت' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/10">
                  {walkIn.map((s) => (
                    <tr key={s.id} className="hover:bg-blue-600/10">
                      <td className="px-3 py-3 text-cyan-300 font-mono">{s.date}</td>
                      <td className="px-3 py-3 font-black text-white">{s.customer_name || (ur ? 'واک اِن گاہک' : 'Walk-in')}</td>
                      <td className="px-3 py-3 text-right font-black text-cyan-300">{qty(s.quantity)} L</td>
                      <td className="px-3 py-3 text-right">Rs. {s.rate}</td>
                      <td className="px-3 py-3 text-right font-black text-white">Rs. {money(s.total_amount)}</td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            s.payment_status === 'Paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {s.payment_status === 'Paid' ? (ur ? 'ادا شدہ' : 'Paid') : (ur ? 'بقایا' : 'Pending')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* WhatsApp QR Code Scanning Modal */}
      <WhatsAppQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        waStatus={waStatus}
        qrCodeData={qrCodeData}
        isConnecting={isConnectingWa}
        onRefresh={() => handleConnectWhatsApp(true)}
        onDisconnect={handleDisconnectWhatsApp}
      />

      {/* Bill & Receipt View Modal (Wider width as requested by user) */}
      {billFor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 md:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-[#081028] border-2 border-cyan-500/40 rounded-3xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:rounded-none">
            {/* Modal Header */}
            <div className="p-3.5 px-5 bg-[#0b1437] border-b border-blue-500/20 flex items-center justify-between no-print">
              {/* Card Mode Toggle */}
              <div className="flex items-center gap-1.5 bg-[#081028] p-1 rounded-2xl border border-blue-500/20">
                <button
                  type="button"
                  onClick={() => setCardMode('bill')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cardMode === 'bill'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{ur ? 'بل (Bill)' : 'Bill'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCardMode('receipt')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cardMode === 'receipt'
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{ur ? 'ادائیگی کی رسید' : 'Receipt'}</span>
                </button>
              </div>

              <button
                onClick={() => setBillFor(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600/40 text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Either ModernBillCard or ModernReceiptCard */}
            <div className="p-3 md:p-5 space-y-3 overflow-y-auto flex-1 print:p-0 print:overflow-visible flex flex-col items-center">
              {/* Account Number & Bank Quick Editor Toolbar (No-Print) */}
              <div className="w-full no-print bg-[#0c163b] border border-emerald-500/30 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowAccountEditor(!showAccountEditor)}
                    className="flex items-center gap-2 text-xs font-bold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>
                      {ur
                        ? 'اکاؤنٹ نمبر اور بینک تفصیلات تبدیل کریں'
                        : 'Edit Account & Bank Details'}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-300 border border-emerald-500/30">
                      {showAccountEditor ? 'بند کریں' : 'تبدیل کریں ✏️'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>اکاؤنٹ نمبر:</span>
                    <b className="font-mono text-emerald-400">
                      {billSettings?.account_number || '02090111954760'}
                    </b>
                  </div>
                </div>

                {showAccountEditor && (
                  <div className="pt-2 border-t border-blue-500/20 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {ur ? 'اکاؤنٹ نمبر / IBAN:' : 'Account Number:'}
                      </label>
                      <input
                        type="text"
                        value={billSettings?.account_number || ''}
                        onChange={(e) =>
                          setBillSettings({
                            ...(billSettings || {
                              shop_title: 'قاری ظفر اقبال ملک شاپ',
                              owner_name: 'حافظ مصعب ظفر',
                              phone: '0320-4815221',
                              bank_name: 'میزان بینک',
                              account_title: 'حافظ مصعب ظفر',
                              account_number: '',
                            }),
                            account_number: e.target.value,
                          })
                        }
                        dir="ltr"
                        placeholder="02090111954760"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#081028] border border-blue-500/40 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {ur ? 'بینک کا نام / اکاؤنٹ:' : 'Bank Name:'}
                      </label>
                      <input
                        type="text"
                        value={billSettings?.bank_name || ''}
                        onChange={(e) =>
                          setBillSettings({
                            ...(billSettings || {
                              shop_title: 'قاری ظفر اقبال ملک شاپ',
                              owner_name: 'حافظ مصعب ظفر',
                              phone: '0320-4815221',
                              bank_name: '',
                              account_title: 'حافظ مصعب ظفر',
                              account_number: '02090111954760',
                            }),
                            bank_name: e.target.value,
                          })
                        }
                        placeholder="میزان بینک"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#081028] border border-blue-500/40 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {ur ? 'اکاؤنٹ ٹائٹل:' : 'Account Title:'}
                      </label>
                      <input
                        type="text"
                        value={billSettings?.account_title || ''}
                        onChange={(e) =>
                          setBillSettings({
                            ...(billSettings || {
                              shop_title: 'قاری ظفر اقبال ملک شاپ',
                              owner_name: 'حافظ مصعب ظفر',
                              phone: '0320-4815221',
                              bank_name: 'میزان بینک',
                              account_title: '',
                              account_number: '02090111954760',
                            }),
                            account_title: e.target.value,
                          })
                        }
                        placeholder="حافظ مصعب ظفر"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#081028] border border-blue-500/40 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={saveCustomAccount}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors"
                      >
                        {savedBadge ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        <span>{savedBadge ? (ur ? 'محفوظ ہو گیا!' : 'Saved!') : (ur ? 'محفوظ کریں' : 'Save')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {cardMode === 'bill' ? (() => {
                const rowCarry = billFor.row.carry ?? Math.max(0, (billFor.row.balance || 0) + (billFor.row.paid || 0) - (billFor.row.bill || 0));
                const netBill = computeNetUnpaidBreakdown({
                  liters: billFor.row.liters,
                  rate: billFor.row.rate,
                  bill: billFor.row.bill,
                  carry: rowCarry,
                  alreadyPaid: billFor.row.paid,
                });
                return (
                <ModernBillCard
                  customerId={billFor.customer.id}
                  customerName={billFor.customer.name}
                  phone={billFor.customer.phone}
                  monthLabel={monthLabel(billFor.row.month, ur)}
                  issueDateStr={new Date().toLocaleDateString(ur ? 'ur-PK' : 'en-GB')}
                  rate={billFor.row.rate}
                  liters={netBill.liters}
                  bill={netBill.bill}
                  carry={netBill.carry}
                  received={netBill.received}
                  payable={netBill.payable}
                  billNo={billFor.customer.id || '28'}
                  settings={{
                    shop_title: billSettings?.shop_title || 'قاری ظفر اقبال ملک شاپ',
                    owner_name: billSettings?.owner_name || 'حافظ مصعب ظفر',
                    phone: billSettings?.phone || '0320-4815221',
                    bank_name: billSettings?.bank_name || 'میزان بینک',
                    account_title: billSettings?.account_title || 'حافظ مصعب ظفر',
                    account_number: billSettings?.account_number || (billSettings as any)?.account_no || '02090111954760',
                  }}
                  accountNumber={billSettings?.account_number || '02090111954760'}
                  bankName={billSettings?.bank_name || 'میزان بینک'}
                  accountTitle={billSettings?.account_title || 'حافظ مصعب ظفر'}
                  ur={ur}
                  onEditAccount={() => setShowAccountEditor(true)}
                />
                );
              })() : (
                <ModernReceiptCard
                  receiptNumber={String(billFor.customer.id || '28')}
                  customerName={billFor.customer.name}
                  phone={billFor.customer.phone}
                  monthLabel={monthLabel(billFor.row.month, ur)}
                  issueDateStr={new Date().toLocaleDateString(ur ? 'ur-PK' : 'en-GB')}
                  rate={billFor.row.rate}
                  liters={billFor.row.liters}
                  carry={billFor.row.carry ?? Math.max(0, (billFor.row.balance || 0) + (billFor.row.paid || 0) - (billFor.row.bill || 0))}
                  totalBill={(billFor.row.bill || 0) + (billFor.row.carry ?? Math.max(0, (billFor.row.balance || 0) + (billFor.row.paid || 0) - (billFor.row.bill || 0)))}
                  paidNow={billFor.row.paid}
                  totalReceived={billFor.row.paid}
                  remaining={billFor.row.balance}
                  settings={{
                    shop_title: billSettings?.shop_title || 'قاری ظفر اقبال ملک شاپ',
                    owner_name: billSettings?.owner_name || 'حافظ مصعب ظفر',
                    phone: billSettings?.phone || '0320-4815221',
                    bank_name: billSettings?.bank_name || 'میزان بینک',
                    account_title: billSettings?.account_title || 'حافظ مصعب ظفر',
                    account_number: billSettings?.account_number || '02090111954760',
                  }}
                  accountNumber={billSettings?.account_number || '02090111954760'}
                  bankName={billSettings?.bank_name || 'میزان بینک'}
                  accountTitle={billSettings?.account_title || 'حافظ مصعب ظفر'}
                  ur={ur}
                  onEditAccount={() => setShowAccountEditor(true)}
                />
              )}

              {/* Action Buttons: Print, WhatsApp Image Send, Close */}
              <div className="grid grid-cols-2 gap-3 no-print w-full pt-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>{cardMode === 'bill' ? (ur ? 'پرنٹ بل' : 'Print Bill') : (ur ? 'پرنٹ رسید' : 'Print Receipt')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSendBillImageNow(billFor.customer, billFor.row)}
                  disabled={sendingSingleId === billFor.customer.id}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg cursor-pointer transition-all disabled:opacity-50"
                >
                  {sendingSingleId === billFor.customer.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{ur ? '📱 واٹس ایپ پر تصویر بھیجیں' : 'Send Image via WhatsApp'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setBillFor(null)}
                className="w-full py-2.5 rounded-2xl bg-[#0b1437] hover:bg-slate-800 border border-blue-500/20 text-slate-300 text-xs font-bold cursor-pointer print:hidden transition-colors"
              >
                {ur ? 'بند کریں' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Monthly Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-[#081028] border-2 border-amber-500/40 rounded-3xl max-w-lg w-full shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 px-6 bg-[#0b1437] border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {ur ? 'ماہانہ کھاتا ریکارڈ میں ترمیم' : 'Edit Monthly Khata Record'}
                  </h3>
                  <p className="text-[11px] text-amber-300 font-bold">
                    {editingRecord.customerName} • <span className="font-mono text-cyan-300">{editingRecord.month}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="w-8 h-8 rounded-xl bg-slate-800/60 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 flex items-center justify-center cursor-pointer transition-all border border-slate-700/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Row 1: Liters & Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {ur ? 'کل دودھ (لیٹر)' : 'Total Liters'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editLiters}
                      onChange={(e) => setEditLiters(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c163b] border border-blue-500/30 text-white text-sm font-bold focus:outline-none focus:border-cyan-400"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">Ltr</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {ur ? 'دودھ کا ریٹ (فی لیٹر)' : 'Rate (per Liter)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c163b] border border-blue-500/30 text-white text-sm font-bold focus:outline-none focus:border-cyan-400"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">Rs</span>
                  </div>
                </div>
              </div>

              {/* Calculated Bill Preview */}
              <div className="p-3 rounded-xl bg-[#061e2f] border border-cyan-500/30 flex items-center justify-between text-xs font-bold text-cyan-300">
                <span>{ur ? 'اس ماہ کا کل بل (لیٹر × ریٹ):' : 'Month Bill (Ltr × Rate):'}</span>
                <span className="text-base font-black text-white">
                  Rs. {money((Number(editLiters) || 0) * (Number(editRate) || 0))}
                </span>
              </div>

              {/* Row 2: Paid Amount & Arrears/Carry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1">
                    {ur ? 'وصول شدہ رقم (Paid)' : 'Paid Amount'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={editPaid}
                      onChange={(e) => setEditPaid(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#06201a] border border-emerald-500/40 text-emerald-300 text-sm font-black focus:outline-none focus:border-emerald-400"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-emerald-400/80">Rs</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">
                    {ur ? 'سابقہ بقایا (Previous)' : 'Previous Arrears'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={editCarry}
                      onChange={(e) => setEditCarry(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#231a08] border border-amber-500/40 text-amber-300 text-sm font-black focus:outline-none focus:border-amber-400"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-amber-400/80">Rs</span>
                  </div>
                </div>
              </div>

              {/* Live Net Balance Preview */}
              {(() => {
                const billAmt = (Number(editLiters) || 0) * (Number(editRate) || 0);
                const carryAmt = Number(editCarry) || 0;
                const paidAmt = Number(editPaid) || 0;
                const netBal = carryAmt + billAmt - paidAmt;
                return (
                  <div className="p-3.5 rounded-xl bg-[#081028] border border-blue-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">
                        {ur ? 'ترمیم کے بعد نیا بقایا (New Net Balance):' : 'New Net Balance after update:'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Rs. {carryAmt} (سابقہ) + Rs. {money(billAmt)} (بل) - Rs. {money(paidAmt)} (ادا)
                      </span>
                    </div>
                    <span className={`text-lg font-black ${netBal > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      Rs. {money(netBal)}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 bg-[#0b1437] border-t border-amber-500/20 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-all border border-slate-700"
              >
                {ur ? 'منسوخ کریں' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveMonthlyEdit}
                disabled={isSavingEdit}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-black cursor-pointer transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{ur ? 'محفوظ ہو رہا ہے...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{ur ? 'محفوظ کریں (Save Changes)' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
