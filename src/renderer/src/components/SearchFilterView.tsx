import React, { useState, useEffect } from 'react';
import { Filter, Search, RotateCcw, Calendar, User, ChevronDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { SaleItem, CustomerItem } from '../types/electron';

interface SearchFilterViewProps {
  pageTitle: string;
}

export const SearchFilterView: React.FC<SearchFilterViewProps> = ({ pageTitle }) => {
  const { t } = useLanguage();

  const [dateFrom, setDateFrom] = useState('01/05/2025');
  const [dateTo, setDateTo] = useState('20/05/2025');
  const [status, setStatus] = useState<string>('All');
  const [customerId, setCustomerId] = useState<string>('All');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const custList = await window.electronAPI.getCustomers();
        setCustomers(custList);

        const salesList = await window.electronAPI.getSales({
          status: status === 'All' ? undefined : status,
          customerId: customerId === 'All' ? undefined : Number(customerId),
        });
        setSales(salesList);
      }
    } catch (err) {
      console.error('Failed to load search data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleReset = () => {
    setDateFrom('01/05/2025');
    setDateTo('20/05/2025');
    setStatus('All');
    setCustomerId('All');
    setMinAmount('');
    setMaxAmount('');
    if (window.electronAPI) {
      window.electronAPI.getSales().then(setSales).catch(console.error);
    }
  };

  const totalAmountSum = sales.reduce((sum, item) => sum + (item.total_amount || item.totalAmount || 0), 0);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 5. Search / Filter Form (Matches Mockup 5) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="bg-brand-600 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <h3 className="font-bold text-sm tracking-tight">{t.searchFilter}</h3>
          </div>
        </div>

        <form onSubmit={handleSearch} className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.dateFrom}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="01/05/2025"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.dateTo}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="20/05/2025"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Customer Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.customer}
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                <option value="All">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Status Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.paymentStatus}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                <option value="All">All</option>
                <option value="Paid">{t.paid}</option>
                <option value="Due">{t.due}</option>
              </select>
            </div>

            {/* Min Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.minAmount}
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="Rs. Min amount"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.maxAmount}
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Rs. Max amount"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Buttons: RESET and SEARCH */}
          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              {t.reset}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              {t.search}
            </button>
          </div>
        </form>
      </div>

      {/* 6. Search Results / Listing Table (Matches Mockup 6) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Results Header */}
        <div className="bg-brand-600 text-white px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-tight">{t.searchResults}</h3>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
            {sales.length} items
          </span>
        </div>

        {/* Filter Summary Bar */}
        <div className="bg-blue-50/70 border-b border-blue-100 px-5 py-2.5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">From: <strong className="text-slate-800">{dateFrom}</strong></span>
            <span>•</span>
            <span className="font-medium">To: <strong className="text-slate-800">{dateTo}</strong></span>
            <span>•</span>
            <span className="font-medium">Customer: <strong className="text-slate-800">{customerId}</strong></span>
            <span>•</span>
            <span className="font-medium">Status: <strong className="text-slate-800">{status}</strong></span>
          </div>
          <button
            onClick={handleReset}
            className="text-brand-600 hover:text-brand-700 font-bold hover:underline shrink-0"
          >
            {t.clearFilter}
          </button>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">{t.date}</th>
                <th className="px-5 py-3">{t.customer}</th>
                <th className="px-5 py-3 text-center">{t.milkQuantity}</th>
                <th className="px-5 py-3 text-right">{t.ratePerLtr}</th>
                <th className="px-5 py-3 text-right">{t.totalAmount}</th>
                <th className="px-5 py-3 text-center">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sales.length > 0 ? (
                sales.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-600">{row.date}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{row.customer_name || row.customerName}</td>
                    <td className="px-5 py-3 text-center font-semibold">{row.quantity}</td>
                    <td className="px-5 py-3 text-right font-medium">{row.rate.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">
                      {(row.total_amount || row.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          (row.payment_status || row.paymentStatus) === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}
                      >
                        {(row.payment_status || row.paymentStatus) === 'Paid' ? t.paid : t.due}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No records found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="bg-slate-50/90 px-5 py-3 border-t border-slate-200 flex items-center justify-between font-bold text-xs text-slate-800">
          <div>
            {t.totalRecords}: <span className="text-brand-600">{sales.length}</span>
          </div>
          <div>
            Total Amount: <span className="text-brand-600">Rs. {totalAmountSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
