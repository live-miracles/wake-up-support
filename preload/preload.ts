import { contextBridge, ipcRenderer } from "electron";

type WakeRequest = {
  name: string;
  macAddress: string;
  broadcastAddress: string;
  port: number;
};

type AjaPowerRequest = {
  name: string;
  ipmiIp: string;
  username: string;
  password: string;
};

type AjaStatusRequest = AjaPowerRequest & {
  id: string;
};

type SystemStatusRequest = {
  id: string;
  macAddress: string;
  ipAddress?: string;
};

contextBridge.exposeInMainWorld("api", {
  wakeSystems: (requests: WakeRequest[]) =>
    ipcRenderer.invoke("wake-systems", requests),
  powerOnAja: (requests: AjaPowerRequest[]) =>
    ipcRenderer.invoke("power-on-aja", requests),
  powerOffAja: (requests: AjaPowerRequest[]) =>
    ipcRenderer.invoke("power-off-aja", requests),
  checkAjaStatuses: (requests: AjaStatusRequest[]) =>
    ipcRenderer.invoke("check-aja-statuses", requests),
  checkSystemStatuses: (systems: SystemStatusRequest[]) =>
    ipcRenderer.invoke("check-system-statuses", systems),
  scanLocalNetwork: () => ipcRenderer.invoke("scan-local-network"),

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
