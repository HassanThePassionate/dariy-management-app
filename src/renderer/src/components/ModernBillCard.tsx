import React from 'react';
import { User, Calendar, Building2, Send, CheckCircle2 } from 'lucide-react';
import { CowLogo } from './CowLogo';

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
  carry,
  received,
  settings,
  ur = true,
}) => {
  const shopTitle = settings.shop_title || 'قاری ظفر اقبال ملک شاپ';
  const ownerName = settings.owner_name || 'حافظ مصعب ظفر';
  const bankName = settings.bank_name || 'میزان بینک';
  const accountTitle = settings.account_title || 'حافظ مصعب ظفر';
  const accountNumber = settings.account_number || '02090111954760';
  const contactPhone = settings.phone || '+92 321 0001168';

  const totalBill = (carry || 0) + (bill || 0);
  const totalReceived = received || 0;
  const balance = totalBill - totalReceived;

  const isPaid = balance <= 0 && (totalBill > 0 || totalReceived > 0);
  const isPartial = totalReceived > 0 && balance > 0;
  const isAdvance = balance < 0;

  return (
    <div
      id="print-bill"
      dir="rtl"
      className="printable-bill mx-auto shadow-xl print:shadow-none print:m-0 select-none text-right"
      style={{
        width: '360px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        background: '#FFFFFF',
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Noto Sans Arabic', system-ui, sans-serif",
        color: '#0F1B44',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {/* 1. Header Gradient Banner (Compact) */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1B44C8 0%, #102A7D 100%)',
          padding: '12px 14px 14px',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Shop Branding Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                flexShrink: 0,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1.5px solid rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
              }}
            >
              <CowLogo variant="white" size={32} className="w-8 h-8 object-contain" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.2, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {shopTitle}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>
                {ownerName} • {contactPhone}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '3px 8px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              fontSize: '10px',
              fontWeight: 700,
              color: '#FFFFFF',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {monthLabel}
          </div>
        </div>

        {/* Total Amount & Status Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '12px',
            padding: '6px 10px',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>
              {isPaid ? 'اس ماہ کا کل بل' : 'کل واجب الادا رقم'}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#FCD34D', lineHeight: 1.1 }}>
              Rs. {money(isPaid ? totalBill : balance)}
            </div>
          </div>

          {/* Status Pill */}
          {isPaid ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: '#059669',
                fontSize: '10.5px',
                fontWeight: 800,
                color: '#FFFFFF',
              }}
            >
              ✓ ادا شدہ (PAID)
            </span>
          ) : isPartial ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '999px',
                background: '#D97706',
                fontSize: '10px',
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              ⚠️ جزوی ادا
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.2)',
                fontSize: '10px',
                fontWeight: 600,
                color: '#FFFFFF',
              }}
            >
              بل واجب الادا
            </span>
          )}
        </div>
      </div>

      {/* 2. Compact Body */}
      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: '#FFFFFF',
        }}
      >
        {/* Customer Info Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
            borderRadius: '10px',
            padding: '6px 8px',
            fontSize: '11px',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#64748B' }}>گاہک:</span>
            <span style={{ fontWeight: 800, color: '#0F1B44' }}>{customerName}</span>
            {customerId && (
              <span style={{ fontSize: '9px', background: '#E0E7FF', color: '#3730A3', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                #{customerId}
              </span>
            )}
          </div>
          <div style={{ fontSize: '10px', color: '#64748B' }}>
            {issueDateStr}
          </div>
        </div>

        {/* 4-Column Metrics: Milk Breakdown */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: carry !== 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
            background: '#F1F5F9',
            borderRadius: '10px',
            padding: '6px 4px',
            textAlign: 'center',
            fontSize: '10px',
          }}
        >
          <div>
            <div style={{ color: '#64748B' }}>کل دودھ</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F1B44' }}>
              {qty(liters)} <span style={{ fontSize: '9px', fontWeight: 500 }}>L</span>
            </div>
          </div>
          <div style={{ borderRight: '1px solid #CBD5E1' }}>
            <div style={{ color: '#64748B' }}>ریٹ</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F1B44' }}>
              {rate}
            </div>
          </div>
          <div style={{ borderRight: '1px solid #CBD5E1' }}>
            <div style={{ color: '#64748B' }}>ماہانہ بل</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#1B44C8' }}>
              Rs. {money(bill)}
            </div>
          </div>
          {carry !== 0 && (
            <div style={{ borderRight: '1px solid #CBD5E1' }}>
              <div style={{ color: '#64748B' }}>سابقہ</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: carry > 0 ? '#DC2626' : '#059669' }}>
                Rs. {money(carry)}
              </div>
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div
          style={{
            background: isPaid ? '#F0FDF4' : isPartial ? '#FFFBEB' : '#F8FAFC',
            border: `1px solid ${isPaid ? '#86EFAC' : isPartial ? '#FDE68A' : '#E2E8F0'}`,
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
            <span>کل بل بنتا تھا:</span>
            <span style={{ fontWeight: 700, color: '#0F1B44' }}>Rs. {money(totalBill)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
            <span>وصول شدہ رقم:</span>
            <span style={{ fontWeight: 800, color: '#059669' }}>Rs. {money(totalReceived)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '4px',
              borderTop: `1px solid ${isPaid ? '#BBF7D0' : isPartial ? '#FDE68A' : '#E2E8F0'}`,
              fontWeight: 800,
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#0F1B44' }}>باقی واجب الادا:</span>
            <span style={{ color: balance > 0 ? '#DC2626' : '#059669' }}>
              {balance > 0
                ? `Rs. ${money(balance)}`
                : balance < 0
                ? `Rs. ${money(-balance)} (ایڈوانس)`
                : `Rs. 0 (صاف ✓)`}
            </span>
          </div>
          <div style={{ fontSize: '9.5px', color: isPaid ? '#166534' : isPartial ? '#92400E' : '#64748B', textAlign: 'center', paddingTop: '2px', fontWeight: 600 }}>
            {isPaid
              ? `✓ کل بل Rs. ${money(totalBill)} مکمل ادا ہو چکا ہے۔ شکریہ!`
              : isPartial
              ? `⚠️ کل بل Rs. ${money(totalBill)}، ادا Rs. ${money(totalReceived)}، باقی Rs. ${money(balance)}`
              : `⌛ براہ کرم بل 5 تاریخ تک ادا فرمائیں۔ شکریہ!`}
          </div>
        </div>

        {/* Bank & Payment Info Strip */}
        <div
          style={{
            background: '#F1F5F9',
            borderRadius: '8px',
            padding: '5px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '9.5px',
            color: '#475569',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Building2 style={{ width: '12px', height: '12px', color: '#1B44C8' }} />
            <span style={{ fontWeight: 700 }}>{bankName}:</span>
            <span dir="ltr" style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0F1B44' }}>{accountNumber}</span>
          </div>
          <div style={{ color: '#64748B' }}>
            ({accountTitle})
          </div>
        </div>
      </div>
    </div>
  );
};
