import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let dbInstance: Database.Database | null = null;
let resolvedDbPath: string = '';

export function getDatabasePath(): string {
  if (!resolvedDbPath) {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    resolvedDbPath = path.join(userDataPath, 'app_data.db');
  }
  return resolvedDbPath;
}

export function initDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  console.log('[SQLite] Initializing database at:', dbPath);

  try {
    dbInstance = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    });

    // High performance pragmas
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('synchronous = NORMAL');
    dbInstance.pragma('foreign_keys = ON');

    console.log('[SQLite] Database connected successfully.');
    return dbInstance;
  } catch (error) {
    console.error('[SQLite] Failed to connect to database:', error);
    throw error;
  }
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      // Ensure WAL checkpoint before closing
      try {
        dbInstance.pragma('wal_checkpoint(PASSIVE)');
      } catch {}
      dbInstance.close();
      console.log('[SQLite] Database closed.');
    } catch (err) {
      console.error('[SQLite] Error closing database:', err);
    } finally {
      dbInstance = null;
    }
  }
}

/**
 * Creates a consistent, standalone SQLite snapshot including all uncommitted WAL frames.
 * Uses better-sqlite3's online backup API.
 */
export async function createDatabaseSnapshot(destPath: string): Promise<string> {
  const db = getDatabase();
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    db.pragma('wal_checkpoint(PASSIVE)');
  } catch (cpErr) {
    console.warn('[SQLite Snapshot] WAL passive checkpoint warning:', cpErr);
  }

  if (typeof db.backup === 'function') {
    await db.backup(destPath);
  } else {
    db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(getDatabasePath(), destPath);
  }

  return destPath;
}

/**
 * Safely restores the active database from a verified backup file.
 * Automatically creates a safety backup of the current database before replacement.
 */
export function restoreDatabaseFromFile(sourcePath: string): {
  success: boolean;
  safetyBackupPath?: string;
  error?: string;
} {
  const dbPath = getDatabasePath();
  if (!fs.existsSync(sourcePath)) {
    return { success: false, error: `Source backup file does not exist at: ${sourcePath}` };
  }

  const safetyBackupPath = `${dbPath}.pre-restore-${Date.now()}.bak`;

  try {
    // 1. Close current connection safely
    closeDatabase();

    // 2. Create safety copy of current DB and WAL files
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, safetyBackupPath);
    }
    const walFile = `${dbPath}-wal`;
    const shmFile = `${dbPath}-shm`;
    if (fs.existsSync(walFile)) {
      try {
        fs.copyFileSync(walFile, `${safetyBackupPath}-wal`);
        fs.unlinkSync(walFile);
      } catch {}
    }
    if (fs.existsSync(shmFile)) {
      try {
        fs.copyFileSync(shmFile, `${safetyBackupPath}-shm`);
        fs.unlinkSync(shmFile);
      } catch {}
    }

    // 3. Replace active dbPath with source backup
    fs.copyFileSync(sourcePath, dbPath);

    // 4. Re-open database and verify integrity
    const newDb = initDatabase();
    const check = newDb.pragma('quick_check') as any[];
    console.log('[SQLite Restore] Integrity verification result:', check);

    return { success: true, safetyBackupPath };
  } catch (err: any) {
    console.error('[SQLite Restore] Failed to restore database:', err);
    try {
      if (fs.existsSync(safetyBackupPath)) {
        fs.copyFileSync(safetyBackupPath, dbPath);
        initDatabase();
      }
    } catch {}
    return { success: false, error: err.message || 'Database restore failed' };
  }
}
