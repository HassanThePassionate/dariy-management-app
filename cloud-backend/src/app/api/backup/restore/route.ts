import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getDb, schema } from '@/db';
import { eq } from 'drizzle-orm';
import { getBackupSignedDownloadUrl, getBackupDownloadStream, isStorageConfigured } from '@/services/storage';

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
    const backupId = body.backupId;

    if (!backupId) {
      return NextResponse.json(
        { success: false, error: 'backupId is required' },
        { status: 400 }
      );
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Cloud database not configured' },
        { status: 503 }
      );
    }

    const rows = await db
      .select()
      .from(schema.backups)
      .where(eq(schema.backups.id, backupId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Backup not found: ${backupId}` },
        { status: 404 }
      );
    }

    const backupRecord = rows[0];

    // If S3 is configured, generate a secure pre-signed download URL
    let downloadUrl = backupRecord.storageUrl;
    if (isStorageConfigured()) {
      const signed = await getBackupSignedDownloadUrl(backupRecord.storageKey, 3600);
      if (signed.success && signed.url) {
        downloadUrl = signed.url;
      }
    }

    return NextResponse.json({
      success: true,
      backupId: backupRecord.id,
      fileName: backupRecord.fileName,
      fileSizeBytes: backupRecord.fileSizeBytes,
      sha256Checksum: backupRecord.sha256Checksum,
      storageKey: backupRecord.storageKey,
      downloadUrl,
      createdAt: backupRecord.createdAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error preparing backup restore' },
      { status: 500 }
    );
  }
}
