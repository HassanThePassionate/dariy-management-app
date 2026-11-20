import React from 'react';
import './receipt-card.css';
import logoUrl from '../assets/logo.png';
import { ThankYouScriptGraphic } from './ThankYouScriptGraphic';

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
  customerName = 'کاظم',
  phone,
  address,
  monthLabel = 'اگست 2026',
  issueDateStr,
  rate = 240,
  liters = 0,
  bill,
  carry = 0,
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
  const bankName = customBankName || settings?.bank_name || 'میزان بینک';
  const accountTitle = customAccountTitle || settings?.account_title || 'حافظ مصعب ظفر';
  const accountNumber = customAccountNo || settings?.account_number || '02090111954760';

  const milkAmount = typeof bill === 'number' && Number.isFinite(bill) ? bill : Math.round(liters * rate);
  const totalPayable =
    typeof payable === 'number' && Number.isFinite(payable)
      ? payable
      : Math.max(0, milkAmount + (carry || 0) - (received || 0));

  return (
    <div id="print-bill" className="printable-bill modern-dark-slip">
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

            <div className="dark-slip-badge">
              <span className="badge-ur">دودھ کا بل</span>
              <span className="badge-en">Milk Bill</span>
            </div>
          </div>
        </div>

        {/* 2. Mobile Numbers Box (Matching the exact paper slip layout) */}
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

        {/* 3. Customer & Account / Bill Number Box */}
        <div className="dark-slip-customer-section">
          {/* Left: Account / Bill Number Badge (Box with #28) */}
          <div className="dark-slip-account-badge" title="بل نمبر / اکاؤنٹ نمبر">
            <div className="badge-box-label">اکاؤنٹ / بل نمبر</div>
            <div className="badge-box-num">{billNo}</div>
          </div>

          {/* Right: Customer Name & Month */}
          <div className="dark-slip-customer-meta">
            <div className="customer-meta-row">
              <span className="meta-label">بل بنام:</span>
              <span className="meta-val customer-name">{customerName}</span>
              {phone && (
                <span className="meta-phone" dir="ltr">
                  ({phone})
                </span>
              )}
            </div>

            <div className="customer-meta-row">
              <span className="meta-label">بل ماہ وسال:</span>
              <span className="meta-val month-val">{monthLabel}</span>
              {issueDateStr && (
                <span className="meta-date">
                  [تاریخ اجرا: {issueDateStr}]
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Milk Calculations Rows (Vibrant Colorful Dark Badges) */}
        <div className="dark-slip-calc-grid">
          {/* Row 1: Rate & Liters */}
          <div className="calc-pill calc-rate">
            <span className="calc-label">دودھ فی لٹر:</span>
            <span className="calc-val">Rs. {money(rate)}</span>
          </div>
          <div className="calc-pill calc-liters">
            <span className="calc-label">ٹوٹل لٹر دودھ:</span>
            <span className="calc-val">{qty(liters)} لٹر</span>
          </div>

          {/* Row 2: Milk Amount & Previous Balance */}
          <div className="calc-pill calc-milk-amount">
            <span className="calc-label">کل رقم دودھ:</span>
            <span className="calc-val">Rs. {money(milkAmount)}</span>
          </div>
          <div className="calc-pill calc-carry">
            <span className="calc-label">سابقہ رقم (بقایا):</span>
            <span className="calc-val">Rs. {money(carry)}</span>
          </div>

          {/* Received if any */}
          {received > 0 && (
            <div className="calc-pill calc-received col-span-2">
              <span className="calc-label">وصول شدہ رقم (پیشگی/جزوی):</span>
              <span className="calc-val text-emerald-400">-Rs. {money(received)}</span>
            </div>
          )}
        </div>

        {/* 5. Grand Total / Payable Card (Prominent Glowing Gradient Card) */}
        <div className="dark-slip-total-banner">
          <div className="total-banner-label">
            <span>ٹوٹل رقم دودھ / کل واجب الادا:</span>
            <span className="total-banner-sub">(Total Payable Amount)</span>
          </div>
          <div className="total-banner-amount">
            <span className="currency">Rs.</span>
            <span className="value">{money(totalPayable)}</span>
          </div>
        </div>

        {/* 6. Urdu Rules & Bank Payment Instructions (Exact text from slip) */}
        <div className="dark-slip-rules-card">
          <div className="rules-item rule-warning">
            <span className="rule-icon">⚠️</span>
            <span className="rule-text">
              بل ہر ماہ کی 5 تاریخ تک ادا کر دیں بصورت دیگر دودھ بند کر دیا جائے گا۔
            </span>
          </div>

          <div className="rules-item rule-bank-intro">
            <span className="rule-icon">💳</span>
            <span className="rule-text">
              آن لائن بل کی رقم ادا کرنے کے لیے میزان بینک میں رقم ٹرانسفر کریں۔
            </span>
          </div>

          <div
            className={`rules-item rule-bank-account ${onEditAccount ? 'cursor-pointer hover:bg-emerald-950/40 rounded-lg p-1 transition-colors' : ''}`}
            onClick={onEditAccount}
            title={onEditAccount ? 'اکاؤنٹ نمبر تبدیل کرنے کے لیے کلک کریں' : undefined}
          >
            <span className="rule-icon">🏦</span>
            <div className="rule-text-block">
              <span>{bankName} اکاؤنٹ نمبر: </span>
              <span className="account-number-pill" dir="ltr">
                {accountNumber}
              </span>
              <span> عنوان: <b>{accountTitle}</b></span>
              <div className="rule-bank-warning">
                اور اس کے علاوہ کسی بھی بینک اور جاز کیش میں رقم نہ بھیجیں اور بل کی رقم ٹرانسفر کرنے کے بعد سکرین شاٹ لازمی وٹس ایپ کریں۔
                {onEditAccount && <span className="text-emerald-400 text-xs no-print"> [تبدیل کریں ✏️]</span>}
              </div>
            </div>
          </div>

          <div className="rules-item rule-whatsapp">
            <span className="rule-icon">📱</span>
            <span className="rule-text">
              آن لائن بل کا سکرین شاٹ <span className="whatsapp-highlight" dir="ltr">03204815221</span> اس نمبر پر وٹس ایپ کریں۔
            </span>
          </div>
        </div>

        {/* 7. Footer Calligraphy "شکریہ! Thank You!" */}
        <div className="dark-slip-footer">
          <ThankYouScriptGraphic width={160} height={42} color="#10b981" />
          <div className="footer-tagline">
            خالص دودھ و تازہ دہی کا بااعتماد مرکز • تشریف لانے کا شکریہ!
          </div>
        </div>
      </div>
    </div>
  );
};
