# Pricing Sources Guide

## Retail Pricing (Home Depot, Lowe's)

### Home Depot Canada
- **URL**: https://www.homedepot.ca/
- **Search pattern**: `homedepot.ca/search/{product-name}`
- **Pricing**: Retail, includes tax in some regions
- **Best for**: Roofing, HVAC, general construction materials
- **Update frequency**: Daily (prices fluctuate)

**Example searches:**
- Roofing shingles: `homedepot.ca/search/roof%20shingles`
- Underlayment: `homedepot.ca/search/roofing%20underlayment`
- Plywood: `homedepot.ca/search/plywood%20sheathing`

### Lowe's
- **URL**: https://www.lowes.com/
- **Pricing**: US-based, higher for specialty items
- **Best for**: Comparison pricing, specialty tools

## Wholesale & Contractor Pricing

### Supplier APIs
Many suppliers offer B2B APIs for real-time pricing:
- **Rexel** (electrical, HVAC) - API available
- **ScanSource** (IT) - B2B portal
- **Grainger** (industrial) - API available

### Direct Supplier Contacts
For bulk pricing, contact suppliers directly:
- Shingle manufacturers: GAF, Owens Corning, Asphalt Roofing Manufacturers Association
- Lumber suppliers: Local mills, Weyerhaeuser
- HVAC: Lennox, Carrier, Trane

## Manual Entry Workflow

For materials not available online:

1. **Gather quotes** from 2-3 suppliers
2. **Average the prices** for fairness
3. **Add markup** (typically 20-30% for retail)
4. **Enter into system** with "Last Updated" date
5. **Review quarterly** to catch price changes

## Regional Variations

### Canada
- HST: 13% (Ontario, Nova Scotia, Newfoundland)
- GST: 5% (Alberta, BC, Manitoba, Saskatchewan)
- PST: 7-8% (BC, Manitoba, Saskatchewan)

### US
- Sales tax: 0-10% depending on state
- No federal sales tax

### Pricing by Region
- **Urban areas**: Higher retail prices
- **Rural areas**: Lower availability, higher shipping
- **Seasonal**: Winter materials more expensive in cold climates

## Automation Options

### CSV Import
Create a spreadsheet with columns:
```
name | category | unit | unitPrice | supplier | lastUpdated
```

Then import via script:
```bash
node seed-materials.mjs --file materials.csv
```

### API Integration
For frequent updates, integrate with supplier APIs:
```javascript
// Example: Fetch from Home Depot API (if available)
const response = await fetch(`https://api.homedepot.com/products/${sku}`);
const { price } = await response.json();
```

### Web Scraping
For suppliers without APIs, use web scraping (check terms of service):
```javascript
// Example: Scrape Home Depot product page
const cheerio = require('cheerio');
const response = await fetch(url);
const html = await response.text();
const $ = cheerio.load(html);
const price = $('.price').text();
```

## Price Accuracy Tips

1. **Always check tax inclusion** - Some sources include tax, others don't
2. **Note the unit** - "Per square" vs "per bundle" vs "per sheet"
3. **Include shipping** - For bulk orders, add shipping cost to unit price
4. **Track source** - Document where each price came from
5. **Set update frequency** - Decide how often to refresh (daily/weekly/monthly)

## Example: Roofing Materials Pricing

| Material | Supplier | Unit | Price | Tax | Total/Unit | Source |
|----------|----------|------|-------|-----|-----------|--------|
| GAF Timberline HDZ | Home Depot CA | Square | $120 | 13% | $135.60 | homedepot.ca |
| Ice & Water Shield | Home Depot CA | Roll | $110 | 13% | $124.30 | homedepot.ca |
| 3/4" Plywood | Home Depot CA | Sheet | $103 | 13% | $116.39 | homedepot.ca |
| Pipe Flange | Home Depot CA | Each | $75 | 13% | $84.75 | homedepot.ca |

Store **pre-tax prices** in the database, apply tax at estimate time based on customer location.
