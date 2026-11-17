import React from 'react';
import { User, Calendar, Building2, Send } from 'lucide-react';
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
  payable,
  settings,
}) => {
  const shopTitle = settings.shop_title || 'قاری ظفر اقبال ملک شاپ';
  const ownerName = settings.owner_name || 'حافظ مصعب ظفر';
  const bankName = settings.bank_name || 'میزان بینک';
  const accountTitle = settings.account_title || 'حافظ مصعب ظفر';
  const accountNumber = settings.account_number || '02090111954760';
  const contactPhone = settings.phone || '+92 321 0001168';

  return (
    <div
      id="print-bill"
      dir="rtl"
      className="printable-bill mx-auto shadow-2xl print:shadow-none print:m-0 select-none text-right"
      style={{
        width: '390px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        background: '#FFFFFF',
        borderRadius: '28px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Noto Sans Arabic', system-ui, sans-serif",
        color: '#0F1B44',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {/* 1. Header Gradient Banner */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(155deg, #1B44C8 0%, #102A7D 100%)',
          padding: '22px 20px 48px',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Background decorative circular shapes */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-70px',
            left: '-60px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '-90px',
            right: '-30px',
            width: '190px',
            height: '190px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            pointerEvents: 'none',
          }}
        />

        {/* Shop Branding Header */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              flexShrink: 0,
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CowLogo variant="white" className="w-8 h-8 object-contain" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '19px', fontWeight: 800, lineHeight: 1.4, color: '#FFFFFF' }}>
              {shopTitle}
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>
              پروپرائیٹر: {ownerName}
            </div>
          </div>
        </div>

        {/* Total Payable Section */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
          <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            کل واجب الادا رقم
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '46px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              {money(payable)}
            </span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
              روپے
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.26)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#FFFFFF',
            }}
          >
            <Calendar style={{ width: '13px', height: '13px' }} />
            <span>بل ہر ماہ 5 تاریخ تک ادا کریں</span>
          </div>
        </div>
      </div>

      {/* 2. Overlapping Card Body */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          marginTop: '-26px',
          background: '#FFFFFF',
          borderRadius: '28px 28px 0 0',
          padding: '18px 16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '13px',
          boxShadow: '0 -8px 22px rgba(15,36,102,0.12)',
        }}
      >
        {/* Customer Information & Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                flexShrink: 0,
                borderRadius: '50%',
                background: '#EAF0FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1B44C8',
              }}
            >
              <User style={{ width: '20px', height: '20px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', lineHeight: 1.4, color: '#5B6785' }}>بل بنام</span>
              <span style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.3, color: '#0F1B44' }}>
                {customerName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                background: '#F1F5FF',
                border: '1px solid #E1E9FC',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#1B44C8',
              }}
            >
              {monthLabel}
            </span>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                background: '#F1F5FF',
                border: '1px solid #E1E9FC',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#0F1B44',
              }}
            >
              کھاتہ #{customerId || 1}
            </span>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                background: '#F1F5FF',
                border: '1px solid #E1E9FC',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#5B6785',
              }}
            >
              تاریخ: {issueDateStr}
            </span>
          </div>
        </div>

        {/* 3-Column Metrics Card */}
        <div
          style={{
            display: 'flex',
            background: '#F3F6FE',
            borderRadius: '16px',
            padding: '10px 0',
          }}
        >
          <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '11px', lineHeight: 1.4, color: '#5B6785' }}>کل دودھ</span>
            <span style={{ fontSize: '17px', fontWeight: 800, lineHeight: 1.3, color: '#0F1B44' }}>
              {qty(liters)}{' '}
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#5B6785' }}>لٹر</span>
            </span>
          </div>
          <div aria-hidden="true" style={{ width: '1px', background: '#DDE5F8' }} />
          <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '11px', lineHeight: 1.4, color: '#5B6785' }}>فی لٹر ریٹ</span>
            <span style={{ fontSize: '17px', fontWeight: 800, lineHeight: 1.3, color: '#0F1B44' }}>
              {rate}{' '}
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#5B6785' }}>روپے</span>
            </span>
          </div>
          <div aria-hidden="true" style={{ width: '1px', background: '#DDE5F8' }} />
          <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '11px', lineHeight: 1.4, color: '#5B6785' }}>سابقہ بقایا</span>
            <span
              style={{
                fontSize: '17px',
                fontWeight: 800,
                lineHeight: 1.3,
                color: carry !== 0 ? '#DC2626' : '#0F1B44',
              }}
            >
              {money(carry)}{' '}
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#5B6785' }}>روپے</span>
            </span>
          </div>
        </div>

        {/* If payment already received this month, show clean breakdown pill */}
        {received > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderRadius: '12px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#065F46',
            }}
          >
            <span>وصول شدہ رقم (اس ماہ):</span>
            <span style={{ fontWeight: 800 }}>- {money(received)} روپے</span>
          </div>
        )}

        {/* 3. Official Bank Payment Card */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #14308F 0%, #0A173F 100%)',
            borderRadius: '18px',
            padding: '14px 16px',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-50px',
              left: '-40px',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}>
              <Building2 style={{ width: '16px', height: '16px' }} />
              {bankName}
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                padding: '2px 9px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.14)',
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              آن لائن ادائیگی
            </span>
          </div>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.68)' }}>اکاؤنٹ نمبر</span>
            <span
              dir="ltr"
              style={{
                unicodeBidi: 'isolate',
                alignSelf: 'flex-start',
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                fontFamily: 'monospace',
              }}
            >
              {accountNumber}
            </span>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.68)' }}>اکاؤنٹ ٹائٹل</span>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>{accountTitle}</span>
          </div>
        </div>

        {/* 4. WhatsApp / Transfer Verification Instruction */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '0 4px' }}>
          <Send
            style={{
              width: '16px',
              height: '16px',
              color: '#1B44C8',
              flexShrink: 0,
              marginTop: '2px',
            }}
          />
          <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.6, color: '#5B6785' }}>
            رقم صرف اسی اکاؤنٹ میں بھیجیں، پھر سکرین شاٹ واٹس ایپ کریں:{' '}
            <span dir="ltr" style={{ unicodeBidi: 'isolate', fontWeight: 700, color: '#1B44C8' }}>
              {contactPhone}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
