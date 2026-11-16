// Desktop shell: one window that shows the built web app from dist/.
// The app itself is a plain static site, so nothing here is required to run it in a browser.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const INDEX = path.join(__dirname, '..', 'dist', 'index.html');

/** @type {BrowserWindow | null} */
let win = null;

function isExternal(url) {
  return /^https?:\/\//i.test(url);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 380,
    minHeight: 560,
    title: 'KiberAkademiya',
    backgroundColor: '#090d13',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      // The page is static content with no need for Node: keep it fully sandboxed.
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win?.show());
  win.on('closed', () => {
    win = null;
  });

  // Links to learning resources open in the system browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return;
    event.preventDefault();
    if (isExternal(url)) void shell.openExternal(url);
  });

  void win.loadFile(INDEX);
}

// A second launch focuses the running window instead of opening another copy
// (two copies would overwrite each other's saved progress).
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
