import { getDatabase } from '../db/database';
import { getCloudConfig } from './cloudConfig';
import { generateBillImage, BillRenderData } from './billImageGenerator';

export interface WhatsAppQueueItem {
  customerId: number;
  customerName: string;
  phone: string;
  billMonth: string;
  monthLabel: string;
  liters: number;
  rate: number;
  billAmount: number;
  carry: number;
  received: number;
  payable: number;
  whatsappConsent?: boolean;
}

export interface WhatsAppStatus {
  configured: boolean;
  connected: boolean;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  templateStatus?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  error?: string;
}

export async function getWhatsAppCloudStatus(): Promise<WhatsAppStatus> {
  const config = getCloudConfig();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${config.apiUrl}/api/whatsapp/status`, {
      headers: {
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.ok) {
      return await res.json();
    } else {
      return {
        configured: false,
        connected: false,
        error: `Cloud backend responded with status ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      configured: false,
      connected: false,
      error: err.name === 'AbortError' ? 'WhatsApp status check timed out' : err.message || 'Cannot reach cloud backend',
    };
  }
}

/**
 * Upload a generated bill image buffer to Meta WhatsApp Media Endpoint
 */
export async function uploadBillImageToCloud(
  buffer: Buffer,
  fileName: string = 'bill.png'
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const config = getCloudConfig();

  try {
    const formData = new FormData();
    const blob = new Blob([buffer as any], { type: 'image/png' });
    formData.append('file', blob, fileName);

    const res = await fetch(`${config.apiUrl}/api/whatsapp/media`, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || `Media upload failed (${res.status})` };
    }

    return { success: true, mediaId: data.mediaId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error uploading media to backend' };
  }
}

/**
 * Sends a single customer's monthly bill
 */
export async function sendSingleCustomerBill(
  item: WhatsAppQueueItem,
  settings: any,
  force: boolean = false
): Promise<{ success: boolean; messageId?: string; error?: string; duplicate?: boolean }> {
  const config = getCloudConfig();
  const db = getDatabase();

  // 1. Consent Check
  if (item.whatsappConsent === false) {
    return { success: false, error: 'Customer has opted out of WhatsApp billing notifications.' };
  }

  // 2. Render Bill Image offscreen
  const renderRes = await generateBillImage({
    customerId: item.customerId,
    customerName: item.customerName,
    phone: item.phone,
    month: item.billMonth,
    monthLabel: item.monthLabel,
    rate: item.rate,
    liters: item.liters,
    billAmount: item.billAmount,
    carry: item.carry,
    received: item.received,
    payable: item.payable,
    shopTitle: settings?.shop_title,
    ownerName: settings?.owner_name,
    shopPhone: settings?.phone,
    bankName: settings?.bank_name,
    accountTitle: settings?.account_title,
    accountNumber: settings?.account_number,
  });

  let mediaId: string | undefined;
  if (renderRes.success && renderRes.buffer) {
    const uploadRes = await uploadBillImageToCloud(
      renderRes.buffer,
      `bill_${item.customerId}_${item.billMonth}.png`
    );
    if (uploadRes.success) {
      mediaId = uploadRes.mediaId;
    }
  }

  // 3. Dispatch to Next.js backend
  try {
    const res = await fetch(`${config.apiUrl}/api/whatsapp/send-bill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
      body: JSON.stringify({
        customerId: item.customerId,
        customerName: item.customerName,
        phone: item.phone,
        billMonth: item.billMonth,
        liters: item.liters,
        rate: item.rate,
        billAmount: item.billAmount,
        balanceDue: item.payable,
        mediaId,
        force,
      }),
    });

    const data = await res.json();

    const idempotencyKey = `${item.customerId || item.phone}_${item.billMonth}`;
    const status = data.success ? 'sent' : 'failed';

    // 4. Update local SQLite whatsapp_bill_logs
    try {
      db.prepare(`
        INSERT INTO whatsapp_bill_logs (
          customer_id, customer_name, phone, bill_month, bill_amount, liters, rate,
          balance_due, status, message_id, media_id, error_message, idempotency_key, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(idempotency_key) DO UPDATE SET
          status = excluded.status,
          message_id = excluded.message_id,
          media_id = excluded.media_id,
          error_message = excluded.error_message,
          retry_count = whatsapp_bill_logs.retry_count + 1,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        item.customerId,
        item.customerName,
        item.phone,
        item.billMonth,
        item.billAmount,
        item.liters,
        item.rate,
        item.payable,
        status,
        data.messageId || null,
        mediaId || null,
        data.error || null,
        idempotencyKey
      );
    } catch (dbErr) {
      console.warn('[WhatsApp Client] Local log save error:', dbErr);
    }

    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to dispatch bill' };
  }
}

/**
 * Gets bill logs for a specific month from local SQLite
 */
export function getLocalWhatsAppBillLogs(month: string): any[] {
  const db = getDatabase();
  try {
    return db
      .prepare('SELECT * FROM whatsapp_bill_logs WHERE bill_month = ? ORDER BY id DESC')
      .all(month);
  } catch {
    return [];
  }
}
