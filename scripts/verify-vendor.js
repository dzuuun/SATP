"use strict";

const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const { inflateSync } = require("node:zlib");
const {
  exportRatingPdf,
} = require("../api/reports/rating/rating_pdf.controller");
const root = path.resolve(__dirname, "..");
const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ratingModal = fs
  .readFileSync(path.join(root, "client/report/rating/index.html"), "utf8")
  .match(/<div\s+id="loadingModal"[\s\S]*?(?=<div id="toast-container")/)[0];
const fixture =
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="/report/rating/"><link rel="stylesheet" href="/tailwind.css"><link rel="stylesheet" href="/report/rating/style.css"><link rel="stylesheet" href="/report/rating/individual/style.css"></head><body><div id="fixture"><h1>SATP export verification</h1><p>Patched PDF dependencies.</p></div>' +
  ratingModal +
  [
    "jspdf.umd.min.js",
    "jspdf.plugin.autotable.min.js",
    "jszip.min.js",
    "html2pdf.bundle.min.js",
    "xlsx.full.min.js",
  ]
    .map((name) => '<script src="/vendor/' + name + '"></script>')
    .join("") +
  '<script src="/report/html2pdf-export.js"></script><script src="/report/rating/export-progress.js"></script><script src="/report/rating/bulk-export.js"></script></body></html>';
const server = http.createServer(async (req, res) => {
  if (req.url === "/api/report/rating/individual/export-pdf") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    req.body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.type = (type) => {
      res.setHeader("Content-Type", type);
      return res;
    };
    res.set = (key, value) => {
      res.setHeader(key, value);
      return res;
    };
    res.json = (data) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
      return res;
    };
    res.send = (data) => {
      const source = data.toString("latin1");
      assert.match(source, /\/ToUnicode/);
      assert.match(source, /\/Font/);
      const textStreams = [
        ...source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g),
      ].flatMap((match) => {
        try {
          return [
            inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"),
          ];
        } catch {
          return [];
        }
      });
      assert.ok(
        textStreams.some(
          (stream) => /\bBT\b/.test(stream) && /\bTj\b/.test(stream),
        ),
        "PDF contains real text drawing commands",
      );
      if (process.env.SATP_EXPORT_PREVIEW)
        fs.writeFileSync(`${process.env.SATP_EXPORT_PREVIEW}-text.pdf`, data);
      res.end(data);
      return res;
    };
    // Keep a report pending long enough to exercise the elapsed clock independently.
    await pause(1100);
    return exportRatingPdf(req, res);
  }
  if (req.url === "/fixture") {
    res.setHeader("Content-Type", "text/html");
    return res.end(fixture);
  }
  const clientRoot = path.join(root, "client");
  const file = path.resolve(
    clientRoot,
    "." + new URL(req.url, "http://localhost").pathname,
  );
  if (
    !file.startsWith(clientRoot + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "application/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
    }[path.extname(file)] || "application/octet-stream",
  );
  fs.createReadStream(file).pipe(res);
});
let browser, socket;

async function verifyBulkExport() {
  const elapsedSamples = [];
  const elapsedObserver = new MutationObserver(() => {
    elapsedSamples.push({
      time: document.getElementById("exportElapsed").textContent,
      reports: document.getElementById("exportProgressLabel").textContent,
      stage: document.getElementById("loadingModal").dataset.stage,
    });
  });
  elapsedObserver.observe(document.getElementById("exportElapsed"), {
    childList: true,
  });
  const originalHtml2pdf = window.html2pdf;
  window.html2pdf = () => {
    throw new Error("ZIP exports must use native text PDFs.");
  };
  for (const id of [
    "bulkExportButton",
    "teacherExportButton",
    "exportMenuButton",
    "generateButton",
  ]) {
    const element = document.createElement("button");
    element.id = id;
    document.body.appendChild(element);
  }
  let exportedZip;
  let exportMessage;
  window.showLoading = (message) => ratingExportProgress.open({ message });
  window.hideLoading = () => ratingExportProgress.close();
  window.updateTeacherExportState = () => {
    document.getElementById("teacherExportButton").disabled = false;
  };
  const updates = [];
  const updateProgress = ratingExportProgress.update;
  ratingExportProgress.update = (progress) => {
    updateProgress(progress);
    updates.push({
      ...progress,
      value: document
        .getElementById("exportProgress")
        .getAttribute("aria-valuenow"),
    });
  };
  window.showToast = (message) => {
    exportMessage = message;
  };
  window.saveZipBlob = (blob) => {
    exportedZip = blob;
  };
  window.requestJson = async () => ({
    data: {
      ratings: Array.from({ length: 25 }, (_, index) => ({
        teacher_id: 1,
        subject_id: 1,
        teacher_name: "Quality Check Teacher",
        subject_code: "QA101",
        subject_name: "Export Quality",
        school_year: "2026-2027",
        semester: "First Semester",
        college: "Sample College",
        department: "Sample Department",
        respondents: 10,
        category: index < 12 ? "Instruction" : "Assessment",
        number: index + 1,
        question: "Explains course material clearly and gives useful feedback.",
        mean: 4.5,
        rating_count: 10,
      })),
      comments: Array.from({ length: 20 }, (_, index) => ({
        teacher_id: 1,
        subject_id: 1,
        comment: `Comment ${index + 1}: Clear explanations and helpful feedback throughout the course.`,
      })),
    },
  });
  document.getElementById("bulkExportButton").focus();
  await exportIndividualRatings({
    schoolYearId: 1,
    semesterId: 1,
    schoolYearName: "2026-2027",
    semesterName: "First Semester",
  });
  if (!exportedZip)
    throw new Error(exportMessage || "Bulk export produced no ZIP.");
  elapsedObserver.disconnect();
  if (
    !elapsedSamples.some(
      (sample) =>
        sample.stage === "rendering" &&
        sample.reports === "0 of 1 reports ready" &&
        sample.time !== "0:00 elapsed",
    )
  ) {
    throw new Error(
      "Elapsed time did not advance while the first report was being prepared.",
    );
  }
  window.html2pdf = originalHtml2pdf;
  if (
    !updates.some(
      (update) =>
        update.stage === "rendering" &&
        update.completed === 0 &&
        update.value === "0",
    ) ||
    !updates.some(
      (update) =>
        update.stage === "rendering" &&
        update.completed === 1 &&
        update.value === "100",
    ) ||
    !updates.some((update) => update.stage === "packaging") ||
    updates.at(-1).stage !== "ready"
  ) {
    throw new Error("Export modal did not follow actual PDF and ZIP progress.");
  }
  const modal = document.getElementById("loadingModal");
  if (
    modal.getAttribute("aria-hidden") !== "true" ||
    document.activeElement.id !== "bulkExportButton"
  ) {
    throw new Error("Export modal did not close and restore keyboard focus.");
  }
  const zip = await JSZip.loadAsync(await exportedZip.arrayBuffer());
  const files = Object.values(zip.files).filter((file) => !file.dir);
  if (files.length !== 1 || !files[0].name.endsWith(".pdf"))
    throw new Error("Bulk ZIP report missing.");
  const bytes = await files[0].async("uint8array");
  const pdf = new TextDecoder("latin1").decode(bytes);
  const widths = [
    ...pdf.matchAll(/\/Subtype\s*\/Image[\s\S]*?\/Width\s+(\d+)/g),
  ].map((match) => Number(match[1]));
  const pages = (pdf.match(/\/Type\s*\/Page\b/g) || []).length;
  if (
    !pdf.startsWith("%PDF-") ||
    !pdf.includes("/ToUnicode") ||
    widths.some((width) => width > 2000)
  ) {
    throw new Error(
      "Bulk PDF must contain native text and only small logo images.",
    );
  }
  if (pages < 2) throw new Error("Multi-page bulk report was truncated.");
  if (document.querySelector(".html2pdf-report"))
    throw new Error("Bulk export did not remove its rendered clone.");
  exportedZip = null;
  window.requestJson = async () => {
    throw new Error("Test request failed");
  };
  await exportIndividualRatings({
    teacherId: 1,
    teacherName: "Quality Check Teacher",
  });
  if (
    exportedZip ||
    exportMessage !== "Test request failed" ||
    modal.getAttribute("aria-hidden") !== "true" ||
    document.body.classList.contains("overflow-hidden") ||
    document.getElementById("exportMenuButton").disabled
  ) {
    throw new Error("Failed export did not release the modal and controls.");
  }
  ratingExportProgress.open({ message: "Loading report options..." });
  if (
    modal.dataset.mode !== "loading" ||
    getComputedStyle(document.querySelector(".rating-export-details"))
      .display !== "none"
  ) {
    throw new Error("Export details leaked into normal options loading.");
  }
  ratingExportProgress.close();
  return {
    pdfBytes: bytes.byteLength,
    pages,
    imageWidths: widths,
    nativeText: true,
    elapsedDuringFirstReport: elapsedSamples
      .filter(
        (sample) =>
          sample.stage === "rendering" &&
          sample.reports === "0 of 1 reports ready",
      )
      .map((sample) => sample.time),
  };
}

async function main() {
  assert.ok(
    fs.existsSync(chrome),
    "Set CHROME_PATH to a Chrome or Chromium executable.",
  );
  const profile = fs.mkdtempSync(
    path.join(os.tmpdir(), "satp-security-browser-"),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port + "/fixture";
  browser = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--remote-debugging-port=0",
      "--user-data-dir=" + profile,
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );
  const activePort = path.join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100 && !fs.existsSync(activePort); i++) await pause(100);
  const port = fs.readFileSync(activePort, "utf8").split("\n")[0].trim();
  const targets = await fetch("http://127.0.0.1:" + port + "/json/list", {
    signal: AbortSignal.timeout(10000),
  }).then((r) => r.json());
  socket = new WebSocket(
    targets.find((t) => t.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Chrome debugger connection timed out.")),
      10000,
    );
    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const browserErrors = [];
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown")
      browserErrors.push(message.params.exceptionDetails);
    if (!pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error
      ? reject(new Error(message.error.message))
      : resolve(message.result);
  });
  const command = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const commandId = ++id;
      const timeout = setTimeout(() => {
        pending.delete(commandId);
        reject(new Error("Chrome command timed out: " + method));
      }, 40000);
      pending.set(commandId, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      socket.send(JSON.stringify({ id: commandId, method, params }));
    });
  await command("Runtime.enable");
  await command("Page.enable");
  await command("Page.navigate", { url });
  let loaded = false;
  for (let i = 0; i < 100 && !loaded; i++) {
    await pause(100);
    const ready = await command("Runtime.evaluate", {
      expression:
        'location.pathname === "/fixture" && document.readyState === "complete"',
      returnByValue: true,
    }).catch(() => null);
    loaded = ready?.result?.value === true;
  }
  assert.ok(loaded, "Browser fixture did not finish loading.");
  const expression = [
    "(async () => {",
    "for(let i=0;i<100 && (!window.XLSX || !window.html2pdf || !window.jspdf);i++) await new Promise(r=>setTimeout(r,100));",
    "if (!window.XLSX || !window.html2pdf || !window.jspdf) throw new Error('Vendor load failed: ' + JSON.stringify({scripts:[...document.scripts].map(s=>s.src), resources:performance.getEntriesByType('resource').map(r=>({name:r.name,status:r.responseStatus}))}));",
    "if (jspdf.jsPDF.version !== '4.2.1' || XLSX.version !== '0.20.3') throw new Error('Unexpected vendor versions');",
    "const sanitized = await html2pdf().from('<p>Text source</p><img src=x onerror=alert(1)>').get('src');",
    "if (sanitized.querySelector('[onerror]')) throw new Error('HTML source sanitization failed');",
    "const pdf = new jspdf.jsPDF();",
    "pdf.autoTable({head:[['Name','Value']],body:[['Security check','Passed']]});",
    "const tableBytes = pdf.output('arraybuffer').byteLength;",
    "const workbook = XLSX.utils.book_new();",
    "XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Username','Year'],['test',4]]), 'Students');",
    "const data = XLSX.write(workbook,{type:'array',bookType:'xlsx'});",
    "const parsed = XLSX.read(data,{type:'array'});",
    "if (XLSX.utils.sheet_to_json(parsed.Sheets.Students)[0].Year !== 4) throw new Error('Spreadsheet roundtrip failed');",
    "const rendered = await html2pdf().set({html2canvas:{scale:1,logging:false},jsPDF:{unit:'mm',format:'letter'}}).from(document.getElementById('fixture')).toPdf().outputPdf('arraybuffer');",
    "const zipped = await new JSZip().file('verification.txt','passed').generateAsync({type:'uint8array'});",
    "return {jspdf:jspdf.jsPDF.version,xlsx:XLSX.version,tableBytes,htmlPdfBytes:rendered.byteLength,zipBytes:zipped.byteLength};",
    "})()",
  ].join("\n");
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: 30000,
  });
  if (result.exceptionDetails)
    throw new Error(
      JSON.stringify({ evaluation: result.exceptionDetails, browserErrors }),
    );
  assert.ok(result.result.value.tableBytes > 1000);
  assert.ok(result.result.value.htmlPdfBytes > 1000);
  const bulkResult = await command("Runtime.evaluate", {
    expression: "(" + verifyBulkExport.toString() + ")()",
    awaitPromise: true,
    returnByValue: true,
    timeout: 30000,
  });
  if (bulkResult.exceptionDetails)
    throw new Error(JSON.stringify(bulkResult.exceptionDetails));
  for (const width of [1024, 360]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const dialogResult = await command("Runtime.evaluate", {
      expression: `(() => {
        ratingExportProgress.open({ exporting: true, scope: 'All teachers', period: '2026-2027 / First Semester' });
        ratingExportProgress.update({ stage: 'rendering', completed: 7, total: 24, teacher: 'Maria Christina Dela Cruz', course: 'SCI101 - Introduction to Environmental Science and Sustainability' });
        const modal = document.getElementById('loadingModal');
        const card = document.getElementById('loadingModalCard');
        const rect = card.getBoundingClientRect();
        if (rect.left < 0 || rect.right > innerWidth || card.scrollWidth > card.clientWidth) throw new Error('Export dialog overflows the viewport.');
        if (document.getElementById('exportProgress').getAttribute('aria-valuenow') !== '29') throw new Error('Report progress is incorrect.');
        for (const key of ['Tab', 'Escape']) {
          const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
          document.dispatchEvent(event);
          if (!event.defaultPrevented || document.activeElement !== card || modal.getAttribute('aria-hidden') !== 'false') throw new Error('Keyboard focus left the busy dialog: ' + JSON.stringify({ key, prevented: event.defaultPrevented, focused: document.activeElement.id, visibility: getComputedStyle(card).visibility, modal: modal.className }));
        }
        return { width: rect.width, height: rect.height };
      })()`,
      returnByValue: true,
    });
    if (dialogResult.exceptionDetails)
      throw new Error(JSON.stringify(dialogResult.exceptionDetails));
    if (process.env.SATP_EXPORT_PREVIEW) {
      // Allow the modal's opacity transition to finish before the screenshot.
      await pause(300);
      const screenshot = await command("Page.captureScreenshot", {
        format: "png",
      });
      fs.writeFileSync(
        `${process.env.SATP_EXPORT_PREVIEW}-${width}.png`,
        Buffer.from(screenshot.data, "base64"),
      );
    }
    await command("Runtime.evaluate", {
      expression: "ratingExportProgress.close()",
    });
  }
  if (process.env.SATP_EXPORT_PREVIEW) {
    await command("Emulation.setDeviceMetricsOverride", {
      width: 1024,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await command("Page.navigate", {
      url: pathToFileURL(`${process.env.SATP_EXPORT_PREVIEW}-text.pdf`).href,
    });
    await pause(1500);
    const screenshot = await command("Page.captureScreenshot", {
      format: "png",
    });
    fs.writeFileSync(
      `${process.env.SATP_EXPORT_PREVIEW}-pdf.png`,
      Buffer.from(screenshot.data, "base64"),
    );
  }
  console.log(
    "Chrome export checks passed: " +
      JSON.stringify({ ...result.result.value, bulk: bulkResult.result.value }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 1000);
        socket.addEventListener(
          "close",
          () => {
            clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
        socket.close();
      });
    }
    if (browser) browser.kill();
    server.closeAllConnections();
    server.close();
  });
