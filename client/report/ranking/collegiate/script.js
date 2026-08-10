"use strict";

const state = {
  userId: localStorage.getItem("user_id"),
  reportsAccess: localStorage.getItem("reportsAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
  schoolYearId: localStorage.getItem("genReportSchoolYear"),
  semesterId: localStorage.getItem("genReportSemester"),
  teachingStatus: localStorage.getItem("genReportTeachingStatus"),
  collegeId: localStorage.getItem("genReportCollege"),
  rows: [],
  collegeCode: "College",
};

if (!state.userId) {
  alert("Log in to continue.");
  location.href = "../../../index.html";
} else if (state.reportsAccess == 0) {
  alert("You don't have permission to access this page.");
  history.back();
} else if (!state.schoolYearId || !state.semesterId || !state.collegeId) {
  alert("Select the report filters before opening this report.");
  location.href = "../index.html";
}

const teachingStatusTitles = {
  0: "College ranking result of teachers with full-time load",
  1: "College ranking result of teachers with part-time load",
  2: "College ranking result of teachers with NTPO and admin load",
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok)
    throw new Error(`Request failed with status ${response.status}.`);
  return response.json();
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value ?? "";
  return span.innerHTML;
}

function formatMean(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return (Math.round((number + Number.EPSILON) * 100) / 100).toFixed(2);
}

async function loadReport() {
  showLoading();
  try {
    const query = {
      school_year_id: state.schoolYearId,
      semester_id: state.semesterId,
      is_part_time: state.teachingStatus,
      colleges_id: state.collegeId,
    };
    const [collegeResponse, rankingResponse] = await Promise.all([
      requestJson(`/api/college/${encodeURIComponent(state.collegeId)}`),
      requestJson("/api/report/ranking/collegiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      }),
    ]);

    state.collegeCode = collegeResponse.data?.code || "College";
    state.rows = rankingResponse.data || [];
    renderReport();
  } catch (error) {
    showToast(error.message || "Unable to prepare the college ranking report.");
    showEmptyState();
  } finally {
    hideLoading();
  }
}

function renderReport() {
  document.getElementById("dateGenerated").textContent =
    new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());
  document.getElementById("reportTitle").textContent =
    teachingStatusTitles[state.teachingStatus] || "College ranking result";

  if (!state.rows.length) {
    showEmptyState();
    return;
  }

  const first = state.rows[0];
  document.getElementById("collegeHeader").textContent =
    first.college || state.collegeCode;
  document.getElementById("schoolYear").textContent = first.school_year || "—";
  document.getElementById("semester").textContent = first.semester || "—";
  document.getElementById("mean").textContent = formatMean(
    average(state.rows.map((row) => Number(row.mean))),
  );
  document.getElementById("tbData").innerHTML = state.rows
    .map(
      (row, index) => `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.teacher_name)}</td>
        <td>${escapeHtml(row.department)}</td>
        <td>${formatMean(row.mean)}</td>
        <td><span class="qualitative-badge">${getQualitativeEquivalent(Number(row.mean))}</span></td>
      </tr>`,
    )
    .join("");
  document.getElementById("downloadButton").disabled = false;
  document.getElementById("printButton").disabled = false;
}

function showEmptyState() {
  document.getElementById("table").classList.add("hidden");
  document.getElementById("emptyState").classList.remove("hidden");
  document.getElementById("mean").textContent = "—";
}

function getQualitativeEquivalent(score) {
  if (score < 1 || score > 5 || !Number.isFinite(score)) return "Invalid score";
  if (score <= 1.5) return "Poor";
  if (score <= 2.25) return "Fair";
  if (score <= 3.75) return "Satisfactory";
  if (score < 4.5) return "Very Satisfactory";
  return "Excellent";
}

function average(numbers) {
  const validNumbers = numbers.filter(Number.isFinite);
  if (!validNumbers.length) return 0;
  return (
    validNumbers.reduce((sum, value) => sum + value, 0) / validNumbers.length
  );
}

async function imageAsDataUrl(url) {
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

async function downloadPdf() {
  if (!state.rows.length) return;
  const button = document.getElementById("downloadButton");
  const buttonLabel = button.querySelector("span");
  button.disabled = true;
  buttonLabel.textContent = "Preparing PDF...";

  try {
    if (!window.jspdf?.jsPDF)
      throw new Error("The PDF generator could not be loaded.");
    const { jsPDF } = window.jspdf;
    const documentPdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });
    const pageWidth = documentPdf.internal.pageSize.getWidth();
    const reportDate = document.getElementById("dateGenerated").textContent;
    const collegeName = document.getElementById("collegeHeader").textContent;
    const schoolYear = document.getElementById("schoolYear").textContent;
    const semester = document.getElementById("semester").textContent;
    const overallMean = document.getElementById("mean").textContent;

    try {
      const [ndmuLogo, greenUniversityLogo] = await Promise.all([
        imageAsDataUrl("../../../images/NDMU-Logo.png"),
        imageAsDataUrl("../../../images/green-university.jpg"),
      ]);
      documentPdf.addImage(ndmuLogo, "PNG", 18, 10, 24, 24);
      documentPdf.addImage(
        greenUniversityLogo,
        "JPEG",
        pageWidth - 47,
        11,
        29,
        22,
      );
    } catch (error) {
      console.warn("PDF logos were not added:", error);
    }

    documentPdf.setTextColor(20, 40, 30);
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(13);
    documentPdf.text(
      "NOTRE DAME OF MARBEL UNIVERSITY",
      pageWidth / 2,
      14,
      { align: "center" },
    );
    documentPdf.setFont("helvetica", "normal");
    documentPdf.setFontSize(8);
    documentPdf.text(
      "Alunan Avenue, City of Koronadal 9506",
      pageWidth / 2,
      19,
      { align: "center" },
    );
    documentPdf.text("South Cotabato, Philippines", pageWidth / 2, 23, {
      align: "center",
    });
    documentPdf.setDrawColor(7, 92, 59);
    documentPdf.setLineWidth(0.5);
    documentPdf.line(18, 37, pageWidth - 18, 37);

    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(9);
    documentPdf.text(
      "STUDENT ASSESSMENT OF TEACHER'S PERFORMANCE",
      pageWidth / 2,
      44,
      { align: "center" },
    );
    documentPdf.setFontSize(10);
    documentPdf.text(
      document.getElementById("reportTitle").textContent.toUpperCase(),
      pageWidth / 2,
      50,
      { align: "center" },
    );

    documentPdf.setFontSize(8);
    documentPdf.setFont("helvetica", "normal");
    documentPdf.text(`College: ${collegeName}`, 18, 58);
    documentPdf.text(`School year: ${schoolYear}`, 112, 58);
    documentPdf.text(`Semester: ${semester}`, 18, 63);
    documentPdf.text(`Date generated: ${reportDate}`, 112, 63);
    documentPdf.setFont("helvetica", "bold");
    documentPdf.text(`Overall mean: ${overallMean}`, pageWidth - 18, 69, {
      align: "right",
    });

    documentPdf.autoTable({
      startY: 73,
      margin: { left: 18, right: 18, bottom: 16 },
      head: [
        [
          "Rank",
          "Teacher",
          "Department",
          "General mean",
          "Qualitative equivalent",
        ],
      ],
      body: state.rows.map((row, index) => [
        index + 1,
        row.teacher_name || "",
        row.department || "",
        formatMean(row.mean),
        getQualitativeEquivalent(Number(row.mean)),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [7, 92, 59],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7.5,
      },
      bodyStyles: {
        textColor: [30, 42, 35],
        fontSize: 7.5,
        cellPadding: 2.4,
      },
      alternateRowStyles: { fillColor: [246, 249, 247] },
      columnStyles: {
        0: { halign: "center", cellWidth: 13 },
        1: { cellWidth: 48 },
        2: { cellWidth: 48 },
        3: { halign: "center", cellWidth: 25 },
        4: { cellWidth: 40 },
      },
      didDrawPage: () => {
        const pageNumber = documentPdf.internal.getNumberOfPages();
        const pageHeight = documentPdf.internal.pageSize.getHeight();
        documentPdf.setFont("helvetica", "normal");
        documentPdf.setFontSize(7);
        documentPdf.setTextColor(100);
        documentPdf.text("SATP College Ranking Report", 18, pageHeight - 7);
        documentPdf.text(`Page ${pageNumber}`, pageWidth - 18, pageHeight - 7, {
          align: "right",
        });
      },
    });

    const safeCollegeCode = state.collegeCode.replace(/[\\/:*?"<>|]/g, "-");
    documentPdf.save(
      `SATP College Ranking Report - ${safeCollegeCode} - ${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  } catch (error) {
    showToast(error.message || "Unable to generate the PDF report.");
  } finally {
    button.disabled = false;
    buttonLabel.textContent = "Download PDF";
  }
}

function showLoading() {
  toggleModal("loadingModal", true);
}

function hideLoading() {
  toggleModal("loadingModal", false);
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
  toast.innerHTML =
    '<span class="toast-symbol"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><span></span>';
  toast.lastElementChild.textContent = message;
  document.getElementById("toast-container").replaceChildren(toast);
  setTimeout(() => toast.remove(), 4000);
}

function toggleNav() {
  const side = document.getElementById("mySidenav");
  if (!side) return;
  const open = side.style.width === "280px";
  side.style.width = open ? "0" : "280px";
  document.getElementById("main").style.marginLeft =
    innerWidth <= 760 || open ? "0" : "280px";
}

async function loadSidebar() {
  try {
    const container = document.getElementById("sidebar-container");
    container.innerHTML = await (await fetch("/sidebar.html")).text();
    const name = document.getElementById("sidebar-fullname");
    if (name) name.textContent = state.fullname || state.username || "User";
    document.querySelectorAll(".menu-toggle").forEach((toggle) =>
      toggle.addEventListener("click", function () {
        const menu = document.getElementById(this.dataset.target);
        menu?.classList.toggle("hidden");
        const hidden = menu?.classList.contains("hidden");
        this.setAttribute("aria-expanded", String(!hidden));
        const arrow = this.querySelector(".chevron");
        if (arrow)
          arrow.style.transform = hidden ? "rotate(0deg)" : "rotate(180deg)";
      }),
    );
    const rankingLink = document.querySelector(
      '#mySidenav a[href="/report/ranking/index.html"]',
    );
    rankingLink?.classList.add("sub-active");
    const reportMenu = document.getElementById("dropdown-rating");
    reportMenu?.classList.remove("hidden");
    const reportToggle = document.querySelector(
      '[data-target="dropdown-rating"]',
    );
    reportToggle?.setAttribute("aria-expanded", "true");
    const arrow = reportToggle?.querySelector(".chevron");
    if (arrow) arrow.style.transform = "rotate(180deg)";
    document.getElementById("signout")?.addEventListener("click", () => {
      localStorage.clear();
      location.href = "../../../index.html";
    });
  } catch (error) {
    console.error("Sidebar failed:", error);
  }
}

document
  .getElementById("downloadButton")
  .addEventListener("click", async () => {
    if (!state.rows.length) return;
    const button = document.getElementById("downloadButton");
    const label = button.querySelector("span");
    const safeCollegeCode = state.collegeCode.replace(/[\\/:*?"<>|]/g, "-");
    button.disabled = true;
    label.textContent = "Preparing PDF...";
    try {
      await renderReportPdf({
        filename: `SATP College Ranking Report - ${safeCollegeCode} - ${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (error) {
      showToast(error.message || "Unable to generate the PDF report.");
    } finally {
      button.disabled = false;
      label.textContent = "Download PDF";
    }
  });
document
  .getElementById("printButton")
  .addEventListener("click", () => window.print());
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
  loadReport();
});
