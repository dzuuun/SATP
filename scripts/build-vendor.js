"use strict";

const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const projectRoot = path.resolve(__dirname, "..");
const vendorRoot = path.join(projectRoot, "client", "vendor");

async function main() {
  fs.mkdirSync(vendorRoot, { recursive: true });
  // Build from source so the bundle uses the audited lockfile dependencies,
  // rather than the older libraries embedded in the upstream prebuilt bundle.
  await esbuild.build({
    entryPoints: [require.resolve("html2pdf.js/src/index.js")],
    outfile: path.join(vendorRoot, "html2pdf.bundle.min.js"),
    bundle: true,
    platform: "browser",
    format: "iife",
    globalName: "html2pdf",
    footer: { js: "html2pdf = html2pdf.default;" },
    target: ["es2020"],
    minify: true,
    legalComments: "linked",
  });

  const assets = [
    ["jspdf/dist/jspdf.umd.min.js", "jspdf.umd.min.js"],
    ["jspdf.plugin.autotable.min.js", "jspdf.plugin.autotable.min.js"],
    ["jszip/dist/jszip.min.js", "jszip.min.js"],
  ];
  for (const [source, filename] of assets) {
    const sourcePath = source === "jspdf.plugin.autotable.min.js"
      ? path.join(path.dirname(require.resolve("jspdf-autotable")), source)
      : require.resolve(source);
    fs.copyFileSync(sourcePath, path.join(vendorRoot, filename));
  }
  console.log("Rebuilt PDF assets using the installed, audited dependencies.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
