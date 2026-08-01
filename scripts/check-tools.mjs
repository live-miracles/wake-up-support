import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const requiredTools = [
  path.join("tools", "abl_ipmitool", "ipmitool.exe"),
  path.join("tools", "abl_ipmitool", "cygcrypto-1.1.dll"),
  path.join("tools", "abl_ipmitool", "cygncursesw-10.dll"),
  path.join("tools", "abl_ipmitool", "cygreadline7.dll"),
  path.join("tools", "abl_ipmitool", "cygwin1.dll"),
  path.join("tools", "abl_ipmitool", "cygz.dll"),
];
const missingTools = requiredTools.filter((toolPath) => !existsSync(toolPath));

if (missingTools.length > 0) {
  console.error(
    [
      "Missing required bundled tool(s):",
      ...missingTools.map((toolPath) => `- ${toolPath}`),
      "",
      "Add the abl_ipmitool folder to the tools folder before building or publishing the installer.",
    ].join("\n"),
  );
  process.exit(1);
}
