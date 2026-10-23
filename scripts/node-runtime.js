"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const projectRoot = path.resolve(__dirname, "..");
const version = fs.readFileSync(path.join(projectRoot, ".nvmrc"), "utf8").trim();
const minimum = version.split(".").map(Number);
const updateMessage = `SATP requires Node.js ${version} or a newer 24.x security release. Use npm start to select the project runtime. On Windows, install it with powershell -File scripts/install-node.ps1, or update the system Node.js installation.`;

function supportedVersion(value) {
  const parts = value.trim().replace(/^v/, "").split(".").map(Number);
  return parts[0] === minimum[0] && (
    parts[1] > minimum[1] || (parts[1] === minimum[1] && parts[2] >= minimum[2])
  );
}

function nodeRuntime() {
  const localNode = path.join(projectRoot, ".runtime", `node-v${version}-win-x64`, "node.exe");
  const executable = process.platform === "win32" && fs.existsSync(localNode)
    ? localNode
    : process.execPath;
  const check = spawnSync(executable, ["--version"], { encoding: "utf8", windowsHide: true });
  if (check.status !== 0 || !supportedVersion(check.stdout || "")) {
    throw new Error(updateMessage);
  }
  return executable;
}

nodeRuntime.assertCurrent = () => {
  if (!supportedVersion(process.version)) throw new Error(updateMessage);
};

module.exports = nodeRuntime;
