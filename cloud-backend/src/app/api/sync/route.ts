import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { processSyncBatch, SyncPayload } from '@/services/sync';

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const payload: SyncPayload = await req.json();
    payload.deviceId = payload.deviceId || auth.deviceId || 'terminal-1';

    const result = await processSyncBatch(payload);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Invalid sync request payload',
      },
      { status: 400 }
    );
  }
}
