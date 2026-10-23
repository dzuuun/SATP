"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");
const nodeRuntime = require("./node-runtime");

const projectRoot = path.resolve(__dirname, "..");
let executable;
try {
  executable = nodeRuntime();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const child = spawnSync(executable, process.argv.slice(2), {
  cwd: projectRoot,
  stdio: "inherit",
  windowsHide: true,
  env: { ...process.env, PATH: `${path.dirname(executable)}${path.delimiter}${process.env.PATH || ""}` },
});
if (child.error) console.error(child.error.message);
process.exitCode = child.status ?? 1;
