type SystemEntry = {
  id: string;
  name: string;
  macAddress: string;
  broadcastAddress: string;
  port: number;
};

export {};

type WakeResult = {
  name: string;
  macAddress: string;
  ok: boolean;
  message: string;
};

type LogEntry = WakeResult & {
  time: string;
};

type SettingsExport = {
  app: "wake-up-support";
  version: 1;
  exportedAt: string;
  systems: SystemEntry[];
};

type Api = {
  wakeSystems: (requests: SystemEntry[]) => Promise<WakeResult[]>;
  onUpdateAvailable: (cb: () => void) => void;
  onUpdateProgress: (cb: (progress: number) => void) => void;
  onUpdateReady: (cb: () => void) => void;
  downloadUpdate: () => void;
  installUpdate: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  onZoomChanged: (cb: (z: number) => void) => void;
};

declare global {
  interface Window {
    api: Api;
  }
}

const SYSTEMS_STORAGE_KEY = "wake-up-support.systems";
const LOGS_STORAGE_KEY = "wake-up-support.logs";
const DEFAULT_BROADCAST = "192.168.154.255";
const MAX_LOG_ENTRIES = 300;

const systemModal = document.getElementById(
  "system-modal",
) as HTMLDialogElement;
const logModal = document.getElementById("log-modal") as HTMLDialogElement;
const systemModalTitle = document.getElementById("system-modal-title")!;
const addSystemBtn = document.getElementById(
  "add-system-btn",
) as HTMLButtonElement;
const showLogBtn = document.getElementById("show-log-btn") as HTMLButtonElement;
const importSettingsBtn = document.getElementById(
  "import-settings-btn",
) as HTMLButtonElement;
const exportSettingsBtn = document.getElementById(
  "export-settings-btn",
) as HTMLButtonElement;
const importSettingsInput = document.getElementById(
  "import-settings-input",
) as HTMLInputElement;
const form = document.getElementById("system-form") as HTMLFormElement;
const editingIdInput = document.getElementById(
  "editing-id",
) as HTMLInputElement;
const nameInput = document.getElementById("name-input") as HTMLInputElement;
const macInput = document.getElementById("mac-input") as HTMLInputElement;
const broadcastInput = document.getElementById(
  "broadcast-input",
) as HTMLInputElement;
const portInput = document.getElementById("port-input") as HTMLInputElement;
const saveSystemBtn = document.getElementById(
  "save-system-btn",
) as HTMLButtonElement;
const cancelEditBtn = document.getElementById(
  "cancel-edit-btn",
) as HTMLButtonElement;
const systemsTable = document.getElementById(
  "systems-table",
) as HTMLTableSectionElement;
const emptyState = document.getElementById("empty-state")!;
const logList = document.getElementById("log-list")!;
const alertBox = document.getElementById("alert")!;
const alertText = document.getElementById("alert-text")!;

let systems = loadSystems();
let logEntries: LogEntry[] = loadLogs();

function loadSystems(): SystemEntry[] {
  const saved = localStorage.getItem(SYSTEMS_STORAGE_KEY);
  if (!saved) return [];

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveSystems() {
  localStorage.setItem(SYSTEMS_STORAGE_KEY, JSON.stringify(systems));
}

function loadLogs(): LogEntry[] {
  const saved = localStorage.getItem(LOGS_STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_LOG_ENTRIES) : [];
  } catch {
    return [];
  }
}

function saveLogs() {
  localStorage.setItem(
    LOGS_STORAGE_KEY,
    JSON.stringify(logEntries.slice(0, MAX_LOG_ENTRIES)),
  );
}

function normalizeMac(macAddress: string) {
  return macAddress.replace(/[:.-]/g, "").trim().toUpperCase();
}

function formatMac(macAddress: string) {
  const normalized = normalizeMac(macAddress);
  return normalized.match(/.{1,2}/g)?.join("-") ?? macAddress;
}

function validateSystem(system: Omit<SystemEntry, "id">): string | null {
  if (!system.name.trim()) return "Enter a system name.";
  if (!/^[0-9A-F]{12}$/.test(normalizeMac(system.macAddress))) {
    return "Enter a valid 12-digit MAC address.";
  }
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(system.broadcastAddress)) {
    return "Enter a valid IPv4 broadcast address.";
  }
  if (
    !Number.isInteger(system.port) ||
    system.port < 1 ||
    system.port > 65535
  ) {
    return "Enter a valid UDP port between 1 and 65535.";
  }
  return null;
}

function validateImportedSystem(value: unknown, index: number): SystemEntry {
  if (!value || typeof value !== "object") {
    throw new Error(`System ${index + 1} is not valid.`);
  }

  const system = value as Partial<SystemEntry>;
  const importedSystem: SystemEntry = {
    id:
      typeof system.id === "string" && system.id
        ? system.id
        : crypto.randomUUID(),
    name: typeof system.name === "string" ? system.name.trim() : "",
    macAddress:
      typeof system.macAddress === "string" ? formatMac(system.macAddress) : "",
    broadcastAddress:
      typeof system.broadcastAddress === "string"
        ? system.broadcastAddress.trim()
        : "",
    port: Number(system.port),
  };
  const validationError = validateSystem(importedSystem);

  if (validationError) {
    throw new Error(`System ${index + 1}: ${validationError}`);
  }

  return importedSystem;
}

function getImportedSystems(value: unknown): SystemEntry[] {
  const systemsValue =
    value && typeof value === "object" && "systems" in value
      ? (value as Partial<SettingsExport>).systems
      : value;

  if (!Array.isArray(systemsValue)) {
    throw new Error("Choose a Wake Up Support settings JSON file.");
  }

  return systemsValue.map(validateImportedSystem);
}

function getFormSystem(): Omit<SystemEntry, "id"> {
  return {
    name: nameInput.value.trim(),
    macAddress: formatMac(macInput.value),
    broadcastAddress: broadcastInput.value.trim(),
    port: Number(portInput.value),
  };
}

function resetForm() {
  editingIdInput.value = "";
  nameInput.value = "";
  macInput.value = "";
  broadcastInput.value = DEFAULT_BROADCAST;
  portInput.value = "9";
  systemModalTitle.textContent = "Add System";
  saveSystemBtn.textContent = "Add System";
}

function openSystemModal() {
  systemModal.showModal();
  requestAnimationFrame(() => nameInput.focus());
}

function closeSystemModal() {
  systemModal.close();
  resetForm();
}

function showAlert(
  message: string,
  type: "success" | "error" | "info" = "info",
) {
  alertBox.className =
    "alert fixed top-3 left-1/2 z-50 max-w-[min(92vw,720px)] -translate-x-1/2 shadow-lg";
  alertBox.classList.add(
    type === "success"
      ? "alert-success"
      : type === "error"
        ? "alert-error"
        : "alert-info",
  );
  alertText.textContent = message;

  window.setTimeout(() => {
    alertBox.classList.add("hidden");
  }, 3500);
}

function render() {
  systems.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
  systemsTable.innerHTML = "";

  for (const system of systems) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td class="font-semibold">${escapeHtml(system.name)}</td>
            <td class="font-mono">${escapeHtml(system.macAddress)}</td>
            <td class="font-mono">${escapeHtml(system.broadcastAddress)}</td>
            <td>${system.port}</td>
            <td>
                <div class="flex justify-end gap-2">
                    <button class="btn btn-primary btn-xs wake-one" data-id="${system.id}">Wake</button>
                    <button class="btn btn-square btn-outline btn-xs edit-one" data-id="${system.id}" title="Edit" aria-label="Edit">
                        <svg aria-hidden="true" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4Z" />
                        </svg>
                    </button>
                    <button class="btn btn-square btn-error btn-xs delete-one" data-id="${system.id}" title="Delete" aria-label="Delete">
                        <svg aria-hidden="true" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                        </svg>
                    </button>
                </div>
            </td>
        `;
    systemsTable.appendChild(tr);
  }

  emptyState.classList.toggle("hidden", systems.length > 0);
}

function escapeHtml(value: string) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function renderLog() {
  logList.innerHTML = "";

  if (logEntries.length === 0) {
    const emptyLog = document.createElement("div");
    emptyLog.className = "py-8 text-center text-base-content/70";
    emptyLog.textContent = "No wake logs yet.";
    logList.appendChild(emptyLog);
    return;
  }

  for (const entry of logEntries) {
    const item = document.createElement("div");
    item.className = `rounded border p-2 ${entry.ok ? "border-success/40 bg-success/10" : "border-error/40 bg-error/10"}`;
    item.textContent = `${entry.time} - ${entry.message}`;
    logList.appendChild(item);
  }
}

function addLog(result: WakeResult) {
  logEntries = [
    {
      ...result,
      time: new Date().toLocaleTimeString(),
    },
    ...logEntries,
  ].slice(0, MAX_LOG_ENTRIES);

  saveLogs();
  renderLog();
}

function exportSettings() {
  const settings: SettingsExport = {
    app: "wake-up-support",
    version: 1,
    exportedAt: new Date().toISOString(),
    systems,
  };
  const blob = new Blob([JSON.stringify(settings, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `wake-up-support-settings-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showAlert(`Exported ${systems.length} system(s).`, "success");
}

async function importSettings(file: File) {
  try {
    const importedSystems = getImportedSystems(JSON.parse(await file.text()));
    const confirmed =
      systems.length === 0 ||
      confirm(
        `Import ${importedSystems.length} system(s)? This will replace your current list.`,
      );

    if (!confirmed) return;

    systems = importedSystems;
    saveSystems();
    render();
    showAlert(`Imported ${systems.length} system(s).`, "success");
  } catch (err) {
    showAlert(err instanceof Error ? err.message : String(err), "error");
  } finally {
    importSettingsInput.value = "";
  }
}

async function wakeEntries(
  entries: SystemEntry[],
  wakeButtons: HTMLButtonElement[] = [],
) {
  if (entries.length === 0) {
    showAlert("Add a system first.", "error");
    return;
  }

  wakeButtons.forEach((button) => (button.disabled = true));
  try {
    const results = await window.api.wakeSystems(entries);
    results.forEach(addLog);
    const failures = results.filter((result) => !result.ok);
    showAlert(
      failures.length === 0
        ? `Sent wake signal to ${results.length} system(s).`
        : `Sent ${results.length - failures.length}, failed ${failures.length}.`,
      failures.length === 0 ? "success" : "error",
    );
  } catch (err) {
    showAlert(err instanceof Error ? err.message : String(err), "error");
  } finally {
    wakeButtons.forEach((button) => (button.disabled = false));
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formSystem = getFormSystem();
  const validationError = validateSystem(formSystem);
  if (validationError) {
    showAlert(validationError, "error");
    return;
  }

  const editingId = editingIdInput.value;
  if (editingId) {
    systems = systems.map((system) =>
      system.id === editingId ? { ...formSystem, id: editingId } : system,
    );
    showAlert("System updated.", "success");
  } else {
    const id = crypto.randomUUID();
    systems.push({ ...formSystem, id });
    showAlert("System added.", "success");
  }

  saveSystems();
  resetForm();
  systemModal.close();
  render();
});

addSystemBtn.addEventListener("click", () => {
  resetForm();
  openSystemModal();
});
showLogBtn.addEventListener("click", () => logModal.showModal());
exportSettingsBtn.addEventListener("click", exportSettings);
importSettingsBtn.addEventListener("click", () => importSettingsInput.click());
importSettingsInput.addEventListener("change", () => {
  const file = importSettingsInput.files?.[0];
  if (file) {
    importSettings(file);
  }
});
cancelEditBtn.addEventListener("click", closeSystemModal);
systemModal.addEventListener("cancel", () => resetForm());
systemModal.addEventListener("close", () => resetForm());

systemsTable.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  const system = systems.find((entry) => entry.id === id);
  if (!id || !system) return;

  if (button.classList.contains("wake-one")) {
    wakeEntries([system], [button as HTMLButtonElement]);
  }

  if (button.classList.contains("edit-one")) {
    editingIdInput.value = system.id;
    nameInput.value = system.name;
    macInput.value = system.macAddress;
    broadcastInput.value = system.broadcastAddress;
    portInput.value = String(system.port);
    systemModalTitle.textContent = "Edit System";
    saveSystemBtn.textContent = "Save Changes";
    openSystemModal();
  }

  if (button.classList.contains("delete-one")) {
    const confirmed = confirm(`Delete ${system.name}?`);
    if (!confirmed) return;

    systems = systems.filter((entry) => entry.id !== id);
    saveSystems();
    render();
    showAlert("System deleted.", "success");
  }
});

document.getElementById("clear-log-btn")!.addEventListener("click", () => {
  logEntries = [];
  saveLogs();
  renderLog();
});

const updateText = document.getElementById("update-text")!;
const updateBtn = document.getElementById("update-btn")!;
const updateDownloadBtn = document.getElementById("update-download-btn")!;
const updateDismissBtn = document.getElementById("update-dismiss-btn")!;
const updateProgress = document.getElementById(
  "update-progress",
) as HTMLProgressElement;
const updateToast = document.getElementById("update-toast")!;

window.api.onUpdateAvailable(() => {
  updateToast.classList.remove("hidden");
  updateText.textContent = "A new release is ready to download.";
  updateProgress.classList.add("hidden");
  updateBtn.classList.add("hidden");
  updateDownloadBtn.classList.remove("hidden");
  updateDismissBtn.classList.remove("hidden");
});

window.api.onUpdateProgress((p: number) => {
  updateProgress.value = p;
  updateText.textContent = `Downloading: ${p.toFixed(1)}%`;
});

window.api.onUpdateReady(() => {
  updateText.textContent = "Downloaded. Restart to install.";
  updateProgress.classList.add("hidden");
  updateBtn.classList.remove("hidden");
  updateDownloadBtn.classList.add("hidden");
  updateDismissBtn.classList.add("hidden");
});

updateDownloadBtn.addEventListener("click", () => {
  updateText.textContent = "Downloading...";
  updateProgress.value = 0;
  updateProgress.classList.remove("hidden");
  updateDownloadBtn.classList.add("hidden");
  updateDismissBtn.classList.add("hidden");
  window.api.downloadUpdate();
});
updateDismissBtn.addEventListener("click", () =>
  updateToast.classList.add("hidden"),
);
updateBtn.addEventListener("click", () => window.api.installUpdate());

const zoomContainer = document.getElementById("zoom-ui") as HTMLDivElement;
const zoomLabel = document.getElementById("zoom-level") as HTMLSpanElement;
let hideTimer: number | null = null;

function showZoom(z: number) {
  zoomLabel.textContent = `${Math.round(z * 100)}%`;
  zoomContainer.classList.remove("hidden");
  requestAnimationFrame(() => {
    zoomContainer.classList.remove("scale-90", "opacity-0");
    zoomContainer.classList.add("scale-100", "opacity-100");
  });

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    zoomContainer.classList.add("opacity-0");
    setTimeout(() => zoomContainer.classList.add("hidden"), 200);
  }, 2500);
}

document
  .getElementById("zoom-in")!
  .addEventListener("click", () => window.api.zoomIn());
document
  .getElementById("zoom-out")!
  .addEventListener("click", () => window.api.zoomOut());
window.api.onZoomChanged(showZoom);

window.addEventListener("keydown", (event) => {
  if (!event.ctrlKey && !event.metaKey) return;

  if (event.key === "=" || event.key === "+") {
    event.preventDefault();
    window.api.zoomIn();
  }
  if (event.key === "-") {
    event.preventDefault();
    window.api.zoomOut();
  }
  if (event.code === "Digit0" || event.code === "Numpad0") {
    event.preventDefault();
    window.api.zoomReset();
  }
});

resetForm();
render();
renderLog();
