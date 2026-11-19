import React from 'react';
import { Phone, FileText, CheckCircle2, Megaphone, Building2, Coins } from 'lucide-react';
import logoUrl from '../assets/logo.png';

export interface ModernBillCardProps {
  customerId?: number;
  customerName: string;
  phone?: string;
  monthLabel: string;
  issueDateStr?: string;
  rate: number;
  liters: number;
  bill?: number;
  carry?: number;
  received?: number;
  payable?: number;
  billNo?: number | string;
  settings: {
    shop_title: string;
    owner_name: string;
    phone: string;
    bank_name: string;
    account_title: string;
    account_number: string;
  };
  ur?: boolean;
}

const money = (n: number | undefined | null) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
};

const qty = (n: number | undefined | null) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
};

export const ModernBillCard: React.FC<ModernBillCardProps> = ({
  customerId,
  customerName = 'احمد علی',
  phone,
  monthLabel = 'اگست 2026',
  rate = 240,
  liters = 80,
  carry = 140,
  received = 0,
  payable,
  billNo = customerId || '28',
  settings,
}) => {
  const shopTitle = settings?.shop_title || 'قاری ظفر اقبال ملک شاپ';
  const ownerName = settings?.owner_name || 'حافظ مصعب ظفر';
  const contactPhone = settings?.phone || '0300-1234567';
  const bankName = settings?.bank_name || 'Faysal Bank';
  const accountTitle = settings?.account_title || 'Hafiz Musab Zafar';
  const accountNumber = settings?.account_number || '0210-1234567890';

  const milkAmount = Math.round(liters * rate);
  const totalPayable =
    typeof payable === 'number' && Number.isFinite(payable)
      ? payable
      : Math.max(0, milkAmount + (carry || 0) - (received || 0));

  return (
    <div
      id="print-bill"
      dir="rtl"
      className="printable-bill mx-auto shadow-2xl print:shadow-none select-none text-right font-sans relative overflow-hidden"
      style={{
        width: '430px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#101D35',
        backgroundImage: 'linear-gradient(180deg, #101D35 0%, #0C1628 100%)',
        borderRadius: '26px',
        border: '2px solid rgba(233, 184, 63, 0.45)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5), 0 0 1px rgba(233, 184, 63, 0.35)',
        color: '#F4F3ED',
        padding: '18px 16px 18px',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {/* Top Header: Authentic Logo + Milk Bottle Graphic + Shop Title & Subtitle */}
      <div className="relative pb-2">
        <div className="flex items-center justify-between gap-2.5">
          {/* Left: Authentic Shop Logo & Milk Bottle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Logo */}
            <div className="w-14 h-14 rounded-2xl bg-[#192B48]/90 p-1 border border-[#E9B83F]/50 shadow-md flex items-center justify-center">
              <img
                src={logoUrl}
                alt={shopTitle}
                className="w-full h-full object-contain select-none"
              />
            </div>
            {/* Milk Bottle Graphic */}
            <div className="w-10 h-14 flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-10 h-12 filter drop-shadow-[0_2px_6px_rgba(57,201,216,0.35)]" fill="none">
                <rect x="22" y="8" width="14" height="6" rx="2" fill="#E2E8F0" stroke="#39C9D8" strokeWidth="1.5" />
                <path d="M20 14h18l4 8v32a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V22l4-8z" fill="#FFFFFF" fillOpacity="0.95" stroke="#39C9D8" strokeWidth="2" />
                <path d="M22 28c4 3 12 3 14 0v24a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V28z" fill="#39C9D8" fillOpacity="0.25" />
                <path d="M42 32h12l2 24a2 2 0 0 1-2 2H40a2 2 0 0 1-2-2l2-24h2z" fill="#FFFFFF" fillOpacity="0.9" stroke="#39C9D8" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          {/* Right: Shop Name & Owner Pill with Golden Accents */}
          <div className="text-right flex-1 min-w-0 pr-1">
            <h1 className="text-2xl sm:text-[25px] font-black text-[#F4F3ED] tracking-wide font-urdu leading-tight truncate">
              {shopTitle}
            </h1>
            <div className="flex items-center justify-end gap-2 mt-1.5">
              <div className="h-[1.5px] w-7 bg-gradient-to-r from-transparent to-[#E9B83F]"></div>
              <div className="px-3.5 py-0.5 rounded-full border border-[#E9B83F]/80 bg-[#192B48]/95 shadow-sm">
                <span className="text-xs font-bold text-[#E9B83F] font-urdu">{ownerName}</span>
              </div>
              <div className="h-[1.5px] w-7 bg-gradient-to-l from-transparent to-[#E9B83F]"></div>
            </div>
          </div>
        </div>

        {/* Decorative Golden Ribbon Arc */}
        <div className="mt-2 flex justify-center">
          <svg viewBox="0 0 380 8" className="w-full h-2 text-[#E9B83F]/70" fill="none">
            <path d="M0 4 Q 95 0 190 4 T 380 4" stroke="#E9B83F" strokeWidth="1.5" strokeOpacity="0.65" />
          </svg>
        </div>
      </div>

      {/* Box 1: Mobile Number */}
      <div className="mt-1.5 p-2 rounded-2xl border border-[#39C9D8]/40 bg-[#192B48] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-[#F4F3ED] font-black font-mono text-base tracking-wider" dir="ltr">
          <div className="w-7 h-7 rounded-full bg-[#E9B83F]/15 border border-[#E9B83F] flex items-center justify-center text-[#E9B83F]">
            <Phone className="w-3.5 h-3.5" />
          </div>
          <span>{contactPhone}</span>
        </div>
        <div className="border-r border-[#39C9D8]/30 pr-3 mr-1">
          <span className="text-xs font-bold text-[#B7C1D0] font-urdu">موبائل نمبر:</span>
        </div>
      </div>

      {/* Box 2: Bill Number, Month & Customer Name */}
      <div className="mt-2 p-2.5 rounded-2xl border border-[#39C9D8]/40 bg-[#192B48] grid grid-cols-2 gap-2 items-center shadow-sm">
        {/* Left Column: Bill No & Month */}
        <div className="flex items-center gap-2 border-l border-[#39C9D8]/30 pl-2">
          <div className="w-8 h-8 rounded-xl bg-[#101D35] border border-[#39C9D8]/50 flex items-center justify-center text-[#39C9D8] shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#B7C1D0]">
              بل نمبر: <span className="text-lg font-black text-[#F4F3ED] font-mono">{billNo}</span>
            </div>
            <div className="text-[10px] text-[#39C9D8] font-bold">{monthLabel}</div>
          </div>
        </div>

        {/* Right Column: Customer Name */}
        <div className="text-right pr-2">
          <div className="text-[11px] text-[#B7C1D0] font-medium font-urdu">بل بنام:</div>
          <div className="text-xl font-black text-[#F4F3ED] font-urdu truncate">{customerName}</div>
        </div>
      </div>

      {/* Box 3: Rate and Total Milk */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {/* Rate (Left) */}
        <div className="p-2.5 rounded-2xl border border-[#39C9D8]/40 bg-[#192B48] flex items-center justify-between shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-[#101D35] border border-[#39C9D8]/40 flex items-center justify-center text-[#39C9D8] shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#39C9D8]/15 text-[#39C9D8]" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 3h12l-1.5 17a2 2 0 0 1-2 1.8H9.5a2 2 0 0 1-2-1.8L6 3z" />
              <path d="M7 9c2 1 4 1 5 0s3-1 5 0" stroke="#39C9D8" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[#B7C1D0] font-medium font-urdu">فی لیٹر ریٹ:</div>
            <div className="text-base font-black text-[#F4F3ED] font-mono">
              {rate} <span className="text-xs font-urdu text-[#39C9D8]">روپے</span>
            </div>
          </div>
        </div>

        {/* Total Milk (Right) */}
        <div className="p-2.5 rounded-2xl border border-[#39C9D8]/40 bg-[#192B48] flex items-center justify-between shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-[#101D35] border border-[#39C9D8]/40 flex items-center justify-center text-[#39C9D8] shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#39C9D8]/15 text-[#39C9D8]" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 2h6v3H9z" />
              <path d="M8 5h8l3 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V10l3-5z" />
              <path d="M19 10a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3" />
            </svg>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[#B7C1D0] font-medium font-urdu">کل دودھ:</div>
            <div className="text-base font-black text-[#39C9D8] font-mono">
              {qty(liters)} <span className="text-xs font-urdu text-[#F4F3ED]">لیٹر</span>
            </div>
          </div>
        </div>
      </div>

      {/* Box 4: Previous Balance & Milk Amount */}
      <div className="mt-2 p-2.5 rounded-2xl border border-[#39C9D8]/40 bg-[#192B48] grid grid-cols-2 gap-2 items-center shadow-sm">
        {/* Previous Balance (Left) */}
        <div className="flex items-center gap-2 border-l border-[#39C9D8]/30 pl-2">
          <div className="w-8 h-8 rounded-xl bg-[#101D35] border border-[#E9B83F]/50 flex items-center justify-center text-[#E9B83F] shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#B7C1D0] font-medium font-urdu">سابقہ رقم:</div>
            <div className="text-base font-black text-[#E9B83F] font-mono">
              {money(carry)} <span className="text-xs font-urdu text-[#B7C1D0]">روپے</span>
            </div>
          </div>
        </div>

        {/* Milk Amount (Right) */}
        <div className="text-right pr-2">
          <div className="text-[11px] text-[#B7C1D0] font-medium font-urdu">کل رقم دودھ:</div>
          <div className="text-lg font-black text-[#F4F3ED] font-mono">
            {money(milkAmount)} <span className="text-xs font-urdu text-[#39C9D8]">روپے</span>
          </div>
        </div>
      </div>

      {/* Box 5: PROMINENT TOTAL PAYABLE HERO BOX (کل بل ادائیگی) - Golden Yellow Accent */}
      <div className="mt-2.5 p-3 rounded-2xl border-2 border-[#E9B83F] bg-gradient-to-r from-[#1E3357] via-[#192B48] to-[#1E3357] shadow-[0_4px_20px_rgba(233,184,63,0.22)] flex items-center justify-between">
        <div className="w-11 h-11 rounded-full bg-[#E9B83F]/20 border-2 border-[#E9B83F] flex items-center justify-center text-[#E9B83F] shrink-0">
          <CheckCircle2 className="w-7 h-7 text-[#E9B83F]" />
        </div>
        <div className="border-r border-[#E9B83F]/40 pr-3.5 text-right">
          <div className="text-sm font-black text-[#E9B83F] font-urdu leading-tight">کل بل ادائیگی:</div>
          <div className="text-3xl font-black text-[#F4F3ED] font-mono tracking-tight leading-none mt-1">
            {money(totalPayable)} <span className="text-lg text-[#E9B83F] font-urdu font-normal">روپے</span>
          </div>
        </div>
      </div>

      {/* Box 6: Payment Notice */}
      <div className="mt-2 px-3 py-2 rounded-2xl border border-[#39C9D8]/35 bg-[#14233D] shadow-sm">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#E9B83F] shrink-0" />
          <p className="text-[11px] font-bold text-[#F4F3ED] font-urdu m-0 leading-normal">
            بل ہر ماہ کی <span className="text-[#39C9D8] font-black underline decoration-[#39C9D8]/50">5 تاریخ</span> تک ادا کریں، بصورت دیگر دودھ کی سپلائی بند کر دی جائے گی۔
          </p>
        </div>
      </div>

      {/* Box 7: Bank Details */}
      <div className="mt-2 p-2.5 rounded-2xl border border-[#39C9D8]/40 bg-[#192B48] flex items-center justify-between shadow-sm">
        {/* Left: Bank Badge */}
        <div className="flex items-center gap-2 border-l border-[#39C9D8]/30 pl-2">
          <div className="px-2.5 py-1 rounded-xl bg-[#101D35] border border-[#39C9D8]/50 text-[#39C9D8] text-xs font-black tracking-tight flex items-center gap-1.5">
            <span className="font-sans font-bold">{bankName}</span>
            <span className="text-[11px] font-urdu">فیصل</span>
          </div>
        </div>
        {/* Right: Account Info */}
        <div className="text-right text-[11px] pr-2" dir="ltr">
          <div className="font-mono text-[#39C9D8] font-black text-sm">
            <span className="text-[#B7C1D0] text-[10px] font-sans mr-1 font-normal">A/C:</span>
            {accountNumber}
          </div>
          <div className="text-[#F4F3ED] text-[10px] font-bold mt-0.5 font-sans">
            <span className="text-[#B7C1D0] mr-1 font-normal">Title:</span>
            {accountTitle}
          </div>
        </div>
      </div>

      {/* Box 8: Online Transfer Note */}
      <div className="mt-2 p-2.5 rounded-2xl border border-[#39C9D8]/30 bg-[#13223B] flex items-center gap-2.5 shadow-sm">
        <div className="w-8 h-8 rounded-xl bg-[#101D35] border border-[#39C9D8]/40 flex items-center justify-center text-[#39C9D8] shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        <p className="text-[10.5px] text-[#B7C1D0] font-urdu leading-relaxed">
          آن لائن رقم کی ادائیگی کے لیے میزان بینک اکاؤنٹ میں رقم ٹرانسفر کریں۔ ادائیگی کی رسید اس نمبر <span className="text-[#39C9D8] font-bold font-mono" dir="ltr">{contactPhone}</span> پر واٹس ایپ کریں۔
        </p>
      </div>

      {/* Milk Splash Waves Graphic with Golden Accent Line at Bottom */}
      <div className="mt-2.5 pt-1 flex flex-col items-center">
        <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#E9B83F]/60 to-transparent"></div>
        <svg viewBox="0 0 300 22" className="w-full h-5 text-[#39C9D8]" fill="currentColor">
          <path d="M0 10 Q 25 22 50 10 T 100 10 T 150 10 T 200 10 T 250 10 T 300 10 V 22 H 0 Z" fill="#F4F3ED" fillOpacity="0.75" />
          <path d="M0 14 Q 25 4 50 14 T 100 14 T 150 14 T 200 14 T 250 14 T 300 14 V 22 H 0 Z" fill="#39C9D8" fillOpacity="0.35" />
        </svg>
      </div>
    </div>
  );
};
