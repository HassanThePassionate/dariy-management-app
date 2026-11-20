/**
 * Normalizes Eastern Arabic / Urdu digits to standard Western ASCII digits (0-9)
 */
function normalizeDigits(str: string): string {
  const map: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  return (str || '').replace(/[۰-۹٠-٩]/g, (d) => map[d] || d);
}

/**
 * Standardizes phone numbers for WhatsApp JID format
 * Pakistan numbers: 03001234567, +923001234567, 00923001234567, 3001234567, etc.
 */
export function formatToWhatsAppJid(phone?: string | null): string | null {
  if (!phone) return null;
  // If already full jid passed
  if (typeof phone === 'string' && phone.includes('@s.whatsapp.net')) {
    return phone.trim();
  }

  let clean = normalizeDigits(String(phone)).replace(/\D/g, '');
  if (!clean) return null;

  // 00 prefix (e.g. 0092...)
  if (clean.startsWith('00')) {
    clean = clean.slice(2);
  }

  // Handle accidental +9203XXXXXXXX (e.g. 9203204815221) -> becomes 923204815221
  if (clean.startsWith('920') && clean.length === 13) {
    clean = '92' + clean.slice(3);
  }

  // Pakistan local format 03XX... (11 digits: e.g. 03204815221)
  if (clean.startsWith('03') && clean.length === 11) {
    clean = '92' + clean.slice(1);
  }
  // Pakistan format with any leading 0 (e.g. 03... 10 to 12 digits)
  else if (clean.startsWith('0') && clean.length >= 10 && clean.length <= 12) {
    clean = '92' + clean.slice(1);
  }
  // 3XXXXXXXXX (10 digits starting with 3)
  else if (clean.startsWith('3') && clean.length === 10) {
    clean = '92' + clean;
  }

  // International minimum 10 digits, max 15
  if (clean.length < 10 || clean.length > 15) {
    return null;
  }

  return `${clean}@s.whatsapp.net`;
}

/**
 * Returns clean human readable phone number e.g. "+92 300 1234567"
 */
export function formatHumanPhone(phone?: string | null): string {
  if (!phone) return '';
  let clean = normalizeDigits(String(phone)).replace(/\D/g, '');
  if (clean.startsWith('00')) clean = clean.slice(2);
  if (clean.startsWith('920') && clean.length === 13) clean = '92' + clean.slice(3);
  if (clean.startsWith('03') && clean.length === 11) clean = '92' + clean.slice(1);
  else if (clean.startsWith('0') && clean.length >= 10) clean = '92' + clean.slice(1);
  if (clean.startsWith('3') && clean.length === 10) clean = '92' + clean;

  if (clean.startsWith('92') && clean.length === 12) {
    // +92 3XX XXXXXXX
    return `+92 ${clean.slice(2, 5)} ${clean.slice(5)}`;
  }

  return `+${clean}`;
}

/**
 * Validates if a phone string looks like a valid WhatsApp phone number
 */
export function isValidWhatsAppPhone(phone?: string | null): boolean {
  return formatToWhatsAppJid(phone) !== null;
}
