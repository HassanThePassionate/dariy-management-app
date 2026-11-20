import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  ConnectionState,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { app, BrowserWindow } from 'electron';
import { formatToWhatsAppJid, formatHumanPhone } from './phoneUtils';

export interface WhatsAppConnectionInfo {
  connected: boolean;
  connecting: boolean;
  status: 'disconnected' | 'connecting' | 'scan_qr' | 'connected' | 'reconnecting';
  qrCodeDataUrl?: string | null;
  phone?: string;
  name?: string;
  error?: string | null;
  lastConnectedAt?: string | null;
}

let socket: WASocket | null = null;
let currentQrDataUrl: string | null = null;
let connectionInfo: WhatsAppConnectionInfo = {
  connected: false,
  connecting: false,
  status: 'disconnected',
  qrCodeDataUrl: null,
  phone: undefined,
  name: undefined,
  error: null,
  lastConnectedAt: null,
};

type DeliveryCallback = (messageId: string, status: 'delivered' | 'read') => void;
const deliveryCallbacks: DeliveryCallback[] = [];

export function onWhatsAppDeliveryReceipt(cb: DeliveryCallback): void {
  deliveryCallbacks.push(cb);
}

function getAuthDirectory(): string {
  const baseDir = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), '.user_data');
  const authDir = path.join(baseDir, 'whatsapp_session');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  return authDir;
}

function broadcastToWindows(channel: string, data: any): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}

function updateStatus(updates: Partial<WhatsAppConnectionInfo>): void {
  connectionInfo = { ...connectionInfo, ...updates };
  broadcastToWindows('whatsapp:status', connectionInfo);
}

/**
 * Initializes or reconnects to WhatsApp
 * If force is true, closes existing socket, wipes session, and requests a fresh QR code
 */
export async function connectToWhatsApp(force = false): Promise<WhatsAppConnectionInfo> {
  // If already connected and not forcing fresh connection
  if (socket && connectionInfo.connected && !force) {
    return connectionInfo;
  }

  // If we already have a valid active QR code and not forcing refresh
  if (!force && currentQrDataUrl && connectionInfo.status === 'scan_qr') {
    return { ...connectionInfo, qrCodeDataUrl: currentQrDataUrl };
  }

  const authDir = getAuthDirectory();

  // If force refresh requested or previous connection was broken
  if (force) {
    if (socket) {
      try {
        socket.end(undefined);
      } catch {}
      socket = null;
    }
    try {
      fs.rmSync(authDir, { recursive: true, force: true });
      fs.mkdirSync(authDir, { recursive: true });
    } catch {}
    currentQrDataUrl = null;
    connectionInfo = {
      connected: false,
      connecting: false,
      status: 'disconnected',
      qrCodeDataUrl: null,
      phone: undefined,
      name: undefined,
      error: null,
      lastConnectedAt: null,
    };
  }

  updateStatus({ connecting: true, status: 'connecting', error: null, qrCodeDataUrl: null });

  return new Promise<WhatsAppConnectionInfo>(async (resolve) => {
    let hasResolved = false;

    // Timeout safety: resolve after 14s if no event arrived
    const timer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        resolve(connectionInfo);
      }
    }, 14000);

    const finish = (result: WhatsAppConnectionInfo) => {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timer);
        resolve(result);
      }
    };

    try {
      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      socket = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Qari Zafar Milk Shop', 'Desktop', '1.0.0'],
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
      });

      socket.ev.on('creds.update', saveCreds);

      socket.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            console.log('[WhatsApp] QR string received, generating DataURL...');
            currentQrDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 8,
              color: {
                dark: '#022c22',
                light: '#ffffff',
              },
            });
            console.log('[WhatsApp] QR DataURL ready, length:', currentQrDataUrl.length);

            const updated: WhatsAppConnectionInfo = {
              ...connectionInfo,
              status: 'scan_qr',
              connecting: false,
              qrCodeDataUrl: currentQrDataUrl,
            };
            updateStatus(updated);
            broadcastToWindows('whatsapp:qr', currentQrDataUrl);
            finish(updated);
          } catch (err: any) {
            console.error('[WhatsApp] QR Render error:', err);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;

          console.log('[WhatsApp] Connection closed. Status code:', statusCode, 'isLoggedOut:', isLoggedOut);

          socket = null;
          currentQrDataUrl = null;

          if (isLoggedOut) {
            try {
              fs.rmSync(authDir, { recursive: true, force: true });
            } catch {}

            const updated: WhatsAppConnectionInfo = {
              connected: false,
              connecting: false,
              status: 'disconnected',
              qrCodeDataUrl: null,
              phone: undefined,
              name: undefined,
              error: 'WhatsApp session logged out from phone.',
              lastConnectedAt: null,
            };
            updateStatus(updated);
            finish(updated);
          } else {
            const updated: WhatsAppConnectionInfo = {
              connected: false,
              connecting: true,
              status: 'reconnecting',
              qrCodeDataUrl: null,
              error: 'Connection lost. Reconnecting...',
            };
            updateStatus(updated);

            setTimeout(() => {
              connectToWhatsApp().catch(console.error);
            }, 3500);
          }
        } else if (connection === 'open') {
          const userId = socket?.user?.id || '';
          const rawPhone = userId.split(':')[0].split('@')[0];
          const formattedPhone = formatHumanPhone(rawPhone);
          const userName = socket?.user?.name || 'قاری ظفر ملک شاپ';

          console.log('[WhatsApp] Connected successfully as:', formattedPhone, userName);

          currentQrDataUrl = null;
          const updated: WhatsAppConnectionInfo = {
            connected: true,
            connecting: false,
            status: 'connected',
            qrCodeDataUrl: null,
            phone: formattedPhone,
            name: userName,
            error: null,
            lastConnectedAt: new Date().toISOString(),
          };
          updateStatus(updated);
          finish(updated);
        }
      });

      // Delivery and read receipts listener
      socket.ev.on('messages.update', (updates) => {
        for (const update of updates) {
          const msgId = update.key?.id;
          const ackStatus = update.update?.status;

          if (msgId && ackStatus !== undefined) {
            if (ackStatus === 3 || ackStatus === 4) {
              const receiptStatus = ackStatus === 4 ? 'read' : 'delivered';
              for (const cb of deliveryCallbacks) {
                try {
                  cb(msgId, receiptStatus);
                } catch (cbErr) {
                  console.error('[WhatsApp] Delivery callback error:', cbErr);
                }
              }
            }
          }
        }
      });
    } catch (err: any) {
      console.error('[WhatsApp] Connection initialization error:', err);
      const updated: WhatsAppConnectionInfo = {
        connected: false,
        connecting: false,
        status: 'disconnected',
        error: err.message || 'Failed to start WhatsApp connection',
      };
      updateStatus(updated);
      finish(updated);
    }
  });
}

/**
 * Returns current live WhatsApp connection status
 */
export function getWhatsAppStatus(): WhatsAppConnectionInfo {
  return connectionInfo;
}

/**
 * Disconnects and removes local session
 */
export async function disconnectWhatsApp(): Promise<WhatsAppConnectionInfo> {
  if (socket) {
    try {
      await socket.logout();
    } catch {
      try {
        socket.end(undefined);
      } catch {}
    }
    socket = null;
  }

  const authDir = getAuthDirectory();
  try {
    fs.rmSync(authDir, { recursive: true, force: true });
  } catch (err) {
    console.error('[WhatsApp] Failed to clear session directory:', err);
  }

  currentQrDataUrl = null;
  const updated: WhatsAppConnectionInfo = {
    connected: false,
    connecting: false,
    status: 'disconnected',
    qrCodeDataUrl: null,
    phone: undefined,
    name: undefined,
    error: null,
    lastConnectedAt: null,
  };
  updateStatus(updated);
  return updated;
}

/**
 * Sends a bill image strictly without text caption to customer phone.
 * Supports both object payload and positional arguments (phone, imageBuffer, caption).
 */
export async function sendWhatsAppImageBill(
  targetOrPayload:
    | string
    | {
        toPhone?: string;
        phone?: string;
        imageBuffer?: Buffer;
        mimeType?: string;
        fileName?: string;
      },
  optionalBuffer?: Buffer,
  _optionalCaption?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!socket || !connectionInfo.connected) {
    return {
      success: false,
      error: 'WhatsApp is not connected. Please scan QR code first.',
    };
  }

  let phoneStr: string = '';
  let imgBuffer: Buffer | null = null;
  let mime = 'image/png';
  let fname = 'milk_bill.png';

  if (typeof targetOrPayload === 'string') {
    phoneStr = targetOrPayload;
    imgBuffer = optionalBuffer || null;
  } else if (targetOrPayload && typeof targetOrPayload === 'object') {
    phoneStr = targetOrPayload.toPhone || targetOrPayload.phone || '';
    imgBuffer = targetOrPayload.imageBuffer || optionalBuffer || null;
    if (targetOrPayload.mimeType) mime = targetOrPayload.mimeType;
    if (targetOrPayload.fileName) fname = targetOrPayload.fileName;
  }

  phoneStr = (phoneStr || '').trim();

  if (!imgBuffer) {
    return {
      success: false,
      error: 'No image buffer data provided for bill delivery',
    };
  }

  const jid = formatToWhatsAppJid(phoneStr);
  if (!jid) {
    return {
      success: false,
      error: `Invalid Pakistani mobile number: "${phoneStr}". Please check that the customer phone number is correct.`,
    };
  }

  try {
    const sent = await socket.sendMessage(jid, {
      image: imgBuffer,
      caption: '', // Strictly only the bill image (no long Urdu message)
      mimetype: mime,
      fileName: fname,
    });

    const msgId = sent?.key?.id;
    console.log('[WhatsApp] Bill image sent successfully to:', jid, 'msgId:', msgId);

    return {
      success: true,
      messageId: msgId,
    };
  } catch (err: any) {
    console.error('[WhatsApp] Send image error:', err);
    return {
      success: false,
      error: err.message || 'Failed to send WhatsApp image message',
    };
  }
}
