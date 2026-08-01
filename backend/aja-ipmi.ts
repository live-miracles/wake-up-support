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
  const bundledCandidates = [
    path.join(process.resourcesPath ?? "", "tools", "ipmiutil.exe"),
    path.join(process.cwd(), "tools", "ipmiutil.exe"),
  ];

  const bundledPath = bundledCandidates.find(
    (candidate) => candidate && existsSync(candidate),
  );

  if (!bundledPath) {
    throw new Error(
      "Bundled ipmiutil.exe was not found. Add it to the app's tools folder and rebuild the installer.",
    );
  }

  return bundledPath;
}
