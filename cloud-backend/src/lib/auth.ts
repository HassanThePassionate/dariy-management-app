import { NextRequest } from 'next/server';

export interface AuthResult {
  authenticated: boolean;
  error?: string;
  deviceId?: string;
}

export function authenticateRequest(req: NextRequest): AuthResult {
  // Authentication requirement removed: allow direct desktop app syncing
  const deviceId = req.headers.get('x-device-id') || 'dairy-desktop';
  return {
    authenticated: true,
    deviceId,
  };
}
