import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Store, Home, Wallet, Bike, FileQuestion, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { ExpenseItem } from '../types/electron';

type Cat = 'Shop' | 'Home' | 'Drawer' | 'Fleet' | 'Other';

const FLEET_ACTIONS = [
  { id: 'Fuel', ur: 'پیٹرول (Fuel)', en: 'Fuel / Petrol', icon: '⛽' },
  { id: 'Oil', ur: 'موبل آئل (Oil Change)', en: 'Engine Oil', icon: '🛢️' },
  { id: 'Tuning', ur: 'ٹیوننگ / سروس', en: 'Tuning & Service', icon: '🔧' },
  { id: 'Puncture', ur: 'پنکچر / ٹائر', en: 'Puncture & Tyre', icon: '🛞' },
  { id: 'Spare', ur: 'اسپیئر پارٹس', en: 'Spare Parts', icon: '⚙️' },
  { id: 'Wash', ur: 'واشنگ / صفائی', en: 'Car/Bike Wash', icon: '🚿' },
];

const money = (n: number) => Math.round(n).toLocaleString('en-US');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const CATS: { id: Cat; label: string; sub: string; icon: React.ReactNode; color: string }[] = [
  { id: 'Shop', label: 'Shop Expense', sub: 'Bills, rent, supplies', icon: <Store className="w-5 h-5" />, color: 'brand' },
  { id: 'Home', label: 'Home Expense', sub: 'Household items', icon: <Home className="w-5 h-5" />, color: 'amber' },
  { id: 'Drawer', label: 'Drawer Cash Out', sub: 'Till drawer payouts', icon: <Wallet className="w-5 h-5" />, color: 'purple' },
  { id: 'Fleet', label: 'Fleet & Bikes', sub: 'Fuel, oil, tuning', icon: <Bike className="w-5 h-5" />, color: 'rose' },
  { id: 'Other', label: 'Other Expenses', sub: 'Misc refreshment', icon: <FileQuestion className="w-5 h-5" />, color: 'slate' },
];

const colorCls: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
};

export const ExpensesView: React.FC = () => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [mainTab, setMainTab] = useState<'expenses' | 'fleet'>('expenses');
  const [vehicles, setVehicles] = useState<Array<{ id: number; name: string; reg_number: string; type: string; assigned_to?: string }>>([]);
  const [month, setMonth] = useState(monthOf(new Date()));
  const [list, setList] = useState<ExpenseItem[]>([]);
  const [filter, setFilter] = useState<Cat | 'All'>('All');
  const [category, setCategory] = useState<Cat>('Shop');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [paidTo, setPaidTo] = useState('');
  const [source, setSource] = useState('Cash');
  const [error, setError] = useState('');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehName, setNewVehName] = useState('');
  const [newVehReg, setNewVehReg] = useState('');
  const [newVehDriver, setNewVehDriver] = useState('');

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
  const [fleetAction, setFleetAction] = useState<string>('Fuel');

  const applyFleetSelection = (vehId: number | '', actionId: string) => {
    setSelectedVehicleId(vehId);
    setFleetAction(actionId);
    const act = FLEET_ACTIONS.find((a) => a.id === actionId);
    const actLabel = act ? (ur ? act.ur : act.en) : actionId;
    if (vehId !== '') {
      const v = vehicles.find((x) => x.id === vehId);
      if (v) {
        setTitle(`${v.name} (${v.reg_number}) - ${actLabel}`);
        if (v.assigned_to) {
          setPaidTo(v.assigned_to);
        }
      }
    } else {
      setTitle(`${ur ? 'بائیک / گاڑی' : 'Vehicle'} - ${actLabel}`);
    }
  };

  // Editing expense state
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [editError, setEditError] = useState('');

  const load = useCallback(async () => {
    if (window.electronAPI) {
      setList(await window.electronAPI.getExpenses(month));
      setVehicles(await window.electronAPI.getVehicles());
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const t: Record<Cat, number> = { Shop: 0, Home: 0, Drawer: 0, Fleet: 0, Other: 0 };
    let grand = 0, today = 0;
    const todayKey = todayStr();
    for (const x of list) {
      if (t[x.category as Cat] !== undefined) {
        t[x.category as Cat] += x.amount;
      }
      grand += x.amount;
      if (x.date === todayKey) today += x.amount;
    }
    return { t, grand, today };
  }, [list]);

  const filtered = filter === 'All' ? list : list.filter((x) => x.category === filter);

  const submit = async () => {
    setError('');
    if (!title.trim()) return setError(ur ? 'عنوان لکھیں' : 'Enter a description');
    const amt = parseFloat(amount);
    if (!(amt > 0)) return setError(ur ? 'درست رقم لکھیں' : 'Enter a valid amount');
    const res = await window.electronAPI?.addExpense({ category, title, amount: amt, date, paidTo, source });
    if (!res?.success) return setError(res?.error || 'Failed to save');
    setTitle('');
    setAmount('');
    setPaidTo('');
    setSelectedVehicleId('');
    load();
  };

  const remove = async (id: number) => {
    if (!confirm(ur ? 'یہ اندراج حذف کریں؟' : 'Delete this entry?')) return;
    await window.electronAPI?.deleteExpense(id);
    load();
  };

  const saveEditedExpense = async () => {
    if (!editingExpense || !window.electronAPI) return;
    setEditError('');
    if (!editingExpense.title.trim()) {
      return setEditError(ur ? 'عنوان درج کریں' : 'Title is required');
    }
    if (!(editingExpense.amount > 0)) {
      return setEditError(ur ? 'درست رقم درج کریں' : 'Enter a valid amount');
    }

    const res = await window.electronAPI.updateExpense({
      id: editingExpense.id,
      category: editingExpense.category,
      title: editingExpense.title.trim(),
      amount: editingExpense.amount,
      date: editingExpense.date,
      paidTo: editingExpense.paid_to || undefined,
      source: editingExpense.payment_source || 'Cash',
      notes: editingExpense.notes || undefined,
    });

    if (!res.success) {
      return setEditError(res.error || 'Failed to update');
    }

    setEditingExpense(null);
    load();
  };

  const shiftMonth = (d: number) => {
    const [y, m] = month.split('-').map(Number);
    setMonth(monthOf(new Date(y, m - 1 + d, 1)));
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500';

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-10">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
        <h2 className="text-lg font-bold text-slate-800">{ur ? 'روزانہ اخراجات اور گاڑیاں' : 'Daily Expenses & Fleet Management'}</h2>
        <p className="text-xs text-slate-500 mt-1">
          {ur
            ? 'دکان کے اخراجات، گھریلو خرچے، کیش ڈرائر کی ادائیگیاں، اور موٹرسائیکل/پک اپ کی دیکھ بھال کا ریکارڈ رکھیں'
            : 'Track shop expenses, household costs, cash drawer payouts, and motorcycle/pickup vehicle maintenance'}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(filter === c.id ? 'All' : c.id)}
            className={`text-left rounded-2xl border p-3.5 transition-all ${colorCls[c.color]} ${filter === c.id ? 'ring-2 ring-brand-400' : ''}`}
          >
            <div className="flex items-center gap-2 mb-1">{c.icon}<span className="text-xs font-bold">{c.label}</span></div>
            <div className="text-lg font-extrabold">Rs. {money(totals.t[c.id])}</div>
            <div className="text-[10px] opacity-70">{c.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">{ur ? 'کل رقم' : 'Grand Total'}</span>
          <span className="text-xl font-extrabold">Rs. {money(totals.grand)}</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">{ur ? 'آج' : 'Today'}</span>
          <span className="text-xl font-extrabold text-slate-800">Rs. {money(totals.today)}</span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMainTab('expenses')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
            mainTab === 'expenses'
              ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>{ur ? 'روزمرہ اخراجات و کیش ڈرائر (Shop, Home, Till)' : 'Daily Expenses & Cash Drawer (Shop, Home, Till)'}</span>
        </button>
        <button
          onClick={() => setMainTab('fleet')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
            mainTab === 'fleet'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>{ur ? `بائیکس و گاڑیاں (${vehicles.length})` : `Bikes & Vehicles Fleet (${vehicles.length})`}</span>
        </button>
      </div>

      {mainTab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              {ur ? 'گاڑیوں اور موٹرسائیکلوں کی فہرست' : 'Vehicles & Motorcycles Fleet'}
            </h3>
            <button
              onClick={() => setShowAddVehicle(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{ur ? 'نئی گاڑی شامل کریں' : 'Add Vehicle'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vehicles.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{v.name}</h4>
                      <p className="text-[11px] font-mono text-slate-500 font-semibold">{v.reg_number}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(ur ? 'گاڑی حذف کریں؟' : 'Delete vehicle?')) return;
                      await window.electronAPI?.deleteVehicle(v.id);
                      load();
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-400">{ur ? 'ڈرائیور / رائیڈر:' : 'Assigned to:'}</span>
                  <span className="font-bold text-slate-700">{v.assigned_to || '-'}</span>
                </div>

                <button
                  onClick={() => {
                    setCategory('Fleet');
                    applyFleetSelection(v.id, 'Fuel');
                    setMainTab('expenses');
                  }}
                  className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  {ur ? 'خرچ درج کریں' : 'Log Expense'}
                </button>
              </div>
            ))}
          </div>

          {showAddVehicle && (
            <div className="bg-white rounded-2xl border border-brand-200 p-4 space-y-3 shadow-md max-w-md">
              <h4 className="text-xs font-bold text-slate-800">{ur ? 'نئی گاڑی کا اندراج' : 'Add New Vehicle'}</h4>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{ur ? 'نام (جیسے Bike 1)' : 'Name'} *</label>
                <input value={newVehName} onChange={(e) => setNewVehName(e.target.value)} placeholder="e.g. Bike 3 (Honda 70)" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{ur ? 'رجسٹریشن نمبر' : 'Reg Number'}</label>
                <input value={newVehReg} onChange={(e) => setNewVehReg(e.target.value)} placeholder="e.g. LE-2024" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{ur ? 'رائیڈر / ڈرائیور' : 'Rider / Driver'}</label>
                <input value={newVehDriver} onChange={(e) => setNewVehDriver(e.target.value)} placeholder="e.g. Aslam" className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!newVehName.trim()) return;
                    await window.electronAPI?.addVehicle({ name: newVehName, regNumber: newVehReg, assignedTo: newVehDriver });
                    setNewVehName('');
                    setNewVehReg('');
                    setNewVehDriver('');
                    setShowAddVehicle(false);
                    load();
                  }}
                  className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold cursor-pointer"
                >
                  {ur ? 'محفوظ کریں' : 'Save'}
                </button>
                <button
                  onClick={() => setShowAddVehicle(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  {ur ? 'منسوخ' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mainTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 self-start">
            <h3 className="text-sm font-bold text-slate-800">{ur ? 'نیا اخراجہ / کیش آؤٹ درج کریں' : 'Log New Expense / Cash Out'}</h3>
            {error && <div className="p-2 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">{error}</div>}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{ur ? 'قسم منتخب کریں' : 'Select Category'}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {CATS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCategory(c.id);
                      if (c.id === 'Fleet') {
                        if (selectedVehicleId !== '') {
                          applyFleetSelection(selectedVehicleId, fleetAction);
                        } else if (vehicles.length > 0) {
                          applyFleetSelection(vehicles[0].id, fleetAction || 'Fuel');
                        }
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      category === c.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {c.icon}
                    {c.label.replace(' Expense', '').replace(' Cash Out', '').replace('Other Expenses', ur ? 'دیگر' : 'Other')}
                  </button>
                ))}
              </div>
            </div>

            {category === 'Fleet' && (
              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <Bike className="w-4 h-4 text-rose-600" />
                      <span>{ur ? 'بائیک / گاڑی منتخب کریں' : 'Select Bike / Vehicle'}</span>
                      <span className="text-[10px] text-rose-600 font-normal">({vehicles.length} {ur ? 'دستیاب' : 'available'})</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMainTab('fleet');
                        setShowAddVehicle(true);
                      }}
                      className="text-[10px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                    >
                      {ur ? '+ نئی بائیک شامل کریں' : '+ Add New Bike'}
                    </button>
                  </div>

                  <select
                    value={selectedVehicleId}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      applyFleetSelection(val, fleetAction);
                    }}
                    className={`${inputCls} bg-white text-xs font-semibold text-slate-800 border-rose-200 focus:border-rose-500 focus:ring-rose-500/20`}
                  >
                    <option value="">{ur ? '-- بائیک یا گاڑی منتخب کریں --' : '-- Choose Bike / Vehicle --'}</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} • {v.reg_number} {v.assigned_to ? `(${ur ? 'ڈرائیور: ' : 'Driver: '}${v.assigned_to})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-1">
                    {ur ? 'خرچ کی نوعیت (فوری انتخاب):' : 'Quick Expense Type:'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FLEET_ACTIONS.map((fa) => (
                      <button
                        type="button"
                        key={fa.id}
                        onClick={() => applyFleetSelection(selectedVehicleId, fa.id)}
                        className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          fleetAction === fa.id
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white text-rose-800 border-rose-200/90 hover:bg-rose-100/50'
                        }`}
                      >
                        <span>{fa.icon}</span>
                        <span className="truncate">{ur ? fa.ur.split(' ')[0] : fa.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'تفصیل / عنوان' : 'Description / Title'} *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ur ? 'مثلاً بجلی کا بل، دکان کرایہ' : 'e.g. Electricity bill, shop rent, cleaning'} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'رقم' : 'Amount (PKR)'} *</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'تاریخ' : 'Date'} *</label>
                <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'کسے ادا کیا (اختیاری)' : 'Paid To (Optional)'}</label>
              <input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder={ur ? 'مثلاً احمد، خان' : 'e.g. Ahmad, Khan, Worker'} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'ادائیگی کا ذریعہ' : 'Payment Source'}</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={`${inputCls} bg-white`}>
                <option value="Cash">{ur ? 'دکان کیش ٹِل / ڈرائر' : 'Shop Cash Till / Drawer'}</option>
                <option value="Bank">{ur ? 'بینک' : 'Bank'}</option>
                <option value="Personal">{ur ? 'ذاتی جیب' : 'Personal pocket'}</option>
              </select>
            </div>

            <button onClick={submit} className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm cursor-pointer shadow-xs">
              {ur ? 'اخراجہ محفوظ کریں' : 'Save Expense / Cash Out'}
            </button>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 overflow-hidden self-start">
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">{ur ? 'تمام اخراجات' : 'All Expenses'}</h3>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5">
                <button onClick={() => shiftMonth(-1)} className="p-1 rounded-lg hover:bg-white cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-[11px] font-bold text-slate-600 px-1">{month}</span>
                <button onClick={() => shiftMonth(1)} className="p-1 rounded-lg hover:bg-white cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex gap-1.5 px-4 py-2 border-b border-slate-100 overflow-x-auto">
              {(['All', ...CATS.map((c) => c.id)] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${filter === f ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  {f === 'All' ? (ur ? 'سب' : 'All') : f}
                </button>
              ))}
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {filtered.map((x) => (
                <div key={x.id} className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-slate-50/70 transition-colors">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                      {x.category === 'Fleet' && (
                        <span className="p-0.5 rounded-md bg-rose-100 text-rose-700 shrink-0 inline-flex items-center" title="Fleet / Bike">
                          <Bike className="w-3 h-3" />
                        </span>
                      )}
                      <span className="truncate">{x.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {x.date} • {x.category}
                      {x.paid_to ? ` • ${x.paid_to}` : ''}
                      {x.payment_source ? ` • ${x.payment_source}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <b className="text-slate-800">Rs. {money(x.amount)}</b>
                    <button
                      onClick={() => {
                        setEditError('');
                        setEditingExpense({ ...x });
                      }}
                      title={ur ? 'ترمیم کریں' : 'Edit'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 cursor-pointer transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(x.id)}
                      title={ur ? 'حذف کریں' : 'Delete'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="py-10 text-center text-xs text-slate-400">{ur ? 'کوئی اندراج نہیں' : 'No expenses yet'}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-brand-600 text-white px-5 py-3.5 flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                <span>{ur ? 'اخراجہ میں ترمیم' : 'Edit Expense'}</span>
              </h2>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {editError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{ur ? 'قسم' : 'Category'}</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setEditingExpense({ ...editingExpense, category: c.id })}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                        editingExpense.category === c.id
                          ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {c.icon}
                      <span className="truncate">{c.label.replace(' Expense', '').replace(' Cash Out', '').replace('Other Expenses', ur ? 'دیگر' : 'Other')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {editingExpense.category === 'Fleet' && (
                <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-rose-600" />
                    <span>{ur ? 'بائیک / گاڑی منتخب کریں' : 'Select Bike / Vehicle'}</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      if (val !== '') {
                        const v = vehicles.find((x) => x.id === val);
                        if (v) {
                          setEditingExpense({
                            ...editingExpense,
                            title: `${v.name} (${v.reg_number}) - ${ur ? 'پیٹرول (Fuel)' : 'Fuel'}`,
                            paid_to: v.assigned_to || editingExpense.paid_to,
                          });
                        }
                      }
                    }}
                    className={`${inputCls} bg-white text-xs font-semibold text-slate-800 border-rose-200 focus:border-rose-500`}
                    defaultValue=""
                  >
                    <option value="">{ur ? '-- بائیک تبدیل / منتخب کریں --' : '-- Choose / Switch Bike --'}</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} • {v.reg_number} {v.assigned_to ? `(${ur ? 'ڈرائیور: ' : 'Driver: '}${v.assigned_to})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'تفصیل / عنوان' : 'Description / Title'} *</label>
                <input
                  value={editingExpense.title}
                  onChange={(e) => setEditingExpense({ ...editingExpense, title: e.target.value })}
                  className={inputCls}
                  placeholder={ur ? 'تفصیل درج کریں' : 'Enter title'}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'رقم' : 'Amount (PKR)'} *</label>
                  <input
                    type="number"
                    value={editingExpense.amount || ''}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'تاریخ' : 'Date'} *</label>
                  <input
                    type="date"
                    value={editingExpense.date}
                    onChange={(e) => e.target.value && setEditingExpense({ ...editingExpense, date: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'کسے ادا کیا' : 'Paid To'}</label>
                <input
                  value={editingExpense.paid_to || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, paid_to: e.target.value })}
                  className={inputCls}
                  placeholder={ur ? 'نام (اختیاری)' : 'e.g. Ahmad'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{ur ? 'ادائیگی کا ذریعہ' : 'Payment Source'}</label>
                <select
                  value={editingExpense.payment_source || 'Cash'}
                  onChange={(e) => setEditingExpense({ ...editingExpense, payment_source: e.target.value })}
                  className={`${inputCls} bg-white`}
                >
                  <option value="Cash">{ur ? 'دکان کیش ٹِل / ڈرائر' : 'Shop Cash Till / Drawer'}</option>
                  <option value="Bank">{ur ? 'بینک' : 'Bank'}</option>
                  <option value="Personal">{ur ? 'ذاتی جیب' : 'Personal pocket'}</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={saveEditedExpense}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm cursor-pointer shadow-xs"
                >
                  {ur ? 'محفوظ کریں' : 'Update Expense'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
                >
                  {ur ? 'منسوخ' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
