import fs from 'node:fs/promises';
import path from 'node:path';
import type { CreatedDesignProduct } from '../types.js';
import type { ParsedDesignPayload } from '../validation.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DESIGN_FILE = path.join(DATA_DIR, 'designs.json');

export interface StoredDesign {
  createdAt: string;
  payload: ParsedDesignPayload;
  product: CreatedDesignProduct;
}

async function readAll(): Promise<StoredDesign[]> {
  try {
    const raw = await fs.readFile(DESIGN_FILE, 'utf8');
    return JSON.parse(raw) as StoredDesign[];
  } catch {
    return [];
  }
}

export async function saveDesignRecord(record: StoredDesign): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const all = await readAll();
  all.unshift(record);
  await fs.writeFile(DESIGN_FILE, JSON.stringify(all, null, 2), 'utf8');
}

export async function listDesignRecords(): Promise<StoredDesign[]> {
  return readAll();
}
