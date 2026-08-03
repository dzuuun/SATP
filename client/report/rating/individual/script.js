"use strict";

const reportConfig = {
  title: "Individual Rating Report",
  loadingDescription: "Loading the individual rating...",
  ...window.ratingReportConfig,
};

const state = {
  userId: localStorage.getItem("user_id"),
  reportsAccess: localStorage.getItem("reportsAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
  schoolYearId: localStorage.getItem("genReportSchoolYear"),
  semesterId: localStorage.getItem("genReportSemester"),
  teacherId: localStorage.getItem("genReportteacher"),
  subjectId: localStorage.getItem("genReportSubject"),
  rows: [],
  comments: [],
  teacher: null,
};

if (!state.userId) {
  alert("Log in to continue.");
  location.href = "../../../index.html";
} else if (state.reportsAccess == 0) {
  alert("You don't have permission to access this page.");
  history.back();
} else if (!state.schoolYearId || !state.semesterId || !state.teacherId || !state.subjectId) {
  alert("Select the report filters before opening this report.");
  location.href = "../index.html";
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Request failed with status ${response.status}.`);
  return response.json();
}

function postJson(url, body) {
  return requestJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value ?? "";
  return span.innerHTML;
}

function average(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : 0;
}

function getQualitativeEquivalent(score) {
  if (score >= 1 && score <= 1.5) return "Poor";
  if (score > 1.51 && score <= 2.24) return "Fair";
  if (score > 2.25 && score <= 3.75) return "Satisfactory";
  if (score > 3.76 && score <= 4.49) return "Very Satisfactory";
  if (score >= 4.5 && score <= 5) return "Excellent";
  return "Invalid Score";
}

function groupedRows() {
  const groups = new Map();
  state.rows.forEach((row) => {
    if (!groups.has(row.category)) groups.set(row.category, []);
    groups.get(row.category).push(row);
  });
  return groups;
}

async function loadReport() {
  toggleModal("loadingModal", true);
  const periodQuery = {
    school_year_id: state.schoolYearId,
    semester_id: state.semesterId,
    teacher_id: state.teacherId,
  };
  const reportQuery = { ...periodQuery, subject_id: state.subjectId };
  try {
    const [ratingResponse, teacherResponse, commentResponse] = await Promise.all([
      postJson("/api/report/rating/individual", reportQuery),
      postJson("/api/report/rating/teacher/information", periodQuery),
      postJson("/api/report/rating/comment", reportQuery),
    ]);
    state.rows = ratingResponse.data || [];
    state.teacher = teacherResponse.data || null;
    state.comments = commentResponse.data || [];
    renderReport();
  } catch (error) {
    showToast(error.message || `Unable to prepare the ${reportConfig.title.toLowerCase()}.`);
    showEmptyState();
  } finally {
    toggleModal("loadingModal", false);
  }
}

function renderReport() {
  document.getElementById("dateGenerated").textContent = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
  if (!state.rows.length) return showEmptyState();

  const first = state.rows[0];
  const teacherInfo = state.teacher || first;
  const subjectMean = average(state.rows.map((row) => row.mean));
  const teacherMean = Number(teacherInfo.mean);
  const displayedTeacherMean = Number.isFinite(teacherMean) ? teacherMean : subjectMean;

  document.getElementById("teacher").textContent = teacherInfo.teacher_name || first.teacher_name || "—";
  document.getElementById("schoolYear").textContent = teacherInfo.school_year || first.school_year || "—";
  document.getElementById("semester").textContent = teacherInfo.semester || first.semester || "—";
  document.getElementById("college").textContent = teacherInfo.college || first.college || "—";
  document.getElementById("department").textContent = teacherInfo.department || first.department || "—";
  document.getElementById("subject").textContent = first.subject || "—";
  document.getElementById("respondents").textContent = Number(first.respondents) || 0;
  document.getElementById("subjectAverage").textContent = subjectMean.toFixed(2);

  const html = [];
  groupedRows().forEach((items, category) => {
    html.push(`<tr class="category-row"><th colspan="2">${escapeHtml(category)}</th></tr>`);
    items.forEach((item) => {
      html.push(`<tr><td>${escapeHtml(item.number)}. ${escapeHtml(item.question)}</td><td>${Number(item.mean).toFixed(2)}</td></tr>`);
    });
    html.push(`<tr class="average-row"><td>Category Average: </td><td>${average(items.map((item) => item.mean)).toFixed(2)}</td></tr>`);
  });
  html.push(`<tr class="average-row"><td>Subject Average: </td><td>${subjectMean.toFixed(2)}</td></tr>`);
  html.push(`<tr class="average-row"><td>Your Mean: </td><td>${displayedTeacherMean.toFixed(2)}</td></tr>`);
  html.push(`<tr class="average-row"><td>Qualitative Equivalent: </td><td>${escapeHtml(getQualitativeEquivalent(displayedTeacherMean))}</td></tr>`);
  document.getElementById("tbData").innerHTML = html.join("");

  if (state.comments.length) {
    document.getElementById("commentSection").classList.remove("hidden");
    document.getElementById("comments").innerHTML = state.comments
      .map((row) => `<p class="comment-entry">${escapeHtml(row.comment)}</p>`)
      .join("");
  }
  document.getElementById("downloadButton").disabled = false;
  document.getElementById("printButton").disabled = false;
}

function showEmptyState() {
  document.getElementById("table").classList.add("hidden");
  document.getElementById("emptyState").classList.remove("hidden");
}

async function imageData(url) {
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

function appendPdfComments(pdf) {
  if (!state.comments.length) return;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = (pdf.lastAutoTable?.finalY || 80) + 10;
  if (y > pageHeight - 30) {
    pdf.addPage();
    y = 20;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Comments:", 18, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  state.comments.forEach((row, index) => {
    const lines = pdf.splitTextToSize(`${index + 1}. ${row.comment}`, pageWidth - 36);
    if (y + lines.length * 4 > pageHeight - 15) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(lines, 18, y);
    y += lines.length * 4 + 3;
  });
}

function addPdfDetail(pdf, label, value, y, width) {
  const lines = pdf.splitTextToSize(`${label}: ${value}`, width);
  pdf.text(lines, 18, y);
  return y + lines.length * 4 + 1;
}

async function downloadPdf() {
  if (!state.rows.length) return;
  const button = document.getElementById("downloadButton");
  const label = button.querySelector("span");
  button.disabled = true;
  label.textContent = "Preparing PDF...";
  try {
    if (!window.jspdf?.jsPDF) throw new Error("The PDF generator could not be loaded.");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    try {
      const [ndmu, green] = await Promise.all([
        imageData("../../../images/NDMU-Logo.png"),
        imageData("../../../images/green-university.jpg"),
      ]);
      pdf.addImage(ndmu, "PNG", 18, 10, 24, 24);
      pdf.addImage(green, "JPEG", pageWidth - 47, 11, 29, 22);
    } catch (error) {
      console.warn("PDF logos were not added:", error);
    }
    pdf.setTextColor(20, 40, 30);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("NOTRE DAME OF MARBEL UNIVERSITY", pageWidth / 2, 14, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Alunan Avenue, City of Koronadal 9506", pageWidth / 2, 19, { align: "center" });
    pdf.text("South Cotabato, Philippines", pageWidth / 2, 23, { align: "center" });
    pdf.setDrawColor(7, 92, 59);
    pdf.line(18, 37, pageWidth - 18, 37);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("STUDENT ASSESSMENT OF TEACHER'S PERFORMANCE", pageWidth / 2, 44, { align: "center" });
    pdf.setFontSize(10);
    pdf.text(reportConfig.title.toUpperCase(), pageWidth / 2, 50, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    let detailY = 58;
    detailY = addPdfDetail(pdf, "Teacher", document.getElementById("teacher").textContent, detailY, pageWidth - 36);
    detailY = addPdfDetail(pdf, "College", document.getElementById("college").textContent, detailY, pageWidth - 36);
    detailY = addPdfDetail(pdf, "Department", document.getElementById("department").textContent, detailY, pageWidth - 36);
    detailY = addPdfDetail(pdf, "Subject", document.getElementById("subject").textContent, detailY, pageWidth - 36);
    pdf.text(`School Year: ${document.getElementById("schoolYear").textContent}`, 18, detailY);
    pdf.text(`Semester: ${document.getElementById("semester").textContent}`, 112, detailY);
    detailY += 5;
    pdf.text(`Respondents: ${document.getElementById("respondents").textContent}`, 18, detailY);
    pdf.text(`Date Generated: ${document.getElementById("dateGenerated").textContent}`, 112, detailY);
    detailY += 5;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Subject Average: ${document.getElementById("subjectAverage").textContent}`, pageWidth - 18, detailY, { align: "right" });

    const teacherMean = Number(state.teacher?.mean);
    const subjectMean = average(state.rows.map((row) => row.mean));
    const displayedTeacherMean = Number.isFinite(teacherMean) ? teacherMean : subjectMean;
    const body = [];
    groupedRows().forEach((items, category) => {
      body.push([{ content: category, colSpan: 2, styles: { fillColor: [234, 243, 237], textColor: [7, 92, 59], fontStyle: "bold" } }]);
      items.forEach((item) => body.push([`${item.number}. ${item.question}`, Number(item.mean).toFixed(2)]));
      body.push([{ content: "Category Average: ", styles: { halign: "right", fontStyle: "bold" } }, { content: average(items.map((item) => item.mean)).toFixed(2), styles: { fontStyle: "bold" } }]);
    });
    body.push([{ content: "Subject Average: ", styles: { halign: "right", fontStyle: "bold" } }, { content: subjectMean.toFixed(2), styles: { fontStyle: "bold" } }]);
    body.push([{ content: "Your Mean: ", styles: { halign: "right", fontStyle: "bold" } }, { content: displayedTeacherMean.toFixed(2), styles: { fontStyle: "bold" } }]);
    body.push([{ content: "Qualitative Equivalent: ", styles: { halign: "right", fontStyle: "bold" } }, { content: getQualitativeEquivalent(displayedTeacherMean), styles: { fontStyle: "bold" } }]);

    pdf.autoTable({
      startY: detailY + 5,
      margin: { left: 18, right: 18, bottom: 18 },
      head: [["Criteria", "Item Average"]],
      body,
      theme: "grid",
      headStyles: { fillColor: [7, 92, 59], textColor: 255, fontStyle: "bold", fontSize: 7.5, overflow: "linebreak" },
      bodyStyles: { textColor: [30, 42, 35], fontSize: 7.2, cellPadding: 2.1, overflow: "linebreak" },
      columnStyles: { 0: { cellWidth: 142 }, 1: { cellWidth: 26, halign: "center" } },
      didDrawPage: () => {
        const height = pdf.internal.pageSize.getHeight();
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(100);
        pdf.text(`SATP ${reportConfig.title}`, 18, height - 7);
        pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageWidth - 18, height - 7, { align: "right" });
      },
    });
    appendPdfComments(pdf);
    const teacherName = document.getElementById("teacher").textContent.replace(/[\\/:*?"<>|]/g, "-");
    const subjectName = document.getElementById("subject").textContent.replace(/[\\/:*?"<>|]/g, "-");
    pdf.save(`SATP ${reportConfig.title} - ${teacherName} - ${subjectName} - ${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    showToast(error.message || "Unable to generate the PDF report.");
  } finally {
    button.disabled = false;
    label.textContent = "Download PDF";
  }
}

function toggleModal(id, show = true) {
  const modal = document.getElementById(id);
  const card = document.getElementById(`${id}Card`);
  if (show) {
    modal.classList.remove("invisible");
    document.body.classList.add("overflow-hidden");
    requestAnimationFrame(() => {
      modal.classList.add("opacity-100");
      card?.classList.replace("scale-95", "scale-100");
    });
  } else {
    modal.classList.remove("opacity-100");
    card?.classList.replace("scale-100", "scale-95");
    setTimeout(() => modal.classList.add("invisible"), 250);
    document.body.classList.remove("overflow-hidden");
  }
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "category-toast";
  toast.innerHTML = '<span class="toast-symbol"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><span></span>';
  toast.lastElementChild.textContent = message;
  document.getElementById("toast-container").replaceChildren(toast);
  setTimeout(() => toast.remove(), 4000);
}

function toggleNav() {
  const side = document.getElementById("mySidenav");
  if (!side) return;
  const open = side.style.width === "280px";
  side.style.width = open ? "0" : "280px";
  document.getElementById("main").style.marginLeft = innerWidth <= 760 || open ? "0" : "280px";
}

async function loadSidebar() {
  try {
    const container = document.getElementById("sidebar-container");
    container.innerHTML = await (await fetch("/sidebar.html")).text();
    const name = document.getElementById("sidebar-fullname");
    if (name) name.textContent = state.fullname || state.username || "User";
    document.querySelectorAll(".menu-toggle").forEach((toggle) => toggle.addEventListener("click", function () {
      const menu = document.getElementById(this.dataset.target);
      menu?.classList.toggle("hidden");
      const hidden = menu?.classList.contains("hidden");
      this.setAttribute("aria-expanded", String(!hidden));
      const arrow = this.querySelector(".chevron");
      if (arrow) arrow.style.transform = hidden ? "rotate(0deg)" : "rotate(180deg)";
    }));
    document.querySelector('#mySidenav a[href="/report/rating/index.html"]')?.classList.add("sub-active");
    const menu = document.getElementById("dropdown-rating");
    menu?.classList.remove("hidden");
    const toggle = document.querySelector('[data-target="dropdown-rating"]');
    toggle?.setAttribute("aria-expanded", "true");
    const arrow = toggle?.querySelector(".chevron");
    if (arrow) arrow.style.transform = "rotate(180deg)";
    document.getElementById("signout")?.addEventListener("click", () => {
      localStorage.clear();
      location.href = "../../../index.html";
    });
  } catch (error) {
    console.error("Sidebar failed:", error);
  }
}

document.getElementById("downloadButton").addEventListener("click", downloadPdf);
document.getElementById("printButton").addEventListener("click", () => window.print());
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
  loadReport();
});
