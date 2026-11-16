// Renders public/favicon.svg into the PNG icons the desktop build needs.
// Run with:  npx electron scripts/make-icon.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'public', 'favicon.svg'), 'utf8');
const SIZE = 512;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    frame: false,
    transparent: true,
    useContentSize: true,
    webPreferences: { offscreen: true },
  });

  // Offscreen windows hand every rendered frame to the "paint" event.
  let frame = null;
  win.webContents.on('paint', (_event, _dirty, image) => {
    frame = image;
  });
  win.webContents.setFrameRate(10);

  const html = `<html><body style="margin:0;background:transparent;overflow:hidden">
    <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${SIZE}" height="${SIZE}" style="display:block">
  </body></html>`;
  await win.loadURL('data:text/html;base64,' + Buffer.from(html).toString('base64'));
  await new Promise((resolve) => setTimeout(resolve, 1200));

  if (!frame || frame.isEmpty()) {
    console.error('no frame was painted');
    app.exit(1);
    return;
  }
  const image = frame.resize({ width: SIZE, height: SIZE, quality: 'best' });
  fs.mkdirSync(path.join(root, 'build'), { recursive: true });
  fs.writeFileSync(path.join(root, 'build', 'icon.png'), image.toPNG());
  fs.writeFileSync(path.join(root, 'electron', 'icon.png'), image.resize({ width: 256, height: 256, quality: 'best' }).toPNG());
  console.log('icons written');
  app.exit(0);
});
