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
      dbInstance.close();
      console.log('[SQLite] Database closed.');
    } catch (err) {
      console.error('[SQLite] Error closing database:', err);
    } finally {
      dbInstance = null;
    }
  }
}
