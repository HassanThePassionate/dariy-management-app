import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { uploadMediaToWhatsApp } from '@/services/whatsapp';

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file uploaded' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'image/png';
    const fileName = file.name || 'bill.png';

    const upload = await uploadMediaToWhatsApp(buffer, fileName, mimeType);

    if (!upload.success) {
      return NextResponse.json(
        { success: false, error: upload.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      mediaId: upload.mediaId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Media upload failed' },
      { status: 500 }
    );
  }
}
