const Jimp = require('jimp');
const pngToIco = require('png-to-ico');
const fs = require('fs').promises;
const path = require('path');

(async () => {
  try {
    const cwd = process.cwd();
    const buildDir = path.join(cwd, 'build');
    const src = path.join(buildDir, 'icon.png');
    const sizes = [16, 32, 48, 64, 128, 256];

    // Ensure source exists
    await fs.access(src);

    const tmpFiles = [];
    for (const s of sizes) {
      const out = path.join(buildDir, `icon-${s}.png`);
      const img = await Jimp.read(src);
      await img.resize(s, s).writeAsync(out);
      tmpFiles.push(out);
      console.log('Wrote', out);
    }

    const icoBuffer = await pngToIco(tmpFiles);
    const icoPath = path.join(buildDir, 'icon.ico');
    await fs.writeFile(icoPath, icoBuffer);
    console.log('Wrote', icoPath);

    // Optionally remove tmpFiles (keep them for inspection)
    // await Promise.all(tmpFiles.map(f => fs.unlink(f)));

    console.log('icon.ico generation complete');
  } catch (err) {
    console.error('Error creating icon.ico:', err);
    process.exit(1);
  }
})();