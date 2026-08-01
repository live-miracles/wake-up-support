import { execFile } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type AjaPowerRequest = {
  name: string;
  ipmiIp: string;
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
  powerStatus: "on" | "off" | "unknown";
  message?: string;
};

export async function checkAjaBridgeStatus(
  request: AjaStatusRequest,
): Promise<AjaStatusResult> {
  try {
    const status = await runIpmiPowerCommand(request, "-c");

    if (/power is on/i.test(status)) {
      return { id: request.id, powerStatus: "on" };
    }

    if (/power is off/i.test(status)) {
      return { id: request.id, powerStatus: "off" };
    }

    return {
      id: request.id,
      powerStatus: "unknown",
      message: `Unable to read AJA power status. Details: ${status.trim()}`,
    };
  } catch (err) {
    return {
      id: request.id,
      powerStatus: "unknown",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function powerOnAjaBridge(
  request: AjaPowerRequest,
): Promise<AjaPowerResult> {
  try {
    const status = await runIpmiPowerCommand(request, "-c");

    if (/power is on/i.test(status)) {
      return {
        name: request.name,
        ok: true,
        message: `${request.name} is already powered on.`,
      };
    }

    if (!/power is off/i.test(status)) {
      throw new Error(
        `Unable to read AJA power status. Details: ${status.trim()}`,
      );
    }

    await runIpmiPowerCommand(request, "-u");

    return {
      name: request.name,
      ok: true,
      message: `Power-on command sent to ${request.name}.`,
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
    const status = await runIpmiPowerCommand(request, "-c");

    if (/power is off/i.test(status)) {
      return {
        name: request.name,
        ok: true,
        message: `${request.name} is already powered off.`,
      };
    }

    if (!/power is on/i.test(status)) {
      throw new Error(
        `Unable to read AJA power status. Details: ${status.trim()}`,
      );
    }

    await runIpmiPowerCommand(request, "-s");

    return {
      name: request.name,
      ok: true,
      message: `Soft shutdown command sent to ${request.name}.`,
    };
  } catch (err) {
    return {
      name: request.name,
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runIpmiPowerCommand(
  request: AjaPowerRequest,
  powerFlag: "-c" | "-u" | "-s",
) {
  const ipmiutilPath = getIpmiutilPath();
  const { stdout, stderr } = await execFileAsync(
    ipmiutilPath,
    [
      "power",
      powerFlag,
      "-N",
      request.ipmiIp,
      "-U",
      request.username,
      "-P",
      request.password,
    ],
    {
      cwd: path.dirname(ipmiutilPath),
      windowsHide: true,
      timeout: 10000,
    },
  );

  return `${stdout}\n${stderr}`.trim();
}

function getIpmiutilPath() {
  const pathCandidates = (process.env.PATH ?? process.env.Path ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((pathEntry) => path.join(pathEntry, "ipmiutil.exe"));
  const checkedCandidates = [
    path.join(process.resourcesPath ?? "", "tools", "ipmiutil.exe"),
    path.join(process.cwd(), "tools", "ipmiutil.exe"),
    path.join("C:", "Program Files", "ipmiutil", "ipmiutil.exe"),
    path.join("C:", "Program Files (x86)", "ipmiutil", "ipmiutil.exe"),
    ...pathCandidates,
  ];

  const ipmiutilPath = checkedCandidates.find(
    (candidate) => candidate && existsSync(candidate),
  );

  if (!ipmiutilPath) {
    throw new Error(
      `ipmiutil.exe was not found. Add it to the app's tools folder before building the installer, or install ipmiutil and add it to PATH. Checked: ${checkedCandidates.join("; ")}`,
    );
  }

  return ipmiutilPath;
}
