const { app, BrowserWindow, ipcMain, shell, dialog, screen } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const { DatabaseSync } = require('node:sqlite')

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)
const legacyDataFile = () => path.join(app.getPath('userData'), 'roofingcrm-data.json')
const sqliteFile = () => path.join(app.getPath('userData'), 'roofingcrm.sqlite')
const backupDir = () => path.join(app.getPath('userData'), 'backups')

const STATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`

let database
let lastBackupAt = null
const execFileAsync = promisify(execFile)

function getDatabase() {
  if (!database) {
    database = new DatabaseSync(sqliteFile())
    database.exec('PRAGMA journal_mode = WAL;')
    database.exec(STATE_TABLE_SQL)
  }

  return database
}

async function readLegacyDesktopData() {
  try {
    return await fs.readFile(legacyDataFile(), 'utf8')
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

async function backupState(payload) {
  await fs.mkdir(backupDir(), { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = path.join(backupDir(), `roofingcrm-backup-${timestamp}.json`)
  await fs.writeFile(filePath, payload, 'utf8')
  lastBackupAt = new Date().toISOString()

  const entries = await fs.readdir(backupDir(), { withFileTypes: true })
  const backupFiles = entries
    .filter((entry) => entry.isFile() && entry.name.startsWith('roofingcrm-backup-') && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort()

  const filesToDelete = backupFiles.slice(0, Math.max(0, backupFiles.length - 12))
  await Promise.all(filesToDelete.map((name) => fs.unlink(path.join(backupDir(), name))))

  return filePath
}

function readDesktopState() {
  const db = getDatabase()
  const row = db.prepare('SELECT payload, updated_at FROM app_state WHERE id = 1').get()
  if (!row?.payload) {
    return null
  }

  return {
    payload: row.payload,
    updatedAt: row.updated_at,
  }
}

async function writeDesktopState(payload) {
  const db = getDatabase()
  db.prepare(
    `
      INSERT INTO app_state (id, payload, updated_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        updated_at = excluded.updated_at;
    `,
  ).run(payload, new Date().toISOString())

  const backupPath = await backupState(payload)

  return {
    dbPath: sqliteFile(),
    backupPath,
  }
}

async function ensureDesktopState() {
  const existing = readDesktopState()
  if (existing) {
    return { migrated: false, payload: existing.payload }
  }

  const legacyPayload = await readLegacyDesktopData()
  if (!legacyPayload) {
    return { migrated: false, payload: null }
  }

  await writeDesktopState(legacyPayload)
  return { migrated: true, payload: legacyPayload }
}

async function runMaterialScraper() {
  const scriptPath = path.join(app.getAppPath(), 'scripts', 'scrape-prices.js')
  const dbPath = sqliteFile()
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, '--db', dbPath], {
      cwd: app.getAppPath(),
      timeout: 300000,
      windowsHide: true,
    })

    return {
      ok: true,
      stdout,
      stderr,
      dbPath,
      ranAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      ok: false,
      dbPath,
      ranAt: new Date().toISOString(),
      code: typeof error?.code === 'number' ? error.code : null,
      stdout: typeof error?.stdout === 'string' ? error.stdout : '',
      stderr: typeof error?.stderr === 'string' ? error.stderr : '',
      message: error?.message || 'Scraper process failed',
    }
  }
}

function getLatestMaterialPrices() {
  const db = getDatabase()
  const rows = db.prepare(`
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
  `).all()

  return rows
}

async function exportPdf({ html, suggestedName }) {
  const focusedWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const defaultPath = path.join(app.getPath('documents'), suggestedName || 'estimate.pdf')
  const saveResult = await dialog.showSaveDialog(focusedWindow ?? undefined, {
    defaultPath,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })

  if (saveResult.canceled || !saveResult.filePath) {
    return { cancelled: true }
  }

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
    },
  })

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const pdfBuffer = await printWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: {
        marginType: 'default',
      },
    })
    await fs.writeFile(saveResult.filePath, pdfBuffer)
    return { cancelled: false, path: saveResult.filePath }
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close()
    }
  }
}

function createWindow() {
  const { workAreaSize } = screen.getPrimaryDisplay()
  const width = Math.max(1180, Math.min(1560, workAreaSize.width - 96))
  const height = Math.max(820, Math.min(1020, workAreaSize.height - 96))
  const window = new BrowserWindow({
    width,
    height,
    minWidth: 1120,
    minHeight: 760,
    show: false,
    center: true,
    backgroundColor: '#07111d',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.setZoomFactor(0.9)

  window.once('ready-to-show', () => {
    window.show()
  })

  if (isDev) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL)
    window.webContents.openDevTools({ mode: 'detach' })
    return
  }

  void window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  ipcMain.handle('desktop-storage:load', async () => {
    const result = await ensureDesktopState()
    return {
      payload: result.payload,
      driver: 'sqlite-native',
      migrated: result.migrated,
    }
  })

  ipcMain.handle('desktop-storage:save', async (_event, payload) => {
    return writeDesktopState(payload)
  })

  ipcMain.handle('desktop-storage:meta', async () => {
    return {
      dbPath: sqliteFile(),
      backupDir: backupDir(),
      legacyPath: legacyDataFile(),
      lastBackupAt,
      tempDir: os.tmpdir(),
    }
  })

  ipcMain.handle('desktop-estimate:export-pdf', async (_event, payload) => {
    return exportPdf(payload)
  })

  ipcMain.handle('desktop-materials:run-scraper', async () => {
    return runMaterialScraper()
  })

  ipcMain.handle('desktop-materials:get-latest', async () => {
    return getLatestMaterialPrices()
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (database) {
    database.close()
    database = null
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
