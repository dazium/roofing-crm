import path from 'node:path';
import process from 'node:process';

const PRODUCTS = [
  {
    product: 'GAF Timberline HDZ Shingles',
    query: 'GAF Timberline HDZ shingles',
    unit: 'bundle',
  },
  {
    product: 'CertainTeed Landmark Shingles',
    query: 'CertainTeed Landmark shingles',
    unit: 'bundle',
  },
  {
    product: 'IKO Dynasty Shingles',
    query: 'IKO Dynasty shingles',
    unit: 'bundle',
  },
  {
    product: 'Ice & Water Shield',
    query: 'ice and water shield roofing',
    unit: 'roll',
  },
  {
    product: 'Ridge Vent',
    query: 'roof ridge vent',
    unit: 'lf',
  },
  {
    product: 'Hip & Ridge Cap',
    query: 'hip ridge cap shingles',
    unit: 'bundle',
  },
  {
    product: 'Starters',
    query: 'starter strip shingles',
    unit: 'bundle',
  },
  {
    product: 'Drip Edge',
    query: 'roof drip edge',
    unit: 'piece',
  },
];

function parseArgs(argv) {
  const args = {
    dryRun: false,
    db: path.resolve(process.cwd(), 'roofingcrm.sqlite'),
    only: '',
    limit: 0,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--db') {
      const db = argv[index + 1];
      if (!db) throw new Error('--db requires a SQLite path');
      args.db = path.resolve(db);
      index += 1;
    } else if (arg === '--only') {
      const only = argv[index + 1];
      if (!only) throw new Error('--only requires product text');
      args.only = only.toLowerCase();
      index += 1;
    } else if (arg === '--limit') {
      args.limit = Math.max(0, Number(argv[index + 1]) || 0);
      index += 1;
    }
  }

  return args;
}

function searchUrls(query) {
  const encoded = encodeURIComponent(query);
  return [
    `https://www.homedepot.ca/search?q=${encoded}`,
    `https://www.homedepot.ca/search/${encoded}`,
  ];
}

function stripHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(text) {
  const homeDepotMatch = text.match(/\$\s*([0-9]{1,4}(?:,[0-9]{3})*)\s+And\s+([0-9]{1,2})\s+Cents/i);
  if (homeDepotMatch) {
    return Number(`${homeDepotMatch[1].replace(/,/g, '')}.${homeDepotMatch[2].padStart(2, '0')}`);
  }

  const matches = [...text.matchAll(/\$\s*([0-9]{1,4}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g)]
    .map((match) => Number(match[1].replace(/,/g, '')))
    .filter((price) => Number.isFinite(price) && price > 0 && price < 2000);

  return matches[0] ?? null;
}

async function scrapeProductWithFetch(item) {
  let lastError = null;
  for (const url of searchUrls(item.query)) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-CA,en;q=0.9',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        },
      });
      if (!response.ok) {
        throw new Error(`Home Depot returned HTTP ${response.status}`);
      }

      const html = await response.text();
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '';
      const text = stripHtml(html);
      const price = parsePrice(text);
      if (!price) {
        throw new Error(`No price found on Home Depot search results for "${item.query}"`);
      }

      return {
        product: item.product,
        price,
        unit: item.unit,
        store: 'Home Depot CA',
        url,
        scraped_at: new Date().toISOString(),
        page_title: title,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Could not scrape "${item.query}"`);
}

async function scrapeProductWithBrowser(page, item) {
  let lastError = null;
  for (const url of searchUrls(item.query)) {
    try {
      let navigationError = null;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch (error) {
        navigationError = error;
      }
      await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const result = await page.evaluate(() => ({
        html: document.documentElement.outerHTML,
        title: document.title,
      }));
      const price = parsePrice(stripHtml(result.html));
      if (!price) {
        if (navigationError) throw navigationError;
        throw new Error(`No price found on Home Depot search results for "${item.query}"`);
      }

      return {
        product: item.product,
        price,
        unit: item.unit,
        store: 'Home Depot CA',
        url,
        scraped_at: new Date().toISOString(),
        page_title: result.title,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Could not scrape "${item.query}"`);
}

function ensureTable(db) {
  db.exec(`
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
}

async function saveRows(dbPath, rows) {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(dbPath);
  try {
    ensureTable(db);
    const insert = db.prepare(`
      INSERT INTO material_prices (product, sku, store, price, unit, url, scraped_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    for (const row of rows) {
      insert.run(row.product, null, row.store, row.price, row.unit, row.url, row.scraped_at);
    }
  } finally {
    db.close();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const rows = [];
  const failures = [];
  let browser = null;
  let page = null;
  let products = PRODUCTS;
  if (args.only) {
    products = products.filter((item) => `${item.product} ${item.query}`.toLowerCase().includes(args.only));
  }
  if (args.limit > 0) {
    products = products.slice(0, args.limit);
  }

  if (!products.length) {
    throw new Error('No products matched the scraper filters.');
  }

  try {
    for (const item of products) {
      try {
        console.log(`Scraping ${item.product}...`);
        let row;
        try {
          row = await scrapeProductWithFetch(item);
        } catch (fetchError) {
          if (!browser || !page) {
            const { default: puppeteer } = await import('puppeteer');
            browser = await puppeteer.launch({
              headless: true,
              args: ['--disable-gpu', '--disable-http2', '--no-sandbox', '--disable-setuid-sandbox'],
            });
            page = await browser.newPage();
            await page.setViewport({ width: 1365, height: 900 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36');
          }

          row = await scrapeProductWithBrowser(page, item);
        }

        rows.push(row);
        console.log(`${row.product}: $${row.price.toFixed(2)} / ${row.unit} from ${row.store}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ product: item.product, message });
        console.error(`${item.product}: ${message}`);
      }
    }
  } finally {
    if (browser) await browser.close();
  }

  if (!args.dryRun && rows.length) {
    await saveRows(args.db, rows);
    console.log(`Saved ${rows.length} material price row(s) to ${args.db}`);
  } else if (args.dryRun) {
    console.log(`Dry run complete. ${rows.length} row(s) scraped; database was not changed.`);
  }

  if (failures.length) {
    process.exitCode = rows.length ? 2 : 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
