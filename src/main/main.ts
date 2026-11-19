import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, closeDatabase } from './db/database';
import { setupSchema } from './db/schema';
import { registerIpcHandlers } from './db/handlers';
import { getConnectionStatus } from './cloud/connectivity';
import { createAndUploadCloudBackup, cancelActiveBackup } from './cloud/cloudBackup';

let mainWindow: BrowserWindow | null = null;
let isForceQuit = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function getAppIconPath(): string {
  const candidates = [
    path.join(process.resourcesPath, 'public/icon.ico'),
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(app.getAppPath(), 'public/icon.ico'),
    path.join(app.getAppPath(), 'dist/icon.ico'),
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../dist/icon.ico'),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return path.join(__dirname, '../public/icon.ico');
}

function createWindow(): void {
  const iconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 960,
    minHeight: 650,
    title: 'Qari Zafar Milk Shop',
    backgroundColor: '#030712',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  try {
    mainWindow.setIcon(iconPath);
  } catch {}

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
    if (process.env.OPEN_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Application Shutdown Lifecycle: Intercept Close Button
  mainWindow.on('close', async (e) => {
    if (isForceQuit) {
      return; // Allow native window close
    }

    e.preventDefault(); // Stop instant window destruction

    try {
      const conn = await getConnectionStatus();
      let scenario: 'A' | 'B' | 'C' = 'A';
      if (!conn.isOnline) {
        scenario = 'B';
      } else if (!conn.isBackendReachable) {
        scenario = 'C';
      }

      mainWindow?.webContents.send('app:show-close-backup-modal', {
        scenario,
        error: conn.error,
      });
    } catch (err: any) {
      mainWindow?.webContents.send('app:show-close-backup-modal', {
        scenario: 'B',
        error: err.message || 'Connectivity check failed',
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  console.log('[Main] App starting...');

  // 1. Initialize SQLite Database
  try {
    initDatabase();
    setupSchema();
  } catch (err) {
    console.error('[Main] Database initialization failed:', err);
  }

  // 2. Register IPC handlers
  registerIpcHandlers();

  // Register shutdown dialog IPC handlers
  ipcMain.handle('app:confirmForceClose', () => {
    isForceQuit = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
    app.quit();
  });

  ipcMain.handle('app:cancelClose', () => {
    cancelActiveBackup();
  });

  ipcMain.handle('app:performCloseBackup', async () => {
    return createAndUploadCloudBackup((stage, percent) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('backup:close-progress', { stage, percent });
      }
    }, 'Application shutdown auto-backup');
  });

  // 3. Create Main Window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isForceQuit = true;
  closeDatabase();
});
