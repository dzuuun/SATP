"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawn } = require("node:child_process");

const templateUrl = pathToFileURL(path.resolve(__dirname, "../../../client/report/rating/pdf-template.html")).href;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let running = 0;

function chromePath() {
  const candidates = [process.env.SATP_CHROME_PATH, process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean);
  const found = candidates.find((file) => fs.existsSync(file));
  if (!found) throw Object.assign(new Error("Text PDF export requires Chrome or Chromium on the server. Configure SATP_CHROME_PATH."), { status: 503 });
  return found;
}

async function renderRatingPdf(payload) {
  if (running >= 2) throw Object.assign(new Error("The PDF exporter is busy. Please try again shortly."), { status: 503 });
  const executable = chromePath();
  running += 1;
  let profile, browser, socket;
  const pending = new Map();
  try {
    profile = await fsp.mkdtemp(path.join(os.tmpdir(), "satp-pdf-"));
    browser = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run",
      "--no-default-browser-check", "--disable-background-networking", "--disable-extensions",
      "--disable-sync", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
    { stdio: "ignore", windowsHide: true });
    let launchError;
    browser.on("error", (error) => { launchError = error; });
    const activePort = path.join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !fs.existsSync(activePort); i++) {
      if (launchError || browser.exitCode !== null) throw new Error("The PDF browser could not be started.");
      await pause(100);
    }
    if (!fs.existsSync(activePort)) throw new Error("The PDF browser did not start in time.");
    const port = (await fsp.readFile(activePort, "utf8")).split("\n")[0].trim();
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(10000) }).then((res) => res.json());
    socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("The PDF browser connection timed out.")), 10000);
      socket.addEventListener("open", () => { clearTimeout(timeout); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("The PDF browser connection failed.")); }, { once: true });
    });
    let sequence = 0;
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timeout);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
    socket.addEventListener("close", () => {
      for (const request of pending.values()) {
        clearTimeout(request.timeout);
        request.reject(new Error("The PDF browser connection closed."));
      }
      pending.clear();
    });
    const command = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error("PDF generation timed out.")); }, 30000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params }));
    });
    await command("Page.enable");
    await command("Network.enable");
    // The template uses local assets exclusively. Report text cannot trigger network requests.
    await command("Network.setBlockedURLs", { urls: ["http://*", "https://*", "ftp://*"] });
    await command("Emulation.setDeviceMetricsOverride", { width: 1024, height: 800, deviceScaleFactor: 1, mobile: false });
    // Use the same screen styles as the existing export rather than its alternate print theme.
    await command("Emulation.setEmulatedMedia", { media: "screen" });
    await command("Page.navigate", { url: templateUrl });
    let ready = false;
    for (let i = 0; i < 100 && !ready; i++) {
      const result = await command("Runtime.evaluate", {
        expression: "document.readyState === 'complete' && typeof createReportPdfElement === 'function' && typeof buildBulkRatingReportElement === 'function'",
        returnByValue: true,
      });
      ready = result.result?.value === true;
      if (!ready) await pause(100);
    }
    if (!ready) throw new Error("The PDF report template could not be loaded.");
    const rendered = await command("Runtime.evaluate", {
      expression: `(async (data) => {
        const report = buildBulkRatingReportElement(data.report, data.teacherMean, data.ratingType === 'institutional' ? 'Institutional' : 'Individual');
        document.body.replaceChildren(createReportPdfElement(report));
        await Promise.all([...document.images].map(image => image.decode()));
        await document.fonts.ready;
        return true;
      })(${JSON.stringify(payload)})`,
      awaitPromise: true, returnByValue: true,
    });
    if (rendered.exceptionDetails) throw new Error("The PDF report content could not be rendered.");
    const pdf = await command("Page.printToPDF", {
      printBackground: true, displayHeaderFooter: false, paperWidth: 8.5, paperHeight: 11,
      marginTop: 10 / 25.4, marginRight: 10 / 25.4, marginBottom: 10 / 25.4, marginLeft: 10 / 25.4,
      preferCSSPageSize: false, generateTaggedPDF: true,
    });
    return Buffer.from(pdf.data, "base64");
  } finally {
    for (const request of pending.values()) clearTimeout(request.timeout);
    try { socket?.close(); } catch {}
    if (browser && browser.exitCode === null) {
      const exited = new Promise((resolve) => browser.once("exit", resolve));
      browser.kill();
      await Promise.race([exited, pause(2000)]);
    }
    // Only remove the temporary profile created by this request.
    if (profile && path.dirname(profile) === path.resolve(os.tmpdir()) && path.basename(profile).startsWith("satp-pdf-")) {
      await fsp.rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {});
    }
    running -= 1;
  }
}

module.exports = { renderRatingPdf };
