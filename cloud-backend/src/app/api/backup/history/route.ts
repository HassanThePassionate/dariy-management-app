import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getDb, schema } from '@/db';
import { desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({
      success: true,
      backups: [],
      message: 'Cloud database not connected. No cloud backup history available.',
    });
  }

  try {
    const list = await db
      .select()
      .from(schema.backups)
      .orderBy(desc(schema.backups.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      backups: list,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch backup history',
      },
      { status: 500 }
    );
  }
}
