import React, { useState, useEffect } from 'react';
import { Menu, ArrowLeft, LogOut, CheckCircle2, AlertCircle, Cloud, QrCode, Loader2, Pause, Play, Clock } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { CowLogo } from './CowLogo';
import { WhatsAppQrModal } from './WhatsAppQrModal';
import { WhatsAppWebStatus, WhatsAppQueueProgress } from '../types/electron';

interface HeaderProps {
  title: string;
  onToggleSidebar: () => void;
  onLogout: () => void;
  isDbConnected: boolean;
  canGoBack?: boolean;
  onBack?: () => void;
  onNavigateQueue?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onToggleSidebar,
  onLogout,
  isDbConnected,
  canGoBack = false,
  onBack,
  onNavigateQueue,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);

  // WhatsApp QR State
  const [waStatus, setWaStatus] = useState<WhatsAppWebStatus | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // WhatsApp Background Safe Queue Progress State
  const [queueProgress, setQueueProgress] = useState<WhatsAppQueueProgress | null>(null);

  const formatTimer = (seconds?: number) => {
    if (typeof seconds !== 'number' || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Initial WhatsApp status & Queue status check
  useEffect(() => {
    async function checkWhatsApp() {
      if (window.electronAPI?.getWhatsAppStatus) {
        try {
          const status = await window.electronAPI.getWhatsAppStatus();
          setWaStatus(status);
          if (status?.qrCodeDataUrl) {
            setQrCodeData(status.qrCodeDataUrl);
          }
        } catch {}
      }
      if (window.electronAPI?.getWhatsAppQueueStatus) {
        try {
          const q = await window.electronAPI.getWhatsAppQueueStatus();
          if (q) setQueueProgress(q);
        } catch {}
      }
    }
    checkWhatsApp();
  }, []);

  // WhatsApp Real-time IPC listeners
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubQR = window.electronAPI.onWhatsAppQR((qr) => {
      setQrCodeData(qr);
      setIsConnecting(false);
    });

    const unsubStatus = window.electronAPI.onWhatsAppStatus((status) => {
      setWaStatus(status);
      if (status.qrCodeDataUrl) {
        setQrCodeData(status.qrCodeDataUrl);
      } else if (status.connected) {
        setQrCodeData(null);
      }
      setIsConnecting(status.connecting);
    });

    const unsubQueue = window.electronAPI.onWhatsAppQueueProgress((q) => {
      setQueueProgress(q);
    });

    return () => {
      unsubQR?.();
      unsubStatus?.();
      unsubQueue?.();
    };
  }, []);

  // WhatsApp Connect & Refresh
  const handleConnectWhatsApp = async (force = false) => {
    if (!window.electronAPI) return;
    setIsConnecting(true);
    setShowQrModal(true);
    try {
      const res = await window.electronAPI.connectWhatsApp({ force });
      if (res?.qrCodeDataUrl) {
        setQrCodeData(res.qrCodeDataUrl);
      }
      if (res?.connected) {
        setWaStatus(res);
        setQrCodeData(null);
      }
    } catch (err) {
      console.error('Failed to initiate WhatsApp connection:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  // WhatsApp Disconnect
  const handleDisconnectWhatsApp = async () => {
    if (!window.electronAPI) return;
    if (!confirm(language === 'ur' ? 'کیا آپ واقعی واٹس ایپ منقطع کرنا چاہتے ہیں؟' : 'Disconnect WhatsApp?')) return;
    try {
      await window.electronAPI.disconnectWhatsApp();
      setWaStatus({ connected: false, connecting: false });
      setQrCodeData(null);
    } catch (err) {
      console.error('Failed to disconnect WhatsApp:', err);
    }
  };

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
    <>
      <header className="sticky top-0 z-30 bg-[#050d24] text-white border-b border-blue-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)] select-none">
        <div className="flex items-center justify-between px-3 py-2.5 md:px-6">
          {/* Left: Hamburger, Back Button & Title */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl bg-[#0b1437] hover:bg-blue-600/30 text-cyan-400 border border-blue-500/30 transition-all cursor-pointer focus:outline-none shadow-[0_0_10px_rgba(0,102,255,0.15)]"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5 text-cyan-400" />
            </button>

            {/* Global Back Button */}
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

            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#0b1437] p-0.5 border border-cyan-400/50 shadow-[0_0_14px_rgba(0,150,255,0.35)] flex items-center justify-center shrink-0">
              <CowLogo variant="white" size={36} className="w-8 h-8 md:w-9 md:h-9 object-contain" />
            </div>
            <h1 className="text-lg md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              {title}
            </h1>
          </div>

          {/* Right Actions: WhatsApp Queue Pill, WhatsApp QR, DB Status, Language Switcher, Logout */}
          <div className="flex items-center gap-2 md:gap-3.5">
            {/* 🚀 Real-time WhatsApp Safe Queue Live Indicator Pill */}
            {queueProgress && queueProgress.total > 0 && (queueProgress.isRunning || queueProgress.queued > 0 || queueProgress.isPaused) && (
              <button
                type="button"
                onClick={onNavigateQueue}
                className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  queueProgress.isRunning
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.35)]'
                    : queueProgress.isPaused
                    ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                    : 'bg-blue-950/80 border-blue-400 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.25)]'
                }`}
                title={language === 'ur' ? 'ماہانہ کھاتہ و واٹس ایپ قطار کھولیں' : 'View Monthly Khatta & Safe Queue'}
              >
                {queueProgress.isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                ) : queueProgress.isPaused ? (
                  <Pause className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span className="font-mono font-extrabold text-white text-xs">
                  {queueProgress.sent}/{queueProgress.total}
                </span>
                <span className="text-[10px] text-slate-300 hidden sm:inline">
                  {language === 'ur' ? 'بل بھیجے گئے' : 'Sent'}
                </span>
                {queueProgress.isRunning && queueProgress.nextSendInSeconds > 0 && (
                  <span className="font-mono text-cyan-300 text-[11px] bg-cyan-900/60 px-1.5 py-0.5 rounded border border-cyan-500/40">
                    ⏱ {formatTimer(queueProgress.nextSendInSeconds)}
                  </span>
                )}
                {queueProgress.isRunning && queueProgress.nextCustomerName && (
                  <span className="text-[10px] text-slate-300 font-bold hidden xl:inline max-w-[90px] truncate">
                    → {queueProgress.nextCustomerName}
                  </span>
                )}
                {queueProgress.failed > 0 && (
                  <span className="text-rose-400 font-bold text-[11px]">
                    ❌ {queueProgress.failed}
                  </span>
                )}
              </button>
            )}

            {/* 📱 Prominent WhatsApp QR Code Connection Button in Header */}
            {waStatus?.connected ? (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-400 text-emerald-300 font-black text-xs shadow-[0_0_14px_rgba(16,185,129,0.3)] hover:bg-emerald-900/60 transition-all cursor-pointer"
                title={language === 'ur' ? 'واٹس ایپ منسلک ہے (تفصیلات کے لیے کلک کریں)' : 'WhatsApp Connected'}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-bold">
                  {language === 'ur'
                    ? `واٹس ایپ (${waStatus.phoneNumber || '03204815221'})`
                    : `WhatsApp (${waStatus.phoneNumber || 'Online'})`}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(true);
                  if (!qrCodeData && !waStatus?.connecting) {
                    handleConnectWhatsApp();
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/25 via-cyan-500/20 to-emerald-500/25 border-2 border-emerald-400 hover:border-emerald-300 text-emerald-300 hover:text-white font-black text-xs shadow-[0_0_16px_rgba(16,185,129,0.35)] animate-pulse hover:animate-none cursor-pointer transition-all"
                title={language === 'ur' ? 'واٹس ایپ QR کوڈ اسکین کریں' : 'Scan WhatsApp QR'}
              >
                <QrCode className="w-4 h-4 text-emerald-300" />
                <span className="font-bold">
                  {language === 'ur' ? '📱 واٹس ایپ QR کوڈ' : '📱 WhatsApp QR'}
                </span>
              </button>
            )}

            {/* SQLite DB Connection Pill */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isDbConnected
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-rose-950/40 text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
              }`}
            >
              {isDbConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SQLite</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Cloud Backend Online Sync Pill */}
            <div
              className={`hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                cloudConnected
                  ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                  : 'bg-slate-900/60 text-slate-400 border-slate-700/50'
              }`}
            >
              <Cloud className={`w-3.5 h-3.5 ${cloudConnected ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{cloudConnected ? 'Cloud' : 'Offline'}</span>
            </div>

            {/* Bilingual Language Switcher */}
            <div className="flex items-center bg-[#0b1437] rounded-full p-0.5 border border-blue-500/30 text-xs font-semibold">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ur')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer font-urdu ${
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 transition-all text-xs font-bold border border-rose-500/30 text-rose-300 cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.15)]"
              title={t.logout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.logout}</span>
            </button>
          </div>
        </div>
      </header>

      {/* WhatsApp QR Code Modal */}
      <WhatsAppQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        waStatus={waStatus}
        qrCodeData={qrCodeData}
        isConnecting={isConnecting}
        onRefresh={() => handleConnectWhatsApp(true)}
        onDisconnect={handleDisconnectWhatsApp}
      />
    </>
  );
};
