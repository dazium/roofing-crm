-- Migration: Add material_prices table
-- Created by Alesha automation for RoofingCRM

CREATE TABLE IF NOT EXISTS material_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product TEXT NOT NULL,          -- e.g., 'CertainTeed Landmark Shingles'
  sku TEXT,                       -- Home Depot SKU
  store TEXT NOT NULL,            -- 'Home Depot' or 'Lowe's'
  price REAL NOT NULL,            -- latest price
  unit TEXT NOT NULL,             -- e.g., 'bundle', 'sq', 'roll', 'lf'
  url TEXT,                       -- product page URL
  scraped_at TEXT NOT NULL,       -- ISO timestamp
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_material_prices_product ON material_prices(product);
CREATE INDEX IF NOT EXISTS idx_material_prices_store ON material_prices(store);
CREATE INDEX IF NOT EXISTS idx_material_prices_scraped ON material_prices(scraped_at);
