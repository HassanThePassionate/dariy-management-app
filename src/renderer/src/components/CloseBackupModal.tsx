import React, { useState, useEffect } from 'react';
import {
  Cloud,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  HardDrive,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export interface CloseModalState {
  isOpen: boolean;
  scenario: 'A' | 'B' | 'C';
  error?: string;
  isBackingUp: boolean;
  stage: string;
  percent: number;
  isSuccess: boolean;
  successMessage?: string;
}

export const CloseBackupModal: React.FC = () => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [modalState, setModalState] = useState<CloseModalState>({
    isOpen: false,
    scenario: 'A',
    isBackingUp: false,
    stage: '',
    percent: 0,
    isSuccess: false,
  });

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen for close requests from the Electron Main Process
    const removeShowListener = window.electronAPI.onShowCloseBackupModal((data) => {
      setModalState({
        isOpen: true,
        scenario: data.scenario,
        error: data.error,
        isBackingUp: false,
        stage: '',
        percent: 0,
        isSuccess: false,
      });
    });

    // Listen for real-time progress updates during backup
    const removeProgressListener = window.electronAPI.onBackupCloseProgress((data) => {
      setModalState((prev) => ({
        ...prev,
        stage: data.stage,
        percent: data.percent ?? prev.percent,
      }));
    });

    return () => {
      removeShowListener();
      removeProgressListener();
    };
  }, []);

  if (!modalState.isOpen) return null;

  // Action: Backup & Close
  const handleBackupAndClose = async () => {
    setModalState((prev) => ({
      ...prev,
      isBackingUp: true,
      stage: ur ? 'کلاؤڈ سے رابطہ چیک کیا جا رہا ہے...' : 'Checking cloud connection...',
      percent: 10,
    }));

    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.performCloseBackup();

        if (result.success) {
          setModalState((prev) => ({
            ...prev,
            isBackingUp: false,
            isSuccess: true,
            percent: 100,
            stage: ur ? 'بیک اپ کامیابی سے محفوظ ہو گیا!' : 'Backup completed successfully!',
          }));

          // Automatically close app after short confirmation
          setTimeout(async () => {
            await window.electronAPI?.confirmForceClose();
          }, 1200);
        } else if (result.cancelled) {
          setModalState((prev) => ({ ...prev, isOpen: false, isBackingUp: false }));
        } else {
          // Backup failed: transition to Scenario C modal
          setModalState((prev) => ({
            ...prev,
            isBackingUp: false,
            scenario: 'C',
            error: result.error || 'Backup upload failed',
          }));
        }
      } catch (err: any) {
        setModalState((prev) => ({
          ...prev,
          isBackingUp: false,
          scenario: 'C',
          error: err.message || 'Unexpected backup error',
        }));
      }
    }
  };

  // Action: Close Without Backup
  const handleCloseWithoutBackup = async () => {
    if (window.electronAPI) {
      await window.electronAPI.confirmForceClose();
    }
  };

  // Action: Cancel (return to application)
  const handleCancel = async () => {
    if (window.electronAPI) {
      await window.electronAPI.cancelClose();
    }
    setModalState((prev) => ({ ...prev, isOpen: false, isBackingUp: false }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      dir={ur ? 'rtl' : 'ltr'}
    >
      <div className="bg-[#050d24] border-2 border-cyan-400/80 rounded-3xl shadow-[0_0_40px_rgba(0,210,255,0.35)] max-w-lg w-full overflow-hidden text-white flex flex-col">
        {/* Modal Top Banner */}
        <div className="bg-[#081845] border-b border-cyan-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-300">
              {modalState.scenario === 'B' ? (
                <WifiOff className="w-5 h-5 text-amber-400" />
              ) : modalState.scenario === 'C' ? (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              ) : (
                <Cloud className="w-5 h-5 text-cyan-300" />
              )}
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {modalState.isBackingUp
                  ? ur
                    ? 'آن لائن بیک اپ بن رہا ہے...'
                    : 'Creating Online Backup'
                  : modalState.scenario === 'B'
                  ? ur
                    ? 'انٹرنیٹ کنکشن درکار ہے'
                    : 'Internet Connection Required'
                  : modalState.scenario === 'C'
                  ? ur
                    ? 'کلاؤڈ سرور دستیاب نہیں'
                    : 'Cloud Backend Unavailable'
                  : ur
                  ? 'ایپ بند کرنے سے پہلے بیک اپ لیں؟'
                  : 'Backup Your Data Before Closing?'}
              </h2>
              <p className="text-xs text-cyan-200/80 font-medium">
                {ur ? 'ڈیری مینجمنٹ سسٹم آن لائن کلاؤڈ' : 'Dairy Management System Cloud Sync'}
              </p>
            </div>
          </div>

          {!modalState.isBackingUp && (
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 space-y-4">
          {/* Active Backup Progress State */}
          {modalState.isBackingUp ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-200 leading-relaxed text-center font-medium">
                {ur
                  ? 'برائے مہربانی انتظار فرمائیں۔ آپ کا ڈیری مینجمنٹ ڈیٹا کلاؤڈ میں محفوظ کیا جا رہا ہے۔'
                  : 'Please wait. We are securely backing up your Dairy Management System data online.'}
              </p>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono font-bold text-cyan-300">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    {modalState.stage || (ur ? 'بیک اپ جاری ہے...' : 'In progress...')}
                  </span>
                  <span>{modalState.percent}%</span>
                </div>
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/40 p-0.5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_10px_#00d2ff]"
                    style={{ width: `${Math.max(8, modalState.percent)}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  {ur ? 'کینسل کریں (Cancel)' : 'Cancel Backup'}
                </button>
              </div>
            </div>
          ) : modalState.isSuccess ? (
            <div className="py-4 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_20px_#10b981]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-emerald-300">
                {ur ? 'کلاؤڈ بیک اپ مکمل ہو گیا!' : 'Cloud Backup Succeeded!'}
              </h3>
              <p className="text-xs text-slate-300">
                {ur ? 'ایپلیکیشن محفوظ طریقے سے بند ہو رہی ہے...' : 'Closing application safely...'}
              </p>
            </div>
          ) : modalState.scenario === 'B' ? (
            /* Scenario B: Internet Not Available */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-3">
                <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200 leading-relaxed font-medium">
                  {ur
                    ? 'آپ اس وقت آف لائن ہیں۔ انٹرنیٹ کنکشن نہ ہونے کی وجہ سے آن لائن بیک اپ نہیں بنایا جا سکتا۔ آپ کا لوکل ڈیٹا اس کمپیوٹر پر بالکل محفوظ ہے، لیکن تازہ ترین تبدیلیاں کلاؤڈ پر محفوظ نہیں ہوں گی۔'
                    : 'You are currently offline. We cannot create an online backup because there is no internet connection. Your local data is safe on this device, but your latest changes will not be backed up online.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full py-2.5 rounded-xl bg-[#0b1437] hover:bg-slate-800 border border-blue-500/30 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {ur ? 'کینسل کریں (Cancel)' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseWithoutBackup}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-black transition-all cursor-pointer shadow-lg"
                >
                  {ur ? 'بغیر بیک اپ بند کریں' : 'Close Without Backup'}
                </button>
              </div>
            </div>
          ) : modalState.scenario === 'C' ? (
            /* Scenario C: Backend Unavailable */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-300 mb-1">
                    {ur ? 'کلاؤڈ سروس سے رابطہ نہیں ہو سکا' : 'Could Not Reach Cloud Server'}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {modalState.error || (ur ? 'سرور مصروف ہے یا کلاؤڈ یو آر ایل درست نہیں۔' : 'Server is unreachable or credentials are unverified.')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="py-2.5 rounded-xl bg-[#0b1437] hover:bg-slate-800 border border-blue-500/30 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {ur ? 'کینسل' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseWithoutBackup}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition-colors cursor-pointer truncate"
                >
                  {ur ? 'بغیر بیک اپ' : 'Close Without'}
                </button>
                <button
                  type="button"
                  onClick={handleBackupAndClose}
                  className="py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{ur ? 'دوبارہ کوشش' : 'Retry'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Scenario A: Online & Backend Available */
            <div className="space-y-4">
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {ur
                  ? 'کیا آپ ایپلیکیشن بند کرنے سے پہلے اپنے تمام تازہ ترین ڈیری ریکارڈز اور کھاتوں کا محفوظ کلاؤڈ بیک اپ لینا چاہتے ہیں؟'
                  : 'Would you like to create an online backup of your latest Dairy Management System data before closing the application?'}
              </p>

              <div className="p-3 rounded-2xl bg-[#06143c] border border-cyan-400/40 flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-2 text-cyan-300">
                  <HardDrive className="w-4 h-4" />
                  {ur ? 'لوکل SQLite ڈیٹا بیس + WAL' : 'SQLite WAL Database Snapshot'}
                </span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {ur ? 'آن لائن محفوظ کلاؤڈ' : 'Cloud S3 Ready'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="py-2.5 rounded-xl bg-[#0b1437] hover:bg-slate-800 border border-blue-500/30 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {ur ? 'کینسل (Cancel)' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseWithoutBackup}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {ur ? 'بغیر بیک اپ' : 'Close Without'}
                </button>
                <button
                  type="button"
                  onClick={handleBackupAndClose}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center justify-center gap-1"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{ur ? 'بیک اپ اور بند' : 'Backup & Close'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
