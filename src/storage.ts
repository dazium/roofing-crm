import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'
import { seedData } from './data'
import { STORAGE_KEY } from './lib'
import type { AppData } from './types'

export type StorageDriver = 'sqlite-native' | 'localstorage-browser'

type StoredAppDataResult = {
  data: AppData
  driver: StorageDriver
  migrated?: boolean
}

export type StorageMeta = {
  dbPath?: string
  backupDir?: string
  legacyPath?: string
  lastBackupAt?: string | null
  tempDir?: string
}

export type MaterialPrice = {
  product: string;
  price: number;
  unit: string;
  store: string;
  scraped_at: string;
}

const DB_NAME = 'roofingcrm'
const STATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`

let sqliteConnection: SQLiteConnection | null = null
let databaseConnection: SQLiteDBConnection | null = null

function normalizeAppData(partial?: Partial<AppData> | null): AppData {
  const normalized: AppData = {
    companyProfile: partial?.companyProfile ?? seedData.companyProfile,
    customers: partial?.customers ?? seedData.customers,
    jobs: partial?.jobs ?? seedData.jobs,
    estimates: partial?.estimates ?? seedData.estimates,
    invoices: (partial?.invoices ?? seedData.invoices).map((invoice) => {
      const amount = Number(invoice.amount) || 0
      const paidAmount = Math.min(amount, Math.max(0, Number(invoice.paidAmount ?? (invoice.status === 'Paid' ? amount : 0)) || 0))
      return {
        ...invoice,
        paidAmount,
        balanceDue: Math.max(0, amount - paidAmount),
      }
    }),
    inspections: partial?.inspections ?? seedData.inspections,
    materialPrices: partial?.materialPrices ?? seedData.materialPrices,
  }

  const hasCustomerOne = normalized.customers.some((customer) => customer.id === 'cust-1')
  const hasInspectionForCustomerOne = normalized.inspections.some((inspection) => inspection.customerId === 'cust-1')

  if (hasCustomerOne && !hasInspectionForCustomerOne) {
    const fallbackInspection = seedData.inspections.find((inspection) => inspection.customerId === 'cust-1')
    if (fallbackInspection) {
      normalized.inspections = [fallbackInspection, ...normalized.inspections]
    }
  }

  return normalized
}

function usesSqlitePlatform() {
  return Capacitor.getPlatform() !== 'web'
}

function usesDesktopBridge() {
  return typeof window !== 'undefined' && typeof window.roofingcrmDesktop !== 'undefined'
}

async function getDatabase() {
  if (!sqliteConnection) {
    sqliteConnection = new SQLiteConnection(CapacitorSQLite)
  }

  if (databaseConnection) {
    return databaseConnection
  }

  await sqliteConnection.checkConnectionsConsistency()
  const existingConnection = await sqliteConnection.isConnection(DB_NAME, false)
  databaseConnection = existingConnection.result
    ? await sqliteConnection.retrieveConnection(DB_NAME, false)
    : await sqliteConnection.createConnection(DB_NAME, false, 'no-encryption', 1, false)

  await databaseConnection.open()
  await databaseConnection.execute(STATE_TABLE_SQL)
  // Create material_prices table if it doesn't exist
  await databaseConnection.execute(`
    CREATE TABLE IF NOT EXISTS material_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product TEXT NOT NULL,
      sku TEXT,
      store TEXT NOT NULL,
      price REAL NOT NULL,
      unit TEXT NOT NULL,
      url TEXT,
      scraped_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  return databaseConnection
}

async function loadFromSqlite(): Promise<AppData> {
  const db = await getDatabase()
  const result = await db.query('SELECT payload FROM app_state WHERE id = 1')
  const row = result.values?.[0] as { payload?: string } | undefined
  if (!row?.payload) {
    await saveToSqlite(seedData)
    return seedData
  }

  const parsed = JSON.parse(row.payload) as Partial<AppData>
  return normalizeAppData(parsed)
}

async function saveToSqlite(data: AppData) {
  const db = await getDatabase()
  await db.run(
    `
      INSERT INTO app_state (id, payload, updated_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        updated_at = excluded.updated_at;
    `,
    [JSON.stringify(data), new Date().toISOString()],
  )
}

function loadFromLocalStorage(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData))
    return seedData
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppData>
    return normalizeAppData(parsed)
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData))
    return seedData
  }
}

function saveToLocalStorage(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export async function loadAppData(): Promise<StoredAppDataResult> {
  if (usesDesktopBridge()) {
    try {
      const result = await window.roofingcrmDesktop!.loadData()
      if (!result.payload) {
        await window.roofingcrmDesktop!.saveData(JSON.stringify(seedData))
        return { data: seedData, driver: 'sqlite-native', migrated: result.migrated }
      }

      const parsed = JSON.parse(result.payload) as Partial<AppData>
      return { data: normalizeAppData(parsed), driver: 'sqlite-native', migrated: result.migrated }
    } catch {
      const fallback = loadFromLocalStorage()
      return { data: fallback, driver: 'localstorage-browser' }
    }
  }

  if (usesSqlitePlatform()) {
    try {
      return { data: await loadFromSqlite(), driver: 'sqlite-native' }
    } catch {
      const fallback = loadFromLocalStorage()
      return { data: fallback, driver: 'localstorage-browser' }
    }
  }

  return { data: loadFromLocalStorage(), driver: 'localstorage-browser' }
}

export async function saveAppData(data: AppData): Promise<StorageDriver> {
  if (usesDesktopBridge()) {
    try {
      await window.roofingcrmDesktop!.saveData(JSON.stringify(data))
      return 'sqlite-native'
    } catch {
      saveToLocalStorage(data)
      return 'localstorage-browser'
    }
  }

  if (usesSqlitePlatform()) {
    try {
      await saveToSqlite(data)
      return 'sqlite-native'
    } catch {
      saveToLocalStorage(data)
      return 'localstorage-browser'
    }
  }

  saveToLocalStorage(data)
  return 'localstorage-browser'
}

export async function getStorageMeta(): Promise<StorageMeta> {
  if (usesDesktopBridge()) {
    try {
      return await window.roofingcrmDesktop!.getMeta()
    } catch {
      return {}
    }
  }

  return {}
}

/** Fetch latest material prices from SQLite (if available) */
export async function getMaterialPrices(): Promise<MaterialPrice[]> {
  // Only works on native SQLite (desktop/mobile), not in browser-only mode
  if (!usesSqlitePlatform() && !usesDesktopBridge()) {
    console.warn('getMaterialPrices only works with native SQLite');
    return []
  }

  try {
    const db = await getDatabase()
    const rows = await db.query(`
      SELECT product, price, unit, store, scraped_at
      FROM material_prices
      WHERE product IN (
        'CertainTeed Landmark Shingles',
        'IKO Dynasty Shingles',
        'Ice & Water Shield',
        'Ridge Vent',
        'Hip & Ridge Cap',
        'Starters',
        'Drip Edge'
      )
      AND scraped_at = (
        SELECT MAX(scraped_at) FROM material_prices mp2
        WHERE mp2.product = material_prices.product
      )
      ORDER BY product
    `)
    return (rows.values ?? []) as unknown as MaterialPrice[]
  } catch (err) {
    console.warn('Could not fetch material_prices:', err)
    return []
  }
}
