import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Store,
  ShoppingBag,
  FileSpreadsheet,
  Boxes,
  Truck,
  Receipt,
  Wallet,
  Settings,
  Droplet,
  Package,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { CowLogo } from './CowLogo';

export type PageId =
  | 'dashboard'
  | 'monthly-khatta'
  | 'customers'
  | 'suppliers'
  | 'daily-sale'
  | 'all-record'
  | 'daily-stock'
  | 'fleet-expenses'
  | 'ghee'
  | 'shopper'
  | 'monthly-bills'
  | 'payments'
  | 'settings';

interface SidebarProps {
  isOpen: boolean;
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  activePage,
  onSelectPage,
  onClose,
}) => {
  const { t, language } = useLanguage();

  const menuItems: { id: PageId; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: t.dashboard,
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'monthly-khatta',
      label: t.monthlyKhatta,
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      id: 'customers',
      label: t.customers,
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'suppliers',
      label: t.suppliers,
      icon: <Store className="w-5 h-5" />,
    },
    {
      id: 'daily-sale',
      label: t.dailySale,
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      id: 'all-record',
      label: t.allRecord,
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
    {
      id: 'daily-stock',
      label: t.dailyStock,
      icon: <Boxes className="w-5 h-5" />,
    },
    {
      id: 'fleet-expenses',
      label: t.fleetExpenses,
      icon: <Truck className="w-5 h-5" />,
    },
    // 'monthly-bills' and 'payments' are temporarily removed — not ready yet.
    // {
    //   id: 'monthly-bills',
    //   label: t.monthlyBills,
    //   icon: <Receipt className="w-5 h-5" />,
    // },
    // {
    //   id: 'payments',
    //   label: t.payments,
    //   icon: <Wallet className="w-5 h-5" />,
    // },
    {
      id: 'ghee',
      label: t.gheeStock,
      icon: <Droplet className="w-5 h-5" />,
    },
    {
      id: 'shopper',
      label: t.shopperStock,
      icon: <Package className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: t.settings,
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <>
      {/* Mobile/Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col shadow-xl transition-transform duration-300 ease-in-out ${
          language === 'ur'
            ? isOpen
              ? 'right-0 translate-x-0'
              : 'right-0 translate-x-full'
            : isOpen
            ? 'left-0 translate-x-0'
            : 'left-0 -translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-4 bg-brand-600 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center p-1.5 border border-white/20">
              <CowLogo variant="white" className="w-full h-full" />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-wide leading-tight">{t.appName}</h2>
              <p className="text-xs text-blue-100 font-medium">{t.shopName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-brand-700/70 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectPage(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 font-semibold shadow-xs border border-brand-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={`${isActive ? 'text-brand-600' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-brand-100 text-brand-700 font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-400 text-center">
          <span>Milk Shop v1.0 • Offline SQLite</span>
        </div>
      </aside>
    </>
  );
};
