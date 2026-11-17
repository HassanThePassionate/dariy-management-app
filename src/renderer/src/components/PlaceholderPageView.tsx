import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Store,
  Boxes,
  Truck,
  Receipt,
  Wallet,
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { PageId } from './Sidebar';
import { useLanguage } from '../i18n/LanguageContext';
import { DbInfo } from '../types/electron';

interface PlaceholderPageViewProps {
  pageId: PageId;
  dbInfo: DbInfo | null;
}

export const PlaceholderPageView: React.FC<PlaceholderPageViewProps> = ({ pageId, dbInfo }) => {
  const { t, language, setLanguage } = useLanguage();

  // Settings State
  const [shopName, setShopName] = useState('Wajeeh Milk Shop');
  const [mobileNumber, setMobileNumber] = useState('03001234567');
  const [defaultRate, setDefaultRate] = useState('90');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (window.electronAPI) {
        try {
          const s = await window.electronAPI.getSettings();
          if (s.shop_name) setShopName(s.shop_name);
          if (s.mobile_number) setMobileNumber(s.mobile_number);
          if (s.default_rate) setDefaultRate(s.default_rate);
        } catch (err) {
          console.error(err);
        }
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
      await window.electronAPI.setSetting('shop_name', shopName);
      await window.electronAPI.setSetting('mobile_number', mobileNumber);
      await window.electronAPI.setSetting('default_rate', defaultRate);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  if (pageId === 'settings') {
    return (
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t.settings}</h2>
              <p className="text-xs text-slate-400">Configure application preferences and shop details</p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Settings saved to SQLite successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Owner Mobile Number
                </label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Milk Rate (Rs. / Ltr)
                </label>
                <input
                  type="number"
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold text-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  App Language (زبان)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                      language === 'en'
                        ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('ur')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all font-urdu ${
                      language === 'ur'
                        ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    اردو
                  </button>
                </div>
              </div>
            </div>

            {/* SQLite Storage Details */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-brand-600" />
                SQLite Storage Location:
              </span>
              <p className="font-mono text-[11px] text-slate-600 break-all select-all bg-white p-2 rounded border border-slate-200">
                {dbInfo?.dbPath || 'Detecting...'}
              </p>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </form>
        </div>

        <BillSettingsCard language={language} />
      </div>
    );
  }

  // Page title mapping
  const infoMap: Record<string, { title: string; urTitle: string; icon: React.ReactNode; desc: string }> = {
    'monthly-bills': {
      title: 'Monthly Bills',
      urTitle: 'ماہانہ بل',
      icon: <Receipt className="w-8 h-8 text-brand-600" />,
      desc: 'Electricity, rent, employee salaries, and generator fuel recurring bills.',
    },
    payments: {
      title: 'Payments',
      urTitle: 'ادائیگی و وصولی',
      icon: <Wallet className="w-8 h-8 text-brand-600" />,
      desc: 'Customer cash receipts, bank transfers, credit collections, and vendor payouts.',
    },
  };

  if (pageId === 'monthly-bills' || pageId === 'payments') {
    // These sections are temporarily disabled — comment left intentionally.
  }

  const current = infoMap[pageId] || {
    title: pageId,
    urTitle: pageId,
    icon: <Store className="w-8 h-8 text-brand-600" />,
    desc: 'Modular view ready for next step.',
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
          {current.icon}
        </div>
        <h2 className="text-2xl font-bold text-slate-800">
          {language === 'ur' ? current.urTitle : current.title}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mt-2">
          {current.desc}
        </p>

        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 max-w-md w-full text-left">
          <div className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>SQLite Table Foundation Ready</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            This module is structured cleanly in our Electron + Vite + SQLite architecture. Data models can be extended modularly in the next steps.
          </p>
        </div>
      </div>
    </div>
  );
};

/** Bill header + bank account details shown on WhatsApp bills. */
const BillSettingsCard: React.FC<{ language: 'en' | 'ur' }> = ({ language }) => {
  const ur = language === 'ur';
  const [form, setForm] = useState({
    shop_title: '',
    owner_name: '',
    phone: '',
    bank_name: '',
    account_title: '',
    account_number: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electronAPI?.getBillSettings().then((s) => s && setForm({ ...form, ...s })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    const res = await window.electronAPI?.saveBillSettings(form);
    if (res?.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500';

  const preview = [
    form.shop_title || (ur ? 'دکان کا نام' : 'Shop name'),
    '',
    `${ur ? 'پروپرائیٹر' : 'Proprietor'}: ${form.owner_name || '-'}`,
    form.phone || '',
    form.bank_name ? (ur ? `آنلائن بل کی رقم ادا کرنے کے لیے ${form.bank_name} میں رقم ٹرانسفر کریں` : `Transfer bill amount via ${form.bank_name}`) : '',
    form.account_title ? `${form.bank_name || 'Bank'} ${ur ? 'اکاؤنٹ ٹائٹل' : 'Account Title'}: ${form.account_title}` : '',
    form.account_number ? `${form.bank_name || 'Bank'} ${ur ? 'اکاؤنٹ نمبر' : 'Account Number'}: ${form.account_number}` : '',
  ].filter(Boolean);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <h3 className="text-base font-bold text-slate-800 mb-1">
        {ur ? 'بل پرنٹنگ اور بینک اکاؤنٹ کی تفصیلات' : 'Bill Printing & Bank Account Settings'}
      </h3>
      <p className="text-xs text-slate-400 mb-5">
        {ur ? 'یہ معلومات کسٹمر بل پر دکھائی جاتی ہیں' : 'Manage the phone number, bank name, account title, and account number shown on customer bills.'}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'دکان کا عنوان' : 'Shop Title'}</label>
            <input value={form.shop_title} onChange={(e) => setForm({ ...form, shop_title: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'مالک / رابطہ کا نام' : 'Owner / Contact Name'}</label>
            <input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'فون / واٹس ایپ نمبر' : 'Phone / WhatsApp Number'} *</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 3XX XXXXXXX" className={inputCls} />
            <p className="text-[10px] text-slate-400 mt-1">{ur ? 'بل کے اوپر اور واٹس ایپ ہدایات میں دکھائی دے گا' : 'Shown at top header and in WhatsApp instructions'}</p>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'بینک کا نام' : 'Bank Name'}</label>
            <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Meezan Bank, JazzCash, EasyPaisa, HBL" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'اکاؤنٹ ٹائٹل' : 'Account Title'}</label>
            <input value={form.account_title} onChange={(e) => setForm({ ...form, account_title: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'اکاؤنٹ نمبر / IBAN' : 'Account Number / IBAN'}</label>
            <input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className={inputCls} />
          </div>

          {saved && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              {ur ? 'محفوظ ہو گیا' : 'Settings saved'}
            </div>
          )}
          <button onClick={save} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold">
            <Save className="w-4 h-4" />
            {ur ? 'محفوظ کریں' : 'Save Settings'}
          </button>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-700 mb-1.5">{ur ? 'بل پر پیش منظر' : 'Live Preview on Bill'}</div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-urdu" dir={ur ? 'rtl' : 'ltr'}>
            {preview.join('\n')}
          </div>
        </div>
      </div>
    </div>
  );
};
