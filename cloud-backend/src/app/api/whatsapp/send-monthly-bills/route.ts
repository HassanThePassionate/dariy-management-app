import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { sendWhatsAppBillMessage, formatWhatsAppNumber } from '@/services/whatsapp';
import { getDb, schema } from '@/db';
import { eq } from 'drizzle-orm';

export interface BillItem {
  customerId: number;
  customerName: string;
  phone: string;
  billMonth: string;
  liters: number;
  rate: number;
  billAmount: number;
  balanceDue: number;
  mediaId?: string;
  mediaUrl?: string;
  whatsappConsent?: boolean;
}

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
    const bills: BillItem[] = body.bills || [];
    const force: boolean = Boolean(body.force);

    if (!Array.isArray(bills) || bills.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No bills provided in request array' },
        { status: 400 }
      );
    }

    const db = getDb();
    const results: Array<{
      customerId: number;
      customerName: string;
      phone: string;
      status: 'sent' | 'failed' | 'skipped' | 'duplicate';
      messageId?: string;
      error?: string;
    }> = [];

    let sentCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    // Concurrency control: batch in chunks of 5 with delay to respect Meta API rate limits
    const CHUNK_SIZE = 5;
    for (let i = 0; i < bills.length; i += CHUNK_SIZE) {
      const chunk = bills.slice(i, i + CHUNK_SIZE);

      await Promise.all(
        chunk.map(async (bill) => {
          // 1. Consent Check
          if (bill.whatsappConsent === false) {
            skippedCount++;
            results.push({
              customerId: bill.customerId,
              customerName: bill.customerName,
              phone: bill.phone,
              status: 'skipped',
              error: 'Customer opted out or notification consent not granted',
            });
            return;
          }

          // 2. Validate Phone
          const formattedPhone = formatWhatsAppNumber(bill.phone);
          if (!formattedPhone) {
            failedCount++;
            results.push({
              customerId: bill.customerId,
              customerName: bill.customerName,
              phone: bill.phone,
              status: 'failed',
              error: 'Invalid or missing WhatsApp phone number',
            });
            return;
          }

          // 3. Duplicate-Send Protection
          const idempotencyKey = `${bill.customerId || formattedPhone}_${bill.billMonth}`;
          if (db && !force) {
            const existing = await db
              .select()
              .from(schema.whatsappBillLogs)
              .where(eq(schema.whatsappBillLogs.idempotencyKey, idempotencyKey))
              .limit(1);

            if (existing.length > 0 && ['sent', 'delivered', 'read'].includes(existing[0].status)) {
              duplicateCount++;
              results.push({
                customerId: bill.customerId,
                customerName: bill.customerName,
                phone: formattedPhone,
                status: 'duplicate',
                messageId: existing[0].messageId || undefined,
                error: `Bill already sent previously on ${existing[0].sentAt?.toISOString()}`,
              });
              return;
            }
          }

          // 4. Send Message via Meta API
          const sendRes = await sendWhatsAppBillMessage({
            toPhone: formattedPhone,
            customerName: bill.customerName,
            billMonth: bill.billMonth,
            liters: Number(bill.liters) || 0,
            rate: Number(bill.rate) || 0,
            billAmount: Number(bill.billAmount) || 0,
            balanceDue: Number(bill.balanceDue) || 0,
            mediaId: bill.mediaId,
            mediaUrl: bill.mediaUrl,
          });

          const now = new Date();
          const finalStatus = sendRes.success ? 'sent' : 'failed';

          if (sendRes.success) {
            sentCount++;
          } else {
            failedCount++;
          }

          results.push({
            customerId: bill.customerId,
            customerName: bill.customerName,
            phone: formattedPhone,
            status: finalStatus,
            messageId: sendRes.messageId,
            error: sendRes.error,
          });

          // 5. Update Neon Database Log
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
                    messageId: sendRes.messageId || null,
                    mediaId: bill.mediaId || null,
                    mediaUrl: bill.mediaUrl || null,
                    errorMessage: sendRes.error || null,
                    retryCount: (existing[0].retryCount || 0) + 1,
                    sentAt: sendRes.success ? now : existing[0].sentAt,
                    updatedAt: now,
                  })
                  .where(eq(schema.whatsappBillLogs.id, existing[0].id));
              } else {
                await db.insert(schema.whatsappBillLogs).values({
                  customerId: bill.customerId || null,
                  customerName: bill.customerName,
                  phone: formattedPhone,
                  billMonth: bill.billMonth,
                  billAmount: Number(bill.billAmount) || 0,
                  liters: Number(bill.liters) || 0,
                  rate: Number(bill.rate) || 0,
                  balanceDue: Number(bill.balanceDue) || 0,
                  status: finalStatus,
                  messageId: sendRes.messageId || null,
                  mediaId: bill.mediaId || null,
                  mediaUrl: bill.mediaUrl || null,
                  errorMessage: sendRes.error || null,
                  idempotencyKey,
                  retryCount: 0,
                  sentAt: sendRes.success ? now : null,
                  createdAt: now,
                  updatedAt: now,
                });
              }
            } catch (logErr) {
              console.error('[Batch WhatsApp] Error updating log:', logErr);
            }
          }
        })
      );

      // Brief delay between batches to respect Meta throughput limits
      if (i + CHUNK_SIZE < bills.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: bills.length,
        sent: sentCount,
        failed: failedCount,
        duplicates: duplicateCount,
        skipped: skippedCount,
      },
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Batch messaging error' },
      { status: 500 }
    );
  }
}
