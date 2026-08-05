const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
(async () => {
  const svgPath = path.join(__dirname, 'icon.svg');
  const outPath = path.join(__dirname, 'icon.png');
  const svg = fs.readFileSync(svgPath, 'utf8');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body,html{margin:0;padding:0;background:transparent}</style></head><body>${svg}</body></html>`;
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  try {
    const page = await browser.newPage();
    await page.setViewport({width:256,height:256,deviceScaleFactor:1});
    await page.setContent(html);
    // Wait a tick for fonts/images
    await page.waitForTimeout(200);
    const el = await page.$('svg');
    if (el) {
      await el.screenshot({path: outPath, omitBackground: true});
      console.log('Wrote', outPath);
    } else {
      await page.screenshot({path: outPath, omitBackground: true});
      console.log('Wrote full page', outPath);
    }
  } catch (e) {
    console.error('Failed to render SVG to PNG', e);
    process.exit(2);
  } finally {
    await browser.close();
  }
})();
