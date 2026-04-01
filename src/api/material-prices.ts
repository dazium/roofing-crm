/**
 * Material pricing bridge notes
 *
 * RoofingCRM is currently a Vite + React frontend with Electron desktop hooks
 * and Capacitor/native SQLite storage. It does not ship an Express backend.
 *
 * Price refresh/retrieval is handled through:
 * - Electron IPC (`window.roofingcrmDesktop.runMaterialScraper`) on desktop
 * - SQLite reads from `src/storage.ts`
 *
 * This file remains only as documentation so future work does not assume there
 * is an active `/api/material-prices` web server in the app today.
 */

export const MATERIAL_PRICES_BACKEND_STATUS = {
  mode: 'desktop-ipc-and-sqlite',
  hasExpressServer: false,
  refresh: 'Use window.roofingcrmDesktop.runMaterialScraper() in desktop builds.',
  read: 'Use getMaterialPrices() from src/storage.ts.',
} as const;
