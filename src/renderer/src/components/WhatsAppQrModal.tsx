import React, { useEffect } from 'react';
import { QrCode, X, RefreshCw, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { WhatsAppWebStatus } from '../types/electron';

interface WhatsAppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  waStatus: WhatsAppWebStatus | null;
  qrCodeData: string | null;
  isConnecting: boolean;
  onRefresh: () => void;
  onDisconnect: () => void;
}

export const WhatsAppQrModal: React.FC<WhatsAppQrModalProps> = ({
  isOpen,
  onClose,
  waStatus,
  qrCodeData,
  isConnecting,
  onRefresh,
  onDisconnect,
}) => {
  const { language } = useLanguage();
  const ur = language === 'ur';

  // Automatically request QR code when modal opens if not connected and no QR
  useEffect(() => {
    if (isOpen && !waStatus?.connected && !qrCodeData && !isConnecting) {
      onRefresh();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#081028] border-2 border-emerald-400 rounded-3xl max-w-lg w-full p-6 text-slate-100 shadow-[0_0_50px_rgba(16,185,129,0.35)] space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                {ur ? 'واٹس ایپ کنیکٹ کریں (QR کوڈ)' : 'Connect WhatsApp (QR Code)'}
              </h3>
              <p className="text-xs text-emerald-300">
                {ur ? 'موبائل سے اسکین کر کے سسٹم سے پیغامات بھیجیں' : 'Scan with mobile to send bills'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600/40 text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Canvas or Connected Screen */}
        <div className="bg-[#0b1437] rounded-2xl border border-emerald-500/30 p-5 flex flex-col items-center justify-center min-h-[300px] text-center">
          {waStatus?.connected ? (
            <div className="space-y-4 py-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">
                  {ur ? 'واٹس ایپ کامیابی کے ساتھ منسلک ہے!' : 'WhatsApp Connected!'}
                </h4>
                <p className="text-xs text-emerald-300 font-mono mt-1" dir="ltr">
                  {waStatus.phoneNumber || 'Active & Online'}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {ur
                    ? 'آپ کا اکاؤنٹ تیار ہے، اب آپ گاہکوں کو بلز بھیج سکتے ہیں۔'
                    : 'Your account is ready to dispatch bill images.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onDisconnect}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
              >
                {ur ? 'منقطع کریں (Disconnect)' : 'Disconnect'}
              </button>
            </div>
          ) : qrCodeData ? (
            <div className="space-y-3">
              <div className="p-3 bg-white rounded-2xl shadow-2xl inline-block border-4 border-emerald-500/50">
                <img
                  src={qrCodeData}
                  alt="WhatsApp Web QR Code"
                  className="w-60 h-60 object-contain"
                />
              </div>
              <p className="text-xs text-cyan-300 font-bold animate-pulse">
                {ur ? 'براہ کرم 60 سیکنڈ کے اندر اسکین کریں' : 'Scan within 60 seconds'}
              </p>
            </div>
          ) : isConnecting || waStatus?.connecting ? (
            <div className="space-y-3 py-8">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
              <div className="font-bold text-sm text-white">
                {ur ? 'واٹس ایپ کیو آر کوڈ تیار کیا جا رہا ہے...' : 'Generating QR code...'}
              </div>
              <p className="text-xs text-slate-400">
                {ur ? 'براہ کرم چند سیکنڈ انتظار فرمائیں' : 'Please wait a moment'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-8">
              <QrCode className="w-12 h-12 text-slate-500 mx-auto" />
              <div className="font-bold text-sm text-slate-300">
                {ur ? 'کوئی فعال QR کوڈ موجود نہیں' : 'No active QR code'}
              </div>
              <button
                type="button"
                onClick={onRefresh}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold cursor-pointer shadow-md"
              >
                {ur ? 'کنیکٹ کریں اور QR کوڈ بنائیں' : 'Connect & Generate QR'}
              </button>
            </div>
          )}
        </div>

        {/* 3-Step Guide in Urdu */}
        <div className="bg-[#0c163b] rounded-2xl border border-blue-500/20 p-4 text-xs text-slate-300 space-y-2">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{ur ? 'اسکین کرنے کا آسان طریقہ:' : 'How to connect:'}</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11.5px] leading-relaxed">
            <li>اپنے موبائل فون میں واٹس ایپ کھولیں۔</li>
            <li>مینو (تین ڈاٹس یا Settings) میں جا کر <b>Linked Devices</b> منتخب کریں۔</li>
            <li><b>Link a Device</b> پر کلک کر کے اس اسکرین کے کیو آر کوڈ کو اسکین کریں۔</li>
          </ol>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0c163b] hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-bold cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{ur ? 'نیا QR کوڈ ریفریش کریں' : 'Refresh QR'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            {ur ? 'بند کریں' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
