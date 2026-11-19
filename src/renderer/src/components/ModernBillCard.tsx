import React from 'react';
import { Phone, FileText, CheckCircle2, Megaphone, Building2, Coins } from 'lucide-react';

export interface ModernBillCardProps {
  customerId?: number;
  customerName: string;
  phone?: string;
  monthLabel: string;
  issueDateStr: string;
  rate: number;
  liters: number;
  bill: number;
  carry: number;
  received: number;
  payable: number;
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
  customerName,
  phone,
  monthLabel,
  issueDateStr,
  rate,
  liters,
  bill,
  carry = 0,
  received = 0,
  payable,
  billNo = customerId || '28',
  settings,
  ur = true,
}) => {
  const shopTitle = settings.shop_title || 'قاری ظفر اقبال ملک شاپ';
  const ownerName = settings.owner_name || 'حافظ مصعب ظفر';
  const contactPhone = settings.phone || '0300-1234567';
  const bankName = settings.bank_name || 'Faysal Bank';
  const accountTitle = settings.account_title || 'Hafiz Musab Zafar';
  const accountNumber = settings.account_number || '0210-1234567890';

  const milkAmount = Math.round(liters * rate);
  const totalPayable = typeof payable === 'number' && Number.isFinite(payable)
    ? payable
    : Math.max(0, milkAmount + carry - received);

  return (
    <div
      id="print-bill"
      dir="rtl"
      className="printable-bill mx-auto shadow-2xl print:shadow-none select-none text-right font-sans relative overflow-hidden"
      style={{
        width: '420px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#020b24',
        backgroundImage: 'radial-gradient(circle at 50% 15%, #081a4a 0%, #020b24 70%)',
        borderRadius: '24px',
        border: '2px solid #00d2ff',
        boxShadow: '0 0 25px rgba(0, 210, 255, 0.35)',
        color: '#FFFFFF',
        padding: '18px 16px 22px',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {/* Top Header Splash & Shop Name */}
      <div className="relative text-center pb-2">
        {/* Milk Bottle Graphic & Splash at Top */}
        <div className="flex justify-center items-center gap-2 mb-1">
          <div className="w-12 h-14 flex items-center justify-center">
            {/* SVG Milk Bottle & Glass Graphic */}
            <svg viewBox="0 0 64 64" className="w-12 h-12 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" fill="none">
              <rect x="22" y="8" width="14" height="6" rx="2" fill="#E2E8F0" stroke="#00d2ff" strokeWidth="1.5" />
              <path d="M20 14h18l4 8v32a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V22l4-8z" fill="#FFFFFF" fillOpacity="0.9" stroke="#00d2ff" strokeWidth="2" />
              <path d="M22 28c4 3 12 3 14 0v24a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V28z" fill="#00d2ff" fillOpacity="0.3" />
              <path d="M42 32h12l2 24a2 2 0 0 1-2 2H40a2 2 0 0 1-2-2l2-24h2z" fill="#FFFFFF" fillOpacity="0.85" stroke="#00d2ff" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Shop Name In Arabic / Urdu */}
        <h1 className="text-2xl font-black text-white tracking-wide font-urdu leading-tight filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {shopTitle}
        </h1>

        {/* Owner Name Oval Badge */}
        <div className="inline-block mt-1 px-4 py-0.5 rounded-full border border-cyan-400/80 bg-blue-950/60 shadow-[0_0_10px_rgba(0,210,255,0.3)]">
          <span className="text-xs font-bold text-cyan-200 font-urdu">{ownerName}</span>
        </div>
      </div>

      {/* Box 1: Mobile Number */}
      <div className="mt-2.5 p-2 rounded-xl border border-cyan-400/80 bg-[#06143c] flex items-center justify-between shadow-[0_0_12px_rgba(0,150,255,0.2)]">
        <div className="flex items-center gap-1.5 text-cyan-300 font-black font-mono text-base tracking-wider" dir="ltr">
          <div className="w-7 h-7 rounded-full bg-blue-600/40 border border-cyan-400/60 flex items-center justify-center text-cyan-300">
            <Phone className="w-3.5 h-3.5" />
          </div>
          <span>{contactPhone}</span>
        </div>
        <span className="text-xs font-bold text-slate-200 font-urdu">موبائل نمبر:</span>
      </div>

      {/* Box 2: Bill Number, Month & Customer Name */}
      <div className="mt-2 p-2 rounded-xl border border-cyan-400/80 bg-[#06143c] grid grid-cols-2 gap-2 items-center shadow-[0_0_12px_rgba(0,150,255,0.2)]">
        <div className="flex items-center gap-2 border-l border-cyan-400/30 pl-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-300">
              بل نمبر: <span className="text-sm font-black text-white">{billNo}</span>
            </div>
            <div className="text-[10px] text-cyan-300 font-semibold">{monthLabel}</div>
          </div>
        </div>

        <div className="text-right pr-1">
          <div className="text-[10px] text-slate-300 font-medium">بل بنام:</div>
          <div className="text-base font-black text-white font-urdu truncate">{customerName}</div>
        </div>
      </div>

      {/* Box 3: Rate and Total Milk */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {/* Rate */}
        <div className="p-2 rounded-xl border border-cyan-400/80 bg-[#06143c] flex items-center justify-between shadow-[0_0_12px_rgba(0,150,255,0.2)]">
          <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-cyan-300" stroke="currentColor" strokeWidth="1">
              <path d="M17 2H7l2 18a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2l2-18z" />
            </svg>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-300 font-medium">فی لیٹر ریٹ:</div>
            <div className="text-sm font-black text-white">{rate} روپے</div>
          </div>
        </div>

        {/* Total Milk */}
        <div className="p-2 rounded-xl border border-cyan-400/80 bg-[#06143c] flex items-center justify-between shadow-[0_0_12px_rgba(0,150,255,0.2)]">
          <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-cyan-300">
              <path d="M7 6h10a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5H11A5 5 0 0 1 6 9V7a1 1 0 0 1 1-1z" />
              <path d="M9 14v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-6" />
            </svg>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-300 font-medium">کل دودھ:</div>
            <div className="text-sm font-black text-cyan-300">{qty(liters)} لیٹر</div>
          </div>
        </div>
      </div>

      {/* Box 4: Previous Balance & Milk Amount */}
      <div className="mt-2 p-2 rounded-xl border border-cyan-400/80 bg-[#06143c] grid grid-cols-2 gap-2 items-center shadow-[0_0_12px_rgba(0,150,255,0.2)]">
        <div className="flex items-center gap-2 border-l border-cyan-400/30 pl-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0">
            <Coins className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-300 font-medium">سابقہ رقم:</div>
            <div className="text-sm font-black text-amber-300">{money(carry)} روپے</div>
          </div>
        </div>

        <div className="text-right pr-1">
          <div className="text-[10px] text-slate-300 font-medium">کل رقم دودھ:</div>
          <div className="text-sm font-black text-white">{money(milkAmount)} روپے</div>
        </div>
      </div>

      {/* Box 5: PROMINENT TOTAL PAYABLE NEON GLOW BOX */}
      <div className="mt-2.5 p-3 rounded-2xl border-2 border-cyan-400 bg-gradient-to-r from-blue-900/90 via-[#072559] to-blue-900/90 shadow-[0_0_20px_rgba(0,210,255,0.5)]">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-cyan-400/20 border-2 border-cyan-300 flex items-center justify-center text-cyan-300 shrink-0 shadow-[0_0_10px_#00d2ff]">
            <CheckCircle2 className="w-6 h-6 text-cyan-300" />
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-cyan-200 font-urdu leading-tight">کل بل ادائیگی:</div>
            <div className="text-2xl font-black text-white tracking-tight leading-tight mt-0.5">
              {money(totalPayable)} <span className="text-base text-cyan-300 font-urdu">روپے</span>
            </div>
          </div>
        </div>
      </div>

      {/* Box 6: Warning Banner */}
      <div className="mt-2.5 px-3 py-2 rounded-xl border border-cyan-400/70 bg-[#061a47] shadow-[0_0_10px_rgba(0,210,255,0.2)]">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-cyan-300 shrink-0" />
          <p className="text-[11px] font-bold text-white font-urdu m-0 leading-normal">
            بل ہر ماہ کی <span className="text-cyan-300 font-black">5 تاریخ</span> تک ادا کریں، بصورت دیگر دودھ کی سپلائی بند کر دی جائے گی۔
          </p>
        </div>
      </div>

      {/* Box 7: Bank Details */}
      <div className="mt-2 p-2.5 rounded-xl border border-cyan-400/80 bg-[#06143c] flex items-center justify-between shadow-[0_0_12px_rgba(0,150,255,0.2)]">
        <div className="flex items-center gap-2 border-l border-cyan-400/30 pl-2">
          <div className="px-2 py-1 rounded-lg bg-blue-900/60 border border-cyan-400/50 text-cyan-300 text-xs font-black tracking-tight flex items-center gap-1">
            <span className="font-sans lowercase">{bankName.toLowerCase().replace(/\s/g, '')}</span>
            <span className="text-[10px] font-urdu">فیصل</span>
          </div>
        </div>
        <div className="text-right text-[11px]" dir="ltr">
          <div className="font-mono text-cyan-300 font-black">
            <span className="text-slate-300 text-[10px] font-sans mr-1 font-normal">A/C:</span>
            {accountNumber}
          </div>
          <div className="text-slate-200 text-[10px] font-bold mt-0.5 font-sans">
            <span className="text-slate-400 mr-1 font-normal">Title:</span>
            {accountTitle}
          </div>
        </div>
      </div>

      {/* Box 8: Online Transfer Note */}
      <div className="mt-2 p-2 rounded-xl border border-cyan-400/60 bg-[#041030] flex items-center gap-2 shadow-xs">
        <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <p className="text-[10px] text-slate-200 font-urdu leading-relaxed">
          آن لائن رقم کی ادائیگی کے لیے بینک اکاؤنٹ میں رقم ٹرانسفر کریں۔ ادائیگی کی رسید اس نمبر <span className="text-cyan-300 font-bold font-mono" dir="ltr">{contactPhone}</span> پر واٹس ایپ کریں۔
        </p>
      </div>

      {/* Milk Splash Waves Graphic at Bottom */}
      <div className="mt-3 pt-1 flex justify-center opacity-85">
        <svg viewBox="0 0 300 24" className="w-full h-5 text-cyan-300" fill="currentColor">
          <path d="M0 12 Q 25 24 50 12 T 100 12 T 150 12 T 200 12 T 250 12 T 300 12 V 24 H 0 Z" fill="#FFFFFF" fillOpacity="0.4" />
          <path d="M0 16 Q 25 6 50 16 T 100 16 T 150 16 T 200 16 T 250 16 T 300 16 V 24 H 0 Z" fill="#00d2ff" fillOpacity="0.3" />
        </svg>
      </div>
    </div>
  );
};
