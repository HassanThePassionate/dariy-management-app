import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  GripVertical,
  CheckSquare,
  Square,
  Phone,
  Clock,
  Sun,
  Moon,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { CustomerItem } from '../types/electron';

type ShiftFilter = 'all' | 'Morning' | 'Evening' | 'Both';

interface CustomersViewProps {
  onOpenAddCustomer: () => void;
  onEditCustomer: (customer: CustomerItem) => void;
  /** Bumped by the parent after a successful save so the list reloads */
  refreshKey?: number;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenAddCustomer,
  onEditCustomer,
  refreshKey = 0,
}) => {
  const { t, language } = useLanguage();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const list = await window.electronAPI.getCustomers();
        setCustomers(list);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [refreshKey]);

  // Keep selection valid as list changes
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => customers.some((c) => c.id === id)));
  }, [customers]);

  // Dynamic counts for each shift option
  const shiftCounts = useMemo(() => {
    let morning = 0;
    let evening = 0;
    let both = 0;
    for (const c of customers) {
      const s = c.shift || 'Morning';
      if (s === 'Morning' || s === 'Both') morning++;
      if (s === 'Evening' || s === 'Both') evening++;
      if (s === 'Both') both++;
    }
    return {
      all: customers.length,
      Morning: morning,
      Evening: evening,
      Both: both,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      // 1. Shift filter (Morning / Evening / Both)
      if (shiftFilter === 'Morning') {
        const s = c.shift || 'Morning';
        if (s !== 'Morning' && s !== 'Both') return false;
      } else if (shiftFilter === 'Evening') {
        const s = c.shift || 'Morning';
        if (s !== 'Evening' && s !== 'Both') return false;
      } else if (shiftFilter === 'Both') {
        if (c.shift !== 'Both') return false;
      }

      // 2. Search query filter
      if (q) {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const phoneMatch = c.phone ? c.phone.includes(q) : false;
        const addressMatch = c.address ? c.address.toLowerCase().includes(q) : false;
        if (!nameMatch && !phoneMatch && !addressMatch) return false;
      }

      return true;
    });
  }, [customers, searchQuery, shiftFilter]);

  const isFiltered = searchQuery.trim().length > 0 || shiftFilter !== 'all';
  const allVisibleSelected =
    filteredCustomers.length > 0 && filteredCustomers.every((c) => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredCustomers.map((c) => c.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      setSelectedIds((prev) => {
        const merged = new Set([...prev, ...filteredCustomers.map((c) => c.id)]);
        return Array.from(merged);
      });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDeleteOne = async (customer: CustomerItem) => {
    if (!confirm(`${t.deleteConfirm}\n\n${customer.name}`)) return;
    setBusy(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.deleteCustomer(customer.id);
        setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
        setSelectedIds((prev) => prev.filter((id) => id !== customer.id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`${t.deleteAllConfirm}\n\n${selectedIds.length} ${t.selectedCount}`)) return;
    setBusy(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.deleteCustomers(selectedIds);
        setCustomers((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Bulk delete failed:', err);
      alert('Bulk delete failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Drag & drop reordering (only allowed on the unfiltered full list)
  const handleDragStart = (e: React.DragEvent, id: number) => {
    if (isFiltered) {
      e.preventDefault();
      return;
    }
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    if (draggingId === null || draggingId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    const sourceId = draggingId ?? Number(e.dataTransfer.getData('text/plain'));
    setDragOverId(null);
    setDraggingId(null);

    if (!sourceId || sourceId === targetId) return;

    const fromIndex = customers.findIndex((c) => c.id === sourceId);
    const toIndex = customers.findIndex((c) => c.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    // Reorder locally first for instant feedback
    const next = [...customers];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    const renumbered = next.map((c, idx) => ({ ...c, sort_order: idx + 1 }));
    setCustomers(renumbered);

    try {
      if (window.electronAPI) {
        await window.electronAPI.reorderCustomers(renumbered.map((c) => c.id));
      }
    } catch (err) {
      console.error('Reorder failed:', err);
      loadCustomers(); // revert to persisted order
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const formatMoney = (value: number | undefined) => {
    const n = Number(value) || 0;
    return `Rs. ${n.toLocaleString()}`;
  };

  const getBalanceClass = (balance: number) =>
    balance > 0 ? 'text-rose-600' : 'text-emerald-600';

  const avatarColors = [
    'bg-emerald-500',
    'bg-brand-600',
    'bg-purple-600',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-600',
  ];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top action bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              <span>{t.customers}</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold">
                {isFiltered
                  ? `${filteredCustomers.length} / ${customers.length}`
                  : customers.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isFiltered
                ? language === 'ur'
                  ? 'فلٹر فعال ہے — ترتیب بدلنے کے لیے فلٹر کو تمام پر رکھیں'
                  : 'Filter active — switch to All to drag & reorder'
                : t.dragToReorder}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${t.search}...`}
                className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <button
              onClick={onOpenAddCustomer}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addNew}</span>
            </button>
          </div>
        </div>

        {/* Shift Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-500/20 pt-3">
          <div className="flex items-center gap-1.5 bg-[#091438] border border-blue-500/30 p-1 rounded-xl shadow-[0_0_12px_rgba(0,102,255,0.15)]">
            <span className="text-[11px] font-extrabold text-slate-300 px-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'ur' ? 'شفٹ فلٹر:' : 'Shift:'}</span>
            </span>
            {([
              {
                id: 'all' as const,
                label: language === 'ur' ? 'تمام' : 'All',
                icon: null,
                count: shiftCounts.all,
              },
              {
                id: 'Morning' as const,
                label: language === 'ur' ? 'صبح' : 'Morning',
                icon: Sun,
                count: shiftCounts.Morning,
              },
              {
                id: 'Evening' as const,
                label: language === 'ur' ? 'شام' : 'Evening',
                icon: Moon,
                count: shiftCounts.Evening,
              },
              {
                id: 'Both' as const,
                label: language === 'ur' ? 'دونوں وقت' : 'Both',
                icon: null,
                count: shiftCounts.Both,
              },
            ] as const).map((s) => {
              const active = shiftFilter === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShiftFilter(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(0,102,255,0.4)]'
                      : 'text-slate-300 hover:text-white hover:bg-blue-600/20'
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        active
                          ? 'text-white'
                          : s.id === 'Morning'
                          ? 'text-amber-400'
                          : 'text-cyan-400'
                      }`}
                    />
                  )}
                  <span>{s.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-[#0f1d47] text-cyan-300 border border-blue-500/30'
                    }`}
                  >
                    {s.count}
                  </span>
                </button>
              );
            })}
          </div>

          {shiftFilter !== 'all' && (
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <span>{language === 'ur' ? 'فلٹر شدہ گاہک:' : 'Showing:'}</span>
              <span className="font-bold text-slate-800">{filteredCustomers.length}</span>
              <button
                type="button"
                onClick={() => setShiftFilter('all')}
                className="text-[11px] text-brand-600 hover:underline font-bold ml-1 cursor-pointer"
              >
                {language === 'ur' ? '(تمام دکھائیں)' : '(Show All)'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
          <span className="text-xs font-bold text-rose-700">
            {selectedIds.length} {t.selectedCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.deleteSelected}</span>
            </button>
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="w-10 px-3 py-3">
                  <button
                    onClick={toggleSelectAll}
                    title={t.selectAll}
                    className="text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="w-8 px-1 py-3" />
                <th className="w-14 px-2 py-3 font-bold">{t.sno}</th>
                <th className="px-3 py-3 font-bold">{t.fullName}</th>
                <th className="px-3 py-3 font-bold">{t.whatsappNumber}</th>
                <th className="px-3 py-3 font-bold text-right">{t.milkRate}</th>
                <th className="px-3 py-3 font-bold text-right">{t.previousBalance}</th>
                <th className="px-3 py-3 font-bold text-right">{t.totalDue}</th>
                <th className="px-3 py-3 font-bold text-center w-24">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => {
                const isSelected = selectedIds.includes(c.id);
                const rowNumber = customers.findIndex((x) => x.id === c.id) + 1;

                return (
                  <tr
                    key={c.id}
                    draggable={!isFiltered}
                    onDragStart={(e) => handleDragStart(e, c.id)}
                    onDragOver={(e) => handleDragOver(e, c.id)}
                    onDrop={(e) => handleDrop(e, c.id)}
                    onDragEnd={handleDragEnd}
                    className={[
                      'border-b border-slate-100 last:border-b-0 transition-colors',
                      isSelected ? 'bg-brand-50/60' : 'hover:bg-slate-50/70',
                      draggingId === c.id ? 'opacity-40' : '',
                      dragOverId === c.id ? 'bg-brand-50 ring-2 ring-inset ring-brand-300' : '',
                    ].join(' ')}
                  >
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => toggleSelect(c.id)}
                        className="text-slate-400 hover:text-brand-600 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-brand-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-1 py-2.5">
                      <span
                        className={`inline-flex text-slate-300 ${
                          isFiltered ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                        }`}
                        title={isFiltered ? undefined : t.dragToReorder}
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-xs font-bold text-slate-400">{rowNumber}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl ${
                            avatarColors[(rowNumber - 1) % avatarColors.length]
                          } text-white flex items-center justify-center font-bold text-xs shrink-0`}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-[13px] truncate">
                            {c.name}
                            <button
                              type="button"
                              onClick={() =>
                                setShiftFilter(
                                  c.shift === 'Evening'
                                    ? 'Evening'
                                    : c.shift === 'Both'
                                    ? 'Both'
                                    : 'Morning'
                                )
                              }
                              title={
                                language === 'ur'
                                  ? 'اس شفٹ کے مطابق فلٹر کریں'
                                  : 'Filter by this shift'
                              }
                              className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold align-middle cursor-pointer transition-transform hover:scale-105 ${
                                c.shift === 'Evening'
                                  ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                  : c.shift === 'Both'
                                  ? 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                                  : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              }`}
                            >
                              {c.shift === 'Evening'
                                ? language === 'ur' ? 'شام' : 'Evening'
                                : c.shift === 'Both'
                                ? language === 'ur' ? 'دونوں' : 'Both'
                                : language === 'ur' ? 'صبح' : 'Morning'}
                            </button>
                          </div>
                          {c.address && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                              {c.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          {c.phone || '-'}
                        </span>
                        {c.phone && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              c.whatsapp_consent !== false
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            }`}
                            title={c.whatsapp_consent !== false ? 'WhatsApp Consent: Active' : 'WhatsApp Opted Out'}
                          >
                            {c.whatsapp_consent !== false ? 'WA' : 'Opt-Out'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold text-brand-700">
                      {formatMoney(c.default_rate)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600">
                      {formatMoney(c.previous_balance)}
                    </td>
                    <td className={`px-3 py-2.5 text-right text-xs font-bold ${getBalanceClass(c.balance)}`}>
                      {formatMoney(c.balance)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditCustomer(c)}
                          title={language === 'ur' ? 'ترمیم' : 'Edit'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteOne(c)}
                          disabled={busy}
                          title={language === 'ur' ? 'حذف' : 'Delete'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-xs text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-500">
                        {shiftFilter !== 'all'
                          ? language === 'ur'
                            ? `اس شفٹ (${
                                shiftFilter === 'Morning'
                                  ? 'صبح'
                                  : shiftFilter === 'Evening'
                                  ? 'شام'
                                  : 'دونوں وقت'
                              }) میں کوئی گاہک موجود نہیں ہے`
                            : `No customers found in ${shiftFilter} shift`
                          : t.noCustomers}
                      </p>
                      {shiftFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setShiftFilter('all')}
                          className="text-xs text-brand-600 hover:underline font-bold cursor-pointer mt-1"
                        >
                          {language === 'ur' ? 'تمام گاہک دکھائیں' : 'Show All Customers'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
