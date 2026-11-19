import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getWhatsAppApiStatus, isWhatsAppConfigured } from '@/services/whatsapp';

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  const status = await getWhatsAppApiStatus();

  return NextResponse.json({
    success: true,
    ...status,
  });
}
