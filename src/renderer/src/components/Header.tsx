import React from 'react';
import { Menu, Bell, Globe, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { CowLogo } from './CowLogo';

interface HeaderProps {
  title: string;
  onToggleSidebar: () => void;
  onLogout: () => void;
  isDbConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onToggleSidebar,
  onLogout,
  isDbConnected,
}) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-brand-600 text-white shadow-md select-none">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Left: Hamburger & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-brand-700/60 active:bg-brand-800 transition-colors focus:outline-none"
            title="Toggle Menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          <CowLogo variant="white" className="w-8 h-8 shrink-0 hidden sm:block" />
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            {title}
          </h1>
        </div>

        {/* Right Actions: DB Status, Language Switcher, Notifications, Logout */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* SQLite DB Connection Pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isDbConnected
                ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40'
                : 'bg-rose-500/20 text-rose-100 border-rose-400/40'
            }`}
          >
            {isDbConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>SQLite Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
                <span>DB Disconnected</span>
              </>
            )}
          </div>

          {/* Bilingual Language Switcher */}
          <div className="flex items-center bg-brand-700/70 rounded-full p-0.5 border border-white/20 text-xs font-semibold">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-full transition-all ${
                language === 'en'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('ur')}
              className={`px-3 py-1 rounded-full transition-all font-urdu ${
                language === 'ur'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              اردو
            </button>
          </div>

          {/* Notification Bell */}
          <button
            className="relative p-2 rounded-full hover:bg-brand-700/60 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-white" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-300 rounded-full"></span>
          </button>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700/80 hover:bg-brand-800 transition-colors text-xs font-medium border border-white/10"
            title={t.logout}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.logout}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
