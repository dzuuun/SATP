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

function formatMean(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return (Math.round((number + Number.EPSILON) * 100) / 100).toFixed(2);
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

function buildRatingPdf(
  report,
  teacherMean,
  logos,
  ratingType = "individual",
) {
  const reportLabel =
    ratingType === "institutional" ? "Institutional" : "Individual";
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
  pdf.text(`${reportLabel.toUpperCase()} RATING REPORT`, pageWidth / 2, 50, {
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
    `Course: ${report.subjectCode} - ${report.subjectName}`,
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
        formatMean(item.mean),
      ]),
    );
    tableBody.push([
      {
        content: "Category average",
        styles: { halign: "right", fontStyle: "bold" },
      },
      {
        content: formatMean(numericAverage(items.map((item) => item.mean))),
        styles: { fontStyle: "bold" },
      },
    ]);
  });
  const subjectMean = numericAverage(report.items.map((item) => item.mean));
  tableBody.push([
    {
      content: "Course average",
      styles: { halign: "right", fontStyle: "bold" },
    },
    { content: formatMean(subjectMean), styles: { fontStyle: "bold" } },
  ]);
  tableBody.push([
    {
      content: "Teacher mean",
      styles: { halign: "right", fontStyle: "bold" },
    },
    { content: formatMean(teacherMean), styles: { fontStyle: "bold" } },
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
      pdf.text(`SATP ${reportLabel} Rating Report`, 18, pageHeight - 7);
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
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 30000);
}

function bulkEscapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value ?? "";
  return element.innerHTML;
}

function buildBulkRatingReportElement(report, teacherMean, reportLabel) {
  const categories = new Map();
  report.items.forEach((item) => {
    if (!categories.has(item.category)) categories.set(item.category, []);
    categories.get(item.category).push(item);
  });
  const rows = [];
  categories.forEach((items, category) => {
    rows.push(`<tr class="category-row"><th colspan="2">${bulkEscapeHtml(category)}</th></tr>`);
    items.forEach((item) => rows.push(`<tr><td>${bulkEscapeHtml(item.number)}. ${bulkEscapeHtml(item.question)}</td><td>${formatMean(item.mean)}</td></tr>`));
    rows.push(`<tr class="average-row"><td>Category Average: </td><td>${formatMean(numericAverage(items.map((item) => item.mean)))}</td></tr>`);
  });
  const subjectMean = numericAverage(report.items.map((item) => item.mean));
  rows.push(`<tr class="average-row"><td>Course Average: </td><td>${formatMean(subjectMean)}</td></tr>`);
  rows.push(`<tr class="average-row"><td>Your Mean: </td><td>${formatMean(teacherMean)}</td></tr>`);
  rows.push(`<tr class="average-row"><td>Qualitative Equivalent: </td><td>${bulkEscapeHtml(qualitativeEquivalent(teacherMean))}</td></tr>`);
  const comments = report.comments.length
    ? `<section class="comments-section"><h4>Comments:</h4><div>${report.comments.map((comment) => `<p class="comment-entry">${bulkEscapeHtml(comment)}</p>`).join("")}</div></section>`
    : "";
  const element = document.createElement("article");
  element.className = "report-sheet";
  element.innerHTML = `
    <header class="document-header">
      <img src="../../images/NDMU-Logo.png" alt="NDMU seal">
      <div><p>JMJ Marist Brothers</p><h2>Notre Dame of Marbel University</h2><p>Alunan Avenue, City of Koronadal 9506</p><p>South Cotabato, Philippines</p></div>
      <img src="../../images/green-university.jpg" alt="Green University">
    </header>
    <section class="document-title"><p>Student Assessment of Teacher's Performance</p><h3>${reportLabel} Rating Report</h3></section>
    <section class="report-details individual-rating-details" aria-label="Report details">
      <div><span>Teacher</span><strong>${bulkEscapeHtml(report.teacherName)}</strong></div>
      <div><span>School Year</span><strong>${bulkEscapeHtml(report.schoolYear)}</strong></div>
      <div><span>Semester</span><strong>${bulkEscapeHtml(report.semester)}</strong></div>
      <div><span>College</span><strong>${bulkEscapeHtml(report.college)}</strong></div>
      <div><span>Department</span><strong>${bulkEscapeHtml(report.department)}</strong></div>
      <div><span>Course</span><strong>${bulkEscapeHtml(report.subjectCode)} - ${bulkEscapeHtml(report.subjectName)}</strong></div>
      <div><span>Respondents</span><strong>${report.respondents}</strong></div>
      <div><span>Date Generated</span><strong>${new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "long", day: "numeric" }).format(new Date())}</strong></div>
    </section>
    <div class="mean-summary"><span>Course Average:</span><strong>${formatMean(subjectMean)}</strong></div>
    <div class="report-table-wrap"><table class="rating-table" aria-label="${reportLabel} rating results"><thead><tr><th>Criteria</th><th>Item Average</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
    ${comments}
    <footer class="document-footer"><span>SATP ${reportLabel} Rating Report</span><span>Notre Dame of Marbel University</span></footer>`;
  return element;
}

async function exportIndividualRatings({
  ratingType = "individual",
  schoolYearId,
  semesterId,
  schoolYearName,
  semesterName,
  teacherId = null,
  teacherName = "",
}) {
  const reportLabel =
    ratingType === "institutional" ? "Institutional" : "Individual";
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
      ? `Loading all course ratings for ${teacherName}...`
      : "Loading all teacher and course ratings for the selected period...",
  );
  try {
    if (typeof html2pdf === "undefined" || !window.JSZip)
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
        `No completed ${reportLabel.toLowerCase()} ratings were found for this period.`,
      );

    const means = calculateTeacherMeans(reports);
    const zip = new JSZip();
    for (let index = 0; index < reports.length; index += 1) {
      const report = reports[index];
      document.getElementById("loadingMessage").textContent =
        `Preparing ${index + 1} of ${reports.length} course reports...`;
      const teacherFolder = teacherId
        ? zip
        : zip.folder(safeFileName(report.teacherName, "Teacher"));
      const fileName = `SATP ${reportLabel} Rating Report - ${safeFileName(report.subjectCode, "Course")} - ${safeFileName(report.subjectName, "Rating")}.pdf`;
      const teacherMean = means.get(String(report.teacherId)) || 0;
      const reportElement = buildBulkRatingReportElement(
        report,
        teacherMean,
        reportLabel,
      );
      const pdfBlob = await renderReportPdf({
        element: reportElement,
        filename: fileName,
        save: false,
      });
      teacherFolder.file(fileName, pdfBlob);
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
      `SATP ${reportLabel} Rating Reports - ${teacherId ? safeFileName(teacherName, "Teacher") : "All Teachers"} - ${safeFileName(schoolYearName)} - ${safeFileName(semesterName)}.zip`,
    );
    await window.satpLogReportGeneration?.({
      category: "rating",
      reportType: ratingType,
      bulk: true,
      schoolYearId,
      semesterId,
      teacherId,
    });
    showToast(
      teacherId
        ? `${reports.length} course reports for ${teacherName} were exported successfully.`
        : `${reports.length} course reports for all teachers were exported successfully.`,
    );
  } catch (error) {
    showToast(
      error.message ||
        `Unable to export the ${reportLabel.toLowerCase()} rating reports.`,
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
