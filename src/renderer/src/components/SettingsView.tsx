import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Phone,
  Building,
  KeyRound,
  TrendingUp,
  Database,
  HardDrive,
  Usb,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Save,
  Download,
  Upload,
  Lock,
  Eye,
  EyeOff,
  MessageSquare,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { DbInfo } from '../types/electron';
import { ModernBillCard } from './ModernBillCard';
import { CloudBackupSettings } from './CloudBackupSettings';

interface SettingsViewProps {
  dbInfo: DbInfo | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ dbInfo }) => {
  const { language, setLanguage } = useLanguage();
  const ur = language === 'ur';

  // 1. Bill Settings State
  const [billForm, setBillForm] = useState({
    shop_title: 'قاری ظفر ملک شاپ',
    owner_name: 'حافظ مصعب ظفر',
    phone: '+92 321 0001168',
    bank_name: 'میزان بینک',
    account_title: 'حافظ مصعب ظفر',
    account_number: '02090111954760',
  });
  const [billSaved, setBillSaved] = useState(false);

  // 2. Admin Credentials State
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminMsg, setAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);

  // 4. Pricing State
  const [pricing, setPricing] = useState<{
    currentRate: number;
    previousRate: number;
    history: Array<{ id: number; rate: number; effective_from: string; created_at: string }>;
  }>({
    currentRate: 240,
    previousRate: 240,
    history: [],
  });
  const [newRateInput, setNewRateInput] = useState('240');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [recalculateOpen, setRecalculateOpen] = useState(false);
  const [priceSaved, setPriceSaved] = useState(false);

  // 5. Backup State
  const [backupOverview, setBackupOverview] = useState<{
    dbPath: string;
    dbSizeBytes: number;
    localBackupDir: string;
    localBackupsCount: number;
    latestLocalBackup: string | null;
    drives: Array<{ letter: string; type: string; freeSpaceGB: number }>;
    detectedUsbCount: number;
  }>({
    dbPath: dbInfo?.dbPath || 'C:\\Users\\rehan\\AppData\\Roaming\\dairy-management\\dairy.db',
    dbSizeBytes: 253952,
    localBackupDir: 'Documents/DairyBackups',
    localBackupsCount: 11,
    latestLocalBackup: '2026-11-16',
    drives: [],
    detectedUsbCount: 0,
  });
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load all initial data
  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const b = await window.electronAPI.getBillSettings();
      if (b && b.shop_title) {
        setBillForm({
          shop_title: b.shop_title || 'قاری ظفر اقبال ملک شاپ',
          owner_name: b.owner_name || 'حافظ مصعب ظفر',
          phone: b.phone || '+92 321 0001168',
          bank_name: b.bank_name || 'میزان بینک',
          account_title: b.account_title || 'حافظ مصعب ظفر',
          account_number: b.account_number || '02090111954760',
        });
      }

      // Load Settings (Twilio & Admin Credentials)
      if (window.electronAPI.getSettings) {
        const s = await window.electronAPI.getSettings();
        if (s.admin_username) setAdminUsername(s.admin_username);
      }

      const pr = await window.electronAPI.getPricing();
      if (pr) {
        setPricing(pr);
        setNewRateInput(String(pr.currentRate || 240));
      }

      const ov = await window.electronAPI.getBackupOverview();
      if (ov) setBackupOverview(ov);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Bill Settings
  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
      await window.electronAPI.saveBillSettings(billForm);
      setBillSaved(true);
      setTimeout(() => setBillSaved(false), 3000);
    }
  };

  // Save Admin Credentials (Username and/or Password)
  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMsg(null);

    const u = adminUsername.trim();
    if (!u) {
      return setAdminMsg({ type: 'error', text: ur ? 'ایڈمن یوزر نیم درج کریں' : 'Enter Admin username' });
    }

    if (adminPassword) {
      if (adminPassword.length < 4) {
        return setAdminMsg({
          type: 'error',
          text: ur ? 'نیا پاسورڈ کم از کم 4 حروف پر مشتمل ہو' : 'Password must be at least 4 characters',
        });
      }
      if (adminPassword !== confirmPassword) {
        return setAdminMsg({
          type: 'error',
          text: ur ? 'پاسورڈ کی تصدیق مماثل نہیں ہے' : 'Passwords do not match',
        });
      }
    }

    setAdminSaving(true);
    try {
      if (window.electronAPI?.updateAdminCredentials) {
        const res = await window.electronAPI.updateAdminCredentials({
          username: u,
          password: adminPassword || undefined,
        });
        if (res && res.success) {
          setAdminMsg({
            type: 'success',
            text: ur ? '✓ ایڈمن یوزر نیم اور پاسورڈ کامیابی سے اپ ڈیٹ ہو گیا!' : '✓ Admin credentials updated successfully!',
          });
          setAdminPassword('');
          setConfirmPassword('');
          setTimeout(() => setAdminMsg(null), 4000);
        } else {
          setAdminMsg({ type: 'error', text: res?.error || 'Failed to update credentials' });
        }
      } else {
        if (window.electronAPI?.setSetting) {
          await window.electronAPI.setSetting('admin_username', u);
          if (adminPassword) await window.electronAPI.setSetting('admin_password', adminPassword);
          setAdminMsg({
            type: 'success',
            text: ur ? '✓ ایڈمن لاگ ان ترتیبات محفوظ ہو گئیں!' : '✓ Admin settings saved!',
          });
          setAdminPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err: any) {
      setAdminMsg({ type: 'error', text: err.message || 'Error saving credentials' });
    } finally {
      setAdminSaving(false);
    }
  };

  // Save Milk Rate
  const handleSaveRate = async () => {
    const r = parseFloat(newRateInput);
    if (!(r > 0)) return;
    const res = await window.electronAPI?.savePricing({
      rate: r,
      effectiveFrom: effectiveDate,
      recalculate: recalculateOpen,
    });
    if (res?.success) {
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 3000);
      loadData();
    }
  };

  // Backup actions
  const handleUsbBackup = async (letter?: string) => {
    setBackupMsg(null);
    const res = await window.electronAPI?.backupToUsb(letter);
    if (res?.success) {
      setBackupMsg({
        type: 'success',
        text: ur ? 'یو ایس بی پر بیک اپ کامیابی سے محفوظ ہو گیا!' : 'Backup successfully saved to USB!',
      });
      loadData();
    } else {
      setBackupMsg({ type: 'error', text: res?.error || (ur ? 'بیک اپ ناکام ہوا' : 'Backup failed') });
    }
  };

  const handleExportDb = async () => {
    const res = await window.electronAPI?.exportDbBackup();
    if (res?.success) {
      setBackupMsg({
        type: 'success',
        text: ur ? 'ڈیٹا بیس بیک اپ فائل محفوظ ہو گئی!' : 'Database .db backup saved!',
      });
    }
  };

  const handleRestoreDb = async () => {
    if (
      !confirm(
        ur
          ? 'کیا آپ واقعی بیک اپ بحال کرنا چاہتے ہیں؟ موجودہ ڈیٹا اوور رائٹ ہو جائے گا۔'
          : 'Restore database? Current data will be replaced.'
      )
    )
      return;
    const res = await window.electronAPI?.restoreDbBackup();
    if (res?.success) {
      alert(ur ? 'ڈیٹا بیس کامیابی سے بحال ہو گیا! ایپ ری لوڈ ہو رہی ہے۔' : 'Database restored successfully! Reloading...');
      window.location.reload();
    }
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500';

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">
              {ur ? 'سسٹم سیٹنگز اور کنفیگریشن' : 'System Settings & Configuration'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {ur
                ? 'دکان کا بل ہیڈر، ٹویلیو واٹس ایپ، ایڈمن لاگ ان ترتیبات اور ڈیٹا بیس بیک اپ'
                : 'Configure bill headers, Twilio WhatsApp, Admin login credentials, and database backups'}
            </p>
          </div>
        </div>
      </div>

      {/* Language Switch Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{ur ? 'ایپ کی زبان' : 'App Language'}</h3>
          <p className="text-xs text-slate-400">{ur ? 'انٹرفیس کی زبان منتخب کریں' : 'Select interface language'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage('ur')}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              language === 'ur'
                ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            اردو (Urdu)
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* 1. Bill Settings & Real-Time Modern Blue Bill Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-600" />
            <span>{ur ? 'بل کی ترتیبات اور بینک تفصیلات' : 'Bill Header & Bank Details'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {ur
              ? 'گاہکوں اور سپلائرز کے پرنٹ شدہ بل اور واٹس ایپ رسید پر ظاہر ہونے والی دکان کی معلومات'
              : 'Details shown on printed bills and WhatsApp receipts'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Form */}
          <form onSubmit={handleSaveBill} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {ur ? 'دکان کا نام (Shop Title) *' : 'Shop Title *'}
              </label>
              <input
                value={billForm.shop_title}
                onChange={(e) => setBillForm({ ...billForm, shop_title: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {ur ? 'پروپرائیٹر / مالک کا نام *' : 'Owner / Proprietor Name *'}
              </label>
              <input
                value={billForm.owner_name}
                onChange={(e) => setBillForm({ ...billForm, owner_name: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {ur ? 'موبائل نمبر (بل و رسید کے لیے) *' : 'Contact Phone *'}
              </label>
              <input
                value={billForm.phone}
                onChange={(e) => setBillForm({ ...billForm, phone: e.target.value })}
                className={inputCls}
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {ur ? 'بینک کا نام *' : 'Bank Name *'}
              </label>
              <input
                value={billForm.bank_name}
                onChange={(e) => setBillForm({ ...billForm, bank_name: e.target.value })}
                placeholder="میزان بینک / Meezan Bank, JazzCash, EasyPaisa"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {ur ? 'اکاؤنٹ ٹائٹل *' : 'Account Title *'}
              </label>
              <input
                value={billForm.account_title}
                onChange={(e) => setBillForm({ ...billForm, account_title: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {ur ? 'اکاؤنٹ نمبر / IBAN *' : 'Account Number / IBAN *'}
              </label>
              <input
                value={billForm.account_number}
                onChange={(e) => setBillForm({ ...billForm, account_number: e.target.value })}
                className={inputCls}
                dir="ltr"
              />
            </div>

            {billSaved && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{ur ? 'بل کی ترتیبات کامیابی سے محفوظ ہو گئیں!' : 'Bill settings saved successfully!'}</span>
              </div>
            )}

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{ur ? 'ترتیبات محفوظ کریں' : 'Save Bill Settings'}</span>
            </button>
          </form>

          {/* Real-Time Modern Bill Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">
                {ur ? 'بل کا لائیو پیش منظر (Live Invoice Preview):' : 'Live Preview on Bill:'}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Live Preview
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex justify-center overflow-x-auto shadow-inner">
              <div className="scale-95 origin-top transform-gpu w-full">
                <ModernBillCard
                  customerName={ur ? 'ملک احمد علی' : 'Malik Ahmad Ali'}
                  phone="+92 300 1234567"
                  monthLabel="2026-11"
                  issueDateStr={ur ? '16 نومبر 2026' : '16 Nov 2026'}
                  rate={pricing.currentRate || 240}
                  liters={35}
                  bill={8400}
                  carry={0}
                  received={8400}
                  payable={0}
                  settings={billForm}
                  ur={ur}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Admin Login Credentials (Username & Password Update) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand-600" />
            <span>{ur ? 'ایڈمن لاگ ان ترتیبات (Admin Username & Password)' : 'Admin Login Credentials'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {ur
              ? 'ایپ لاگ ان اسکرین کے لیے ایڈمن یوزر نیم اور پاسورڈ تبدیل کریں'
              : 'Update the primary login username and password used to access the application.'}
          </p>
        </div>

        <form onSubmit={handleSaveAdminCredentials} className="space-y-3 max-w-md">
          {adminMsg && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                adminMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {adminMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{adminMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {ur ? 'ایڈمن یوزر نیم (Admin Username) *' : 'Admin Username *'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {ur ? 'لاگ ان اسکرین پر ڈیفالٹ کے طور پر یہی یوزر نیم ظاہر ہوگا' : 'Default username displayed on login screen.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {ur ? 'نیا پاسورڈ (New Password)' : 'New Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showAdminPass ? 'text' : 'password'}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder={ur ? 'پاسورڈ تبدیل کرنے کے لیے درج کریں' : 'Leave blank to keep existing password'}
                className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowAdminPass(!showAdminPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {adminPassword && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {ur ? 'نیا پاسورڈ دوبارہ درج کریں (Confirm Password) *' : 'Confirm Password *'}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                className={inputCls}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={adminSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{adminSaving ? (ur ? 'محفوظ ہو رہا ہے...' : 'Saving...') : ur ? 'ایڈمن لاگ ان تبدیل کریں' : 'Update Admin Credentials'}</span>
          </button>
        </form>
      </div>

      {/* 4. Active Price Per Liter & Update Milk Rate */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              <span>{ur ? 'دودھ کا ریٹ (Active Price Per Liter)' : 'Milk Rate Management'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {ur ? 'دودھ کا فی لیٹر ریٹ اور تاریخ وار تبدیلیاں ترتیب دیں' : 'Manage per-liter milk rate and historical updates'}
            </p>
          </div>
        </div>

        {/* Current Active Rate Card */}
        <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-brand-700 uppercase tracking-wider">Active Price Per Liter</span>
            <div className="text-3xl font-black text-brand-700 mt-0.5">
              Rs. {pricing.currentRate}
              <span className="text-xs font-semibold text-brand-600 ml-1.5">/ Liter</span>
            </div>
            <p className="text-[11px] text-brand-600 mt-1">
              Previous Rate: Rs. {pricing.previousRate}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Rate Update Form */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800">{ur ? 'نیا ریٹ درج کریں' : 'Update Milk Rate'}</h4>
            {priceSaved && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{ur ? 'نیا ریٹ لاگو ہو گیا!' : 'New rate applied successfully!'}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {ur ? 'نیا ریٹ (PKR / Liter) *' : 'New Rate (PKR / Liter) *'}
              </label>
              <input
                type="number"
                value={newRateInput}
                onChange={(e) => setNewRateInput(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {ur ? 'لاگو ہونے کی تاریخ *' : 'Effective From Date *'}
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className={inputCls}
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={recalculateOpen}
                onChange={(e) => setRecalculateOpen(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <span>{ur ? 'کھلے مہینے کی تمام اندراجات کو نئے ریٹ کے ساتھ دوبارہ حساب کریں' : "Recalculate open month's entries with new rate"}</span>
            </label>

            <button
              type="button"
              onClick={handleSaveRate}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{ur ? 'نیا ریٹ محفوظ کریں' : 'Save New Rate'}</span>
            </button>
          </div>

          {/* Rate History Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2">{ur ? 'ریٹ تبدیلی کی تاریخ' : 'Rate Change History'}</h4>
            <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
              <div className="bg-slate-50 px-3 py-2 font-bold text-slate-600 grid grid-cols-3 text-[11px]">
                <span>Rate</span>
                <span>Effective Date</span>
                <span>Recorded Date</span>
              </div>
              {pricing.history.map((h, i) => (
                <div key={i} className="px-3 py-2.5 grid grid-cols-3 items-center">
                  <span className="font-extrabold text-slate-800">Rs. {h.rate}</span>
                  <span className="text-slate-500">{h.effective_from || '-'}</span>
                  <span className="text-slate-400">{h.created_at ? h.created_at.slice(0, 10) : '-'}</span>
                </div>
              ))}
              {pricing.history.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-xs">No price change history yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4b. Cloud Synchronization, Neon PostgreSQL & S3 Online Backup */}
      <CloudBackupSettings />

      {/* 5. Database Backup & Restore (.db and USB Flash) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-600" />
              <span>{ur ? 'ڈیٹا بیس بیک اپ اور بحالی (Database Backup & Restore)' : 'Database Backup & Restore'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {ur
                ? 'تمام کسٹمرز، سپلائرز، سیلز اور روزانہ اسٹاک کی اصل ڈیٹا بیس فائل محفوظ اور بحال کریں'
                : 'Backup and restore the core SQLite database file across local storage and USB flash drives.'}
            </p>
          </div>
        </div>

        {backupMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              backupMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {backupMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{backupMsg.text}</span>
          </div>
        )}

        {/* Database Storage Location Banner */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-brand-600" />
              {ur ? 'ڈیٹا بیس فائل کا اصل مقام (Storage Location):' : 'Database Storage Location'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200 font-mono">
              {(backupOverview.dbSizeBytes / 1024).toFixed(1)} KB
            </span>
          </div>
          <p className="font-mono text-[11px] text-slate-600 select-all bg-white p-2.5 rounded-xl border border-slate-200 break-all">
            {backupOverview.dbPath}
          </p>
        </div>

        {/* 2 Auto Backup Cards (Daily PC & USB Flash) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily PC Auto-Backup */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-brand-600" />
                <h4 className="text-xs font-bold text-slate-800">
                  {ur ? 'روزانہ کمپیوٹر آٹو بیک اپ' : 'Daily PC Auto-Backup'}
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Folder:</span>
                <span className="font-mono font-bold text-slate-700">{backupOverview.localBackupDir}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Total Backups:</span>
                <span className="font-bold text-slate-800">{backupOverview.localBackupsCount} days</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Latest:</span>
                <span className="font-mono font-bold text-emerald-600">{backupOverview.latestLocalBackup || '2026-11-16'}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
              {ur
                ? 'ایپ کھلنے اور بند ہونے پر Documents/DairyBackups میں خودکار اسنیپ شاٹ بنتا ہے۔'
                : 'Automatically snapshots the database into Documents/DairyBackups on start and exit.'}
            </p>
          </div>

          {/* USB Flash Auto-Backup */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Usb className="w-4 h-4 text-brand-600" />
                <h4 className="text-xs font-bold text-slate-800">
                  {ur ? 'یو ایس بی فلیش آٹو بیک اپ' : 'USB Flash Auto-Backup'}
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {backupOverview.detectedUsbCount > 0 ? `${backupOverview.detectedUsbCount} USB` : 'Drives Ready'}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              {backupOverview.drives.map((d) => (
                <div key={d.letter} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                  <span className="font-bold text-slate-700">{d.letter} ({d.type})</span>
                  <span className="text-slate-500 font-semibold">{d.freeSpaceGB} GB Free</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleUsbBackup()}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>{ur ? 'ابھی یو ایس بی پر بیک اپ لیں' : 'Backup to USB Now'}</span>
            </button>
          </div>
        </div>

        {/* Manual Export & Restore Buttons */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <h4 className="text-xs font-bold text-slate-800">
            {ur ? 'دستی ڈیٹا بیس فائل ایکسپورٹ اور بحالی' : 'Manual Database Export & Restore'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleExportDb}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{ur ? 'ڈیٹا بیس بیک اپ لیں (.db)' : 'Backup Database (.db)'}</span>
            </button>

            <button
              onClick={handleRestoreDb}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{ur ? 'بیک اپ فائل بحال کریں (.db)' : 'Restore Backup (.db)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
