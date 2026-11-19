export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  appSecret: string;
  verifyToken: string;
  apiVersion: string;
  templateName: string;
  templateLanguage: string;
}

export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'dairy_verify_token',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'monthly_dairy_bill',
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'ur',
  };
}

export function isWhatsAppConfigured(): boolean {
  const cfg = getWhatsAppConfig();
  return Boolean(
    cfg.accessToken &&
    cfg.phoneNumberId &&
    !cfg.accessToken.startsWith('EAAG...your') &&
    !cfg.phoneNumberId.includes('00000000')
  );
}

/**
 * Standardize phone number for WhatsApp Meta Cloud API (E.164 numeric format without +)
 * e.g. +92 321 0001168 -> 923210001168, 03001234567 -> 923001234567
 */
export function formatWhatsAppNumber(phone: string): string | null {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, '');
  if (!clean) return null;

  if (clean.startsWith('00')) {
    clean = clean.slice(2);
  }
  // Pakistan domestic mobile format starting with 03XX
  if (clean.startsWith('03') && clean.length === 11) {
    clean = '92' + clean.slice(1);
  }
  // If user entered 3XXXXXXXXX (10 digits)
  if (clean.startsWith('3') && clean.length === 10) {
    clean = '92' + clean;
  }

  // General E.164 validity check (minimum 10 digits, maximum 15)
  if (clean.length < 10 || clean.length > 15) {
    return null;
  }

  return clean;
}

/**
 * Check connection status with Meta Graph API
 */
export async function getWhatsAppApiStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  businessAccountId?: string;
  phoneNumberId?: string;
  templateStatus?: string;
  error?: string;
}> {
  const cfg = getWhatsAppConfig();
  if (!isWhatsAppConfigured()) {
    return {
      configured: false,
      connected: false,
      businessAccountId: cfg.businessAccountId,
      phoneNumberId: cfg.phoneNumberId,
      error: 'WhatsApp Cloud API credentials not configured in cloud-backend environment.',
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`,
      {
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
        },
      }
    );

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        configured: true,
        connected: false,
        businessAccountId: cfg.businessAccountId,
        phoneNumberId: cfg.phoneNumberId,
        error: data.error?.message || `Meta API HTTP error: ${res.status}`,
      };
    }

    // Check Template Status if business account ID is provided
    let templateStatus = 'unknown';
    if (cfg.businessAccountId && !cfg.businessAccountId.includes('00000000')) {
      try {
        const tplRes = await fetch(
          `https://graph.facebook.com/${cfg.apiVersion}/${cfg.businessAccountId}/message_templates?name=${encodeURIComponent(cfg.templateName)}`,
          {
            headers: {
              Authorization: `Bearer ${cfg.accessToken}`,
            },
          }
        );
        const tplData = await tplRes.json();
        if (tplData.data && tplData.data.length > 0) {
          templateStatus = tplData.data[0].status || 'APPROVED';
        } else {
          templateStatus = 'NOT_FOUND';
        }
      } catch {
        templateStatus = 'CHECK_FAILED';
      }
    }

    return {
      configured: true,
      connected: true,
      displayPhoneNumber: data.display_phone_number,
      verifiedName: data.verified_name,
      qualityRating: data.quality_rating,
      businessAccountId: cfg.businessAccountId,
      phoneNumberId: cfg.phoneNumberId,
      templateStatus,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      error: err.message || 'Network error reaching Meta Cloud API',
    };
  }
}

/**
 * Upload an image buffer or file to Meta's WhatsApp Media Endpoint
 * Endpoint: POST /v20.0/{phone_number_id}/media
 */
export async function uploadMediaToWhatsApp(
  imageBuffer: Buffer,
  fileName: string = 'bill.png',
  mimeType: string = 'image/png'
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const cfg = getWhatsAppConfig();
  if (!isWhatsAppConfigured()) {
    return { success: false, error: 'WhatsApp Cloud API is not configured' };
  }

  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer as any], { type: mimeType });
    formData.append('file', blob, fileName);
    formData.append('type', mimeType);
    formData.append('messaging_product', 'whatsapp');

    const res = await fetch(
      `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/media`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
        },
        body: formData,
      }
    );

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `Media upload failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      mediaId: data.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to upload media to WhatsApp',
    };
  }
}

export interface SendBillParams {
  toPhone: string;
  customerName: string;
  billMonth: string;
  liters: number;
  rate: number;
  billAmount: number;
  balanceDue: number;
  mediaId?: string;
  mediaUrl?: string;
}

/**
 * Send an approved Utility template with bill image header and billing parameters
 */
export async function sendWhatsAppBillMessage(
  params: SendBillParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const cfg = getWhatsAppConfig();
  if (!isWhatsAppConfigured()) {
    return { success: false, error: 'WhatsApp Cloud API is not configured' };
  }

  const formattedTo = formatWhatsAppNumber(params.toPhone);
  if (!formattedTo) {
    return { success: false, error: `Invalid recipient phone number: ${params.toPhone}` };
  }

  try {
    const components: any[] = [];

    // 1. Header with Media Image (either mediaId or mediaUrl)
    if (params.mediaId) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: {
              id: params.mediaId,
            },
          },
        ],
      });
    } else if (params.mediaUrl) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: {
              link: params.mediaUrl,
            },
          },
        ],
      });
    }

    // 2. Body parameters for approved Utility template:
    // {{1}} Customer Name
    // {{2}} Month Label
    // {{3}} Total Liters
    // {{4}} Rate / L
    // {{5}} Current Month Amount
    // {{6}} Total Payable Balance
    components.push({
      type: 'body',
      parameters: [
        { type: 'text', text: String(params.customerName) },
        { type: 'text', text: String(params.billMonth) },
        { type: 'text', text: String(params.liters) },
        { type: 'text', text: `Rs. ${params.rate}` },
        { type: 'text', text: `Rs. ${Math.round(params.billAmount)}` },
        { type: 'text', text: `Rs. ${Math.round(params.balanceDue)}` },
      ],
    });

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedTo,
      type: 'template',
      template: {
        name: cfg.templateName,
        language: {
          code: cfg.templateLanguage,
        },
        components,
      },
    };

    const res = await fetch(
      `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.accessToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `WhatsApp send message failed (${res.status})`,
      };
    }

    const messageId = data.messages?.[0]?.id;
    return {
      success: true,
      messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error sending WhatsApp template',
    };
  }
}
