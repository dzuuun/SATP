"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function controller(render = async () => Buffer.from("%PDF-1.7\nText report")) {
  const source = fs.readFileSync(
    path.join(__dirname, "../api/reports/rating/rating_pdf.controller.js"),
    "utf8",
  );
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    require: () => ({ renderRatingPdf: render }),
    console: { error() {} },
  });
  return module.exports;
}

function reportData() {
  return {
    ratingType: "individual",
    teacherMean: 4.5,
    report: {
      teacherName: "Maria Pe\u00f1a",
      subjectCode: "QA101",
      subjectName: "Sample Course",
      schoolYear: "2026-2027",
      semester: "First Semester",
      college: "Sample College",
      department: "Sample Department",
      respondents: 10,
      items: [
        {
          category: "Instruction",
          number: 1,
          question: "Explains clearly.",
          mean: "4.50",
        },
      ],
      comments: ["Helpful feedback."],
    },
  };
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    type(value) {
      this.headers["Content-Type"] = value;
      return this;
    },
    set(key, value) {
      this.headers[key] = value;
      return this;
    },
    send(data) {
      this.data = data;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
}

test("Native rating PDF accepts valid reports and rejects invalid or oversized data", () => {
  const { validateReport } = controller();
  assert.equal(validateReport(reportData()), true);
  const institutional = reportData();
  institutional.ratingType = "institutional";
  institutional.report.subjectLabel = "QA101 - Sample Course";
  institutional.report.dateGenerated = "October 29, 2026";
  institutional.report.qualitativeLabel = "Excellent";
  assert.equal(validateReport(institutional), true);
  for (const change of [
    (data) => {
      data.ratingType = "<script>alert(1)</script>";
    },
    (data) => {
      data.teacherMean = 99;
    },
    (data) => {
      data.report.subjectLabel = "a".repeat(2001);
    },
    (data) => {
      data.report.dateGenerated = {};
    },
    (data) => {
      data.report.respondents = "<img src=x>";
    },
    (data) => {
      data.report.items = [];
    },
    (data) => {
      data.report.items = Array(501).fill(data.report.items[0]);
    },
    (data) => {
      data.report.items[0].mean = "invalid";
    },
    (data) => {
      data.report.comments = Array(5001).fill("comment");
    },
    (data) => {
      data.report.comments = ["a".repeat(20001)];
    },
  ]) {
    const data = reportData();
    change(data);
    assert.equal(validateReport(data), false);
  }
});

test("Report Download PDF exports displayed details as text and restores its button", async () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../client/report/rating/individual/script.js"),
    "utf8",
  );
  for (const title of [
    "Individual Rating Report",
    "Institutional Rating Report",
  ]) {
    const handlers = {};
    const label = { textContent: "Download PDF" };
    const values = {
      teacher: "Maria Peña",
      subject: "QA101 - Sample Course",
      schoolYear: "2026-2027",
      semester: "First Semester",
      college: "College",
      department: "Department",
      dateGenerated: "October 29, 2026",
    };
    const elements = Object.fromEntries(
      Object.entries(values).map(([key, textContent]) => [
        key,
        { textContent },
      ]),
    );
    elements.downloadButton = {
      disabled: false,
      querySelector: () => label,
      addEventListener: (_, handler) => {
        handlers.download = handler;
      },
    };
    elements.printButton = { addEventListener() {} };
    let fail = false;
    let exported;
    const printEvents = {};
    const context = vm.createContext({
      window: {
        ratingReportConfig: { title },
        addEventListener: (event, handler) => {
          printEvents[event] = handler;
        },
      },
      localStorage: { getItem: () => "1" },
      document: {
        title: "SATP Report",
        getElementById: (id) => elements[id],
        addEventListener() {},
      },
      console: { error() {} },
      downloadRatingTextPdf: async (payload, filename) => {
        assert.equal(elements.downloadButton.disabled, true);
        assert.equal(label.textContent, "Preparing PDF...");
        if (fail) throw new Error("Export unavailable");
        exported = { payload, filename };
      },
    });
    const helper = fs.readFileSync(
      path.join(__dirname, "../client/report/html2pdf-export.js"),
      "utf8",
    );
    // Load only the print setup so the download spy above stays in place.
    vm.runInContext(
      helper.slice(0, helper.indexOf("async function downloadRatingTextPdf")),
      context,
    );
    vm.runInContext(source, context);
    vm.runInContext(
      'state.rows = [{ mean: 4.5, respondents: 10 }]; state.comments = [{ comment: "Helpful" }]; showToast = (message) => { globalThis.toast = message; };',
      context,
    );
    await handlers.download();
    assert.equal(
      exported.payload.ratingType,
      title.startsWith("Institutional") ? "institutional" : "individual",
    );
    assert.equal(exported.payload.report.subjectLabel, values.subject);
    assert.equal(exported.payload.report.dateGenerated, values.dateGenerated);
    assert.equal(exported.payload.report.comments[0], "Helpful");
    assert.ok(exported.filename.includes(title));
    printEvents.beforeprint();
    assert.equal(context.document.title + ".pdf", exported.filename);
    printEvents.beforeprint();
    printEvents.afterprint();
    assert.equal(context.document.title, "SATP Report");
    assert.equal(elements.downloadButton.disabled, false);
    assert.equal(label.textContent, "Download PDF");
    fail = true;
    await handlers.download();
    assert.equal(context.toast, "Export unavailable");
    assert.equal(elements.downloadButton.disabled, false);
    assert.equal(label.textContent, "Download PDF");
  }
});

test("Native rating PDF endpoint validates before launching the renderer and prevents caching", async () => {
  const calls = [];
  const { exportRatingPdf } = controller(async (data) => {
    calls.push(data);
    return Buffer.from("%PDF-1.7");
  });
  const invalid = response();
  await exportRatingPdf({ body: {} }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls.length, 0);
  const success = response();
  await exportRatingPdf({ body: reportData() }, success);
  assert.equal(calls.length, 1);
  assert.equal(success.headers["Content-Type"], "application/pdf");
  assert.equal(success.headers["Cache-Control"], "no-store");
  assert.match(success.headers["Content-Disposition"], /^attachment;/);
  assert.ok(Buffer.isBuffer(success.data));
});

test("Native rating PDF endpoint reports unavailable browsers without exposing internal errors", async () => {
  for (const [error, expected, message] of [
    [
      Object.assign(new Error("The exporter is busy."), { status: 503 }),
      503,
      "The exporter is busy.",
    ],
    [
      new Error("private process details"),
      500,
      "Unable to generate the text PDF. Please try again.",
    ],
    [
      Object.assign(new Error("private browser details"), {
        pdfCode: "PDF_CONTENT",
      }),
      500,
      "The server could not render this report's content or images.",
    ],
  ]) {
    const { exportRatingPdf } = controller(async () => {
      throw error;
    });
    const res = response();
    await exportRatingPdf({ body: reportData() }, res);
    assert.equal(res.statusCode, expected);
    assert.equal(res.data.message, message);
  }
});
