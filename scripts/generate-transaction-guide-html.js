"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "docs", "CHECK_STUDENT_TRANSACTIONS.md");
const output = path.join(root, "docs", "CHECK_STUDENT_TRANSACTIONS.html");
const screenshots = new Map([
  ["## 1. About SATP", "01-landing.png"],
  ["## 2. Signing in and out", "02-login.png"],
  ["## 4. Transactions", "03-transactions.png"],
  ["### Open a student's transaction details", "25-open-transaction-modal.png"],
  ["### Review the student's transactions", "24-transaction-detail.png"],
]);

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const inline = (value) =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

const lines = fs.readFileSync(source, "utf8").replace(/\r/g, "").split("\n");
const body = [];
let list = null;
const closeList = () => {
  if (!list) return;
  body.push(`</${list}>`);
  list = null;
};

for (const raw of lines) {
  const line = raw.trimEnd();
  const heading = line.match(/^(#{1,3})\s+(.+)$/);
  const ordered = line.match(/^\d+\.\s+(.+)$/);
  const bullet = line.match(/^\s*-\s+(.+)$/);
  if (heading) {
    closeList();
    const level = heading[1].length;
    body.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    const screenshot = screenshots.get(line);
    if (screenshot) {
      const file = path.join(
        root,
        "docs",
        "screenshots",
        "transaction-guide",
        screenshot,
      );
      const data = fs.readFileSync(file).toString("base64");
      body.push(`<figure><img src="data:image/png;base64,${data}" alt="SATP screen"><figcaption>${inline(heading[2])}</figcaption></figure>`);
    }
  } else if (ordered || bullet) {
    const type = ordered ? "ol" : "ul";
    if (list !== type) {
      closeList();
      list = type;
      body.push(`<${type}>`);
    }
    body.push(`<li>${inline((ordered || bullet)[1])}</li>`);
  } else if (!line.trim()) {
    closeList();
  } else {
    closeList();
    body.push(`<p>${inline(line.replace(/\s{2}$/, ""))}</p>`);
  }
}
closeList();

const html = `<!doctype html><html><head><meta charset="utf-8"><title>How to Check Student Transactions in SATP</title><style>
@page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;color:#17251f;font:10.5pt/1.5 Arial,sans-serif}h1{color:#075c3b;font:700 25pt Georgia,serif;text-align:center;margin:0 0 18pt}h2{break-before:page;color:#075c3b;font:700 18pt Georgia,serif;margin:0 0 12pt}h2:first-of-type{break-before:auto}h3{color:#087247;font-size:13pt;margin:16pt 0 7pt}p{margin:0 0 8pt}ol,ul{margin:0 0 10pt;padding-left:22pt}li{margin:0 0 4pt}code{padding:1pt 3pt;background:#edf4f0;border-radius:3pt;font-size:9pt}figure{margin:12pt 0 18pt;break-inside:avoid;text-align:center}figure img{max-width:100%;max-height:165mm;border:1px solid #dce6e0}figcaption{margin-top:5pt;color:#65736c;font-size:8.5pt;font-style:italic}strong{color:#102019}</style></head><body>${body.join("\n")}</body></html>`;

fs.writeFileSync(output, html);
console.log(output);
