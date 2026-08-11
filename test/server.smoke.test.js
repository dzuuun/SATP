"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const roots = ["api", "auth", "db"].map((folder) =>
  path.join(projectRoot, folder),
);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return entry.name.endsWith(".js") ? [target] : [];
  });
}

function relativeName(file) {
  return path.relative(projectRoot, file).replaceAll("\\", "/");
}

const serverFiles = [path.join(projectRoot, "index.js"), ...roots.flatMap(walk)]
  .filter((file) => !relativeName(file).toLowerCase().includes("gradschool"));

for (const file of serverFiles) {
  test(`server script syntax: ${relativeName(file)}`, () => {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotThrow(
      () => new vm.Script(source, { filename: relativeName(file) }),
      "server script must contain valid JavaScript",
    );
  });
}
