import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface UserRecord {
  id: string;
  name: string;
  storeName: string;
  phone?: string;
  email?: string;
  pin?: string;
  avatarUrl?: string;
  googleId?: string;
  authProvider: 'local' | 'google';
  createdAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
}

export interface StoreDataRecord {
  storeInfo: any;
  products: any[];
  transactions: any[];
  updatedAt: string;
}

export interface DatabaseSchema {
  users: UserRecord[];
  sessions: SessionRecord[];
  storesData: Record<string, StoreDataRecord>;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getDefaultDb(): DatabaseSchema {
  return {
    users: [
      {
        id: 'user-demo',
        name: 'Doña María Mendoza R.',
        storeName: 'Tienda Don Lucho',
        phone: '77234567',
        email: 'donlucho@metrika.bo',
        pin: '1234',
        authProvider: 'local',
        avatarUrl: '',
        createdAt: new Date().toISOString(),
      },
    ],
    sessions: [],
    storesData: {},
  };
}

export function readDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const defaultDb = getDefaultDb();
      writeDatabase(defaultDb);
      return defaultDb;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file, returning default:', err);
    return getDefaultDb();
  }
}

export function writeDatabase(data: DatabaseSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

