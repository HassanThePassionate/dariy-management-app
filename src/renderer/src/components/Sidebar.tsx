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
  Settings,
  Droplet,
  Package,
  MessageSquare,
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
      id: 'customers',
      label: t.customers,
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'daily-sale',
      label: t.dailySale,
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      id: 'monthly-khatta',
      label: t.monthlyKhatta,
      icon: <BookOpen className="w-5 h-5" />,
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
      id: 'suppliers',
      label: t.suppliers,
      icon: <Store className="w-5 h-5" />,
    },
    {
      id: 'fleet-expenses',
      label: t.fleetExpenses,
      icon: <Truck className="w-5 h-5" />,
    },
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
      id: 'monthly-bills',
      label: language === 'ur' ? 'واٹس ایپ بلز' : 'WhatsApp Bills',
      icon: <MessageSquare className="w-5 h-5" />,
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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 z-50 w-72 bg-[#060e28] border-r border-blue-500/20 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out ${
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
        <div className="p-4 bg-[#050d24] text-white border-b border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full bg-[#0b1437] flex items-center justify-center p-0.5 border border-cyan-400/50 shadow-[0_0_14px_rgba(0,150,255,0.35)] shrink-0"
            >
              <CowLogo variant="white" size={40} className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h2 className="font-black text-base tracking-wide text-white leading-tight">
                {t.appName}
              </h2>
              <p className="text-xs text-cyan-300/80 font-medium">{t.shopName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-blue-600/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/40 shadow-[0_0_15px_rgba(0,150,255,0.2)]'
                    : 'text-slate-300 hover:bg-[#0b1437] hover:text-white border border-transparent'
                }`}
              >
                <span className={`${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-cyan-300 font-bold border border-blue-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-blue-500/20 bg-[#050d24] text-xs text-slate-400 text-center">
          <span className="text-cyan-400/80 font-medium">Milk Shop v1.0</span> • Offline SQLite
        </div>
      </aside>
    </>
  );
};
