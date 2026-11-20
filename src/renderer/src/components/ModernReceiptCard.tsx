import React from 'react';
import './receipt-card.css';
import logoUrl from '../assets/logo.png';
import { ThankYouScriptGraphic } from './ThankYouScriptGraphic';

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
  customerName = 'کاظم',
  phone,
  address,
  monthLabel = 'اگست 2026',
  issueDateStr,
  currentTimeStr,
  rate = 240,
  liters = 0,
  carry = 0,
  totalBill,
  paidNow = 0,
  totalReceived,
  remaining = 0,
  billNo = receiptNumber,
  accountNumber: customAccountNo,
  bankName: customBankName,
  accountTitle: customAccountTitle,
  paymentMethod = 'نقد / آن لائن (Cash / Online)',
  settings,
  ur = true,
  onEditAccount,
}) => {
  const shopTitle = settings?.shop_title || 'قاری ظفر اقبال ملک شاپ';
  const ownerName = settings?.owner_name || 'حافظ مصعب ظفر';
  const bankName = customBankName || settings?.bank_name || 'میزان بینک';
  const accountTitle = customAccountTitle || settings?.account_title || 'حافظ مصعب ظفر';
  const accountNumber = customAccountNo || settings?.account_number || '02090111954760';

  const milkAmount = Math.round((liters || 0) * (rate || 0));
  const calcTotalBill =
    typeof totalBill === 'number' && Number.isFinite(totalBill)
      ? totalBill
      : milkAmount + (carry || 0);

  const effectivePaid = paidNow > 0 ? paidNow : (totalReceived || 0);
  const calcTotalReceived =
    typeof totalReceived === 'number' && Number.isFinite(totalReceived)
      ? totalReceived
      : effectivePaid;

  const calcRemaining =
    typeof remaining === 'number' && Number.isFinite(remaining)
      ? remaining
      : Math.max(0, calcTotalBill - calcTotalReceived);

  return (
    <div id="print-receipt" className="printable-bill modern-dark-slip receipt-theme">
      {/* Outer Glow & Double Border Frame */}
      <div className="dark-slip-inner-frame">
        {/* Top Header Section */}
        <div className="dark-slip-header">
          {/* Bismillah */}
          <div className="dark-slip-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>

          {/* Title Row with Logo */}
          <div className="dark-slip-title-row">
            <div className="dark-slip-logo-badge" title={shopTitle}>
              <img src={logoUrl} alt={shopTitle} className="dark-slip-logo-img" />
            </div>

            <div className="dark-slip-brand">
              <h1 className="dark-slip-shop-title">{shopTitle}</h1>
              <div className="dark-slip-subtitle">
                پروپرائٹر: <b>{ownerName}</b> • معیار، اعتماد اور خالص دودھ کا بااعتماد مرکز
              </div>
            </div>

            <div className="dark-slip-badge receipt-badge">
              <span className="badge-ur">رسید وصولی رقم</span>
              <span className="badge-en">Payment Receipt</span>
            </div>
          </div>
        </div>

        {/* 2. Mobile Numbers Box (Matching the paper slip) */}
        <div className="dark-slip-mobile-box">
          <div className="mobile-box-label">
            <span>Mobile No:</span>
          </div>
          <div className="mobile-box-grid">
            <div className="mobile-row">
              <span className="mobile-num">0300-8440710</span>
              <span className="mobile-sep">,</span>
              <span className="mobile-num">0320-4815221</span>
            </div>
            <div className="mobile-row">
              <span className="mobile-num">0300-9416564</span>
              <span className="mobile-sep">,</span>
              <span className="mobile-num">0321-4815221</span>
            </div>
          </div>
        </div>

        {/* 3. Customer & Receipt Number Box */}
        <div className="dark-slip-customer-section">
          {/* Left: Receipt / Account Box */}
          <div className="dark-slip-account-badge receipt-badge-box" title="رسید نمبر">
            <div className="badge-box-label">رسید نمبر</div>
            <div className="badge-box-num">#{receiptNumber}</div>
          </div>

          {/* Right: Customer & Date Meta */}
          <div className="dark-slip-customer-meta">
            <div className="customer-meta-row">
              <span className="meta-label">محترم گاہک:</span>
              <span className="meta-val customer-name">{customerName}</span>
              {phone && (
                <span className="meta-phone" dir="ltr">
                  ({phone})
                </span>
              )}
            </div>

            <div className="customer-meta-row">
              <span className="meta-label">ماہ وسال:</span>
              <span className="meta-val month-val">{monthLabel}</span>
              <span className="meta-date">
                [تاریخ: {issueDateStr || new Date().toLocaleDateString(ur ? 'ur-PK' : 'en-GB')}]
              </span>
            </div>
          </div>
        </div>

        {/* 4. Payment Breakdown Grid (Colorful Dark Pills) */}
        <div className="dark-slip-calc-grid">
          {/* Row 1: Total Bill & Paid Now */}
          <div className="calc-pill calc-milk-amount">
            <span className="calc-label">کل واجب الادا بل:</span>
            <span className="calc-val">Rs. {money(calcTotalBill)}</span>
          </div>

          <div className="calc-pill calc-received highlight-paid">
            <span className="calc-label">وصول شدہ رقم (Paid Now):</span>
            <span className="calc-val text-emerald-300 font-black">Rs. {money(calcTotalReceived)}</span>
          </div>

          {/* Row 2: Remaining Balance & Payment Method */}
          <div className="calc-pill calc-carry">
            <span className="calc-label">بقیہ رقم (Remaining Due):</span>
            <span className={`calc-val ${calcRemaining > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
              Rs. {money(calcRemaining)}
            </span>
          </div>

          <div className="calc-pill calc-rate">
            <span className="calc-label">طریقۂ ادائیگی:</span>
            <span className="calc-val text-cyan-300">{paymentMethod}</span>
          </div>
        </div>

        {/* 5. Received Amount Banner (Glowing Green Badge) */}
        <div className="dark-slip-total-banner receipt-banner">
          <div className="total-banner-label">
            <span>وصول شدہ رقم (Payment Received):</span>
            <span className="total-banner-sub">
              {calcRemaining === 0 ? 'مکمل ادائیگی موصول ہو چکی ہے • شکریہ!' : 'جزوی ادائیگی موصول ہوئی'}
            </span>
          </div>
          <div className="total-banner-amount">
            <span className="currency">Rs.</span>
            <span className="value">{money(calcTotalReceived)}</span>
          </div>
        </div>

        {/* 6. Bank Details & Online Verification Notice */}
        <div className="dark-slip-rules-card">
          <div
            className={`rules-item rule-bank-account ${onEditAccount ? 'cursor-pointer hover:bg-emerald-950/40 rounded-lg p-1 transition-colors' : ''}`}
            onClick={onEditAccount}
            title={onEditAccount ? 'اکاؤنٹ نمبر تبدیل کرنے کے لیے کلک کریں' : undefined}
          >
            <span className="rule-icon">🏦</span>
            <div className="rule-text-block">
              <span>{bankName} برائے آن لائن ٹرانسفر: </span>
              <span className="account-number-pill" dir="ltr">
                {accountNumber}
              </span>
              <span> عنوان: <b>{accountTitle}</b></span>
              {onEditAccount && <span className="text-emerald-400 text-xs no-print"> [تبدیل کریں ✏️]</span>}
            </div>
          </div>

          <div className="rules-item rule-whatsapp">
            <span className="rule-icon">📱</span>
            <span className="rule-text">
              کسی بھی معلومات یا سکرین شاٹ کے لیے <span className="whatsapp-highlight" dir="ltr">03204815221</span> پر رابطہ کریں۔
            </span>
          </div>
        </div>

        {/* 7. Footer Calligraphy "شکریہ! Thank You!" */}
        <div className="dark-slip-footer">
          <ThankYouScriptGraphic width={160} height={42} color="#10b981" />
          <div className="footer-tagline">
            خالص دودھ و تازہ دہی کا بااعتماد مرکز • آپ کے تعاون کا بہت شکریہ!
          </div>
        </div>
      </div>
    </div>
  );
};
