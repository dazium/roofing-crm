#!/usr/bin/env node
/**
 * Home Depot Material Price Scraper for RoofingCRM
 *
 * Usage: node scrape-prices.js [--dry-run] [--db <path>]
 *
 * Auto-detects DB location if not provided.
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const PRODUCTS = [
  { name: 'CertainTeed Landmark Shingles', searchQuery: 'CertainTeed Landmark shingles', unit: 'sq', priceSelector: '.price__dollars, [data-testid="price-sub"]' },
  { name: 'IKO Dynasty Shingles', searchQuery: 'IKO Dynasty shingles', unit: 'sq', priceSelector: '.price__dollars, [data-testid="price-sub"]' },
  { name: 'Ice & Water Shield', searchQuery: 'ice and water shield roofing', unit: 'roll', priceSelector: '.price__dollars, [data-testid="price-sub"]' },
  { name: 'Ridge Vent', searchQuery: 'ridge vent roofing', unit: 'lf', priceSelector: '.price__dollars, [data-testid="price-sub"]' },
  { name: 'Hip & Ridge Cap', searchQuery: 'hip and ridge cap shingles', unit: 'bundle', priceSelector: '.price__dollars, [data-testid="price-sub"]' },
  { name: 'Starters', searchQuery: 'roofing starter strip shingles', unit: 'sq', priceSelector: '.price__dollars, [data-testid="price-sub"]' },
  { name: 'Drip Edge', searchQuery: 'roofing drip edge aluminum', unit: 'lf', priceSelector: '.price__dollars, [data-testid="price-sub"]' },
];

const HOME_DEPOT_SEARCH = 'https://www.homedepot.com/s/';

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const dbIdx = args.indexOf('--db');
  const explicitDb = dbIdx !== -1 && args[dbIdx + 1] ? args[dbIdx + 1] : null;
  return { dryRun, explicitDb };
}

function guessDbPaths() {
  const candidates = [];
  const dir = __dirname;
  // Project dev locations
  candidates.push(path.join(dir, '..', 'data', 'roofingcrm.db'));
  candidates.push(path.join(dir, '..', '..', 'data', 'roofingcrm.db'));
  // AppData locations (Windows)
  const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
  candidates.push(path.join(appData, 'roofingcrm', 'roofingcrm.db'));
  candidates.push(path.join(appData, 'RoofingCRM', 'roofingcrm.db'));
  // Portable: same folder as app
  candidates.push(path.join(dir, '..', 'roofingcrm.db'));
  // Remove duplicates and non-existent
  return [...new Set(candidates)].filter(p => fs.existsSync(p));
}

async function checkHasAppState(dbPath) {
  try {
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    const result = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='app_state'");
    await db.close();
    return !!result;
  } catch {
    return false;
  }
}

async function findDb() {
  const { explicitDb } = parseArgs();
  if (explicitDb) {
    return explicitDb;
  }
  const candidates = guessDbPaths();
  for (const p of candidates) {
    if (await checkHasAppState(p)) {
      return p;
    }
  }
  // Fall back to first candidate even if no app_state (scraper will create table anyway)
  return candidates[0] || path.join(__dirname, '..', 'data', 'roofingcrm.db');
}

async function getDb(dbPath) {
  return await open({ filename: dbPath, driver: sqlite3.Database });
}

function parsePrice(text) {
  if (!text) return null;
  const match = text.replace(/[^0-9.]/g, '').match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

async function scrapeProduct(browser, product) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  try {
    const searchUrl = `${HOME_DEPOT_SEARCH}${encodeURIComponent(product.searchQuery)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('section[data-testid="product-pod"]', { timeout: 10000 }).catch(() => null);
    const firstLink = await page.$('a[href^="/p/"]');
    if (!firstLink) throw new Error('No product link found');
    const href = await page.evaluate(el => el.getAttribute('href'), firstLink);
    const productUrl = `https://www.homedepot.com${href}`;
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const priceText = await page.$eval(product.priceSelector, el => el.textContent).catch(() => null);
    const price = parsePrice(priceText);
    const sku = await page.$eval('[data-testid="product-sku"]', el => el.textContent.replace('SKU#', '').trim()).catch(() => null);
    return {
      product: product.name,
      sku,
      store: 'Home Depot',
      price,
      unit: product.unit,
      url: productUrl,
      scraped_at: new Date().toISOString(),
    };
  } finally {
    await page.close();
  }
}

async function runScrape() {
  const { dryRun } = parseArgs();
  const dbPath = await findDb();
  console.log(`[${new Date().toISOString()}] Starting scrape...`);
  console.log(`Using DB: ${dbPath}`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const db = await getDb(dbPath);

  try {
    await db.run(`
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

    for (const product of PRODUCTS) {
      try {
        console.log(`Scraping ${product.name}...`);
        const data = await scrapeProduct(browser, product);
        if (!data.price) {
          console.warn(`No price found for ${product.name}`);
          continue;
        }

        if (dryRun) {
          console.log(`[DRY RUN] Would store:`, data);
        } else {
          await db.run(`
            INSERT INTO material_prices (product, sku, store, price, unit, url, scraped_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [data.product, data.sku, data.store, data.price, data.unit, data.url, data.scraped_at]);
          console.log(`Stored: ${data.product} — $${data.price}/${data.unit}`);
        }
      } catch (err) {
        console.error(`Failed to scrape ${product.name}:`, err.message);
      }
    }
  } finally {
    await browser.close();
    await db.close();
  }

  console.log(`[${new Date().toISOString()}] Scrape complete.`);
}

runScrape().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
