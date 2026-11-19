import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getWhatsAppConfig } from '@/services/whatsapp';
import { getDb, schema } from '@/db';
import { eq } from 'drizzle-orm';

/**
 * GET: Meta Webhook Subscription Verification Challenge
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const cfg = getWhatsAppConfig();

  if (mode && token) {
    if (mode === 'subscribe' && token === cfg.verifyToken) {
      console.log('[WhatsApp Webhook] Verification successful. Challenge accepted.');
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    } else {
      console.warn('[WhatsApp Webhook] Verification token mismatch.');
      return new NextResponse('Forbidden: Token mismatch', { status: 403 });
    }
  }

  return new NextResponse('Bad Request: Missing hub parameters', { status: 400 });
}

/**
 * POST: Incoming WhatsApp Webhook Events (Statuses & Inbound Messages)
 */
export async function POST(req: NextRequest) {
  const cfg = getWhatsAppConfig();
  const rawBody = await req.text();

  // 1. Signature Verification with X-Hub-Signature-256
  const signature = req.headers.get('x-hub-signature-256');
  if (cfg.appSecret && cfg.appSecret !== 'your_meta_app_secret') {
    if (!signature) {
      console.warn('[WhatsApp Webhook] Missing X-Hub-Signature-256 header.');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', cfg.appSecret)
      .update(rawBody)
      .digest('hex')}`;

    if (signature !== expectedSignature) {
      console.warn('[WhatsApp Webhook] Invalid X-Hub-Signature-256.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  // 2. Parse event payload
  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Always return 200 to acknowledge Meta so it does not retry repeatedly
  if (data.object !== 'whatsapp_business_account') {
    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  }

  const db = getDb();
  const entries = data.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value;
      if (!value) continue;

      // Handle Message Delivery Status Updates
      const statuses = value.statuses || [];
      for (const st of statuses) {
        const messageId = st.id;
        const statusStr = st.status; // 'sent', 'delivered', 'read', 'failed'
        const timestampSeconds = parseInt(st.timestamp, 10);
        const eventDate = isNaN(timestampSeconds)
          ? new Date()
          : new Date(timestampSeconds * 1000);

        console.log(`[WhatsApp Webhook] Status update: ID=${messageId}, Status=${statusStr}`);

        if (db && messageId) {
          try {
            const rows = await db
              .select()
              .from(schema.whatsappBillLogs)
              .where(eq(schema.whatsappBillLogs.messageId, messageId))
              .limit(1);

            if (rows.length > 0) {
              const current = rows[0];

              // Protect against out-of-order updates (e.g. read before delivered)
              const statusRank: Record<string, number> = {
                pending: 0,
                processing: 1,
                sent: 2,
                delivered: 3,
                read: 4,
                failed: 5,
              };

              const currentRank = statusRank[current.status] || 0;
              const newRank = statusRank[statusStr] || 0;

              const updateData: any = {
                updatedAt: new Date(),
              };

              // Advance status if new or failure
              if (newRank >= currentRank || statusStr === 'failed') {
                updateData.status = statusStr;
              }

              if (statusStr === 'delivered' && !current.deliveredAt) {
                updateData.deliveredAt = eventDate;
              } else if (statusStr === 'read' && !current.readAt) {
                updateData.readAt = eventDate;
              } else if (statusStr === 'failed') {
                const errors = st.errors || [];
                const errMsg = errors.map((e: any) => `${e.title || e.code}: ${e.message || ''}`).join('; ');
                updateData.errorMessage = errMsg || 'Delivery failed';
              }

              await db
                .update(schema.whatsappBillLogs)
                .set(updateData)
                .where(eq(schema.whatsappBillLogs.id, current.id));
            }
          } catch (dbErr) {
            console.error('[WhatsApp Webhook] Error updating status in DB:', dbErr);
          }
        }
      }

      // Handle Customer Inbound Opt-Out Requests (e.g. customer replies STOP)
      const messages = value.messages || [];
      for (const msg of messages) {
        const textBody = msg.text?.body?.trim()?.toUpperCase();
        const fromNumber = msg.from; // e.g. 923001234567

        if (textBody === 'STOP' || textBody === 'OPTOUT' || textBody === 'UNSUBSCRIBE') {
          console.log(`[WhatsApp Webhook] Opt-out requested from ${fromNumber}`);
          if (db && fromNumber) {
            try {
              // Update customer consent to false in Neon DB
              await db
                .update(schema.customers)
                .set({
                  whatsappConsent: false,
                  whatsappOptOutAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(schema.customers.phone, fromNumber));
            } catch (optErr) {
              console.error('[WhatsApp Webhook] Opt-out DB update error:', optErr);
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
}
