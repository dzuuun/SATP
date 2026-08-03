"use strict";

const state = {
  userId: localStorage.getItem("user_id"),
  reportsAccess: localStorage.getItem("reportsAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
  schoolYearId: localStorage.getItem("genReportSchoolYear"),
  semesterId: localStorage.getItem("genReportSemester"),
  teachingStatus: localStorage.getItem("genReportTeachingStatus"),
  departmentId: localStorage.getItem("genReportDepartment"),
  rows: [],
  departmentCode: "Department",
};

if (!state.userId) {
  alert("Log in to continue.");
  location.href = "../../../index.html";
} else if (state.reportsAccess == 0) {
  alert("You don't have permission to access this page.");
  history.back();
} else if (!state.schoolYearId || !state.semesterId || !state.departmentId) {
  alert("Select the report filters before opening this report.");
  location.href = "../index.html";
}

const teachingStatusTitles = {
  0: "Department ranking result of teachers with full-time load",
  1: "Department ranking result of teachers with part-time load",
  2: "Department ranking result of teachers with NTPO and admin load",
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

async function loadReport() {
  toggleModal("loadingModal", true);
  try {
    const [departmentResponse, rankingResponse] = await Promise.all([
      requestJson(`/api/department/${encodeURIComponent(state.departmentId)}`),
      requestJson("/api/report/ranking/departmental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_year_id: state.schoolYearId,
          semester_id: state.semesterId,
          is_part_time: state.teachingStatus,
          departments_id: state.departmentId,
        }),
      }),
    ]);
    const department = departmentResponse.data || {};
    state.departmentCode =
      department.department_code || department.code || "Department";
    state.rows = rankingResponse.data || [];
    renderReport();
  } catch (error) {
    showToast(
      error.message || "Unable to prepare the department ranking report.",
    );
    showEmptyState();
  } finally {
    toggleModal("loadingModal", false);
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
    teachingStatusTitles[state.teachingStatus] || "Department ranking result";
  if (!state.rows.length) return showEmptyState();

  const first = state.rows[0];
  document.getElementById("collegeHeader").textContent = first.college || "—";
  document.getElementById("departmentHeader").textContent =
    first.department || state.departmentCode;
  document.getElementById("schoolYear").textContent = first.school_year || "—";
  document.getElementById("semester").textContent = first.semester || "—";
  document.getElementById("mean").textContent = average(
    state.rows.map((row) => Number(row.mean)),
  ).toFixed(2);
  document.getElementById("tbData").innerHTML = state.rows
    .map(
      (row, index) => `<tr>
    <td>${index + 1}</td><td>${escapeHtml(row.teacher_name)}</td><td>${Number(row.mean).toFixed(2)}</td>
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
  const valid = numbers.filter(Number.isFinite);
  return valid.length
    ? valid.reduce((sum, value) => sum + value, 0) / valid.length
    : 0;
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
  const label = button.querySelector("span");
  button.disabled = true;
  label.textContent = "Preparing PDF...";
  try {
    if (!window.jspdf?.jsPDF)
      throw new Error("The PDF generator could not be loaded.");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    try {
      const [ndmuLogo, greenLogo] = await Promise.all([
        imageAsDataUrl("../../../images/NDMU-Logo.png"),
        imageAsDataUrl("../../../images/green-university.jpg"),
      ]);
      pdf.addImage(ndmuLogo, "PNG", 18, 10, 24, 24);
      pdf.addImage(greenLogo, "JPEG", pageWidth - 47, 11, 29, 22);
    } catch (error) {
      console.warn("PDF logos were not added:", error);
    }

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
    pdf.text(
      document.getElementById("reportTitle").textContent.toUpperCase(),
      pageWidth / 2,
      50,
      { align: "center" },
    );

    const college = document.getElementById("collegeHeader").textContent;
    const department = document.getElementById("departmentHeader").textContent;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`College: ${college}`, 18, 58);
    pdf.text(`Department: ${department}`, 112, 58);
    pdf.text(
      `School year: ${document.getElementById("schoolYear").textContent}`,
      18,
      63,
    );
    pdf.text(
      `Semester: ${document.getElementById("semester").textContent}`,
      112,
      63,
    );
    pdf.text(
      `Date generated: ${document.getElementById("dateGenerated").textContent}`,
      18,
      68,
    );
    pdf.setFont("helvetica", "bold");
    pdf.text(
      `Overall mean: ${document.getElementById("mean").textContent}`,
      pageWidth - 18,
      68,
      { align: "right" },
    );

    pdf.autoTable({
      startY: 72,
      margin: { left: 18, right: 18, bottom: 16 },
      head: [["Rank", "Teacher", "General mean", "Qualitative equivalent"]],
      body: state.rows.map((row, index) => [
        index + 1,
        row.teacher_name || "",
        Number(row.mean).toFixed(2),
        getQualitativeEquivalent(Number(row.mean)),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [7, 92, 59],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7.5,
      },
      bodyStyles: { textColor: [30, 42, 35], fontSize: 7.5, cellPadding: 2.4 },
      alternateRowStyles: { fillColor: [246, 249, 247] },
      columnStyles: {
        0: { halign: "center", cellWidth: 15 },
        1: { cellWidth: 80 },
        2: { halign: "center", cellWidth: 30 },
        3: { cellWidth: 49 },
      },
      didDrawPage: () => {
        const height = pdf.internal.pageSize.getHeight();
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(100);
        pdf.text("SATP Department Ranking Report", 18, height - 7);
        pdf.text(
          `Page ${pdf.internal.getNumberOfPages()}`,
          pageWidth - 18,
          height - 7,
          { align: "right" },
        );
      },
    });
    const safeCode = state.departmentCode.replace(/[\\/:*?"<>|]/g, "-");
    pdf.save(
      `SATP Department Ranking Report - ${safeCode} - ${new Date().toISOString().slice(0, 10)}.pdf`,
    );
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
    document
      .querySelector('#mySidenav a[href="/report/ranking/index.html"]')
      ?.classList.add("sub-active");
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

document
  .getElementById("downloadButton")
  .addEventListener("click", downloadPdf);
document
  .getElementById("printButton")
  .addEventListener("click", () => window.print());
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
  loadReport();
});
