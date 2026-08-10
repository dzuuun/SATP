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

function formatMean(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return (Math.round((number + Number.EPSILON) * 100) / 100).toFixed(2);
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
  document.getElementById("subjectAverage").textContent = formatMean(subjectMean);

  const html = [];
  groupedRows().forEach((items, category) => {
    html.push(`<tr class="category-row"><th colspan="2">${escapeHtml(category)}</th></tr>`);
    items.forEach((item) => {
      html.push(`<tr><td>${escapeHtml(item.number)}. ${escapeHtml(item.question)}</td><td>${formatMean(item.mean)}</td></tr>`);
    });
    html.push(`<tr class="average-row"><td>Category Average: </td><td>${formatMean(average(items.map((item) => item.mean)))}</td></tr>`);
  });
  html.push(`<tr class="average-row"><td>Course Average: </td><td>${formatMean(subjectMean)}</td></tr>`);
  html.push(`<tr class="average-row"><td>Your Mean: </td><td>${formatMean(displayedTeacherMean)}</td></tr>`);
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




async function downloadPdf() {
  if (!state.rows.length) return;

  const button = document.getElementById("downloadButton");
  const label = button.querySelector("span");
  const originalReport = document.getElementById("reportSheet");

  button.disabled = true;
  label.textContent = "Preparing PDF...";

  let exportContainer = null;

  try {
    if (typeof html2pdf === "undefined") {
      throw new Error("html2pdf could not be loaded.");
    }

    const teacherName = document
      .getElementById("teacher")
      .textContent.trim()
      .replace(/[\\/:*?"<>|]/g, "-");

    const subjectName = document
      .getElementById("subject")
      .textContent.trim()
      .replace(/[\\/:*?"<>|]/g, "-");

    const date = new Date().toISOString().slice(0, 10);

    /*
     * Clone the report so it is no longer affected by:
     * - sidebar width
     * - #main margin
     * - responsive styles
     * - parent transforms
     * - centered page offsets
     */
    const reportClone = originalReport.cloneNode(true);

    reportClone.removeAttribute("id");
    reportClone.classList.add("html2pdf-report");

    exportContainer = document.createElement("div");
    exportContainer.className = "html2pdf-container";
    exportContainer.appendChild(reportClone);

    document.body.appendChild(exportContainer);

    // Wait for cloned images to finish loading.
    const images = [...reportClone.querySelectorAll("img")];

    await Promise.all(
      images.map((image) => {
        if (image.complete) return Promise.resolve();

        return new Promise((resolve) => {
          image.onload = resolve;
          image.onerror = resolve;
        });
      }),
    );

    // Wait for fonts and layout.
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await new Promise((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(resolve),
      ),
    );

    const options = {
      margin: 0,

      filename:
        `SATP ${reportConfig.title} - ` +
        `${teacherName} - ${subjectName} - ${date}.pdf`,

      image: {
        type: "jpeg",
        quality: 0.98,
      },

      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,

        // Capture only the cloned report.
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,

        width: reportClone.scrollWidth,
        windowWidth: reportClone.scrollWidth,
      },

      jsPDF: {
        unit: "mm",
        format: "letter",
        orientation: "portrait",
      },

      pagebreak: {
        mode: ["css", "legacy"],
        avoid: [
          ".document-header",
          ".document-title",
          ".individual-rating-details",
          ".mean-summary",
          ".category-row",
          ".average-row",
          ".comment-entry",
        ],
      },
    };

    await html2pdf()
      .set(options)
      .from(reportClone)
      .save();
  } catch (error) {
    console.error("PDF generation error:", error);

    showToast(
      error.message || "Unable to generate the PDF report.",
    );
  } finally {
    exportContainer?.remove();

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

document.getElementById("downloadButton").addEventListener("click", async () => {
  if (!state.rows.length) return;
  const button = document.getElementById("downloadButton");
  const label = button.querySelector("span");
  const teacherName = document
    .getElementById("teacher")
    .textContent.trim()
    .replace(/[\\/:*?"<>|]/g, "-");
  const subjectName = document
    .getElementById("subject")
    .textContent.trim()
    .replace(/[\\/:*?"<>|]/g, "-");
  button.disabled = true;
  label.textContent = "Preparing PDF...";
  try {
    await renderReportPdf({
      filename: `SATP ${reportConfig.title} - ${teacherName} - ${subjectName} - ${new Date().toISOString().slice(0, 10)}.pdf`,
      pagebreakAvoid: [
        ".individual-rating-details",
        ".mean-summary",
      ],
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    showToast(error.message || "Unable to generate the PDF report.");
  } finally {
    button.disabled = false;
    label.textContent = "Download PDF";
  }
});
document.getElementById("printButton").addEventListener("click", () => window.print());
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
  loadReport();
});
