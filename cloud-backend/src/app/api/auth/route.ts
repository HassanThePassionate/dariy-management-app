import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const deviceId = body.deviceId || auth.deviceId || 'terminal-1';

  return NextResponse.json({
    success: true,
    message: 'Authentication successful',
    deviceId,
    timestamp: new Date().toISOString(),
  });
}
