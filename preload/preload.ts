import { contextBridge, ipcRenderer } from "electron";

type WakeRequest = {
  name: string;
  macAddress: string;
  broadcastAddress: string;
  port: number;
};

contextBridge.exposeInMainWorld("api", {
  wakeSystems: (requests: WakeRequest[]) =>
    ipcRenderer.invoke("wake-systems", requests),

  onUpdateAvailable: (cb: () => void) => ipcRenderer.on("update-available", cb),
  onUpdateProgress: (cb: (progress: number) => void) =>
    ipcRenderer.on("update-progress", (_, p) => cb(p)),
  onUpdateReady: (cb: () => void) => ipcRenderer.on("update-ready", cb),
  downloadUpdate: () => ipcRenderer.send("download-update"),
  installUpdate: () => ipcRenderer.send("install-update"),

  zoomIn: () => ipcRenderer.send("zoom-in"),
  zoomOut: () => ipcRenderer.send("zoom-out"),
  zoomReset: () => ipcRenderer.send("zoom-reset"),
  onZoomChanged: (cb: (z: number) => void) =>
    ipcRenderer.on("zoom-changed", (_, z) => cb(z)),
});
