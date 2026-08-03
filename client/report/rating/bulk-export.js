"use strict";

function safeFileName(value, fallback = "Report") {
  const safe = String(value || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[. ]+$/g, "")
    .trim();
  return safe || fallback;
}

function qualitativeEquivalent(score) {
  if (score < 1 || score > 5 || !Number.isFinite(score)) return "Invalid score";
  if (score <= 1.5) return "Poor";
  if (score <= 2.25) return "Fair";
  if (score <= 3.75) return "Satisfactory";
  if (score < 4.5) return "Very Satisfactory";
  return "Excellent";
}

function numericAverage(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length
    ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length
    : 0;
}

async function reportImageData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to load a report image.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function groupBulkReports(ratings, comments) {
  const reports = new Map();
  ratings.forEach((row) => {
    const key = `${row.teacher_id}:${row.subject_id}`;
    if (!reports.has(key)) {
      reports.set(key, {
        teacherId: row.teacher_id,
        subjectId: row.subject_id,
        teacherName: row.teacher_name,
        subjectCode: row.subject_code,
        subjectName: row.subject_name,
        schoolYear: row.school_year,
        semester: row.semester,
        department: row.department,
        college: row.college,
        respondents: Number(row.respondents) || 0,
        items: [],
        comments: [],
      });
    }
    reports.get(key).items.push(row);
  });
  comments.forEach((row) => {
    reports
      .get(`${row.teacher_id}:${row.subject_id}`)
      ?.comments.push(row.comment);
  });
  return [...reports.values()];
}

function calculateTeacherMeans(reports) {
  const totals = new Map();
  reports.forEach((report) => {
    const current = totals.get(String(report.teacherId)) || {
      weightedTotal: 0,
      ratingCount: 0,
    };
    report.items.forEach((item) => {
      const count = Number(item.rating_count) || 0;
      current.weightedTotal += Number(item.mean) * count;
      current.ratingCount += count;
    });
    totals.set(String(report.teacherId), current);
  });
  return new Map(
    [...totals].map(([teacherId, value]) => [
      teacherId,
      value.ratingCount ? value.weightedTotal / value.ratingCount : 0,
    ]),
  );
}

function appendPdfComments(pdf, comments) {
  if (!comments.length) return;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = (pdf.lastAutoTable?.finalY || 80) + 10;
  if (y > pageHeight - 30) {
    pdf.addPage();
    y = 20;
  }
  pdf.setTextColor(20, 40, 30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Comments", 18, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  comments.forEach((comment, index) => {
    const lines = pdf.splitTextToSize(
      `${index + 1}. ${comment}`,
      pageWidth - 36,
    );
    if (y + lines.length * 4 > pageHeight - 15) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(lines, 18, y);
    y += lines.length * 4 + 3;
  });
}

function buildRatingPdf(report, teacherMean, logos) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  if (logos.ndmu) pdf.addImage(logos.ndmu, "PNG", 18, 10, 24, 24);
  if (logos.green)
    pdf.addImage(logos.green, "JPEG", pageWidth - 47, 11, 29, 22);

  pdf.setTextColor(20, 40, 30);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("NOTRE DAME OF MARBEL UNIVERSITY", pageWidth / 2, 14, {
    align: "center",
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Alunan Avenue, City of Koronadal 9506", pageWidth / 2, 19, {
    align: "center",
  });
  pdf.text("South Cotabato, Philippines", pageWidth / 2, 23, {
    align: "center",
  });
  pdf.setDrawColor(7, 92, 59);
  pdf.setLineWidth(0.5);
  pdf.line(18, 37, pageWidth - 18, 37);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("STUDENT ASSESSMENT OF TEACHER'S PERFORMANCE", pageWidth / 2, 44, {
    align: "center",
  });
  pdf.setFontSize(10);
  pdf.text("INDIVIDUAL RATING REPORT", pageWidth / 2, 50, {
    align: "center",
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.6);
  const leftX = 18;
  const rightX = 112;
  const leftWidth = rightX - leftX - 7;
  const rightWidth = pageWidth - rightX - 18;
  const drawDetailRow = (leftText, rightText, y) => {
    const leftLines = pdf.splitTextToSize(leftText, leftWidth);
    const rightLines = pdf.splitTextToSize(rightText, rightWidth);
    pdf.text(leftLines, leftX, y);
    pdf.text(rightLines, rightX, y);
    return y + Math.max(leftLines.length, rightLines.length) * 4 + 1;
  };
  let detailY = 58;
  detailY = drawDetailRow(
    `Teacher: ${report.teacherName}`,
    `School year: ${report.schoolYear}`,
    detailY,
  );
  detailY = drawDetailRow(
    `Semester: ${report.semester}`,
    `College: ${report.college}`,
    detailY,
  );
  detailY = drawDetailRow(
    `Department: ${report.department}`,
    `Subject: ${report.subjectCode} - ${report.subjectName}`,
    detailY,
  );
  detailY = drawDetailRow(
    `Respondents: ${report.respondents}`,
    `Date generated: ${new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date())}`,
    detailY,
  );

  const categories = new Map();
  report.items.forEach((item) => {
    if (!categories.has(item.category)) categories.set(item.category, []);
    categories.get(item.category).push(item);
  });
  const tableBody = [];
  categories.forEach((items, category) => {
    tableBody.push([
      {
        content: category,
        colSpan: 2,
        styles: {
          fillColor: [234, 243, 237],
          textColor: [7, 92, 59],
          fontStyle: "bold",
        },
      },
    ]);
    items.forEach((item) =>
      tableBody.push([
        `${item.number}. ${item.question}`,
        Number(item.mean).toFixed(2),
      ]),
    );
    tableBody.push([
      {
        content: "Category average",
        styles: { halign: "right", fontStyle: "bold" },
      },
      {
        content: numericAverage(items.map((item) => item.mean)).toFixed(2),
        styles: { fontStyle: "bold" },
      },
    ]);
  });
  const subjectMean = numericAverage(report.items.map((item) => item.mean));
  tableBody.push([
    {
      content: "Subject average",
      styles: { halign: "right", fontStyle: "bold" },
    },
    { content: subjectMean.toFixed(2), styles: { fontStyle: "bold" } },
  ]);
  tableBody.push([
    {
      content: "Teacher mean",
      styles: { halign: "right", fontStyle: "bold" },
    },
    { content: teacherMean.toFixed(2), styles: { fontStyle: "bold" } },
  ]);
  tableBody.push([
    {
      content: "Qualitative equivalent",
      styles: { halign: "right", fontStyle: "bold" },
    },
    {
      content: qualitativeEquivalent(teacherMean),
      styles: { fontStyle: "bold" },
    },
  ]);

  pdf.autoTable({
    startY: detailY + 1,
    margin: { left: 18, right: 18, bottom: 18 },
    head: [["Criteria", "Item average"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [7, 92, 59],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
      overflow: "linebreak",
    },
    bodyStyles: {
      textColor: [30, 42, 35],
      fontSize: 7.2,
      cellPadding: 2.1,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 142 },
      1: { cellWidth: 26, halign: "center" },
    },
    didDrawPage: () => {
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(100);
      pdf.text("SATP Individual Rating Report", 18, pageHeight - 7);
      pdf.text(
        `Page ${pdf.internal.getNumberOfPages()}`,
        pageWidth - 18,
        pageHeight - 7,
        { align: "right" },
      );
    },
  });

  appendPdfComments(pdf, report.comments);
  return pdf.output("arraybuffer");
}

function saveZipBlob(blob, fileName) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

async function exportIndividualRatings({
  schoolYearId,
  semesterId,
  schoolYearName,
  semesterName,
  teacherId = null,
  teacherName = "",
}) {
  const bulkExportButton = document.getElementById("bulkExportButton");
  const teacherExportButton = document.getElementById("teacherExportButton");
  const exportMenuButton = document.getElementById("exportMenuButton");
  const generateButton = document.getElementById("generateButton");
  bulkExportButton.disabled = true;
  teacherExportButton.disabled = true;
  exportMenuButton.disabled = true;
  generateButton.disabled = true;
  showLoading(
    teacherId
      ? `Loading all subject ratings for ${teacherName}...`
      : "Loading all teacher and subject ratings for the selected period...",
  );
  try {
    if (!window.jspdf?.jsPDF || !window.JSZip)
      throw new Error("The ZIP or PDF generator could not be loaded.");
    const response = await requestJson(
      "/api/report/rating/individual/bulk-export",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_year_id: schoolYearId,
          semester_id: semesterId,
          ...(teacherId ? { teacher_id: teacherId } : {}),
        }),
      },
    );
    const reports = groupBulkReports(
      response.data?.ratings || [],
      response.data?.comments || [],
    );
    if (!reports.length)
      throw new Error(
        "No completed individual ratings were found for this period.",
      );

    const logos = { ndmu: null, green: null };
    try {
      [logos.ndmu, logos.green] = await Promise.all([
        reportImageData("../../images/NDMU-Logo.png"),
        reportImageData("../../images/green-university.jpg"),
      ]);
    } catch (error) {
      console.warn("ZIP report logos were not loaded:", error);
    }
    const means = calculateTeacherMeans(reports);
    const zip = new JSZip();
    for (let index = 0; index < reports.length; index += 1) {
      const report = reports[index];
      document.getElementById("loadingMessage").textContent =
        `Preparing ${index + 1} of ${reports.length} subject reports...`;
      const teacherFolder = teacherId
        ? zip
        : zip.folder(safeFileName(report.teacherName, "Teacher"));
      const fileName = `SATP Individual Rating Report - ${safeFileName(report.subjectCode, "Subject")} - ${safeFileName(report.subjectName, "Rating")}.pdf`;
      teacherFolder.file(
        fileName,
        buildRatingPdf(report, means.get(String(report.teacherId)) || 0, logos),
      );
      if ((index + 1) % 5 === 0)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    document.getElementById("loadingMessage").textContent =
      "Compressing the PDF reports...";
    const zipBlob = await zip.generateAsync(
      {
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      },
      ({ percent }) => {
        document.getElementById("loadingMessage").textContent =
          `Compressing reports... ${Math.round(percent)}%`;
      },
    );
    saveZipBlob(
      zipBlob,
      `SATP Individual Rating Reports - ${teacherId ? safeFileName(teacherName, "Teacher") : "All Teachers"} - ${safeFileName(schoolYearName)} - ${safeFileName(semesterName)}.zip`,
    );
    showToast(
      teacherId
        ? `${reports.length} subject reports for ${teacherName} were exported successfully.`
        : `${reports.length} subject reports for all teachers were exported successfully.`,
    );
  } catch (error) {
    showToast(
      error.message || "Unable to export the individual rating reports.",
    );
  } finally {
    hideLoading();
    bulkExportButton.disabled = false;
    updateTeacherExportState();
    exportMenuButton.disabled = false;
    generateButton.disabled = false;
  }
}

function exportAllIndividualRatings(options) {
  return exportIndividualRatings(options);
}

function exportTeacherIndividualRatings(options) {
  return exportIndividualRatings(options);
}
