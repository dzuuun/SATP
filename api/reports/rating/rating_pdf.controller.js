"use strict";

const { renderRatingPdf } = require("./rating_pdf.renderer");

function validateReport(body) {
  const report = body?.report;
  if (!report || !["individual", "institutional"].includes(body.ratingType) ||
      !Number.isFinite(body.teacherMean) || body.teacherMean < 0 || body.teacherMean > 5 ||
      !Array.isArray(report.items) || !report.items.length || report.items.length > 500 ||
      !Array.isArray(report.comments) || report.comments.length > 5000) return false;
  const text = (value, length = 2000) => typeof value === "string" && value.length <= length;
  if (!["subjectLabel", "dateGenerated", "qualitativeLabel"]
    .every((key) => report[key] === undefined || text(report[key]))) return false;
  if (!["teacherName", "subjectCode", "subjectName", "schoolYear", "semester", "department", "college"]
    .every((key) => text(report[key]))) return false;
  if (!Number.isInteger(report.respondents) || report.respondents < 0) return false;
  return report.comments.every((comment) => text(comment, 20000)) && report.items.every((item) =>
    item && text(item.category) && text(item.question, 20000) &&
    ["number", "string"].includes(typeof item.number) && String(item.number).length <= 20 &&
    Number.isFinite(Number(item.mean)) && Number(item.mean) >= 0 && Number(item.mean) <= 5);
}

async function exportRatingPdf(req, res) {
  if (!validateReport(req.body)) return res.status(400).json({ success: 0, message: "The rating report data is invalid." });
  try {
    const pdf = await renderRatingPdf(req.body);
    return res.type("application/pdf").set("Cache-Control", "no-store")
      .set("Content-Disposition", 'attachment; filename="SATP Rating Report.pdf"').send(pdf);
  } catch (error) {
    console.error("Native rating PDF export failed:", error.message);
    return res.status(error.status || 500).json({ success: 0,
      message: error.status === 503 ? error.message : "Unable to generate the text PDF. Please try again." });
  }
}

module.exports = { exportRatingPdf, validateReport };
