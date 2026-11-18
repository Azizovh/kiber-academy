// Renders the link-preview image (public/og.png, 1200×630) and the home-screen icons for the website.
// Run with:  npx electron scripts/make-og.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'public', 'favicon.svg'), 'utf8');
const svgUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

async function render(width, height, body) {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    useContentSize: true,
    webPreferences: { offscreen: true },
  });
  let frame = null;
  win.webContents.on('paint', (_e, _dirty, image) => {
    frame = image;
  });
  win.webContents.setFrameRate(10);
  const html = `<!doctype html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;width:${width}px;height:${height}px;overflow:hidden">${body}</body></html>`;
  await win.loadURL('data:text/html;base64,' + Buffer.from(html).toString('base64'));
  await new Promise((r) => setTimeout(r, 1500));
  win.destroy();
  if (!frame || frame.isEmpty()) throw new Error('no frame was painted');
  return frame.resize({ width, height, quality: 'best' });
}

const card = `
<div style="box-sizing:border-box;width:1200px;height:630px;padding:72px 80px;
  background:radial-gradient(circle at 85% 15%, #123b33 0, transparent 45%), #0b0f14;
  font-family:'Segoe UI', system-ui, sans-serif;color:#e6edf3;display:flex;flex-direction:column;justify-content:space-between">
  <div style="display:flex;align-items:center;gap:22px">
    <img src="${svgUrl}" width="88" height="88" style="border-radius:20px">
    <div style="font-size:46px;font-weight:700;letter-spacing:-1px">Kiber<span style="color:#35d6a4">Akademiya</span></div>
  </div>
  <div>
    <div style="font-size:68px;font-weight:700;line-height:1.08;letter-spacing:-1.5px;max-width:960px">
      Noldan kiberxavfsizlik mutaxassisigacha
    </div>
    <div style="margin-top:24px;font-size:30px;color:#9aa7b4">
      O'zbek tilida darslar, terminal labi, CTF va takrorlash kartochkalari
    </div>
  </div>
  <div style="display:flex;gap:14px;font-size:24px;color:#35d6a4">
    <span style="border:2px solid #1f4d43;border-radius:999px;padding:8px 20px">SOC</span>
    <span style="border:2px solid #1f4d43;border-radius:999px;padding:8px 20px">AppSec</span>
    <span style="border:2px solid #1f4d43;border-radius:999px;padding:8px 20px">Cloud</span>
    <span style="border:2px solid #1f4d43;border-radius:999px;padding:8px 20px">Pentest</span>
    <span style="margin-left:auto;color:#9aa7b4;align-self:center">Bepul</span>
  </div>
</div>`;

const icon = (size) =>
  `<div style="width:${size}px;height:${size}px;background:#0c1118;display:grid;place-items:center">
     <img src="${svgUrl}" width="${size}" height="${size}" style="display:block">
   </div>`;

// Each render closes its window; without this Electron would quit after the first one.
app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
  try {
    const pub = path.join(root, 'public');
    fs.writeFileSync(path.join(pub, 'og.png'), (await render(1200, 630, card)).toPNG());
    for (const [file, size] of [
      ['apple-touch-icon.png', 180],
      ['icon-192.png', 192],
      ['icon-512.png', 512],
    ]) {
      fs.writeFileSync(path.join(pub, file), (await render(size, size, icon(size))).toPNG());
    }
    console.log('og.png and icons written');
    app.exit(0);
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});
