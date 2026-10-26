"use strict";

const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fixture =
  '<!doctype html><html><body><div id="fixture"><h1>SATP export verification</h1><p>Patched PDF dependencies.</p></div>' +
  [
    "jspdf.umd.min.js",
    "jspdf.plugin.autotable.min.js",
    "jszip.min.js",
    "html2pdf.bundle.min.js",
    "xlsx.full.min.js",
  ]
    .map((name) => '<script src="/vendor/' + name + '"></script>')
    .join("") +
  "</body></html>";
const server = http.createServer((req, res) => {
  if (req.url === "/fixture") {
    res.setHeader("Content-Type", "text/html");
    return res.end(fixture);
  }
  const file = path.join(root, "client", "vendor", path.basename(req.url));
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader("Content-Type", "application/javascript");
  fs.createReadStream(file).pipe(res);
});
let browser, socket;

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
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
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
    throw new Error(JSON.stringify(result.exceptionDetails));
  assert.ok(result.result.value.tableBytes > 1000);
  assert.ok(result.result.value.htmlPdfBytes > 1000);
  console.log(
    "Chrome export checks passed: " + JSON.stringify(result.result.value),
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
