type WolSystemEntry = {
  id: string;
  type: "wol";
  name: string;
  macAddress: string;
  ipAddress?: string;
  broadcastAddress: string;
  port: number;
};

type AjaSystemEntry = {
  id: string;
  type: "aja-ipmi";
  name: string;
  ipmiIp: string;
  ipAddress?: string;
  username: string;
  password: string;
};

type SystemEntry = WolSystemEntry | AjaSystemEntry;
type SystemDraft = Omit<WolSystemEntry, "id"> | Omit<AjaSystemEntry, "id">;

export {};

type ActionResult = {
  name: string;
  macAddress?: string;
  ok: boolean;
  message: string;
};

type LogEntry = ActionResult & {
  time: string;
};

type SystemStatus = "online" | "offline" | "unknown" | "checking";
type AjaPowerStatus = "on" | "off" | "unknown" | "checking" | "unreachable";

type SystemStatusResult = {
  id: string;
  ipStatus: SystemStatus;
  macStatus: SystemStatus;
  actualMacForIp?: string;
  ipsForMac: string[];
};

type AjaStatusResult = {
  id: string;
  powerStatus: "on" | "off" | "unknown" | "unreachable";
  message?: string;
};

type AjaPowerStatusResult = Omit<AjaStatusResult, "powerStatus"> & {
  powerStatus: AjaPowerStatus;
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

type AppView = "home" | "scan" | "logs" | "docs";

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
  | "port"
  | "ipmiIp"
  | "username"
  | "password";

type SystemStatusRequest = {
  id: string;
  ipAddress?: string;
  macAddress?: string;
};

type ValidationResult = {
  message: string;
  fields: SystemField[];
};

type Api = {
  wakeSystems: (requests: WolSystemEntry[]) => Promise<ActionResult[]>;
  powerOnAja: (requests: AjaSystemEntry[]) => Promise<ActionResult[]>;
  powerOffAja: (requests: AjaSystemEntry[]) => Promise<ActionResult[]>;
  checkAjaStatuses: (requests: AjaSystemEntry[]) => Promise<AjaStatusResult[]>;
  checkSystemStatuses: (
    systems: SystemStatusRequest[],
  ) => Promise<SystemStatusResult[]>;
  scanLocalNetwork: () => Promise<NetworkScanResult>;
  openGitHub: () => void;
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
const SCAN_REPORT_STORAGE_KEY = "wake-up-support.scan-report";
const DEFAULT_BROADCAST = "192.168.154.255";
const MAX_LOG_ENTRIES = 300;
const DELETE_ANIMATION_MS = 420;

const systemModal = document.getElementById(
  "system-modal",
) as HTMLDialogElement;
const ajaModal = document.getElementById("aja-modal") as HTMLDialogElement;
const powerOffConfirmModal = document.getElementById(
  "power-off-confirm-modal",
) as HTMLDialogElement;
const deleteConfirmModal = document.getElementById(
  "delete-confirm-modal",
) as HTMLDialogElement;
const systemModalTitle = document.getElementById("system-modal-title")!;
const ajaModalTitle = document.getElementById("aja-modal-title")!;
const homeViewBtn = document.getElementById(
  "home-view-btn",
) as HTMLButtonElement;
const openGitHubBtn = document.getElementById(
  "open-github-btn",
) as HTMLButtonElement;
const showHomeBtn = document.getElementById(
  "show-home-btn",
) as HTMLButtonElement;
const showDocsBtn = document.getElementById(
  "show-docs-btn",
) as HTMLButtonElement;
const addSystemBtn = document.getElementById(
  "add-system-btn",
) as HTMLButtonElement;
const addAjaBtn = document.getElementById("add-aja-btn") as HTMLButtonElement;
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
const ajaForm = document.getElementById("aja-form") as HTMLFormElement;
const editingAjaIdInput = document.getElementById(
  "editing-aja-id",
) as HTMLInputElement;
const ajaNameInput = document.getElementById(
  "aja-name-input",
) as HTMLInputElement;
const ipmiIpInput = document.getElementById(
  "ipmi-ip-input",
) as HTMLInputElement;
const ajaIpInput = document.getElementById("aja-ip-input") as HTMLInputElement;
const ipmiUserInput = document.getElementById(
  "ipmi-user-input",
) as HTMLInputElement;
const ipmiPassInput = document.getElementById(
  "ipmi-pass-input",
) as HTMLInputElement;
const toggleIpmiPassBtn = document.getElementById(
  "toggle-ipmi-pass-btn",
) as HTMLButtonElement;
const systemFormError = document.getElementById("system-form-error")!;
const ajaFormError = document.getElementById("aja-form-error")!;
const saveSystemBtn = document.getElementById(
  "save-system-btn",
) as HTMLButtonElement;
const saveAjaBtn = document.getElementById("save-aja-btn") as HTMLButtonElement;
const cancelEditBtn = document.getElementById(
  "cancel-edit-btn",
) as HTMLButtonElement;
const cancelAjaEditBtn = document.getElementById(
  "cancel-aja-edit-btn",
) as HTMLButtonElement;
const systemsTable = document.getElementById(
  "systems-table",
) as HTMLTableSectionElement;
const ajaTable = document.getElementById(
  "aja-table",
) as HTMLTableSectionElement;
const homeView = document.getElementById("home-view")!;
const scanView = document.getElementById("scan-view")!;
const logsView = document.getElementById("logs-view")!;
const docsView = document.getElementById("docs-view")!;
const wolSection = document.getElementById("wol-section")!;
const ajaSection = document.getElementById("aja-section")!;
const logList = document.getElementById("log-list")!;
const scanSummary = document.getElementById("scan-summary")!;
const scanWarningReport = document.getElementById("scan-warning-report")!;
const scanTable = document.getElementById(
  "scan-table",
) as HTMLTableSectionElement;
const scanEmptyState = document.getElementById("scan-empty-state")!;
const refreshScanBtn = document.getElementById(
  "refresh-scan-btn",
) as HTMLButtonElement;
const alertBox = document.getElementById("alert")!;
const alertText = document.getElementById("alert-text")!;
const powerOffConfirmText = document.getElementById("power-off-confirm-text")!;
const deleteConfirmText = document.getElementById("delete-confirm-text")!;

let systems = loadSystems();
let logEntries: LogEntry[] = loadLogs();
let latestScanReport = loadScanReport();
const systemStatuses = new Map<string, SystemStatusResult>();
const ajaStatuses = new Map<string, AjaPowerStatusResult>();
const successTimers = new WeakMap<HTMLElement, number>();
let statusCheckInProgress = false;
let draggedSystemId: string | null = null;
let draggedSystemType: SystemEntry["type"] | null = null;
let activeView: AppView = "home";

function loadSystems(): SystemEntry[] {
  const saved = localStorage.getItem(SYSTEMS_STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeStoredSystem)
          .filter((system): system is SystemEntry => Boolean(system))
      : [];
  } catch {
    return [];
  }
}

function isWolSystem(system: SystemEntry): system is WolSystemEntry {
  return system.type === "wol";
}

function isAjaSystem(system: SystemEntry): system is AjaSystemEntry {
  return system.type === "aja-ipmi";
}

function normalizeStoredSystem(value: unknown): SystemEntry | null {
  if (!value || typeof value !== "object") return null;
  const system = value as {
    id?: unknown;
    name?: unknown;
    type?: string;
    deviceType?: string;
    macAddress?: unknown;
    ipAddress?: unknown;
    broadcastAddress?: unknown;
    port?: unknown;
    ipmiIp?: unknown;
    secondaryIpmiIp?: unknown;
    username?: unknown;
    password?: unknown;
    ipmiUsername?: unknown;
    ipmiPassword?: unknown;
  };

  if (system.type === "aja-ipmi" || system.deviceType === "aja_bridge_live") {
    return {
      id: typeof system.id === "string" ? system.id : crypto.randomUUID(),
      type: "aja-ipmi",
      name: typeof system.name === "string" ? system.name : "",
      ipmiIp: typeof system.ipmiIp === "string" ? system.ipmiIp : "",
      ipAddress:
        typeof system.ipAddress === "string"
          ? system.ipAddress
          : typeof system.secondaryIpmiIp === "string"
            ? system.secondaryIpmiIp
            : undefined,
      username:
        typeof system.username === "string"
          ? system.username
          : typeof system.ipmiUsername === "string"
            ? system.ipmiUsername
            : "",
      password:
        typeof system.password === "string"
          ? system.password
          : typeof system.ipmiPassword === "string"
            ? system.ipmiPassword
            : "",
    };
  }

  return {
    id: typeof system.id === "string" ? system.id : crypto.randomUUID(),
    type: "wol",
    name: typeof system.name === "string" ? system.name : "",
    macAddress: typeof system.macAddress === "string" ? system.macAddress : "",
    ipAddress: typeof system.ipAddress === "string" ? system.ipAddress : "",
    broadcastAddress:
      typeof system.broadcastAddress === "string"
        ? system.broadcastAddress
        : DEFAULT_BROADCAST,
    port: Number(system.port) || 9,
  };
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

function loadScanReport(): NetworkScanResult | null {
  const saved = localStorage.getItem(SCAN_REPORT_STORAGE_KEY);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved) as Partial<NetworkScanResult>;
    if (
      typeof parsed.localIp !== "string" ||
      typeof parsed.subnet !== "string" ||
      !Array.isArray(parsed.devices)
    ) {
      return null;
    }

    return {
      localIp: parsed.localIp,
      subnet: parsed.subnet,
      devices: parsed.devices
        .filter((device): device is NetworkScanDevice =>
          Boolean(
            device &&
            typeof device.ipAddress === "string" &&
            typeof device.macAddress === "string",
          ),
        )
        .map((device) => ({
          ipAddress: device.ipAddress,
          macAddress: device.macAddress,
          name: typeof device.name === "string" ? device.name : undefined,
        })),
    };
  } catch {
    return null;
  }
}

function saveScanReport() {
  if (!latestScanReport) {
    localStorage.removeItem(SCAN_REPORT_STORAGE_KEY);
    return;
  }

  localStorage.setItem(
    SCAN_REPORT_STORAGE_KEY,
    JSON.stringify(latestScanReport),
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

function validateSystem(system: SystemDraft): ValidationResult | null {
  if (!system.name.trim()) {
    return { message: "Enter a system name.", fields: ["name"] };
  }

  if (system.type === "aja-ipmi") {
    if (!isIpv4Address(system.ipmiIp)) {
      return {
        message: "Enter a valid AJA LAN 1 IPMI IPv4 address.",
        fields: ["ipmiIp"],
      };
    }
    if (system.ipAddress && !isIpv4Address(system.ipAddress)) {
      return {
        message: "Enter a valid AJA IPv4 address.",
        fields: ["ipAddress"],
      };
    }
    if (!system.username.trim()) {
      return { message: "Enter the IPMI username.", fields: ["username"] };
    }
    if (!system.password) {
      return { message: "Enter the IPMI password.", fields: ["password"] };
    }
    return null;
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

  const normalized = normalizeStoredSystem(value);
  if (!normalized) {
    throw new Error(`System ${index + 1} is not valid.`);
  }

  const importedSystem =
    normalized.type === "aja-ipmi"
      ? {
          ...normalized,
          name: normalized.name.trim(),
          ipmiIp: normalized.ipmiIp.trim(),
          ipAddress: normalized.ipAddress?.trim() || undefined,
          username: normalized.username.trim(),
        }
      : {
          ...normalized,
          name: normalized.name.trim(),
          macAddress: formatMac(normalized.macAddress),
          ipAddress: normalized.ipAddress?.trim() || undefined,
          broadcastAddress: normalized.broadcastAddress.trim(),
          port: Number(normalized.port),
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

function getFormSystem(): SystemDraft {
  return {
    type: "wol",
    name: nameInput.value.trim(),
    macAddress: formatMac(macInput.value),
    ipAddress: ipInput.value.trim() || undefined,
    broadcastAddress: broadcastInput.value.trim(),
    port: Number(portInput.value),
  };
}

function getAjaFormSystem(): Omit<AjaSystemEntry, "id"> {
  return {
    type: "aja-ipmi",
    name: ajaNameInput.value.trim(),
    ipmiIp: ipmiIpInput.value.trim(),
    ipAddress: ajaIpInput.value.trim() || undefined,
    username: ipmiUserInput.value.trim(),
    password: ipmiPassInput.value.trim(),
  };
}

function getSystemFieldInput(field: SystemField) {
  return {
    name: nameInput,
    macAddress: macInput,
    ipAddress: ipInput,
    broadcastAddress: broadcastInput,
    port: portInput,
    ipmiIp: ipmiIpInput,
    username: ipmiUserInput,
    password: ipmiPassInput,
  }[field];
}

function getAjaFieldInput(field: SystemField) {
  return {
    name: ajaNameInput,
    macAddress: ajaNameInput,
    ipAddress: ajaIpInput,
    broadcastAddress: ipmiIpInput,
    port: ipmiIpInput,
    ipmiIp: ipmiIpInput,
    username: ipmiUserInput,
    password: ipmiPassInput,
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

function clearAjaFormValidation() {
  ajaFormError.classList.add("hidden");
  ajaFormError.textContent = "";

  (
    [
      ajaNameInput,
      ipmiIpInput,
      ajaIpInput,
      ipmiUserInput,
      ipmiPassInput,
    ] as const
  ).forEach((input) => {
    input.classList.remove("input-error");
    input.removeAttribute("aria-invalid");
  });
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

function showAjaFormValidationError(validationError: ValidationResult) {
  clearAjaFormValidation();
  ajaFormError.textContent = validationError.message;
  ajaFormError.classList.remove("hidden");

  validationError.fields.forEach((field) => {
    const input = getAjaFieldInput(field);
    input.classList.add("input-error");
    input.setAttribute("aria-invalid", "true");
  });

  getAjaFieldInput(validationError.fields[0]).focus();
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

function resetAjaForm() {
  editingAjaIdInput.value = "";
  ajaNameInput.value = "";
  ipmiIpInput.value = "";
  ajaIpInput.value = "";
  ipmiUserInput.value = "ADMIN";
  ipmiPassInput.value = "";
  ipmiPassInput.type = "password";
  toggleIpmiPassBtn.title = "Show password";
  toggleIpmiPassBtn.setAttribute("aria-label", "Show password");
  ajaModalTitle.textContent = "Add AJA Bridge Live";
  saveAjaBtn.textContent = "Add AJA";
  saveAjaBtn.disabled = false;
  cancelAjaEditBtn.disabled = false;
  clearAjaFormValidation();
}

function openSystemModal() {
  systemModal.showModal();
  requestAnimationFrame(() => nameInput.focus());
}

function closeSystemModal() {
  systemModal.close();
  resetForm();
}

function openAjaModal() {
  ajaModal.showModal();
  requestAnimationFrame(() => ajaNameInput.focus());
}

function closeAjaModal() {
  ajaModal.close();
  resetAjaForm();
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
  ajaTable.innerHTML = "";

  const ajaSystems = systems.filter(isAjaSystem);
  const wolSystems = systems.filter(isWolSystem);

  ajaSection.classList.toggle("hidden", ajaSystems.length === 0);
  wolSection.classList.toggle("hidden", wolSystems.length === 0);

  for (const [index, system] of ajaSystems.entries()) {
    const status = ajaStatuses.get(system.id);
    const powerStatus = status?.powerStatus ?? "unknown";
    const statusText = getAjaPowerStatusText(powerStatus, status?.message);
    const ipStatus = systemStatuses.get(system.id)?.ipStatus ?? "unknown";
    const tr = document.createElement("tr");
    tr.className = "transition-all duration-500 ease-out";
    tr.dataset.id = system.id;
    tr.innerHTML = `
            <td>
                <button class="drag-handle btn btn-square btn-ghost btn-xs cursor-grab active:cursor-grabbing" data-id="${system.id}" draggable="true" title="Drag to reorder" aria-label="Drag to reorder">
                    <svg aria-hidden="true" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="9" cy="6" r="1" />
                        <circle cx="9" cy="12" r="1" />
                        <circle cx="9" cy="18" r="1" />
                        <circle cx="15" cy="6" r="1" />
                        <circle cx="15" cy="12" r="1" />
                        <circle cx="15" cy="18" r="1" />
                    </svg>
                </button>
            </td>
            <td class="text-base-content/60">${index + 1}</td>
            <td class="font-semibold">${escapeHtml(system.name)}</td>
            <td>
                <div class="flex items-center gap-2 font-mono">
                    <span class="${getAjaPowerStatusDotClass(powerStatus)}" title="${escapeHtml(statusText)}" aria-label="${escapeHtml(statusText)}"></span>
                    <span>${escapeHtml(system.ipmiIp)}</span>
                </div>
            </td>
            <td>
                <div class="flex items-center gap-2 font-mono">
                    <span class="${getIpStatusDotClass(ipStatus, system)}" title="${getIpStatusText(ipStatus, system)}" aria-label="${getIpStatusText(ipStatus, system)}"></span>
                    <span>${escapeHtml(system.ipAddress || "-")}</span>
                </div>
            </td>
            <td>${escapeHtml(system.username)}</td>
            <td class="font-mono">${escapeHtml(getMaskedPasswordHint(system.password))}</td>
            <td>
                <div class="flex justify-end gap-2">
                    <span class="wake-success invisible flex h-6 w-4 items-center justify-center text-success" aria-hidden="true">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" viewBox="0 0 24 24">
                            <path d="m20 6-11 11-5-5" />
                        </svg>
                    </span>
                    <button class="btn btn-primary btn-xs power-on-aja" data-id="${system.id}">On</button>
                    <button class="btn btn-outline btn-xs power-off-aja" data-id="${system.id}">Off</button>
                    <button class="btn btn-square btn-outline btn-xs edit-aja" data-id="${system.id}" title="Edit" aria-label="Edit">
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
    ajaTable.appendChild(tr);
  }

  for (const [index, system] of wolSystems.entries()) {
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
            <td>
                <button class="drag-handle btn btn-square btn-ghost btn-xs cursor-grab active:cursor-grabbing" data-id="${system.id}" draggable="true" title="Drag to reorder" aria-label="Drag to reorder">
                    <svg aria-hidden="true" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="9" cy="6" r="1" />
                        <circle cx="9" cy="12" r="1" />
                        <circle cx="9" cy="18" r="1" />
                        <circle cx="15" cy="6" r="1" />
                        <circle cx="15" cy="12" r="1" />
                        <circle cx="15" cy="18" r="1" />
                    </svg>
                </button>
            </td>
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
            <td class="font-mono">${escapeHtml(`${system.broadcastAddress}:${system.port}`)}</td>
            <td>
                <div class="flex justify-end gap-2">
                    <span class="wake-success invisible flex h-6 w-4 items-center justify-center text-success" aria-hidden="true">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" viewBox="0 0 24 24">
                            <path d="m20 6-11 11-5-5" />
                        </svg>
                    </span>
                    <button class="btn btn-primary btn-xs wake-one" data-id="${system.id}">On</button>
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

function getAjaPowerStatusDotClass(status: AjaPowerStatus) {
  const colorClass =
    status === "on"
      ? "bg-primary"
      : status === "off" || status === "unreachable"
        ? "bg-error"
        : "bg-base-content/30";

  return `block h-3 w-3 shrink-0 rounded-full ${colorClass}`;
}

function getAjaPowerStatusText(status: AjaPowerStatus, message?: string) {
  if (status === "checking") return "Checking AJA power status";
  if (status === "on") return "Powered on";
  if (status === "off") return "Powered off";
  if (status === "unreachable") {
    return message ? `Unable to reach AJA: ${message}` : "Unable to reach AJA";
  }
  return message ? `Status unknown: ${message}` : "Power status unknown";
}

function getMaskedPasswordHint(password: string) {
  const trimmedPassword = password.trim();

  if (!trimmedPassword) {
    return "(empty)";
  }

  if (trimmedPassword.length <= 4) {
    return "...";
  }

  return `${trimmedPassword.slice(0, 2)}...${trimmedPassword.slice(-2)}`;
}

function getMacStatusDotClass(status: SystemStatus) {
  const colorClass = status === "online" ? "bg-primary" : "bg-base-content/30";

  return `block h-3 w-3 shrink-0 rounded-full ${colorClass}`;
}

function getIpStatusDotClass(
  status: SystemStatus,
  system: Pick<SystemEntry, "ipAddress">,
) {
  if (!system.ipAddress) {
    return "invisible block h-3 w-3 shrink-0 rounded-full";
  }

  return getStatusDotBaseClass(status);
}

function getMacStatusText(status: SystemStatus) {
  if (status === "checking") return "Checking whether MAC is visible";
  if (status === "online") return "MAC is visible on the local network";
  if (status === "offline") return "MAC is not visible right now";
  return "MAC visibility unknown";
}

function getIpStatusText(
  status: SystemStatus,
  system: Pick<SystemEntry, "ipAddress">,
) {
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
  if (!status || !isWolSystem(system)) return [];

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

  return systems
    .filter(isWolSystem)
    .some(
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

function showView(view: AppView) {
  activeView = view;
  homeView.classList.toggle("hidden", view !== "home");
  scanView.classList.toggle("hidden", view !== "scan");
  logsView.classList.toggle("hidden", view !== "logs");
  docsView.classList.toggle("hidden", view !== "docs");

  if (view === "scan") renderLatestScanReport();
}

function renderLatestScanReport() {
  if (!latestScanReport) {
    scanSummary.textContent = "No scan report yet.";
    scanWarningReport.classList.add("hidden");
    scanWarningReport.innerHTML = "";
    scanTable.innerHTML = "";
    scanEmptyState.textContent =
      "No scan report yet. Refresh to scan the local subnet.";
    scanEmptyState.classList.remove("hidden");
    return;
  }

  renderScanResults(latestScanReport);
  renderScanWarnings(getCurrentMappingWarnings());
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

  scanEmptyState.textContent = "No devices found on this subnet.";
  scanEmptyState.classList.toggle("hidden", result.devices.length > 0);
}

function getCurrentMappingWarnings() {
  return getMappingWarningDetails([...systemStatuses.values()]);
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

function addLog(result: ActionResult) {
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

function reorderSystemWithinType(
  draggedId: string,
  targetId: string,
  type: SystemEntry["type"],
  position: "before" | "after",
) {
  if (draggedId === targetId) return;

  const sameTypeSystems = systems.filter((entry) => entry.type === type);
  const draggedIndex = sameTypeSystems.findIndex(
    (entry) => entry.id === draggedId,
  );
  const targetIndex = sameTypeSystems.findIndex(
    (entry) => entry.id === targetId,
  );

  if (draggedIndex < 0 || targetIndex < 0) return;

  const [draggedSystem] = sameTypeSystems.splice(draggedIndex, 1);
  const adjustedTargetIndex = sameTypeSystems.findIndex(
    (entry) => entry.id === targetId,
  );
  sameTypeSystems.splice(
    position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex,
    0,
    draggedSystem,
  );

  let sameTypeIndex = 0;
  systems = systems.map((entry) =>
    entry.type === type ? sameTypeSystems[sameTypeIndex++] : entry,
  );
  saveSystems();
  render();
}

function setupDragReordering(
  tableBody: HTMLTableSectionElement,
  type: SystemEntry["type"],
) {
  tableBody.addEventListener("dragstart", (event) => {
    const target = event.target as HTMLElement;
    const handle = target.closest(".drag-handle") as HTMLElement | null;
    const row = handle?.closest("tr") as HTMLTableRowElement | null;
    const id = handle?.dataset.id;
    const system = systems.find((entry) => entry.id === id);

    if (
      !event.dataTransfer ||
      !handle ||
      !row ||
      !id ||
      system?.type !== type
    ) {
      event.preventDefault();
      return;
    }

    draggedSystemId = id;
    draggedSystemType = type;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    row.classList.add("system-row-dragging");
  });

  tableBody.addEventListener("dragover", (event) => {
    if (!draggedSystemId || draggedSystemType !== type || !event.dataTransfer) {
      return;
    }

    const row = getDragTargetRow(event.target);
    if (!row || row.dataset.id === draggedSystemId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropIndicator(row, getDropPosition(row, event));
  });

  tableBody.addEventListener("dragleave", (event) => {
    const row = getDragTargetRow(event.target);
    const relatedTarget = event.relatedTarget as Node | null;

    if (row && relatedTarget && row.contains(relatedTarget)) return;
    row?.classList.remove("system-row-drop-before", "system-row-drop-after");
  });

  tableBody.addEventListener("drop", (event) => {
    const row = getDragTargetRow(event.target);

    if (!draggedSystemId || draggedSystemType !== type || !row?.dataset.id) {
      clearDragState(tableBody);
      return;
    }

    event.preventDefault();
    reorderSystemWithinType(
      draggedSystemId,
      row.dataset.id,
      type,
      getDropPosition(row, event),
    );
    clearDragState(tableBody);
  });

  tableBody.addEventListener("dragend", () => clearDragState(tableBody));
}

function getDragTargetRow(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? (target.closest("tr[data-id]") as HTMLTableRowElement | null)
    : null;
}

function getDropPosition(row: HTMLTableRowElement, event: DragEvent) {
  const rowBounds = row.getBoundingClientRect();
  return event.clientY > rowBounds.top + rowBounds.height / 2
    ? "after"
    : "before";
}

function setDropIndicator(
  row: HTMLTableRowElement,
  position: "before" | "after",
) {
  const tableBody = row.parentElement;
  tableBody
    ?.querySelectorAll(".system-row-drop-before, .system-row-drop-after")
    .forEach((dropRow) =>
      dropRow.classList.remove(
        "system-row-drop-before",
        "system-row-drop-after",
      ),
    );
  row.classList.add(
    position === "before" ? "system-row-drop-before" : "system-row-drop-after",
  );
}

function clearDragState(tableBody: HTMLTableSectionElement) {
  draggedSystemId = null;
  draggedSystemType = null;
  tableBody
    .querySelectorAll(
      ".system-row-dragging, .system-row-drop-before, .system-row-drop-after",
    )
    .forEach((row) =>
      row.classList.remove(
        "system-row-dragging",
        "system-row-drop-before",
        "system-row-drop-after",
      ),
    );
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
    ajaStatuses.clear();
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
  showView("scan");
  refreshScanBtn.disabled = true;
  refreshScanBtn.title = "Refreshing scan";
  refreshScanBtn.setAttribute("aria-label", "Refreshing scan");
  refreshScanBtn.setAttribute("aria-busy", "true");
  renderScanLoading();

  try {
    const result = await window.api.scanLocalNetwork();
    latestScanReport = result;
    saveScanReport();
    const warnings = await refreshStatuses();
    renderScanResults(result);
    renderScanWarnings(warnings);
  } catch (err) {
    if (latestScanReport) {
      renderLatestScanReport();
      scanSummary.textContent =
        "Unable to refresh. Showing latest scan report.";
    } else {
      scanSummary.textContent = "No scan report yet.";
      renderScanWarnings([]);
      scanTable.innerHTML = "";
      scanEmptyState.textContent =
        "Refresh failed. Try again when the network is reachable.";
      scanEmptyState.classList.remove("hidden");
    }
    showAlert(err instanceof Error ? err.message : String(err), "error");
  } finally {
    refreshScanBtn.disabled = false;
    refreshScanBtn.title = "Refresh scan";
    refreshScanBtn.setAttribute("aria-label", "Refresh scan");
    refreshScanBtn.removeAttribute("aria-busy");
  }
}

async function wakeEntries(
  entries: WolSystemEntry[],
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

async function powerAjaEntries(
  entries: AjaSystemEntry[],
  action: "on" | "off",
  powerButtons: HTMLButtonElement[] = [],
) {
  if (entries.length === 0) {
    showAlert("Add an AJA IPMI device first.", "error");
    return;
  }

  powerButtons.forEach((button) => (button.disabled = true));
  try {
    const results =
      action === "on"
        ? await window.api.powerOnAja(entries)
        : await window.api.powerOffAja(entries);
    results.forEach(addLog);
    window.setTimeout(refreshStatuses, 2000);
    const failures = results.filter((result) => !result.ok);

    if (failures.length === 0 && powerButtons.length > 0) {
      powerButtons.forEach(showWakeSuccess);
      return;
    }

    showAlert(
      failures.length === 0
        ? `Sent AJA ${action === "on" ? "power-on" : "power-off"} command to ${results.length} device(s).`
        : getFailureAlertMessage(results.length, failures),
      failures.length === 0 ? "success" : "error",
      failures.length === 0 ? 3500 : 12000,
    );
  } catch (err) {
    showAlert(err instanceof Error ? err.message : String(err), "error");
  } finally {
    powerButtons.forEach((button) => (button.disabled = false));
  }
}

function getFailureAlertMessage(total: number, failures: ActionResult[]) {
  const sentCount = total - failures.length;
  const details = failures
    .map((failure) => `${failure.name}: ${failure.message}`)
    .join("\n");

  return `Sent ${sentCount}, failed ${failures.length}.\n${details}`;
}

function confirmAjaPowerOff(system: AjaSystemEntry) {
  if (powerOffConfirmModal.open) return Promise.resolve(false);

  powerOffConfirmModal.returnValue = "";
  powerOffConfirmText.textContent = `Send a power-off command to ${system.name}?`;
  powerOffConfirmModal.showModal();

  return new Promise<boolean>((resolve) => {
    powerOffConfirmModal.addEventListener(
      "close",
      () => resolve(powerOffConfirmModal.returnValue === "off"),
      { once: true },
    );
  });
}

function confirmDeleteSystem(system: SystemEntry) {
  if (deleteConfirmModal.open) return Promise.resolve(false);

  deleteConfirmModal.returnValue = "";
  deleteConfirmText.textContent = `Delete ${system.name} from Wake Up Support?`;
  deleteConfirmModal.showModal();

  return new Promise<boolean>((resolve) => {
    deleteConfirmModal.addEventListener(
      "close",
      () => resolve(deleteConfirmModal.returnValue === "delete"),
      { once: true },
    );
  });
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

ajaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formSystem = getAjaFormSystem();
  const validationError = validateSystem(formSystem);
  if (validationError) {
    showAjaFormValidationError(validationError);
    return;
  }

  const editingId = editingAjaIdInput.value;
  if (editingId) {
    systems = systems.map((system) =>
      system.id === editingId ? { ...formSystem, id: editingId } : system,
    );
  } else {
    const id = crypto.randomUUID();
    systems.push({ ...formSystem, id });
  }

  saveSystems();
  closeAjaModal();
  render();
  refreshStatuses();
});

addSystemBtn.addEventListener("click", () => {
  resetForm();
  openSystemModal();
});
addAjaBtn.addEventListener("click", () => {
  resetAjaForm();
  openAjaModal();
});
homeViewBtn.addEventListener("click", () => showView("home"));
openGitHubBtn.addEventListener("click", () => window.api.openGitHub());
showHomeBtn.addEventListener("click", () => showView("home"));
showDocsBtn.addEventListener("click", () => showView("docs"));
showLogBtn.addEventListener("click", () => showView("logs"));
scanNetworkBtn.addEventListener("click", () => showView("scan"));
refreshScanBtn.addEventListener("click", scanLocalNetwork);
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
(
  [ajaNameInput, ipmiIpInput, ajaIpInput, ipmiUserInput, ipmiPassInput] as const
).forEach((input) => input.addEventListener("input", clearAjaFormValidation));
cancelEditBtn.addEventListener("click", closeSystemModal);
cancelAjaEditBtn.addEventListener("click", closeAjaModal);
toggleIpmiPassBtn.addEventListener("click", () => {
  const showingPassword = ipmiPassInput.type === "text";
  ipmiPassInput.type = showingPassword ? "password" : "text";
  toggleIpmiPassBtn.title = showingPassword ? "Show password" : "Hide password";
  toggleIpmiPassBtn.setAttribute(
    "aria-label",
    showingPassword ? "Show password" : "Hide password",
  );
});
systemModal.addEventListener("cancel", () => resetForm());
systemModal.addEventListener("close", () => resetForm());
ajaModal.addEventListener("cancel", () => resetAjaForm());
ajaModal.addEventListener("close", () => resetAjaForm());

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
  openSystemModal();
});

setupDragReordering(ajaTable, "aja-ipmi");
setupDragReordering(systemsTable, "wol");

systemsTable.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  const system = systems.find((entry) => entry.id === id);
  if (!id || !system) return;

  if (button.classList.contains("wake-one") && isWolSystem(system)) {
    wakeEntries([system], [button as HTMLButtonElement]);
  }

  if (button.classList.contains("edit-one") && isWolSystem(system)) {
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
    const confirmed = await confirmDeleteSystem(system);
    if (!confirmed) return;

    const row = button.closest("tr") as HTMLTableRowElement | null;
    const removeSystem = () => {
      systems = systems.filter((entry) => entry.id !== id);
      systemStatuses.delete(id);
      ajaStatuses.delete(id);
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

ajaTable.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  const system = systems.find((entry) => entry.id === id);
  if (!id || !system || !isAjaSystem(system)) return;

  if (button.classList.contains("power-on-aja")) {
    powerAjaEntries([system], "on", [button as HTMLButtonElement]);
  }

  if (button.classList.contains("power-off-aja")) {
    const confirmed = await confirmAjaPowerOff(system);
    if (!confirmed) return;

    powerAjaEntries([system], "off", [button as HTMLButtonElement]);
  }

  if (button.classList.contains("edit-aja")) {
    editingAjaIdInput.value = system.id;
    ajaNameInput.value = system.name;
    ipmiIpInput.value = system.ipmiIp;
    ajaIpInput.value = system.ipAddress ?? "";
    ipmiUserInput.value = system.username;
    ipmiPassInput.value = system.password;
    ajaModalTitle.textContent = "Edit AJA Bridge Live";
    saveAjaBtn.textContent = "Save Changes";
    openAjaModal();
  }

  if (button.classList.contains("delete-one")) {
    const confirmed = await confirmDeleteSystem(system);
    if (!confirmed) return;

    const row = button.closest("tr") as HTMLTableRowElement | null;
    const removeSystem = () => {
      systems = systems.filter((entry) => entry.id !== id);
      ajaStatuses.delete(id);
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

  const wolSystems = systems.filter(isWolSystem);
  const ajaSystems = systems.filter(isAjaSystem);

  if (wolSystems.length === 0 && ajaSystems.length === 0) {
    systemStatuses.clear();
    ajaStatuses.clear();
    render();
    return [];
  }

  statusCheckInProgress = true;
  wolSystems.forEach((system) => {
    const currentStatus = systemStatuses.get(system.id);
    systemStatuses.set(system.id, {
      id: system.id,
      ipStatus: system.ipAddress
        ? (currentStatus?.ipStatus ?? "checking")
        : "unknown",
      macStatus: currentStatus?.macStatus ?? "checking",
      actualMacForIp: currentStatus?.actualMacForIp,
      ipsForMac: currentStatus?.ipsForMac ?? [],
    });
  });
  ajaSystems.forEach((system) => {
    const currentIpStatus = systemStatuses.get(system.id);
    const currentStatus = ajaStatuses.get(system.id);
    systemStatuses.set(system.id, {
      id: system.id,
      ipStatus: system.ipAddress
        ? (currentIpStatus?.ipStatus ?? "checking")
        : "unknown",
      macStatus: "unknown",
      ipsForMac: [],
    });
    ajaStatuses.set(system.id, {
      id: system.id,
      powerStatus: currentStatus?.powerStatus ?? "checking",
      message: currentStatus?.message,
    });
  });
  render();

  let warningDetails: string[] = [];

  try {
    const statusRequests: SystemStatusRequest[] = [
      ...wolSystems.map(({ id, macAddress, ipAddress }) => ({
        id,
        macAddress,
        ipAddress,
      })),
      ...ajaSystems.map(({ id, ipAddress }) => ({ id, ipAddress })),
    ];

    const [statusResults, ajaResults] = await Promise.all([
      statusRequests.length > 0
        ? window.api.checkSystemStatuses(statusRequests)
        : Promise.resolve([]),
      ajaSystems.length > 0
        ? window.api.checkAjaStatuses(ajaSystems)
        : Promise.resolve([]),
    ]);

    statusResults.forEach((result) => systemStatuses.set(result.id, result));
    ajaResults.forEach((result) => ajaStatuses.set(result.id, result));
    render();
    warningDetails = getMappingWarningDetails(statusResults);

    if (activeView === "scan" && latestScanReport) {
      renderScanResults(latestScanReport);
      renderScanWarnings(warningDetails);
    }

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
    wolSystems.forEach((system) =>
      systemStatuses.set(system.id, {
        id: system.id,
        ipStatus: system.ipAddress ? "offline" : "unknown",
        macStatus: "offline",
        ipsForMac: [],
      }),
    );
    ajaSystems.forEach((system) => {
      systemStatuses.set(system.id, {
        id: system.id,
        ipStatus: system.ipAddress ? "offline" : "unknown",
        macStatus: "unknown",
        ipsForMac: [],
      });
      ajaStatuses.set(system.id, {
        id: system.id,
        powerStatus: "unreachable",
      });
    });
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
resetAjaForm();
render();
renderLog();
refreshStatuses();
window.setInterval(refreshStatuses, 10000);
