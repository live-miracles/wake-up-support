import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const requiredTools = [path.join("tools", "ipmiutil.exe")];
const missingTools = requiredTools.filter((toolPath) => !existsSync(toolPath));

if (missingTools.length > 0) {
  console.error(
    [
      "Missing required bundled tool(s):",
      ...missingTools.map((toolPath) => `- ${toolPath}`),
      "",
      "Add ipmiutil.exe to the tools folder before building or publishing the installer.",
    ].join("\n"),
  );
  process.exit(1);
}
