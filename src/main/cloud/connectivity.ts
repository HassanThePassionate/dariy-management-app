import dns from 'dns';
import { getCloudConfig } from './cloudConfig';

export interface ConnectionStatus {
  isOnline: boolean;
  isBackendReachable: boolean;
  apiUrl: string;
  backendVersion?: string;
  backendComponents?: any;
  error?: string;
}

/**
 * Fast DNS check to determine if the computer has an active internet connection
 */
export async function isInternetAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 2500);

    dns.lookup('google.com', (err) => {
      clearTimeout(timeout);
      if (!err) {
        resolve(true);
      } else {
        // Fallback check
        dns.lookup('cloudflare.com', (err2) => {
          resolve(!err2);
        });
      }
    });
  });
}

/**
 * Checks if the Next.js cloud backend is reachable and healthy
 */
export async function checkBackendReachable(): Promise<{
  reachable: boolean;
  data?: any;
  error?: string;
}> {
  const config = getCloudConfig();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${config.apiUrl}/api/health`, {
      method: 'GET',
      headers: {
        'x-api-key': config.apiKey,
        'x-device-id': config.deviceId,
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      return { reachable: true, data };
    } else {
      return {
        reachable: false,
        error: `Backend responded with HTTP status ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      reachable: false,
      error: err.name === 'AbortError' ? 'Backend connection timed out' : err.message || 'Cannot reach cloud backend',
    };
  }
}

/**
 * Combined connectivity status
 */
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const config = getCloudConfig();

  // Test local loopback or lan urls without waiting for public internet DNS
  const isLocalBackend = config.apiUrl.includes('localhost') || config.apiUrl.includes('127.0.0.1');

  const [online, backendRes] = await Promise.all([
    isLocalBackend ? Promise.resolve(true) : isInternetAvailable(),
    checkBackendReachable(),
  ]);

  return {
    isOnline: online || backendRes.reachable,
    isBackendReachable: backendRes.reachable,
    apiUrl: config.apiUrl,
    backendVersion: backendRes.data?.version,
    backendComponents: backendRes.data?.components,
    error: backendRes.error,
  };
}
