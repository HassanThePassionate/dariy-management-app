import React, { useState, useMemo } from 'react';
import { X, Zap, Search } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { KhataCustomer } from '../types/electron';

interface BulkEntryModalProps {
  isOpen: boolean;
  customers: KhataCustomer[];
  daysInMonth: number;
  monthLabel: string;
  onClose: () => void;
  onApply: (payload: {
    customerIds: number[];
    fromDay: number;
    toDay: number;
    quantity: number;
  }) => Promise<void>;
}

export const BulkEntryModal: React.FC<BulkEntryModalProps> = ({
  isOpen,
  customers,
  daysInMonth,
  monthLabel,
  onClose,
  onApply,
}) => {
  const { t, language } = useLanguage();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState('2');
  const [fromDay, setFromDay] = useState('1');
  const [toDay, setToDay] = useState(String(daysInMonth));
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  // Reset defaults each time the modal opens (default: NO customers selected)
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setSelectedIds([]);
      setSearchQuery('');
      setToDay(String(daysInMonth));
      setFromDay('1');
      setError('');
    }
  }

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone && String(c.phone).includes(q))
    );
  }, [customers, searchQuery]);

  const isAllSelected = searchQuery.trim()
    ? filteredCustomers.length > 0 && filteredCustomers.every((c) => selectedIds.includes(c.id))
    : customers.length > 0 && selectedIds.length === customers.length;

  const toggleAll = () => {
    if (searchQuery.trim()) {
      const visibleIds = filteredCustomers.map((c) => c.id);
      const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));
      if (allVisibleSelected) {
        setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      } else {
        setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      }
    } else {
      setSelectedIds(selectedIds.length === customers.length ? [] : customers.map((c) => c.id));
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const totalCells = useMemo(() => {
    const from = parseInt(fromDay, 10) || 1;
    const to = parseInt(toDay, 10) || daysInMonth;
    const span = Math.max(0, Math.min(to, daysInMonth) - Math.max(from, 1) + 1);
    return selectedIds.length * span;
  }, [fromDay, toDay, daysInMonth, selectedIds.length]);

  const handleApply = async () => {
    setError('');

    const qty = parseFloat(quantity);
    const from = parseInt(fromDay, 10);
    const to = parseInt(toDay, 10);

    if (selectedIds.length === 0) {
      setError(language === 'ur' ? 'کم از کم ایک گاہک منتخب کریں' : 'Select at least one customer');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError(language === 'ur' ? 'درست مقدار درج کریں' : 'Enter a valid quantity');
      return;
    }
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to > daysInMonth || from > to) {
      setError(
        language === 'ur'
          ? `درست دن منتخب کریں (1 سے ${daysInMonth} تک)`
          : `Choose a valid day range (1 to ${daysInMonth})`
      );
      return;
    }

    setApplying(true);
    try {
      await onApply({ customerIds: selectedIds, fromDay: from, toDay: to, quantity: qty });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Bulk fill failed');
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-brand-600 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">{t.bulkEntry}</h2>
              <p className="text-[11px] text-blue-100">{monthLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-brand-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Daily quantity */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.qtyLtr}
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t.fromDay}</label>
              <select
                value={fromDay}
                onChange={(e) => setFromDay(e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-slate-200 text-sm bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t.toDay}</label>
              <select
                value={toDay}
                onChange={(e) => setToDay(e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-slate-200 text-sm bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                {t.customers} ({selectedIds.length}/{customers.length})
              </label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
              >
                {isAllSelected ? t.clearAll : t.selectAll}
              </button>
            </div>

            {/* Search bar inside bulk modal */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute inset-y-0 left-2.5 my-auto pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'ur'
                    ? 'گاہک تلاش کریں (نام یا فون)...'
                    : 'Search customers (name or phone)...'
                }
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2 my-auto text-xs text-slate-400 hover:text-slate-600 font-bold px-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filteredCustomers.map((c) => {
                const customerNumber = customers.findIndex((x) => x.id === c.id) + 1;
                const checked = selectedIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-xs transition-colors ${
                      checked ? 'bg-brand-50/70 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(c.id)}
                      className="accent-brand-600 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold border border-slate-200">
                      #{customerNumber}
                    </span>
                    <span className="font-semibold text-slate-700 flex-1 truncate">{c.name}</span>
                    <span className="text-slate-400 text-[11px]">{c.phone || '-'}</span>
                  </label>
                );
              })}

              {filteredCustomers.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  {language === 'ur' ? 'کوئی گاہک نہیں ملا' : 'No customers found'}
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 leading-snug">
            {language === 'ur'
              ? `${totalCells} خانے ${quantity || 0} لیٹر سے بھرے جائیں گے۔ پہلے سے موجود قدریں تبدیل ہو جائیں گی۔`
              : `${totalCells} cells will be filled with ${quantity || 0} ltr. Existing values will be overwritten.`}
          </div>

          <button
            onClick={handleApply}
            disabled={applying}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-75"
          >
            {applying ? t.saving : t.apply}
          </button>
        </div>
      </div>
    </div>
  );
};
