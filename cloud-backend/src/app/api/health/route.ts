import { NextResponse } from 'next/server';
import { isDbConfigured } from '@/db';
import { isStorageConfigured, checkStorageHealth } from '@/services/storage';
import { isWhatsAppConfigured, getWhatsAppApiStatus } from '@/services/whatsapp';

export async function GET() {
  const storageHealth = await checkStorageHealth();
  const waHealth = await getWhatsAppApiStatus();

  const isHealthy = true; // Service is alive

  return NextResponse.json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'dairy-cloud-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    components: {
      database: {
        configured: isDbConfigured,
        type: 'Neon PostgreSQL (Drizzle ORM)',
      },
      storage: {
        configured: isStorageConfigured(),
        accessible: storageHealth.accessible,
        error: storageHealth.error,
      },
      whatsapp: {
        configured: isWhatsAppConfigured(),
        connected: waHealth.connected,
        displayPhoneNumber: waHealth.displayPhoneNumber,
        verifiedName: waHealth.verifiedName,
        templateStatus: waHealth.templateStatus,
        error: waHealth.error,
      },
    },
  });
}
