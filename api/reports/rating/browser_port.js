"use strict";

const { readFile } = require("node:fs/promises");
const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForBrowserPort(file, startupError, options = {}) {
  const read = options.read || readFile;
  const wait = options.wait || pause;
  const attempts = options.attempts || 300;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const error = startupError();
    if (error) throw error;
    try {
      const content = await read(file, "utf8");
      // Chrome may still be writing the file or holding a Windows file lock.
      const lines = content.split(/\r?\n/);
      const port = Number(lines[0]);
      if (/^\d+$/.test(lines[0]) && port > 0 && port <= 65535 &&
          lines[1]?.startsWith("/devtools/browser/")) return port;
    } catch (error) {
      if (!["ENOENT", "EBUSY", "EACCES", "EPERM"].includes(error.code)) throw error;
    }
    if (attempt + 1 < attempts) await wait(100);
  }
  throw new Error("The PDF browser startup file stayed locked, incomplete, or unavailable for 30 seconds.");
}

module.exports = { waitForBrowserPort };
