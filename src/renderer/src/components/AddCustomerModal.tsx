import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowLeft, User, Smartphone, MapPin, ListOrdered, Wallet } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { CustomerItem } from '../types/electron';

interface AddCustomerModalProps {
  isOpen: boolean;
  /** When provided the modal edits this customer, otherwise it adds a new one */
  customer?: CustomerItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const isEdit = !!customer;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [rate, setRate] = useState('90');
  const [previousBalance, setPreviousBalance] = useState('0');
  const [shift, setShift] = useState('Morning');
  const [position, setPosition] = useState('1');
  const [existing, setExisting] = useState<CustomerItem[]>([]);
  const [positionTouched, setPositionTouched] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load current order so the position picker can show rows by customer name
  useEffect(() => {
    if (!isOpen) return;

    async function loadExisting() {
      try {
        if (window.electronAPI) {
          const list = await window.electronAPI.getCustomers();
          setExisting(list);
        }
      } catch (err) {
        console.error('Failed to load customers for position picker:', err);
      }
    }
    loadExisting();
  }, [isOpen]);

  // Reset form whenever the modal opens / target changes
  useEffect(() => {
    if (!isOpen) return;

    if (customer) {
      setName(customer.name);
      setPhone(customer.phone || '');
      setAddress(customer.address || '');
      setRate(String(customer.default_rate ?? 90));
      setPreviousBalance(String(customer.previous_balance ?? 0));
      setShift(customer.shift || 'Morning');
      setPosition(String(customer.sort_order || 1));
      setWhatsappConsent(customer.whatsapp_consent !== false);
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setRate('90');
      setPreviousBalance('0');
      setShift('Morning');
      setPosition('');
      setWhatsappConsent(true);
    }
    setPositionTouched(false);
    setError('');
  }, [isOpen, customer]);

  const otherCustomers = useMemo(
    () => existing.filter((c) => c.id !== customer?.id),
    [existing, customer]
  );

  // Rows available: 1..N for edit, 1..N+1 for add
  const rowCount = otherCustomers.length + (isEdit ? 0 : 1);

  // On add, keep the picker on the last row until the user chooses otherwise
  useEffect(() => {
    if (isOpen && !customer && !positionTouched) {
      setPosition(String(rowCount));
    }
  }, [isOpen, customer, positionTouched, rowCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(language === 'ur' ? 'براہ کرم گاہک کا نام درج کریں' : 'Please enter customer name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (window.electronAPI) {
        const payload = {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          default_rate: parseFloat(rate) || 90.0,
          previous_balance: parseFloat(previousBalance) || 0,
          shift,
          position: parseInt(position, 10) || undefined,
          whatsapp_consent: whatsappConsent,
        };

        if (customer) {
          const res = await window.electronAPI.updateCustomer({ id: customer.id, ...payload });
          if (!res?.success) throw new Error(res?.error || 'Failed to update customer');
        } else {
          await window.electronAPI.addCustomer(payload);
        }

        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-brand-600 text-white px-5 py-3.5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-brand-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold tracking-tight">
              {isEdit ? t.editCustomer : t.addCustomer}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-brand-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.fullName}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.enterFullName}
                autoFocus
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              />
            </div>
          </div>

          {/* WhatsApp Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.whatsappNumber}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <input
                type="text"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.whatsappPlaceholder}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              />
            </div>
            <label className="mt-2 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-[11px] font-bold text-slate-600">
                {language === 'ur'
                  ? 'واٹس ایپ بل نوٹیفکیشن موصول کرنے کی رضامندی (WhatsApp Consent)'
                  : 'Receive automated monthly bills via WhatsApp'}
              </span>
            </label>
          </div>

          {/* Address (kept optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.address}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.enterAddress}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              />
            </div>
          </div>

          {/* Milk Rate + Previous Balance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.milkRate} (Rs.)
              </label>
              <input
                type="number"
                step="1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={t.enterRate}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.previousBalance}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  step="1"
                  value={previousBalance}
                  onChange={(e) => setPreviousBalance(e.target.value)}
                  placeholder={t.enterPreviousBalance}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Shift */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {language === 'ur' ? 'شفٹ (دودھ کا وقت)' : 'Shift (milk time)'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Morning', language === 'ur' ? 'صبح' : 'Morning'],
                ['Evening', language === 'ur' ? 'شام' : 'Evening'],
                ['Both', language === 'ur' ? 'دونوں' : 'Both'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setShift(id)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                    shift === id
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Row Position */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.rowPosition}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <ListOrdered className="w-4 h-4" />
              </div>
              <select
                value={position || String(rowCount)}
                onChange={(e) => {
                  setPositionTouched(true);
                  setPosition(e.target.value);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-semibold appearance-none cursor-pointer"
              >
                {Array.from({ length: Math.max(rowCount, 1) }, (_, i) => i + 1).map((rowNo) => {
                  const occupant = otherCustomers[rowNo - 1];
                  return (
                    <option key={rowNo} value={rowNo}>
                      {`${language === 'ur' ? 'قطار' : 'Row'} ${rowNo}`}
                      {occupant ? ` — ${occupant.name}` : ` (${language === 'ur' ? 'آخر' : 'last'})`}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
              {t.rowPositionHint}
            </p>
          </div>

          {/* Save */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-75"
          >
            {isSubmitting ? 'Saving...' : isEdit ? t.update : t.save}
          </button>
        </form>
      </div>
    </div>
  );
};
