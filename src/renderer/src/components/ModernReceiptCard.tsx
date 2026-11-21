import React from 'react';
import { Phone, FileText, CheckCircle2, Megaphone, Coins } from 'lucide-react';
import logoUrl from '../assets/logo.png';

export interface ModernReceiptCardProps {
  receiptNumber?: string;
  customerName: string;
  phone?: string;
  address?: string;
  monthLabel: string;
  issueDateStr?: string;
  currentTimeStr?: string;
  rate?: number;
  liters?: number;
  bill?: number;
  carry?: number;
  totalBill?: number;
  paidNow: number;
  totalReceived?: number;
  remaining?: number;
  billNo?: number | string;
  accountNumber?: string;
  bankName?: string;
  accountTitle?: string;
  paymentMethod?: string;
  settings?: {
    shop_title: string;
    owner_name: string;
    phone: string;
    bank_name?: string;
    account_title?: string;
    account_number?: string;
  };
  ur?: boolean;
  onEditAccount?: () => void;
}

const money = (n: number | undefined | null) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
};

const qty = (n: number | undefined | null) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
};

export const ModernReceiptCard: React.FC<ModernReceiptCardProps> = ({
  receiptNumber = '28',
  customerName = 'احمد علی',
  phone,
  monthLabel = 'اگست 2026',
  issueDateStr,
  rate = 240,
  liters = 80,
  bill,
  carry = 140,
  totalBill,
  paidNow = 19340,
  totalReceived,
  remaining = 0,
  billNo = receiptNumber,
  settings,
  ur = true,
  onEditAccount,
}) => {
  const shopTitle = settings?.shop_title || 'قاری ظفر اقبال ملک شاپ';
  const ownerName = settings?.owner_name || 'حافظ مصعب ظفر';
  const contactPhone = settings?.phone || '0300-1234567';

  const milkAmount =
    typeof bill === 'number' && Number.isFinite(bill)
      ? Math.round(bill)
      : Math.round((Number(liters) || 0) * (Number(rate) || 0));
  const carryAmount = Number(carry) || 0;
  const calcTotalBill =
    typeof totalBill === 'number' && Number.isFinite(totalBill) && totalBill > 0
      ? totalBill
      : milkAmount + carryAmount;
  const effectivePaid = (Number(paidNow) || 0) > 0 ? Number(paidNow) : (Number(totalReceived) || 0);

  return (
    <div
      id="print-receipt"
      dir="rtl"
      className="printable-bill mx-auto shadow-2xl print:shadow-none select-none text-right font-sans relative overflow-hidden"
      style={{
        width: '430px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#f0f9ff',
        backgroundImage: 'linear-gradient(180deg, #dcf4fd 0%, #e0f2fe 30%, #f0fdfa 70%, #d8f3fd 100%)',
        borderRadius: '26px',
        border: '3px solid #0284c7',
        boxShadow: '0 14px 40px rgba(2, 132, 199, 0.25), 0 0 20px rgba(56, 189, 248, 0.35)',
        color: '#0f172a',
        padding: '16px 14px 20px',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {/* Top Header Splash: Shop Official Logo + Shop Title & Owner Badge */}
      <div className="relative text-center pb-1">
        {/* Shop Official Logo on Top */}
        <div className="flex justify-center items-center mb-1">
          <img
            src={logoUrl}
            alt={shopTitle}
            className="h-16 w-auto max-w-[130px] object-contain select-none pointer-events-none filter drop-shadow-[0_2px_8px_rgba(2,132,199,0.35)]"
          />
        </div>

        {/* Shop Name in Beautiful Bold Calligraphy Style */}
        <h1 className="text-3xl font-black text-[#0c2e5e] tracking-wide font-urdu leading-tight filter drop-shadow-sm">
          {shopTitle}
        </h1>

        {/* Owner Name Pill with glowing border */}
        <div className="inline-block mt-1 px-5 py-0.5 rounded-full border-2 border-[#0284c7] bg-[#0c4a7e] shadow-sm">
          <span className="text-sm font-bold text-white font-urdu">{ownerName}</span>
        </div>

        {/* Receipt Badge Header */}
        <div className="mt-1.5 flex justify-center">
          <div className="px-4 py-0.5 rounded-full bg-[#0284c7] text-white text-xs font-black font-urdu shadow-sm flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-200" />
            <span>رسید وصولی رقم (Payment Receipt)</span>
          </div>
        </div>
      </div>

      {/* Box 1: Mobile Number */}
      <div className="mt-2.5 p-2 rounded-xl border-2 border-[#0284c7] bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-[#0c2e5e] font-black font-mono text-xl tracking-wider" dir="ltr">
          <div className="w-7 h-7 rounded-full bg-[#0284c7] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Phone className="w-3.5 h-3.5" />
          </div>
          <span>{contactPhone}</span>
        </div>
        <div className="flex items-center gap-1 border-r-2 border-[#0284c7]/30 pr-3">
          <span className="text-xs font-bold text-[#0c2e5e] font-urdu">موبائل نمبر:</span>
        </div>
      </div>

      {/* Box 2: Bill Number, Month & Customer Name */}
      <div className="mt-2 p-2 rounded-xl border-2 border-[#0284c7] bg-white grid grid-cols-2 gap-2 shadow-sm">
        {/* Left: Bill Number & Month */}
        <div className="flex items-center gap-2 border-l-2 border-[#0284c7]/30 pl-2">
          <div className="w-8 h-8 rounded-lg bg-[#0284c7] flex items-center justify-center text-white shrink-0 shadow-sm">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold">بل نمبر:</div>
            <div className="text-2xl font-black text-[#0c2e5e] font-mono leading-none">{billNo}</div>
            <div className="text-[10px] text-[#0284c7] font-bold mt-0.5">مہینہ: {monthLabel}</div>
          </div>
        </div>

        {/* Right: Customer Name */}
        <div className="text-right pr-1 flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold">بل نام:</span>
          <span className="text-2xl font-black text-[#0c2e5e] font-urdu truncate leading-tight">{customerName}</span>
        </div>
      </div>

      {/* Box 3: Rate per liter & Total Liters */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {/* Rate */}
        <div className="p-2 rounded-xl border-2 border-[#0284c7] bg-white flex items-center justify-between shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-[#e0f2fe] border border-[#0284c7] flex items-center justify-center text-[#0284c7] shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
              <path d="M6 3h12l1 18H5L6 3z" />
              <path d="M5 8h14" />
            </svg>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 font-bold">فی لیٹر ریٹ:</div>
            <div className="text-base font-black text-[#0c2e5e] leading-tight">
              <span className="font-mono text-xl">{rate}</span> <span className="text-xs font-urdu text-slate-600">روپے</span>
            </div>
          </div>
        </div>

        {/* Total Milk Liters */}
        <div className="p-2 rounded-xl border-2 border-[#0284c7] bg-white flex items-center justify-between shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-[#e0f2fe] border border-[#0284c7] flex items-center justify-center text-[#0284c7] shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#0284c7]">
              <path d="M7 6h10a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5H11A5 5 0 0 1 6 9V7a1 1 0 0 1 1-1z" />
              <path d="M9 14v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-6" />
            </svg>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 font-bold">کل دودھ:</div>
            <div className="text-base font-black text-[#0c2e5e] leading-tight">
              <span className="font-mono text-xl text-[#0284c7]">{qty(liters)}</span> <span className="text-xs font-urdu text-slate-600">لیٹر</span>
            </div>
          </div>
        </div>
      </div>

      {/* Box 4: Previous Balance & Milk Amount */}
      <div className="mt-2 p-2 rounded-xl border-2 border-[#0284c7] bg-white grid grid-cols-2 gap-2 items-center shadow-sm">
        {/* Previous Balance */}
        <div className="flex items-center gap-2 border-l-2 border-[#0284c7]/30 pl-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-400 flex items-center justify-center text-amber-600 shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold">سابقہ رقم:</div>
            <div className="text-base font-black text-amber-600">
              <span className="font-mono text-lg">{money(carry)}</span> <span className="text-xs font-urdu text-slate-600">روپے</span>
            </div>
          </div>
        </div>

        {/* Milk Amount */}
        <div className="text-right pr-1">
          <div className="text-[10px] text-slate-500 font-bold">کل رقم دودھ:</div>
          <div className="text-base font-black text-[#0c2e5e]">
            <span className="font-mono text-lg">{money(milkAmount)}</span> <span className="text-xs font-urdu text-slate-600">روپے</span>
          </div>
        </div>
      </div>

      {/* Box 4.5: Total Bill (Milk + Previous) */}
      <div className="mt-2 p-2.5 rounded-xl border-2 border-[#0284c7] bg-[#e0f2fe]/70 flex items-center justify-between shadow-sm">
        <div className="text-lg font-black text-[#0c2e5e] font-mono">
          {money(calcTotalBill)} <span className="text-xs font-urdu text-slate-600">روپے</span>
        </div>
        <span className="text-xs font-extrabold text-[#0c4a7e] font-urdu">کل بل (دودھ + سابقہ):</span>
      </div>

      {/* Box 5: PROMINENT RECEIVED AMOUNT (ادائیگی شدہ رقم) */}
      <div className="mt-2.5 p-3 rounded-2xl border-2 border-emerald-600 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 shadow-md">
        <div className="flex items-center justify-between">
          <div className="w-11 h-11 rounded-full bg-white border-2 border-emerald-600 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-emerald-800 font-urdu leading-tight">ادائیگی شدہ رقم:</div>
            <div className="text-3xl font-black text-emerald-950 tracking-tight leading-tight mt-0.5">
              <span className="font-mono text-3xl font-black text-emerald-900">{money(effectivePaid)}</span> <span className="text-lg text-emerald-700 font-urdu mr-1">روپے</span>
            </div>
          </div>
        </div>
      </div>

      {/* Box 6: Remaining Amount (باقی رقم) */}
      <div className="mt-2 p-2.5 rounded-xl border-2 border-[#0284c7] bg-white flex items-center justify-between shadow-sm">
        <div className="text-xl font-black text-amber-600 font-mono">
          {money(remaining)} <span className="text-xs font-urdu text-slate-600">روپے</span>
        </div>
        <span className="text-xs font-bold text-[#0c2e5e] font-urdu">باقی رقم:</span>
      </div>

      {/* Box 7: شكریہ Banner */}
      <div className="mt-2.5 p-2 rounded-xl border-2 border-[#0284c7] bg-white text-center shadow-sm">
        <div className="text-2xl font-black text-[#0284c7] font-urdu">شکریہ</div>
        <div className="text-[11px] font-bold text-slate-600 font-urdu">خالص دودھ و تازہ دہی کا بااعتماد مرکز • تشریف لانے کا شکریہ!</div>
      </div>

      {/* Milk Splash Waves Graphic at Bottom */}
      <div className="mt-3 pt-1 flex justify-center opacity-90">
        <svg viewBox="0 0 300 24" className="w-full h-5 text-[#0284c7]" fill="currentColor">
          <path d="M0 12 Q 25 24 50 12 T 100 12 T 150 12 T 200 12 T 250 12 T 300 12 V 24 H 0 Z" fill="#FFFFFF" fillOpacity="0.8" />
          <path d="M0 16 Q 25 6 50 16 T 100 16 T 150 16 T 200 16 T 250 16 T 300 16 V 24 H 0 Z" fill="#0284c7" fillOpacity="0.5" />
        </svg>
      </div>
    </div>
  );
};
