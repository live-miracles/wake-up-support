type SystemEntry = {
  id: string;
  name: string;
  macAddress: string;
  ipAddress?: string;
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

type SystemStatus = "online" | "offline" | "unknown" | "checking";

type SystemStatusResult = {
  id: string;
  ipStatus: SystemStatus;
  macStatus: SystemStatus;
  actualMacForIp?: string;
  ipsForMac: string[];
};

type NetworkScanDevice = {
  ipAddress: string;
  macAddress: string;
  name?: string;
};

type NetworkScanResult = {
  subnet: string;
  localIp: string;
  devices: NetworkScanDevice[];
};

type SettingsExport = {
  app: "wake-up-support";
  version: 1;
  exportedAt: string;
  systems: SystemEntry[];
};

type SystemField =
  | "name"
  | "macAddress"
  | "ipAddress"
  | "broadcastAddress"
  | "port";

type ValidationResult = {
  message: string;
  fields: SystemField[];
};

type Api = {
  wakeSystems: (requests: SystemEntry[]) => Promise<WakeResult[]>;
  checkSystemStatuses: (
    systems: Pick<SystemEntry, "id" | "macAddress" | "ipAddress">[],
  ) => Promise<SystemStatusResult[]>;
  scanLocalNetwork: () => Promise<NetworkScanResult>;
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
const DELETE_ANIMATION_MS = 420;

const systemModal = document.getElementById(
  "system-modal",
) as HTMLDialogElement;
const logModal = document.getElementById("log-modal") as HTMLDialogElement;
const scanModal = document.getElementById("scan-modal") as HTMLDialogElement;
const systemModalTitle = document.getElementById("system-modal-title")!;
const addSystemBtn = document.getElementById(
  "add-system-btn",
) as HTMLButtonElement;
const showLogBtn = document.getElementById("show-log-btn") as HTMLButtonElement;
const scanNetworkBtn = document.getElementById(
  "scan-network-btn",
) as HTMLButtonElement;
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
const ipInput = document.getElementById("ip-input") as HTMLInputElement;
const broadcastInput = document.getElementById(
  "broadcast-input",
) as HTMLInputElement;
const portInput = document.getElementById("port-input") as HTMLInputElement;
const systemFormError = document.getElementById("system-form-error")!;
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
const scanSummary = document.getElementById("scan-summary")!;
const scanWarningReport = document.getElementById("scan-warning-report")!;
const scanTable = document.getElementById(
  "scan-table",
) as HTMLTableSectionElement;
const scanEmptyState = document.getElementById("scan-empty-state")!;
const alertBox = document.getElementById("alert")!;
const alertText = document.getElementById("alert-text")!;

let systems = loadSystems();
let logEntries: LogEntry[] = loadLogs();
const systemStatuses = new Map<string, SystemStatusResult>();
const successTimers = new WeakMap<HTMLElement, number>();
let statusCheckInProgress = false;

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

function isIpv4Address(value: string) {
  const parts = value.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) return false;
      const octet = Number(part);
      return octet >= 0 && octet <= 255;
    })
  );
}

function validateSystem(
  system: Omit<SystemEntry, "id">,
): ValidationResult | null {
  if (!system.name.trim()) {
    return { message: "Enter a system name.", fields: ["name"] };
  }
  if (!/^[0-9A-F]{12}$/.test(normalizeMac(system.macAddress))) {
    return {
      message: "Enter a valid 12-digit MAC address.",
      fields: ["macAddress"],
    };
  }
  if (system.ipAddress && !isIpv4Address(system.ipAddress)) {
    return { message: "Enter a valid IPv4 address.", fields: ["ipAddress"] };
  }
  if (!isIpv4Address(system.broadcastAddress)) {
    return {
      message: "Enter a valid IPv4 broadcast address.",
      fields: ["broadcastAddress"],
    };
  }
  if (
    !Number.isInteger(system.port) ||
    system.port < 1 ||
    system.port > 65535
  ) {
    return {
      message: "Enter a valid UDP port between 1 and 65535.",
      fields: ["port"],
    };
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
    ipAddress:
      typeof system.ipAddress === "string" ? system.ipAddress.trim() : "",
    broadcastAddress:
      typeof system.broadcastAddress === "string"
        ? system.broadcastAddress.trim()
        : "",
    port: Number(system.port),
  };
  const validationError = validateSystem(importedSystem);

  if (validationError) {
    throw new Error(`System ${index + 1}: ${validationError.message}`);
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
    ipAddress: ipInput.value.trim() || undefined,
    broadcastAddress: broadcastInput.value.trim(),
    port: Number(portInput.value),
  };
}

function getSystemFieldInput(field: SystemField) {
  return {
    name: nameInput,
    macAddress: macInput,
    ipAddress: ipInput,
    broadcastAddress: broadcastInput,
    port: portInput,
  }[field];
}

function clearSystemFormValidation() {
  systemFormError.classList.add("hidden");
  systemFormError.textContent = "";

  ([nameInput, macInput, ipInput, broadcastInput, portInput] as const).forEach(
    (input) => {
      input.classList.remove("input-error");
      input.removeAttribute("aria-invalid");
    },
  );
}

function showSystemFormValidationError(validationError: ValidationResult) {
  clearSystemFormValidation();
  systemFormError.textContent = validationError.message;
  systemFormError.classList.remove("hidden");

  validationError.fields.forEach((field) => {
    const input = getSystemFieldInput(field);
    input.classList.add("input-error");
    input.setAttribute("aria-invalid", "true");
  });

  getSystemFieldInput(validationError.fields[0]).focus();
}

function resetForm() {
  editingIdInput.value = "";
  nameInput.value = "";
  macInput.value = "";
  ipInput.value = "";
  broadcastInput.value = DEFAULT_BROADCAST;
  portInput.value = "9";
  systemModalTitle.textContent = "Add System";
  saveSystemBtn.textContent = "Add System";
  saveSystemBtn.disabled = false;
  cancelEditBtn.disabled = false;
  clearSystemFormValidation();
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
  durationMs = 3500,
) {
  alertBox.className =
    "alert fixed top-6 left-1/2 z-50 max-w-[min(92vw,720px)] -translate-x-1/2 shadow-lg";
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
  }, durationMs);
}

function render() {
  systemsTable.innerHTML = "";

  for (const [index, system] of systems.entries()) {
    const status = systemStatuses.get(system.id);
    const macStatus = status?.macStatus ?? "unknown";
    const ipStatus = status?.ipStatus ?? "unknown";
    const warningText = getMappingWarnings(system, status).join(". ");
    const escapedWarningText = escapeHtml(warningText);
    const ipTextClass = warningText ? "text-warning" : "";
    const tr = document.createElement("tr");
    tr.className = "transition-all duration-500 ease-out";
    tr.dataset.id = system.id;
    tr.innerHTML = `
            <td class="text-base-content/60">${index + 1}</td>
            <td class="font-semibold">${escapeHtml(system.name)}</td>
            <td>
                <div class="flex items-center gap-2 font-mono">
                    <span class="${getMacStatusDotClass(macStatus)}" title="${getMacStatusText(macStatus)}" aria-label="${getMacStatusText(macStatus)}"></span>
                    <span>${escapeHtml(system.macAddress)}</span>
                </div>
            </td>
            <td>
                <div class="flex items-center gap-2 font-mono" title="${escapedWarningText}">
                    <span class="${getIpStatusDotClass(ipStatus, system)}" title="${getIpStatusText(ipStatus, system)}" aria-label="${getIpStatusText(ipStatus, system)}"></span>
                    <span class="${ipTextClass}">${escapeHtml(system.ipAddress || "-")}</span>
                    ${
                      warningText
                        ? `<svg aria-hidden="true" class="h-4 w-4 shrink-0 text-warning" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                            <path d="M12 9v4" />
                            <path d="M12 17h.01" />
                        </svg>
                        <span class="sr-only">${escapedWarningText}</span>`
                        : ""
                    }
                </div>
            </td>
            <td class="font-mono">${escapeHtml(system.broadcastAddress)}</td>
            <td>${system.port}</td>
            <td>
                <div class="flex justify-end gap-2">
                    <span class="wake-success invisible flex h-6 w-4 items-center justify-center text-success" aria-hidden="true">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" viewBox="0 0 24 24">
                            <path d="m20 6-11 11-5-5" />
                        </svg>
                    </span>
                    <span class="flex gap-0.5">
                        <button class="btn btn-square btn-ghost btn-xs move-up" data-id="${system.id}" title="Move up" aria-label="Move up" ${index === 0 ? "disabled" : ""}>
                            <svg aria-hidden="true" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                <path d="m18 15-6-6-6 6" />
                            </svg>
                        </button>
                        <button class="btn btn-square btn-ghost btn-xs move-down" data-id="${system.id}" title="Move down" aria-label="Move down" ${index === systems.length - 1 ? "disabled" : ""}>
                            <svg aria-hidden="true" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </button>
                    </span>
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

function getStatusDotBaseClass(status: SystemStatus) {
  const colorClass =
    status === "online"
      ? "bg-primary"
      : status === "offline"
        ? "bg-error"
        : "bg-base-content/30";

  return `block h-3 w-3 shrink-0 rounded-full ${colorClass}`;
}

function getMacStatusDotClass(status: SystemStatus) {
  return getStatusDotBaseClass(status);
}

function getIpStatusDotClass(status: SystemStatus, system: SystemEntry) {
  if (!system.ipAddress) {
    return "invisible block h-3 w-3 shrink-0 rounded-full";
  }

  return getStatusDotBaseClass(status);
}

function getMacStatusText(status: SystemStatus) {
  if (status === "checking") return "Checking MAC status";
  if (status === "online") return "MAC found on local network";
  if (status === "offline") return "MAC not found on local network";
  return "MAC status unknown";
}

function getIpStatusText(status: SystemStatus, system: SystemEntry) {
  if (!system.ipAddress) return "No IP address set";
  if (status === "checking") return "Checking status";
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  return "Status unknown";
}

function getMappingWarnings(
  system: SystemEntry,
  status: SystemStatusResult | undefined,
) {
  if (!status) return [];

  const warnings: string[] = [];
  const normalizedMac = normalizeMac(system.macAddress);
  const actualMac = status.actualMacForIp
    ? normalizeMac(status.actualMacForIp)
    : "";
  const otherIps = status.ipsForMac.filter((ip) => ip !== system.ipAddress);

  if (system.ipAddress && actualMac && actualMac !== normalizedMac) {
    warnings.push(
      `IP ${system.ipAddress} is assigned to MAC ${status.actualMacForIp}`,
    );
  }

  if (otherIps.length > 0) {
    warnings.push(
      `MAC ${system.macAddress} also appears at IP ${otherIps.join(", ")}`,
    );
  }

  return warnings;
}

function isScanDeviceAdded(device: NetworkScanDevice) {
  const normalizedDeviceMac = normalizeMac(device.macAddress);

  return systems.some(
    (system) =>
      normalizeMac(system.macAddress) === normalizedDeviceMac &&
      system.ipAddress === device.ipAddress,
  );
}

function getBroadcastAddress(ipAddress: string) {
  const parts = ipAddress.split(".");
  return parts.length === 4
    ? `${parts.slice(0, 3).join(".")}.255`
    : DEFAULT_BROADCAST;
}

function renderScanResults(result: NetworkScanResult) {
  scanSummary.textContent = `Local IP ${result.localIp}, scanned ${result.subnet}. Found ${result.devices.length} device(s).`;
  scanTable.innerHTML = "";

  for (const [index, device] of result.devices.entries()) {
    const tr = document.createElement("tr");
    const added = isScanDeviceAdded(device);

    tr.innerHTML = `
            <td class="text-base-content/60">${index + 1}</td>
            <td class="font-mono">${escapeHtml(device.ipAddress)}</td>
            <td class="font-mono">${escapeHtml(device.macAddress)}</td>
            <td>${escapeHtml(device.name || "-")}</td>
            <td>
                ${
                  added
                    ? ""
                    : `<button class="btn btn-outline btn-xs add-scanned-device" data-ip="${escapeHtml(device.ipAddress)}" data-mac="${escapeHtml(device.macAddress)}" data-name="${escapeHtml(device.name || "")}" title="Add system">Add</button>`
                }
            </td>
        `;
    scanTable.appendChild(tr);
  }

  scanEmptyState.classList.toggle("hidden", result.devices.length > 0);
}

function renderScanWarnings(warnings: string[]) {
  scanWarningReport.innerHTML = "";
  scanWarningReport.classList.toggle("hidden", warnings.length === 0);

  if (warnings.length === 0) return;

  const title = document.createElement("div");
  title.className = "mb-2 font-semibold text-warning";
  title.textContent = `Mapping warning${warnings.length === 1 ? "" : "s"}`;
  scanWarningReport.appendChild(title);

  const list = document.createElement("ul");
  list.className = "list-disc space-y-1 pl-5";

  for (const warning of warnings) {
    const item = document.createElement("li");
    item.textContent = warning;
    list.appendChild(item);
  }

  scanWarningReport.appendChild(list);
}

function renderScanLoading() {
  scanSummary.innerHTML =
    '<span class="loading loading-spinner loading-sm text-primary"></span>';
  scanWarningReport.classList.add("hidden");
  scanWarningReport.innerHTML = "";
  scanTable.innerHTML = "";
  scanEmptyState.classList.add("hidden");
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

function showInlineSuccess(successIcon: HTMLElement, durationMs = 1000) {
  const existingTimer = successTimers.get(successIcon);
  if (existingTimer) clearTimeout(existingTimer);

  successIcon.classList.remove("invisible");
  successTimers.set(
    successIcon,
    window.setTimeout(() => {
      successIcon.classList.add("invisible");
      successTimers.delete(successIcon);
    }, durationMs),
  );
}

function showWakeSuccess(button: HTMLButtonElement) {
  const successIcon = button.parentElement?.querySelector(
    ".wake-success",
  ) as HTMLElement | null;

  if (successIcon) showInlineSuccess(successIcon);
}

function moveSystem(id: string, direction: -1 | 1) {
  const currentIndex = systems.findIndex((system) => system.id === id);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= systems.length) {
    return;
  }

  const [system] = systems.splice(currentIndex, 1);
  systems.splice(nextIndex, 0, system);
  saveSystems();
  render();
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
    systemStatuses.clear();
    saveSystems();
    render();
    refreshStatuses();
    showAlert(`Imported ${systems.length} system(s).`, "success");
  } catch (err) {
    showAlert(err instanceof Error ? err.message : String(err), "error");
  } finally {
    importSettingsInput.value = "";
  }
}

async function scanLocalNetwork() {
  scanNetworkBtn.disabled = true;
  scanNetworkBtn.textContent = "Scanning";
  renderScanLoading();
  scanModal.showModal();

  try {
    const result = await window.api.scanLocalNetwork();
    renderScanResults(result);
    const warnings = await refreshStatuses();
    renderScanWarnings(warnings);
  } catch (err) {
    scanSummary.textContent = "";
    renderScanWarnings([]);
    scanEmptyState.classList.remove("hidden");
    showAlert(err instanceof Error ? err.message : String(err), "error");
  } finally {
    scanNetworkBtn.disabled = false;
    scanNetworkBtn.textContent = "Scan";
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
    window.setTimeout(refreshStatuses, 5000);
    const failures = results.filter((result) => !result.ok);

    if (failures.length === 0 && wakeButtons.length > 0) {
      wakeButtons.forEach(showWakeSuccess);
      return;
    }

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
    showSystemFormValidationError(validationError);
    return;
  }

  const editingId = editingIdInput.value;
  if (editingId) {
    systems = systems.map((system) =>
      system.id === editingId ? { ...formSystem, id: editingId } : system,
    );
  } else {
    const id = crypto.randomUUID();
    systems.push({ ...formSystem, id });
  }

  saveSystems();
  closeSystemModal();
  render();
  refreshStatuses();
});

addSystemBtn.addEventListener("click", () => {
  resetForm();
  openSystemModal();
});
showLogBtn.addEventListener("click", () => logModal.showModal());
scanNetworkBtn.addEventListener("click", scanLocalNetwork);
exportSettingsBtn.addEventListener("click", exportSettings);
importSettingsBtn.addEventListener("click", () => importSettingsInput.click());
importSettingsInput.addEventListener("change", () => {
  const file = importSettingsInput.files?.[0];
  if (file) {
    importSettings(file);
  }
});
([nameInput, macInput, ipInput, broadcastInput, portInput] as const).forEach(
  (input) => input.addEventListener("input", clearSystemFormValidation),
);
cancelEditBtn.addEventListener("click", closeSystemModal);
systemModal.addEventListener("cancel", () => resetForm());
systemModal.addEventListener("close", () => resetForm());

scanTable.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest(
    "button.add-scanned-device",
  ) as HTMLButtonElement | null;

  if (!button) return;

  editingIdInput.value = "";
  nameInput.value = button.dataset.name || "";
  macInput.value = button.dataset.mac ?? "";
  ipInput.value = button.dataset.ip ?? "";
  broadcastInput.value = getBroadcastAddress(button.dataset.ip ?? "");
  portInput.value = "9";
  systemModalTitle.textContent = "Add System";
  saveSystemBtn.textContent = "Add System";
  scanModal.close();
  openSystemModal();
});

systemsTable.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  const system = systems.find((entry) => entry.id === id);
  if (!id || !system) return;

  if (button.classList.contains("move-up")) {
    moveSystem(id, -1);
  }

  if (button.classList.contains("move-down")) {
    moveSystem(id, 1);
  }

  if (button.classList.contains("wake-one")) {
    wakeEntries([system], [button as HTMLButtonElement]);
  }

  if (button.classList.contains("edit-one")) {
    editingIdInput.value = system.id;
    nameInput.value = system.name;
    macInput.value = system.macAddress;
    ipInput.value = system.ipAddress ?? "";
    broadcastInput.value = system.broadcastAddress;
    portInput.value = String(system.port);
    systemModalTitle.textContent = "Edit System";
    saveSystemBtn.textContent = "Save Changes";
    openSystemModal();
  }

  if (button.classList.contains("delete-one")) {
    const confirmed = confirm(`Delete ${system.name}?`);
    if (!confirmed) return;

    const row = button.closest("tr") as HTMLTableRowElement | null;
    const removeSystem = () => {
      systems = systems.filter((entry) => entry.id !== id);
      systemStatuses.delete(id);
      saveSystems();
      render();
    };

    if (!row) {
      removeSystem();
      return;
    }

    row.querySelectorAll("button").forEach((rowButton) => {
      rowButton.disabled = true;
    });
    row.classList.add("system-row-removing");
    window.setTimeout(removeSystem, DELETE_ANIMATION_MS);
  }
});

document.getElementById("clear-log-btn")!.addEventListener("click", () => {
  logEntries = [];
  saveLogs();
  renderLog();
});

async function refreshStatuses(showResultAlert = false): Promise<string[]> {
  if (statusCheckInProgress) return [];

  if (systems.length === 0) {
    systemStatuses.clear();
    render();
    return [];
  }

  statusCheckInProgress = true;
  systems.forEach((system) => {
    const currentStatus = systemStatuses.get(system.id);
    systemStatuses.set(system.id, {
      id: system.id,
      ipStatus: system.ipAddress ? "checking" : "unknown",
      macStatus: "checking",
      actualMacForIp: currentStatus?.actualMacForIp,
      ipsForMac: currentStatus?.ipsForMac ?? [],
    });
  });
  render();

  try {
    const results = await window.api.checkSystemStatuses(
      systems.map(({ id, macAddress, ipAddress }) => ({
        id,
        macAddress,
        ipAddress,
      })),
    );

    results.forEach((result) => systemStatuses.set(result.id, result));
    render();
    const warningDetails = getMappingWarningDetails(results);

    if (showResultAlert) {
      showAlert(
        warningDetails.length === 0
          ? "IP and MAC mappings checked."
          : `Found ${warningDetails.length} mapping warning(s):\n${warningDetails.join("\n")}`,
        warningDetails.length === 0 ? "success" : "error",
        warningDetails.length === 0 ? 3500 : 12000,
      );
    }

    return warningDetails;
  } catch {
    systems.forEach((system) =>
      systemStatuses.set(system.id, {
        id: system.id,
        ipStatus: "unknown",
        macStatus: "unknown",
        ipsForMac: [],
      }),
    );
    render();
    return [];
  } finally {
    statusCheckInProgress = false;
  }
}

function getMappingWarningDetails(results: SystemStatusResult[]) {
  return results.flatMap((result) => {
    const system = systems.find((entry) => entry.id === result.id);
    if (!system) return [];

    const rowNumber = systems.findIndex((entry) => entry.id === result.id) + 1;
    const warnings = getMappingWarnings(system, result);

    return warnings.map(
      (warning) => `Row ${rowNumber} (${system.name}): ${warning}`,
    );
  });
}

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
  updateText.textContent = "";
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
  updateText.textContent = "Downloaded";
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
refreshStatuses();
window.setInterval(refreshStatuses, 10000);
