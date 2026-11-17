import React, { useState, useEffect } from 'react';
import { X, Droplets, Calendar, User, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { CustomerItem } from '../types/electron';

interface AddMilkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenAddCustomer: () => void;
}

export const AddMilkModal: React.FC<AddMilkModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenAddCustomer,
}) => {
  const { t, language } = useLanguage();

  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [quantity, setQuantity] = useState<string>('2');
  const [rate, setRate] = useState<string>('90');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Due'>('Paid');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load customer list from SQLite
  useEffect(() => {
    async function loadCustomers() {
      if (window.electronAPI) {
        try {
          const list = await window.electronAPI.getCustomers();
          setCustomers(list);
          if (list.length > 0 && selectedCustomerId === '') {
            setSelectedCustomerId(list[0].id);
            setCustomerName(list[0].name);
            setRate(list[0].default_rate?.toString() || '90');
          }
        } catch (err) {
          console.error('Failed to load customers:', err);
        }
      }
    }
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
      if (found.default_rate) {
        setRate(found.default_rate.toString());
      }
    }
  };

  const parsedQty = parseFloat(quantity) || 0;
  const parsedRate = parseFloat(rate) || 0;
  const totalAmount = (parsedQty * parsedRate).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName && selectedCustomerId === '') {
      setError(language === 'ur' ? 'براہ کرم گاہک منتخب کریں' : 'Please select a customer');
      return;
    }
    if (parsedQty <= 0) {
      setError(language === 'ur' ? 'دودھ کی درست مقدار درج کریں' : 'Please enter valid milk quantity');
      return;
    }

    setIsSubmitting(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.addSale({
          date,
          customerId: Number(selectedCustomerId) || 0,
          customerName: customerName || 'Walk-in Customer',
          quantity: parsedQty,
          rate: parsedRate,
          totalAmount: parseFloat(totalAmount),
          paymentStatus,
          notes,
        });
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save record to SQLite');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-fade-in flex flex-col max-h-[90vh]">
        {/* Top Header Bar matching Screenshot 3 */}
        <div className="bg-brand-600 text-white px-5 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-brand-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold tracking-tight">{t.addMilk}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-brand-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Date Picker Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.date}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              />
            </div>
          </div>

          {/* Customer Dropdown + Add New */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                {t.customer}
              </label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddCustomer();
                }}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline"
              >
                {t.addNew}
              </button>
            </div>
            <select
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 bg-white"
            >
              <option value="">{t.selectCustomer}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || 'No phone'}) - Rate: {c.default_rate}
                </option>
              ))}
            </select>
          </div>

          {/* Milk Quantity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.milkQuantity}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Droplets className="w-4 h-4 text-brand-500" />
              </div>
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={t.enterQuantity}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-semibold"
              />
            </div>
          </div>

          {/* Rate Per Ltr */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.ratePerLtr}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                Rs.
              </div>
              <input
                type="number"
                step="1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={t.enterRate}
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-semibold"
              />
            </div>
          </div>

          {/* Total Amount (Calculated automatically) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.totalAmount}
            </label>
            <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base font-extrabold text-brand-700">
              Rs. {totalAmount}
            </div>
          </div>

          {/* Payment Status (Radio buttons matching screenshot) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {t.paymentStatus}
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                <input
                  type="radio"
                  name="paymentStatus"
                  value="Paid"
                  checked={paymentStatus === 'Paid'}
                  onChange={() => setPaymentStatus('Paid')}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-emerald-700 font-bold">{t.paid}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                <input
                  type="radio"
                  name="paymentStatus"
                  value="Due"
                  checked={paymentStatus === 'Due'}
                  onChange={() => setPaymentStatus('Due')}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-rose-600 font-bold">{t.due}</span>
              </label>
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.notesOptional}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.enterNotes}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 resize-none"
            />
          </div>

          {/* SAVE button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-75"
          >
            {isSubmitting ? 'Saving to SQLite...' : t.save}
          </button>
        </form>
      </div>
    </div>
  );
};
