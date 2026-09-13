import { join } from 'node:path';
import { app, BrowserWindow } from 'electron';

const DEV_URL = process.env.VITE_DEV_SERVER_URL;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Example',
    webPreferences: {
      // Mặc định an toàn: renderer KHÔNG có Node. Cần quyền gì thì mở đúng
      // quyền đó qua preload, đừng bật nodeIntegration cho nhanh.
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, 'preload.js'),
    },
  });

  if (DEV_URL) void win.loadURL(DEV_URL);
  else void win.loadFile(join(__dirname, '../renderer/index.html'));
}

void app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
