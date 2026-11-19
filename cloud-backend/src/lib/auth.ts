import { NextRequest } from 'next/server';

export interface AuthResult {
  authenticated: boolean;
  error?: string;
  deviceId?: string;
}

export function authenticateRequest(req: NextRequest): AuthResult {
  const configuredKey = process.env.CLOUD_API_KEY;

  // If no API key is configured yet in environment, allow local dev or warn
  if (!configuredKey || configuredKey === 'your_secure_cloud_api_key_here') {
    // In unconfigured state, accept request for setup or dev mode
    const devDeviceId = req.headers.get('x-device-id') || 'dev-terminal';
    return { authenticated: true, deviceId: devDeviceId };
  }

  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');
  const deviceId = req.headers.get('x-device-id') || 'default-device';

  let providedKey: string | null = null;
  if (apiKeyHeader) {
    providedKey = apiKeyHeader.trim();
  } else if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7).trim();
    } else {
      providedKey = authHeader.trim();
    }
  }

  if (!providedKey || providedKey !== configuredKey.trim()) {
    return {
      authenticated: false,
      error: 'Invalid or missing API key. Please check CLOUD_API_KEY.',
    };
  }

  return {
    authenticated: true,
    deviceId,
  };
}
