const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Simple JSON-based config store (instead of electron-store which has ESM issues)
class SimpleStore {
  constructor(name) {
    this.configPath = path.join(app.getPath('userData'), `${name}.json`);
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }
    return {
      hosts: [],
      windowBounds: { width: 1200, height: 800 }
    };
  }

  save() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }
}

let store;
let mainWindow;
let sshManager;
let transferEngine;

function createWindow() {
  const { width, height } = store.get('windowBounds') || { width: 1200, height: 800 };

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#0f0f14',
    show: false,
    frame: true, // Use standard frame for better compatibility
    autoHideMenuBar: true
  });

  mainWindow.loadFile('renderer/index.html');

  // Open DevTools in development for debugging
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('resize', () => {
    const { width, height } = mainWindow.getBounds();
    store.set('windowBounds', { width, height });
  });

  // Initialize managers
  const { SSHManager } = require('./src/ssh-manager');
  const { TransferEngine } = require('./src/transfer-engine');

  sshManager = new SSHManager();
  transferEngine = new TransferEngine(sshManager);
}

app.whenReady().then(() => {
  store = new SimpleStore('local2other-config');
  createWindow();
}).catch(err => {
  console.error('Failed to start app:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ============== IPC Handlers ==============

// Host management
ipcMain.handle('hosts:get', () => {
  return store.get('hosts') || [];
});

ipcMain.handle('hosts:save', (event, hosts) => {
  store.set('hosts', hosts);
  return true;
});

// File dialog
ipcMain.handle('dialog:openFiles', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: '選擇要傳輸的檔案'
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '選擇資料夾'
  });
  return result.canceled ? null : result.filePaths[0];
});

// SSH operations
ipcMain.handle('ssh:testConnection', async (event, host) => {
  return await sshManager.testConnection(host);
});

ipcMain.handle('ssh:generateKey', async () => {
  return await sshManager.generateKey();
});

ipcMain.handle('ssh:getPublicKey', async () => {
  return await sshManager.getPublicKey();
});

// Transfer operations
ipcMain.handle('transfer:start', async (event, transferConfig) => {
  return await transferEngine.startTransfer(transferConfig, (progress) => {
    mainWindow.webContents.send('transfer:progress', progress);
  });
});

ipcMain.handle('transfer:cancel', async () => {
  return await transferEngine.cancelTransfer();
});

// Get user home directory for SSH key path display
ipcMain.handle('system:getHomePath', () => {
  return process.env.USERPROFILE || process.env.HOME;
});

// Clipboard
ipcMain.handle('clipboard:write', (event, text) => {
  const { clipboard } = require('electron');
  clipboard.writeText(text);
  return true;
});
