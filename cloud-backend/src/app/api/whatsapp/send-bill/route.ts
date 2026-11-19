import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { sendWhatsAppBillMessage, formatWhatsAppNumber } from '@/services/whatsapp';
import { getDb, schema } from '@/db';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      customerId,
      customerName,
      phone,
      billMonth,
      liters,
      rate,
      billAmount,
      balanceDue,
      mediaId,
      mediaUrl,
      force = false,
    } = body;

    if (!phone || !customerName || !billMonth) {
      return NextResponse.json(
        { success: false, error: 'phone, customerName, and billMonth are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatWhatsAppNumber(phone);
    if (!formattedPhone) {
      return NextResponse.json(
        { success: false, error: `Invalid WhatsApp phone number: ${phone}` },
        { status: 400 }
      );
    }

    const idempotencyKey = `${customerId || phone}_${billMonth}`;
    const db = getDb();

    // Check Duplicate-Send Protection
    if (db && !force) {
      const existing = await db
        .select()
        .from(schema.whatsappBillLogs)
        .where(eq(schema.whatsappBillLogs.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existing.length > 0) {
        const record = existing[0];
        if (['sent', 'delivered', 'read'].includes(record.status)) {
          return NextResponse.json({
            success: false,
            duplicate: true,
            error: `Bill for ${billMonth} was already sent to this customer on ${record.sentAt?.toISOString()}. Message ID: ${record.messageId}`,
            messageId: record.messageId,
            status: record.status,
          });
        }
      }
    }

    // Send through Meta WhatsApp Cloud API
    const sendResult = await sendWhatsAppBillMessage({
      toPhone: formattedPhone,
      customerName,
      billMonth,
      liters: Number(liters) || 0,
      rate: Number(rate) || 0,
      billAmount: Number(billAmount) || 0,
      balanceDue: Number(balanceDue) || 0,
      mediaId,
      mediaUrl,
    });

    const now = new Date();
    const finalStatus = sendResult.success ? 'sent' : 'failed';

    // Record in Neon DB whatsapp_bill_logs
    if (db) {
      try {
        const existing = await db
          .select()
          .from(schema.whatsappBillLogs)
          .where(eq(schema.whatsappBillLogs.idempotencyKey, idempotencyKey))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(schema.whatsappBillLogs)
            .set({
              status: finalStatus,
              messageId: sendResult.messageId || null,
              mediaId: mediaId || null,
              mediaUrl: mediaUrl || null,
              errorMessage: sendResult.error || null,
              retryCount: (existing[0].retryCount || 0) + 1,
              sentAt: sendResult.success ? now : existing[0].sentAt,
              updatedAt: now,
            })
            .where(eq(schema.whatsappBillLogs.id, existing[0].id));
        } else {
          await db.insert(schema.whatsappBillLogs).values({
            customerId: customerId ? Number(customerId) : null,
            customerName,
            phone: formattedPhone,
            billMonth,
            billAmount: Number(billAmount) || 0,
            liters: Number(liters) || 0,
            rate: Number(rate) || 0,
            balanceDue: Number(balanceDue) || 0,
            status: finalStatus,
            messageId: sendResult.messageId || null,
            mediaId: mediaId || null,
            mediaUrl: mediaUrl || null,
            errorMessage: sendResult.error || null,
            idempotencyKey,
            retryCount: 0,
            sentAt: sendResult.success ? now : null,
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (logErr: any) {
        console.error('[WhatsApp Send API] Failed to log bill dispatch:', logErr);
      }
    }

    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: sendResult.error || 'WhatsApp message dispatch failed',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      status: 'sent',
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server error sending bill' },
      { status: 500 }
    );
  }
}
