import React from 'react';
import { Phone, FileText, CheckCircle2, Megaphone, Coins } from 'lucide-react';
import logoUrl from '../assets/logo.png';

export interface ModernBillCardProps {
  customerId?: number;
  customerName: string;
  phone?: string;
  address?: string;
  monthLabel: string;
  issueDateStr?: string;
  rate: number;
  liters: number;
  bill?: number;
  carry?: number;
  received?: number;
  payable?: number;
  billNo?: number | string;
  accountNumber?: string;
  bankName?: string;
  accountTitle?: string;
  settings?: {
    shop_title: string;
    owner_name: string;
    phone: string;
    bank_name: string;
    account_title: string;
    account_number: string;
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

export const ModernBillCard: React.FC<ModernBillCardProps> = ({
  customerId,
  customerName = 'احمد علی',
  phone,
  monthLabel = 'اگست 2026',
  rate = 240,
  liters = 80,
  bill,
  carry = 140,
  received = 0,
  payable,
  billNo = customerId || '28',
  accountNumber: customAccountNo,
  bankName: customBankName,
  accountTitle: customAccountTitle,
  settings,
  ur = true,
  onEditAccount,
}) => {
  const shopTitle = settings?.shop_title || 'قاری ظفر اقبال ملک شاپ';
  const ownerName = settings?.owner_name || 'حافظ مصعب ظفر';
  const contactPhone = settings?.phone || '0300-1234567';
  const bankName = customBankName || settings?.bank_name || 'faysalbank';
  const accountTitle = customAccountTitle || settings?.account_title || 'Hafiz Musab Zafar';
  const accountNumber = customAccountNo || settings?.account_number || '0210-1234567890';

  const milkAmount = typeof bill === 'number' && Number.isFinite(bill) ? bill : Math.round(liters * rate);
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
      </div>

      {/* Box 1: Mobile Number (Aqua/Cyan Container) */}
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

      {/* Box 5: PROMINENT TOTAL PAYABLE AQUA/CYAN BOX (کل قابل ادائیگی) */}
      <div className="mt-2.5 p-3 rounded-2xl border-2 border-[#0284c7] bg-gradient-to-r from-[#e0f2fe] via-[#bae6fd] to-[#e0f2fe] shadow-md">
        <div className="flex items-center justify-between">
          <div className="w-11 h-11 rounded-full bg-white border-2 border-[#0284c7] flex items-center justify-center text-[#0284c7] shrink-0 shadow-sm">
            <CheckCircle2 className="w-7 h-7 text-[#0284c7]" />
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-[#0c4a7e] font-urdu leading-tight">کل قابل ادائیگی:</div>
            <div className="text-3xl font-black text-[#0c2e5e] tracking-tight leading-tight mt-0.5">
              <span className="font-mono text-3xl font-black text-[#0c2e5e]">{money(totalPayable)}</span> <span className="text-lg text-[#0284c7] font-urdu mr-1">روپے</span>
            </div>
          </div>
        </div>
      </div>

      {/* Box 6: Warning Banner */}
      <div className="mt-2.5 px-3 py-2 rounded-xl border-2 border-[#0284c7] bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#0284c7] shrink-0" />
          <p className="text-[11px] font-bold text-[#0c2e5e] font-urdu m-0 leading-normal">
            بل ہر ماہ کی <span className="text-[#0284c7] font-black">5 تاریخ تک</span> ادا کریں، بصورت دیگر دودھ کی سپلائی بند کر دی جائے گی۔
          </p>
        </div>
      </div>

      {/* Box 7: Bank Details (faysalbank Logo Badge + Account Number) */}
      <div
        className={`mt-2 p-2.5 rounded-xl border-2 border-[#0284c7] bg-white flex items-center justify-between shadow-sm ${
          onEditAccount ? 'cursor-pointer hover:bg-sky-50 transition-colors' : ''
        }`}
        onClick={onEditAccount}
        title={onEditAccount ? 'بینک اکاؤنٹ تبدیل کرنے کے لیے کلک کریں' : undefined}
      >
        <div className="flex items-center gap-2 border-l-2 border-[#0284c7]/30 pl-2">
          <div className="px-2.5 py-1 rounded-lg bg-[#0c4a7e] text-white text-xs font-black tracking-tight flex items-center gap-1.5 shadow-sm">
            <span className="font-sans font-black text-sm tracking-tighter lowercase text-white">faysalbank</span>
            <div className="w-4 h-4 rounded-sm bg-cyan-500 flex items-center justify-center text-[9px] font-urdu text-white font-bold">
              فیصل
            </div>
          </div>
        </div>
        <div className="text-right text-[11px]" dir="ltr">
          <div className="font-mono text-[#0c2e5e] font-black text-sm">
            <span className="text-slate-500 text-[10px] font-sans mr-1 font-normal">A/C:</span>
            {accountNumber}
          </div>
          <div className="text-slate-700 text-[10px] font-bold mt-0.5 font-sans">
            <span className="text-slate-500 mr-1 font-normal">Title:</span>
            {accountTitle}
          </div>
        </div>
      </div>

      {/* Box 8: Online Transfer Note */}
      <div className="mt-2 p-2 rounded-xl border-2 border-[#0284c7] bg-white flex items-center gap-2 shadow-sm">
        <div className="w-8 h-8 rounded-lg bg-[#e0f2fe] border border-[#0284c7] flex items-center justify-center text-[#0284c7] shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
            <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z" />
          </svg>
        </div>
        <p className="text-[10px] text-slate-700 font-urdu leading-relaxed m-0">
          آن لائن رقم کی ادائیگی کے لیے میزان بینک اکاؤنٹ میں رقم ٹرانسفر کریں۔ ادائیگی کی رسید اس نمبر <span className="text-[#0284c7] font-bold font-mono" dir="ltr">{contactPhone}</span> پر واٹس ایپ کریں۔
        </p>
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
