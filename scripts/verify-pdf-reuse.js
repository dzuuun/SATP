"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const originalSpawn = childProcess.spawn;
let launches = 0;
childProcess.spawn = (...args) => {
  launches += 1;
  return originalSpawn(...args);
};
const {
  renderRatingPdf,
} = require("../api/reports/rating/rating_pdf.renderer");
childProcess.spawn = originalSpawn;

(async () => {
  const payload = {
    ratingType: "individual",
    teacherMean: 4.5,
    report: {
      teacherName: "Export verification",
      subjectCode: "QA",
      subjectName: "Sample",
      schoolYear: "2026-2027",
      semester: "First Semester",
      department: "Department",
      college: "College",
      respondents: 10,
      comments: [],
      items: [
        {
          category: "Instruction",
          number: 1,
          question: "Explains clearly",
          mean: 4.5,
        },
      ],
    },
  };
  const durations = [];
  for (let i = 0; i < 3; i++) {
    payload.report.teacherName = `Export verification ${i}`;
    const started = Date.now();
    const pdf = await renderRatingPdf(payload);
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.ok(pdf.includes(Buffer.from("/ToUnicode")));
    durations.push(Date.now() - started);
  }
  assert.equal(launches, 1, "Sequential exports should reuse one browser");
  await assert.rejects(renderRatingPdf({ ...payload, report: null }), {
    pdfCode: "PDF_CONTENT",
  });
  const recovered = await renderRatingPdf(payload);
  assert.equal(recovered.subarray(0, 5).toString(), "%PDF-");
  assert.equal(launches, 2, "A failed browser should be replaced");
  console.log(
    "PDF reuse and failure recovery passed:",
    JSON.stringify({ durationsMs: durations, launches }),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
