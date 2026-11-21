import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  HardDrive,
  Key,
  Globe,
  Loader2,
  ShieldCheck,
  RotateCcw,
  Clock,
  Send,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  CloudConfig,
  CloudConnectionStatus,
  CloudBackupItem,
  WhatsAppCloudStatus,
} from '../types/electron';

export const CloudBackupSettings: React.FC = () => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [connStatus, setConnStatus] = useState<CloudConnectionStatus | null>(null);
  const [config, setConfig] = useState<CloudConfig>({
    apiUrl: 'https://dariy-backend.vercel.app',
    apiKey: '',
    deviceId: 'dairy-desktop-terminal-1',
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Backup & Restore state
  const [backupHistory, setBackupHistory] = useState<CloudBackupItem[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgressStage, setBackupProgressStage] = useState('');
  const [backupPercent, setBackupPercent] = useState(0);
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Restore state
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStage, setRestoreStage] = useState('');
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);

  // Load Data
  const loadCloudData = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const [cfg, conn, syncMeta, history] = await Promise.all([
        window.electronAPI.getCloudConfig(),
        window.electronAPI.getCloudConnectionStatus(),
        window.electronAPI.getCloudSyncMeta(),
        window.electronAPI.getCloudBackupHistory(),
      ]);

      if (cfg) setConfig(cfg);
      setConnStatus(conn);
      setLastSyncAt(syncMeta?.lastSyncAt || null);
      setBackupHistory(history?.backups || []);
    } catch (err) {
      console.error('Failed to load cloud settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCloudData();

    // Listen for restore progress
    if (window.electronAPI) {
      const removeRestore = window.electronAPI.onRestoreProgress((data) => {
        setRestoreStage(data.stage);
      });
      const removeBackup = window.electronAPI.onBackupProgress((data) => {
        setBackupProgressStage(data.stage);
        if (data.percent !== undefined) setBackupPercent(data.percent);
      });

      return () => {
        removeRestore();
        removeBackup();
      };
    }
  }, [loadCloudData]);

  // Save Cloud Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI) return;

    setIsSavingConfig(true);
    setConfigMsg(null);

    try {
      await window.electronAPI.saveCloudConfig(config);
      setConfigMsg({
        type: 'success',
        text: ur ? 'کلاؤڈ سیٹنگز کامیابی سے محفوظ ہو گئیں!' : 'Cloud configuration saved successfully!',
      });
      const conn = await window.electronAPI.getCloudConnectionStatus();
      setConnStatus(conn);
    } catch (err: any) {
      setConfigMsg({ type: 'error', text: err.message || 'Failed to save configuration' });
    } finally {
      setIsSavingConfig(false);
      setTimeout(() => setConfigMsg(null), 4000);
    }
  };

  // Manual Database Sync
  const handleManualSync = async () => {
    if (!window.electronAPI || isSyncing) return;
    setIsSyncing(true);
    setSyncMsg(null);

    try {
      const res = await window.electronAPI.performCloudSync();
      if (res.success) {
        setLastSyncAt(res.serverTimestamp || new Date().toISOString());
        setSyncMsg({
          type: 'success',
          text: ur
            ? `آن لائن سنک مکمل ہو گیا! (${res.counts?.customers || 0} گاہک، ${res.counts?.milkEntries || 0} دودھ ریکارڈز)`
            : `Sync completed successfully! (${res.counts?.customers || 0} customers, ${res.counts?.milkEntries || 0} milk records synced)`,
        });
      } else {
        setSyncMsg({
          type: 'error',
          text: res.error || (ur ? 'سنک نہیں ہو سکا' : 'Sync operation failed'),
        });
      }
    } catch (err: any) {
      setSyncMsg({ type: 'error', text: err.message || 'Sync failed' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  // Manual Cloud Backup Now
  const handleManualBackupNow = async () => {
    if (!window.electronAPI || isBackingUp) return;
    setIsBackingUp(true);
    setBackupMsg(null);
    setBackupPercent(10);
    setBackupProgressStage(ur ? 'بیک اپ شروع کیا جا رہا ہے...' : 'Starting backup...');

    try {
      const res = await window.electronAPI.createCloudBackup('Manual admin backup from settings');
      if (res.success) {
        setBackupMsg({
          type: 'success',
          text: ur
            ? `کلاؤڈ بیک اپ مکمل! بیک اپ ID: ${res.backupId}`
            : `Cloud backup verified and uploaded! ID: ${res.backupId}`,
        });
        // Reload history
        const hist = await window.electronAPI.getCloudBackupHistory();
        setBackupHistory(hist.backups || []);
      } else if (res.cancelled) {
        setBackupMsg({ type: 'error', text: ur ? 'بیک اپ منسوخ کر دیا گیا' : 'Backup was cancelled' });
      } else {
        setBackupMsg({
          type: 'error',
          text: res.error || (ur ? 'بیک اپ اپلوڈ نہیں ہو سکا' : 'Backup upload failed'),
        });
      }
    } catch (err: any) {
      setBackupMsg({ type: 'error', text: err.message || 'Backup failed' });
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setBackupMsg(null), 6000);
    }
  };

  // Restore Cloud Backup
  const handleRestoreBackup = async (item: CloudBackupItem) => {
    if (!window.electronAPI || isRestoring) return;

    const confirmMsg = ur
      ? `کیا آپ واقعی بیک اپ (${item.id}) بحال کرنا چاہتے ہیں؟\n\nآپ کے موجودہ ڈیٹا بیس کی ایک محفوظ سیفٹی کاپی بنائی جائے گی، اس کے بعد نیا ڈیٹا بحال ہوگا۔`
      : `Are you sure you want to restore backup (${item.id})?\n\nA safety backup of your current database will be created first, then the cloud backup will be restored.`;

    if (!confirm(confirmMsg)) return;

    setIsRestoring(true);
    setRestoringBackupId(item.id);
    setRestoreStage(ur ? 'بیک اپ فائل ڈاؤن لوڈ کی جا رہی ہے...' : 'Downloading backup file...');

    try {
      const res = await window.electronAPI.restoreCloudBackup(item.id);
      if (res.success) {
        alert(
          ur
            ? `ڈیٹا بیس کامیابی سے بحال ہو گیا!\nسیفٹی بیک اپ: ${res.safetyBackupPath || 'محفوظ کر لیا گیا'}\nایپلی کیشن ری لوڈ ہو رہی ہے۔`
            : `Database restored successfully!\nSafety copy created at: ${res.safetyBackupPath || 'Saved'}\nReloading application...`
        );
        window.location.reload();
      } else {
        alert(res.error || (ur ? 'ڈیٹا بیس بحالی میں خرابی' : 'Failed to restore database'));
      }
    } catch (err: any) {
      alert(err.message || 'Restore failed');
    } finally {
      setIsRestoring(false);
      setRestoringBackupId(null);
    }
  };

  return (
    <div className="space-y-6" dir={ur ? 'rtl' : 'ltr'}>
      {/* 1. Cloud Sync & Backup Status Overview Card */}
      <div className="bg-[#081028] border border-blue-500/20 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-blue-500/20 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.3)]">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>{ur ? 'کلاؤڈ سنک اور آن لائن بیک اپ مینجمنٹ' : 'Cloud Sync & Online Backup Management'}</span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                    connStatus?.isBackendReachable
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {connStatus?.isBackendReachable ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {ur
                  ? 'Neon PostgreSQL اور S3 کلاؤڈ اسٹوریج کے ساتھ خودکار دو طرفہ سنک اور محفوظ اسنیپ شاٹس'
                  : 'Neon PostgreSQL cloud synchronization and secure S3-compatible WAL database snapshots'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? (ur ? 'سنک جاری ہے...' : 'Syncing...') : ur ? 'ابھی سنک کریں' : 'Sync Now'}</span>
            </button>

            <button
              onClick={handleManualBackupNow}
              disabled={isBackingUp}
              className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Upload className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-bounce' : ''}`} />
              <span>{isBackingUp ? (ur ? 'بیک اپ بن رہا ہے...' : 'Backing up...') : ur ? 'آن لائن بیک اپ لیں' : 'Backup Now'}</span>
            </button>
          </div>
        </div>

        {/* Sync or Backup Notification Messages */}
        {syncMsg && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
              syncMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            {syncMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{syncMsg.text}</span>
          </div>
        )}

        {backupMsg && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
              backupMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            {backupMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{backupMsg.text}</span>
          </div>
        )}

        {/* Active Backup Progress Bar */}
        {isBackingUp && (
          <div className="p-4 rounded-2xl bg-[#06143c] border border-cyan-400/40 space-y-2">
            <div className="flex justify-between text-xs font-mono font-bold text-cyan-300">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                {backupProgressStage}
              </span>
              <span>{backupPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/30">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${backupPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Indicators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#06143c] border border-blue-500/20 space-y-1">
            <div className="text-[11px] text-slate-400 font-bold">{ur ? 'انٹرنیٹ اسٹیٹس' : 'Internet Connection'}</div>
            <div className="text-sm font-black flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connStatus?.isOnline ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span className={connStatus?.isOnline ? 'text-emerald-300' : 'text-rose-300'}>
                {connStatus?.isOnline ? (ur ? 'آن لائن (Connected)' : 'Online') : ur ? 'آف لائن (Offline)' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#06143c] border border-blue-500/20 space-y-1">
            <div className="text-[11px] text-slate-400 font-bold">{ur ? 'کلاؤڈ بیک اینڈ سرور' : 'Cloud Backend API'}</div>
            <div className="text-sm font-black flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connStatus?.isBackendReachable ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span className={connStatus?.isBackendReachable ? 'text-emerald-300' : 'text-rose-300'}>
                {connStatus?.isBackendReachable
                  ? ur
                    ? 'دستیاب ہے (Reachable)'
                    : 'Reachable & Verified'
                  : ur
                  ? 'رابطہ منقطع'
                  : 'Unreachable'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#06143c] border border-blue-500/20 space-y-1">
            <div className="text-[11px] text-slate-400 font-bold">{ur ? 'آخری آن لائن سنک' : 'Last Cloud Sync'}</div>
            <div className="text-sm font-mono font-bold text-cyan-300">
              {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : ur ? 'ابھی تک نہیں ہوا' : 'Never'}
            </div>
          </div>
        </div>

        {/* Cloud Backup History Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>{ur ? 'کلاؤڈ بیک اپ ہسٹری (Cloud S3 Snapshots)' : 'Cloud S3 Backup History'}</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400 font-bold">
              {backupHistory.length} {ur ? 'بیک اپ محفوظ ہیں' : 'backups stored'}
            </span>
          </div>

          <div className="bg-[#050d24] border border-blue-500/20 rounded-2xl overflow-hidden shadow-inner">
            {backupHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 italic">
                {ur
                  ? 'کلاؤڈ پر کوئی سابقہ بیک اپ نہیں ملا۔ "آن لائن بیک اپ لیں" بٹن دبا کر نیا بیک اپ بنائیں یا ایپ بند کرتے وقت بیک اپ لیں۔'
                  : 'No cloud backups found yet. Click "Backup Now" or use the close-time auto backup to create one.'}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#060e28] text-slate-300 font-bold border-b border-blue-500/20 sticky top-0">
                    <tr>
                      <th className="p-2.5 text-center w-10">#</th>
                      <th className="p-2.5">{ur ? 'تاریخ و وقت' : 'Date & Time'}</th>
                      <th className="p-2.5">{ur ? 'بیک اپ ID' : 'Backup ID'}</th>
                      <th className="p-2.5 text-center">{ur ? 'سائز' : 'Size'}</th>
                      <th className="p-2.5 font-mono">{ur ? 'SHA-256 ہیش' : 'SHA-256 Checksum'}</th>
                      <th className="p-2.5 text-center">{ur ? 'اسٹیٹس' : 'Status'}</th>
                      <th className="p-2.5 text-center">{ur ? 'بحالی (Restore)' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-500/10">
                    {backupHistory.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-blue-900/10 transition-colors">
                        <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono text-slate-200">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="p-2.5 font-mono text-cyan-300 font-bold">{item.id}</td>
                        <td className="p-2.5 text-center font-mono text-slate-300">
                          {(item.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                        </td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={item.sha256Checksum}>
                          {item.sha256Checksum}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            {item.status || 'Verified'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleRestoreBackup(item)}
                            disabled={isRestoring}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto disabled:opacity-50"
                          >
                            <RotateCcw className={`w-3 h-3 ${isRestoring && restoringBackupId === item.id ? 'animate-spin' : ''}`} />
                            <span>{ur ? 'بحال کریں' : 'Restore'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Cloud Backend Connection Settings Form */}
      <div className="bg-[#081028] border border-blue-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-blue-500/20">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              {ur ? 'کلاؤڈ سرور کنکشن سیٹنگز' : 'Cloud Server Connection Settings'}
            </h3>
            <p className="text-xs text-slate-300">
              {ur
                ? 'اپنے کلاؤڈ بیک اینڈ سرور کا URL اور مستند API کلید درج کریں'
                : 'Configure Cloud API endpoint URL and secure device authentication key'}
            </p>
          </div>
        </div>

        {configMsg && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
              configMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            {configMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{configMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">
              {ur ? 'کلاؤڈ بیک اینڈ سروس URL (CLOUD_API_URL):' : 'Cloud Backend API URL:'}
            </label>
            <input
              type="text"
              value={config.apiUrl}
              onChange={(e) => setConfig((p) => ({ ...p, apiUrl: e.target.value }))}
              placeholder="https://dariy-backend.vercel.app"
              className="w-full bg-[#050d24] border border-blue-500/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingConfig}
              className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSavingConfig ? (ur ? 'محفوظ ہو رہا ہے...' : 'Saving...') : ur ? 'سیٹنگز محفوظ کریں' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
