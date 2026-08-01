import { execFile } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type ExecFileError = Error & {
  code?: number | string;
  killed?: boolean;
  signal?: NodeJS.Signals;
  stdout?: string;
  stderr?: string;
};

export type AjaPowerRequest = {
  name: string;
  ipmiIp: string;
  secondaryIpmiIp?: string;
  username: string;
  password: string;
};

export type AjaPowerResult = {
  name: string;
  ok: boolean;
  message: string;
};

export type AjaStatusRequest = AjaPowerRequest & {
  id: string;
};

export type AjaStatusResult = {
  id: string;
  powerStatus: "on" | "off" | "unknown" | "unreachable";
  message?: string;
};

export async function checkAjaBridgeStatus(
  request: AjaStatusRequest,
): Promise<AjaStatusResult> {
  try {
    const { output: status } = await runIpmitoolCommandWithFallback(request, [
      "chassis",
      "power",
      "status",
    ]);

    if (isPoweredOn(status)) {
      return { id: request.id, powerStatus: "on" };
    }

    if (isPoweredOff(status)) {
      return { id: request.id, powerStatus: "off" };
    }

    return {
      id: request.id,
      powerStatus: "unreachable",
      message: `Unable to read AJA power status. Details: ${status.trim()}`,
    };
  } catch (err) {
    return {
      id: request.id,
      powerStatus: "unreachable",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function powerOnAjaBridge(
  request: AjaPowerRequest,
): Promise<AjaPowerResult> {
  try {
    const { ipmiIp } = await runIpmitoolCommandWithFallback(request, [
      "chassis",
      "power",
      "on",
    ]);

    return {
      name: request.name,
      ok: true,
      message: `Power-on command sent to ${request.name} via ${ipmiIp}.`,
    };
  } catch (err) {
    return {
      name: request.name,
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function powerOffAjaBridge(
  request: AjaPowerRequest,
): Promise<AjaPowerResult> {
  try {
    const { ipmiIp } = await runIpmitoolCommandWithFallback(request, [
      "chassis",
      "power",
      "soft",
    ]);

    return {
      name: request.name,
      ok: true,
      message: `Soft shutdown command sent to ${request.name} via ${ipmiIp}.`,
    };
  } catch (err) {
    return {
      name: request.name,
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runIpmitoolCommandWithFallback(
  request: AjaPowerRequest,
  commandArgs: string[],
) {
  const ipmiIps = getIpmiIps(request);
  const failures: string[] = [];

  for (const ipmiIp of ipmiIps) {
    try {
      const output = await runIpmitoolCommand(request, commandArgs, ipmiIp);
      return { ipmiIp, output };
    } catch (err) {
      failures.push(
        `${ipmiIp}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  throw new Error(failures.join("\n"));
}

async function runIpmitoolCommand(
  request: AjaPowerRequest,
  commandArgs: string[],
  ipmiIp: string,
) {
  const ipmitoolPath = getIpmitoolPath();
  const args = [
    "-I",
    "lanplus",
    "-H",
    ipmiIp,
    "-U",
    request.username,
    "-P",
    request.password,
    ...commandArgs,
  ];

  try {
    const { stdout, stderr } = await execFileAsync(ipmitoolPath, args, {
      cwd: path.dirname(ipmitoolPath),
      windowsHide: true,
      timeout: 30000,
    });

    return `${stdout}\n${stderr}`.trim();
  } catch (err) {
    throw new Error(formatIpmitoolError(err, request.password));
  }
}

function getIpmiIps(request: AjaPowerRequest) {
  return [request.ipmiIp, request.secondaryIpmiIp]
    .map((ipmiIp) => ipmiIp?.trim())
    .filter((ipmiIp, index, ipmiIps): ipmiIp is string =>
      Boolean(ipmiIp && ipmiIps.indexOf(ipmiIp) === index),
    );
}

function isPoweredOn(output: string) {
  return /chassis power is on/i.test(output);
}

function isPoweredOff(output: string) {
  return /chassis power is off/i.test(output);
}

function formatIpmitoolError(err: unknown, password: string) {
  const passwordHint = getMaskedPasswordHint(password);

  if (!(err instanceof Error)) {
    return `${String(err)} Password used: ${passwordHint}.`;
  }

  const execError = err as ExecFileError;
  if (execError.killed || execError.signal) {
    return [
      "ipmitool command timed out after 30 seconds.",
      `Password used: ${passwordHint}.`,
      "Check the IP address, AJA IPMI network reachability, and password.",
    ].join(" ");
  }

  const details = [execError.stdout, execError.stderr]
    .filter(Boolean)
    .join("\n")
    .trim();
  const code =
    execError.code === undefined ? "" : ` Exit code: ${execError.code}.`;

  return details
    ? `ipmitool command failed.${code} Password used: ${passwordHint}. Details: ${maskPassword(details, password)}`
    : `ipmitool command failed.${code} Password used: ${passwordHint}. ${maskPassword(execError.message, password)}`;
}

function maskPassword(value: string, password: string) {
  return password ? value.split(password).join("***") : value;
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

function getIpmitoolPath() {
  const checkedCandidates = [
    path.join(
      process.resourcesPath ?? "",
      "tools",
      "abl_ipmitool",
      "ipmitool.exe",
    ),
    path.join(process.cwd(), "tools", "abl_ipmitool", "ipmitool.exe"),
  ];

  const ipmitoolPath = checkedCandidates.find(
    (candidate) => candidate && existsSync(candidate),
  );

  if (!ipmitoolPath) {
    throw new Error(
      `Bundled ipmitool.exe was not found. Add the abl_ipmitool folder to the app's tools folder and rebuild the installer. Checked: ${checkedCandidates.join("; ")}`,
    );
  }

  return ipmitoolPath;
}
