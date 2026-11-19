import React, { useState, useEffect } from 'react';
import { Menu, ArrowLeft, LogOut, CheckCircle2, AlertCircle, Cloud } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { CowLogo } from './CowLogo';

interface HeaderProps {
  title: string;
  onToggleSidebar: () => void;
  onLogout: () => void;
  isDbConnected: boolean;
  canGoBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onToggleSidebar,
  onLogout,
  isDbConnected,
  canGoBack = false,
  onBack,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);

  useEffect(() => {
    async function checkCloud() {
      if (window.electronAPI?.getCloudConnectionStatus) {
        try {
          const res = await window.electronAPI.getCloudConnectionStatus();
          setCloudConnected(res.isBackendReachable);
        } catch {}
      }
    }
    checkCloud();
    const interval = setInterval(checkCloud, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#050d24] text-white border-b border-blue-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)] select-none">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Left: Hamburger, Back Button & Title */}
        <div className="flex items-center gap-2.5 md:gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl bg-[#0b1437] hover:bg-blue-600/30 text-cyan-400 border border-blue-500/30 transition-all cursor-pointer focus:outline-none shadow-[0_0_10px_rgba(0,102,255,0.15)]"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5 text-cyan-400" />
          </button>

          {/* Global Back Button (Requested by User) */}
          {canGoBack && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white font-black text-xs border border-cyan-400/50 shadow-[0_0_12px_rgba(0,150,255,0.35)] cursor-pointer transition-all active:scale-95"
              title={language === 'ur' ? 'پچھلے صفحے پر واپس جائیں' : 'Back'}
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>{language === 'ur' ? 'واپس' : 'Back'}</span>
            </button>
          )}

          <div className="w-11 h-11 rounded-full bg-[#0b1437] p-0.5 border border-cyan-400/50 shadow-[0_0_14px_rgba(0,150,255,0.35)] flex items-center justify-center shrink-0">
            <CowLogo variant="white" size={36} className="w-9 h-9 object-contain" />
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            {title}
          </h1>
        </div>

        {/* Right Actions: DB Status, Language Switcher, Logout (Notifications & Profile removed as requested) */}
        <div className="flex items-center gap-2.5 md:gap-4">
          {/* SQLite DB Connection Pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isDbConnected
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-rose-950/40 text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
            }`}
          >
            {isDbConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>SQLite Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>DB Disconnected</span>
              </>
            )}
          </div>

          {/* Cloud Backend Online Sync Pill */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              cloudConnected
                ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-700/50'
            }`}
          >
            <Cloud className={`w-3.5 h-3.5 ${cloudConnected ? 'text-cyan-400' : 'text-slate-500'}`} />
            <span>{cloudConnected ? 'Cloud Online' : 'Cloud Offline'}</span>
          </div>

          {/* Bilingual Language Switcher */}
          <div className="flex items-center bg-[#0b1437] rounded-full p-0.5 border border-blue-500/30 text-xs font-semibold">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('ur')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer font-urdu ${
                language === 'ur'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              اردو
            </button>
          </div>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 transition-all text-xs font-bold border border-rose-500/30 text-rose-300 cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.15)]"
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
