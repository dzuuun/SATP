"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const clientRoot = path.join(projectRoot, "client");

function walk(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target, extension);
    return entry.name.endsWith(extension) ? [target] : [];
  });
}

function relativeName(file) {
  return path.relative(projectRoot, file).replaceAll("\\", "/");
}

function isDeferredGradSchool(file) {
  return relativeName(file).toLowerCase().includes("gradschool");
}

function localReferences(html) {
  return [...html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
    .map((match) => match[1].trim())
    .filter(
      (reference) =>
        reference &&
        !reference.startsWith("#") &&
        !reference.startsWith("data:") &&
        !reference.startsWith("mailto:") &&
        !reference.startsWith("javascript:") &&
        !/^https?:\/\//i.test(reference),
    );
}

for (const page of walk(clientRoot, ".html").filter((file) => !isDeferredGradSchool(file))) {
  test(`page smoke: ${relativeName(page)}`, () => {
    const html = fs.readFileSync(page, "utf8");
    assert.ok(html.trim(), "page must not be empty");
    assert.doesNotMatch(
      html,
      /cdn\.tailwindcss\.com/i,
      "production pages must use the locally compiled Tailwind stylesheet",
    );

    const markup = html.replace(/<!--[\s\S]*?-->/g, "");
    const ids = [...markup.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(
      (match) => match[1],
    );
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    assert.deepEqual(duplicateIds, [], `duplicate element IDs: ${duplicateIds.join(", ")}`);

    const missing = [];
    for (const reference of localReferences(html)) {
      const cleanReference = decodeURIComponent(reference.split(/[?#]/)[0]);
      const target = cleanReference.startsWith("/")
        ? path.join(clientRoot, cleanReference.replace(/^\/+/, ""))
        : path.resolve(path.dirname(page), cleanReference);
      if (!fs.existsSync(target)) missing.push(reference);
    }
    assert.deepEqual(missing, [], `missing local assets or links: ${missing.join(", ")}`);

    if (path.basename(page) === "index.html") {
      assert.match(html, /<title>[^<]+<\/title>/i, "page must have a title");
      assert.match(html, /name=["']viewport["']/i, "page must define a viewport");
    }
  });
}

for (const script of walk(clientRoot, ".js").filter((file) => !isDeferredGradSchool(file))) {
  test(`browser script syntax: ${relativeName(script)}`, () => {
    const source = fs.readFileSync(script, "utf8");
    assert.doesNotThrow(
      () => new vm.Script(source, { filename: relativeName(script) }),
      "browser script must contain valid JavaScript",
    );
  });
}
