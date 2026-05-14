# Material Prices Scraper Setup

## Overview
This scraper pulls roofing material prices from Home Depot.ca and stores them in your RoofingCRM SQLite database. The Roof Math panel then uses those prices to show estimated material costs.

## Installation

1. Open a terminal in your RoofingCRM project folder.
2. Install dependencies:
   ```
   npm install
   ```
   This will add `puppeteer` and `sqlite3` as dev dependencies.

3. (Optional) Test with dry run to see what would be scraped:
   ```
   node scripts/scrape-prices.js --dry-run
   ```

4. Run the scraper for real:
   ```
   node scripts/scrape-prices.js
   ```

   If the DB is not found automatically, specify it:
   ```
   node scripts/scrape-prices.js --db "C:\path\to\roofingcrm.db"
   ```

## Scheduling (Weekly)

Use Windows Task Scheduler:
- Create a Basic Task
- Trigger: Weekly, choose day/time
- Action: Start a program
- Program: `node`
- Arguments: `"C:\Users\daziu\Desktop\Apps\RoofingCRM\scripts\scrape-prices.js"`
- Start in: `C:\Users\daziu\Desktop\Apps\RoofingCRM`

Or run manually before building estimates.

## Supported Products
- CertainTeed Landmark Shingles (per square)
- IKO Dynasty Shingles (per square)
- Ice & Water Shield (per roll)
- Ridge Vent (per linear foot)
- Hip & Ridge Cap (per bundle)
- Starters (per bundle)
- Drip Edge (per linear foot)

## Notes
- Scraper uses headless Chrome via Puppeteer; first run will download Chromium.
- Prices are displayed in the Roof Math panel next to quantities.
- Table `material_prices` is created automatically if missing.

Troubleshooting: Check console output for errors. If Home Depot changes their page layout, you may need to update the selectors in `scripts/scrape-prices.js`.
