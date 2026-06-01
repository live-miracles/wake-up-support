import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";

import updater from "electron-updater";
import { sendWakeOnLan, type WakeRequest } from "./wake-on-lan.js";

const { autoUpdater } = updater;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow;

function createWindow(): void {
  const appTitle = `Wake Up Support ${app.getVersion()}`;

  mainWindow = new BrowserWindow({
    title: appTitle,
    width: 980,
    height: 720,
    minWidth: 820,
    minHeight: 600,
    icon: path.join(__dirname, "../ui/logo.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadFile(path.join(__dirname, "../ui/index.html"));
  setupZoom(mainWindow);
}

app.whenReady().then(() => {
  createWindow();

  autoUpdater.autoDownload = false;
  autoUpdater.checkForUpdates().catch(() => {
    // Update checks fail during local development and before publish config is finalized.
  });

  autoUpdater.on("update-available", () => {
    mainWindow.webContents.send("update-available");
  });

  autoUpdater.on("download-progress", (p) => {
    mainWindow.webContents.send("update-progress", p.percent);
  });

  autoUpdater.on("update-downloaded", () => {
    mainWindow.webContents.send("update-ready");
  });
});

ipcMain.handle("wake-systems", async (_, requests: WakeRequest[]) => {
  return Promise.all(requests.map((request) => sendWakeOnLan(request)));
});

ipcMain.on("download-update", () => autoUpdater.downloadUpdate());
ipcMain.on("install-update", () => autoUpdater.quitAndInstall());

app.on("window-all-closed", () => {
  app.quit();
});

function setupZoom(win: BrowserWindow) {
  const zoom = (delta: number) => {
    const wc = win.webContents;
    const z =
      Math.round(Math.max(0.5, Math.min(2, wc.getZoomFactor() + delta)) * 10) /
      10;
    wc.setZoomFactor(z);
    win.webContents.send("zoom-changed", z);
  };

  const setZoom = (z: number) => {
    win.webContents.setZoomFactor(z);
    win.webContents.send("zoom-changed", z);
  };

  ipcMain.on("zoom-in", () => zoom(0.1));
  ipcMain.on("zoom-out", () => zoom(-0.1));
  ipcMain.on("zoom-reset", () => setZoom(1));
}
