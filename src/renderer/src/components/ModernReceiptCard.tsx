import React from 'react';
import { CowLogo } from './CowLogo';

export interface ModernReceiptCardProps {
  receiptNumber: string;
  customerName: string;
  phone?: string;
  monthLabel: string;
  issueDateStr: string;
  currentTimeStr: string;
  totalBill: number;
  paidNow: number;
  totalReceived: number;
  remaining: number;
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
  totalBill,
  paidNow,
  totalReceived,
  remaining,
  settings,
  ur = true,
}) => {
  const isPaid = remaining <= 0;
  const isPartial = remaining > 0;
  const isAdvance = remaining < 0;

  return (
    <div
      id="print-slip"
      dir="rtl"
      className="printable-bill w-full max-w-[340px] mx-auto bg-white border border-blue-500/30 rounded-2xl p-2.5 shadow-md space-y-2 text-slate-800 text-xs print:border-none print:shadow-none print:p-0 print:max-w-none text-right"
    >
      {/* 1. Header: Royal Blue Brand Strip */}
      <div className="bg-gradient-to-br from-[#1B44C8] via-[#153bb8] to-[#102A7D] text-white rounded-xl p-2.5 relative overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white p-0.5 border border-blue-300 shadow-sm shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, minWidth: 40, minHeight: 40 }}>
              <CowLogo variant="white" size={32} className="w-8 h-8 object-contain" />
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

          {/* Paid / Partial Badge */}
          <div
            className={`px-2 py-0.5 rounded-lg text-center shrink-0 border text-[10px] font-black tracking-wider uppercase shadow-2xs ${
              isPaid
                ? 'bg-emerald-600 text-white border-emerald-300'
                : 'bg-amber-500 text-white border-amber-300'
            }`}
          >
            {isPaid ? 'PAID ✓' : 'PARTIAL'}
          </div>
        </div>

        {/* Receipt # & Phone */}
        <div className="mt-1.5 pt-1.5 border-t border-blue-400/30 flex items-center justify-between text-[9px] text-blue-100 font-mono">
          <span>رسید نمبر: {receiptNumber}</span>
          <span dir="ltr">{settings.phone}</span>
        </div>
      </div>

      {/* 2. Customer & Date Meta */}
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl px-2.5 py-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        <div className="flex items-center gap-1 truncate">
          <span className="text-slate-400 shrink-0 font-medium">گاہک کا نام:</span>
          <span className="font-black text-slate-800 truncate">{customerName}</span>
        </div>
        <div className="flex items-center gap-1 justify-end truncate">
          <span className="text-slate-400 shrink-0 font-medium">مہینہ:</span>
          <span className="font-black text-brand-700 truncate">{monthLabel}</span>
        </div>
        <div className="flex items-center gap-1 truncate text-slate-500">
          <span className="text-slate-400 shrink-0 font-medium">فون:</span>
          <span className="font-mono" dir="ltr">{phone || '-'}</span>
        </div>
        <div className="flex items-center gap-1 justify-end truncate text-slate-500">
          <span className="text-slate-400 shrink-0 font-medium">تاریخ و وقت:</span>
          <span className="text-[9px] font-mono">{issueDateStr}, {currentTimeStr}</span>
        </div>
      </div>

      {/* 3. Highlighted Paid Amount Box */}
      <div className="bg-gradient-to-r from-[#1B44C8] to-[#102A7D] text-white rounded-xl p-2.5 text-center shadow-2xs">
        <div className="text-[9.5px] font-bold text-blue-100 uppercase tracking-wider">
          ابھی موصول شدہ رقم (AMOUNT PAID NOW)
        </div>
        <div className="text-2xl font-black text-amber-300 mt-0.5">
          Rs. {money(paidNow)}
        </div>
        <div className="text-[9px] text-blue-100/90 font-medium">
          ✓ رقم وصول ہو گئی ہے، شکریہ!
        </div>
      </div>

      {/* 4. Complete Balance Summary */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 text-xs space-y-1.5 shadow-2xs">
        <div className="flex justify-between text-[11px] text-slate-600">
          <span>کل بل بنتا تھا:</span>
          <span className="font-extrabold text-slate-900">Rs. {money(totalBill)}</span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-600">
          <span>ابھی ادا شدہ رقم:</span>
          <span className="font-extrabold text-blue-700">Rs. {money(paidNow)}</span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-600">
          <span>کل وصولی (اس ماہ):</span>
          <span className="font-extrabold text-emerald-700">Rs. {money(totalReceived)}</span>
        </div>
        <div className="flex justify-between text-xs font-black pt-1.5 border-t border-slate-200">
          <span className="text-slate-800">باقی واجب الادا رقم:</span>
          <span className={remaining > 0 ? 'text-rose-600 font-black' : 'text-emerald-700 font-black'}>
            {remaining > 0
              ? `Rs. ${money(remaining)}`
              : remaining < 0
              ? `Rs. ${money(-remaining)} (ایڈوانس)`
              : 'Rs. 0 (مکمل ادا شدہ ✓)'}
          </span>
        </div>

        {/* Clear Urdu Explanation Box */}
        <div
          className={`rounded-lg p-2 text-[10px] leading-relaxed text-center font-bold border ${
            isPaid
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : isAdvance
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}
        >
          {isPaid
            ? `✓ آپ کا کل بل Rs. ${money(totalBill)} بنتا تھا، جو مکمل ادا ہو چکا ہے۔ کھاتہ مکمل ادا شدہ (Fully Cleared) ہے۔ شکریہ!`
            : isAdvance
            ? `✓ آپ کا کل بل Rs. ${money(totalBill)} تھا۔ آپ نے Rs. ${money(paidNow)} ادا کیا ہے۔ Rs. ${money(-remaining)} بطور ایڈوانس جمع ہے۔`
            : `⚠️ آپ کا کل بل Rs. ${money(totalBill)} بنتا تھا، آپ نے Rs. ${money(paidNow)} ادا کیا ہے، اور باقی Rs. ${money(remaining)} واجب الادا ہے۔`}
        </div>
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
