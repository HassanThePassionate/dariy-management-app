import React from 'react';
import { CheckCircle2, Phone, Calendar, Clock, Printer, Send } from 'lucide-react';
import { CowLogo } from './CowLogo';

export interface ModernReceiptCardProps {
  receiptNumber: string;
  customerName: string;
  phone?: string;
  monthLabel: string;
  issueDateStr: string;
  currentTimeStr: string;
  paidNow: number;
  received: number;
  payable: number;
  settings: {
    shop_title: string;
    owner_name: string;
    phone: string;
  };
  ur?: boolean;
}

const money = (n: number | undefined | null) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
};

export const ModernReceiptCard: React.FC<ModernReceiptCardProps> = ({
  receiptNumber,
  customerName,
  phone,
  monthLabel,
  issueDateStr,
  currentTimeStr,
  paidNow,
  received,
  payable,
  settings,
  ur = true,
}) => {
  const remaining = payable - paidNow;

  return (
    <div
      id="print-slip"
      className="printable-bill w-full max-w-[340px] mx-auto bg-white border border-blue-500/30 rounded-2xl p-2.5 shadow-md space-y-2 text-slate-800 text-xs print:border-none print:shadow-none print:p-0 print:max-w-none"
    >
      {/* 1. Header: Royal Blue Brand Strip */}
      <div className="bg-gradient-to-br from-[#1B44C8] via-[#153bb8] to-[#102A7D] text-white rounded-xl p-2 relative overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/95 p-1 border border-blue-300 shadow-2xs shrink-0 flex items-center justify-center">
              <CowLogo variant="badge-blue" size={24} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black text-amber-200 tracking-tight truncate leading-tight">
                {settings.shop_title || 'قاری ظفر اقبال ملک شاپ'}
              </h2>
              <p className="text-[9px] text-blue-100 font-medium truncate leading-tight">
                ادائیگی کی تصدیقی رسید (Official Receipt)
              </p>
            </div>
          </div>

          {/* Paid Badge */}
          <div className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-center shrink-0 border border-blue-300 text-[10px] font-black tracking-wider uppercase shadow-2xs">
            PAID ✓
          </div>
        </div>

        {/* Receipt # & Proprietor */}
        <div className="mt-1 pt-1 border-t border-blue-400/30 flex items-center justify-between text-[9px] text-blue-100 font-mono">
          <span>رسید: {receiptNumber}</span>
          <span>{settings.phone}</span>
        </div>
      </div>

      {/* 2. Customer & Date Meta */}
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl px-2 py-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
        <div className="flex items-center gap-1 truncate">
          <span className="text-slate-400 shrink-0 font-medium">گاہک:</span>
          <span className="font-black text-slate-800 truncate">{customerName}</span>
        </div>
        <div className="flex items-center gap-1 justify-end truncate">
          <span className="text-slate-400 shrink-0 font-medium">مہینہ:</span>
          <span className="font-black text-brand-700 truncate">{monthLabel}</span>
        </div>
        <div className="flex items-center gap-1 truncate text-slate-500">
          <span className="text-slate-400 shrink-0 font-medium">فون:</span>
          <span className="font-mono">{phone || '-'}</span>
        </div>
        <div className="flex items-center gap-1 justify-end truncate text-slate-500">
          <span className="text-slate-400 shrink-0 font-medium">وقت:</span>
          <span className="text-[9px]">{issueDateStr}, {currentTimeStr}</span>
        </div>
      </div>

      {/* 3. Highlighted Paid Amount Box */}
      <div className="bg-gradient-to-r from-[#1B44C8] to-[#102A7D] text-white rounded-xl p-2.5 text-center shadow-2xs">
        <div className="text-[9.5px] font-bold text-blue-100 uppercase tracking-wider">
          ابھی موصول شدہ رقم (Amount Paid Now)
        </div>
        <div className="text-xl font-black text-amber-300 mt-0.5">
          Rs. {money(paidNow)}
        </div>
        <div className="text-[9px] text-blue-100/90 font-medium">
          ✓ رقم وصول ہو گئی ہے، شکریہ!
        </div>
      </div>

      {/* 4. Balance Summary */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-2 text-xs space-y-1 shadow-2xs">
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>کل وصولی (اس ماہ):</span>
          <span className="font-bold text-emerald-700">Rs. {money(received + paidNow)}</span>
        </div>
        <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-100">
          <span className="text-slate-700">باقی واجب الادا رقم:</span>
          <span className={remaining > 0 ? 'text-rose-600' : 'text-emerald-700'}>
            Rs. {money(remaining)}
          </span>
        </div>
        <p className="text-[9px] text-center text-slate-400 pt-0.5">
          {remaining <= 0
            ? '✓ کھاتہ مکمل ادا شدہ (Fully Cleared)'
            : 'باقی رقم اگلے مہینے کے کھاتے میں شامل ہوگی'}
        </p>
      </div>

      {/* 5. Footer */}
      <div className="text-center pt-0.5">
        <p className="text-[8px] text-slate-400 font-medium">
          کمپیوٹرائزڈ ڈیری کھاتہ مینجمنٹ سسٹم • ادائیگی رسید
        </p>
      </div>
    </div>
  );
};
