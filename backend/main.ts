import { app, BrowserWindow, ipcMain, shell } from "electron";
import { execFile } from "child_process";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

import updater from "electron-updater";
import {
  checkAjaBridgeStatus,
  powerOffAjaBridge,
  powerOnAjaBridge,
  type AjaPowerRequest,
  type AjaStatusRequest,
} from "./aja-ipmi.js";
import { sendWakeOnLan, type WakeRequest } from "./wake-on-lan.js";

const { autoUpdater } = updater;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = promisify(execFile);

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

ipcMain.handle("power-on-aja", async (_, requests: AjaPowerRequest[]) => {
  return Promise.all(requests.map((request) => powerOnAjaBridge(request)));
});

ipcMain.handle("power-off-aja", async (_, requests: AjaPowerRequest[]) => {
  return Promise.all(requests.map((request) => powerOffAjaBridge(request)));
});

ipcMain.handle(
  "check-aja-statuses",
  async (_, requests: AjaStatusRequest[]) => {
    return Promise.all(
      requests.map((request) => checkAjaBridgeStatus(request)),
    );
  },
);

ipcMain.handle(
  "check-system-statuses",
  async (_, systems: SystemStatusRequest[]) => {
    return checkSystemStatuses(systems);
  },
);

ipcMain.handle("scan-local-network", async () => {
  return scanLocalNetwork();
});

ipcMain.on("open-github", () => {
  shell.openExternal("https://github.com/live-miracles/wake-up-support");
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

type SystemStatusRequest = {
  id: string;
  ipAddress?: string;
  macAddress?: string;
};

type SystemStatusResult = {
  id: string;
  ipStatus: "online" | "offline" | "unknown";
  macStatus: "online" | "offline" | "unknown";
  actualMacForIp?: string;
  ipsForMac: string[];
};

type NetworkScanResult = {
  subnet: string;
  localIp: string;
  devices: NetworkScanDevice[];
};

type NetworkScanDevice = {
  ipAddress: string;
  macAddress: string;
  name?: string;
};

async function checkSystemStatuses(
  systems: SystemStatusRequest[],
): Promise<SystemStatusResult[]> {
  const pingResults = new Map<string, "online" | "offline" | "unknown">();
  const systemsWithIps = systems.filter((system) => system.ipAddress);

  await Promise.all(
    systemsWithIps.map(async (system) => {
      if (!system.ipAddress) return;

      try {
        await execFileAsync(
          "ping",
          ["-n", "1", "-w", "1000", system.ipAddress],
          {
            windowsHide: true,
            timeout: 2000,
          },
        );
        pingResults.set(system.id, "online");
      } catch {
        pingResults.set(system.id, "offline");
      }
    }),
  );

  const arpEntries = await getArpEntries();

  return systems.map((system) => {
    const normalizedMac = system.macAddress
      ? normalizeMac(system.macAddress)
      : "";
    const actualMacForIp = system.ipAddress
      ? arpEntries.get(system.ipAddress)
      : undefined;
    const ipsForMac = normalizedMac
      ? [...arpEntries.entries()]
          .filter(([, mac]) => mac === normalizedMac)
          .map(([ip]) => ip)
      : [];

    return {
      id: system.id,
      ipStatus: system.ipAddress
        ? (pingResults.get(system.id) ?? "unknown")
        : "unknown",
      macStatus: normalizedMac
        ? ipsForMac.length > 0
          ? "online"
          : "offline"
        : "unknown",
      actualMacForIp: actualMacForIp ? formatMac(actualMacForIp) : undefined,
      ipsForMac,
    };
  });
}

async function getArpEntries(): Promise<Map<string, string>> {
  try {
    const { stdout } = await execFileAsync("arp", ["-a"], {
      windowsHide: true,
      timeout: 2000,
    });

    return parseArpEntries(stdout);
  } catch {
    return new Map();
  }
}

async function scanLocalNetwork(): Promise<NetworkScanResult> {
  const localIp = getPrimaryLocalIp();
  if (!localIp) {
    throw new Error("No active local IPv4 network was found.");
  }

  const subnetPrefix = localIp.split(".").slice(0, 3).join(".");
  const subnet = `${subnetPrefix}.*`;
  const ips = Array.from(
    { length: 254 },
    (_, index) => `${subnetPrefix}.${index + 1}`,
  );

  await runLimited(ips, 32, async (ip) => {
    try {
      await execFileAsync("ping", ["-n", "1", "-w", "250", ip], {
        windowsHide: true,
        timeout: 1000,
      });
    } catch {
      // A failed ping may still populate ARP for some devices, so scan continues.
    }
  });

  const arpEntries = await getArpEntries();
  const devices = (
    await Promise.all(
      [...arpEntries.entries()]
        .filter(([ip]) => ip.startsWith(`${subnetPrefix}.`))
        .map(async ([ipAddress, macAddress]) => ({
          ipAddress,
          macAddress: formatMac(macAddress),
          name: await lookupHostName(ipAddress),
        })),
    )
  ).sort((a, b) => compareIps(a.ipAddress, b.ipAddress));

  return {
    subnet,
    localIp,
    devices,
  };
}

function getPrimaryLocalIp() {
  const interfaces = os.networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (
        address.family === "IPv4" &&
        !address.internal &&
        !address.address.startsWith("169.254.")
      ) {
        return address.address;
      }
    }
  }

  return "";
}

async function lookupHostName(ipAddress: string) {
  try {
    const { stdout } = await execFileAsync("nslookup", [ipAddress], {
      windowsHide: true,
      timeout: 1500,
    });
    const nameMatch = stdout.match(/Name:\s+(.+)/i);
    return nameMatch?.[1]?.trim();
  } catch {
    return undefined;
  }
}

async function runLimited<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
) {
  let cursor = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await task(item);
    }
  });

  await Promise.all(workers);
}

function compareIps(a: string, b: string) {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);

  for (let index = 0; index < 4; index++) {
    const difference = aParts[index] - bParts[index];
    if (difference !== 0) return difference;
  }

  return 0;
}

function parseArpEntries(output: string) {
  const entries = new Map<string, string>();

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F:-]{17})\s+/,
    );

    if (match) {
      entries.set(match[1], normalizeMac(match[2]));
    }
  }

  return entries;
}

function normalizeMac(macAddress: string) {
  return macAddress.replace(/[:.-]/g, "").trim().toUpperCase();
}

function formatMac(macAddress: string) {
  return (
    normalizeMac(macAddress)
      .match(/.{1,2}/g)
      ?.join("-") ?? macAddress
  );
}
