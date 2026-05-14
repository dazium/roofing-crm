export {}

declare global {
  interface Window {
    roofingcrmDesktop?: {
      loadData: () => Promise<{ payload: string | null; driver: 'sqlite-native'; migrated: boolean }>
      saveData: (payload: string) => Promise<{ dbPath: string; backupPath: string }>
      getMeta: () => Promise<{ dbPath: string; backupDir: string; legacyPath: string; lastBackupAt: string | null; tempDir: string }>
      exportEstimatePdf: (payload: { html: string; suggestedName: string }) => Promise<{ cancelled: boolean; path?: string }>
      runMaterialScraper: () => Promise<
        | { ok: true; stdout?: string; stderr?: string; dbPath: string; ranAt: string }
        | { ok: false; dbPath: string; ranAt: string; code?: number | null; stdout?: string; stderr?: string; message?: string }
      >
      getLatestMaterialPrices: () => Promise<Array<{ product: string; price: number; unit: string; store: string; scraped_at: string }>>
    }
  }
}
