"use strict";

const state = {
  userId: localStorage.getItem("user_id"),
  reportsAccess: localStorage.getItem("reportsAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
};

if (!state.userId) {
  alert("Log in to continue.");
  location.href = "../../index.html";
} else if (state.reportsAccess == 0) {
  alert("You don't have permission to access this page.");
  history.back();
}

const reportDescriptions = {
  overall: "Ranks college teachers across the institution.",
  overallSHS: "Ranks Senior High School teachers across the institution.",
  collegiate: "Ranks teachers within a selected college.",
  departmental: "Ranks teachers within a selected department.",
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

function appendOptions(selectId, rows, label, secondaryLabel) {
  const select = document.getElementById(selectId);
  select.insertAdjacentHTML(
    "beforeend",
    rows
      .map((row) => {
        const primary = row[label] ?? "";
        const secondary = secondaryLabel ? row[secondaryLabel] : "";
        const text = secondary ? `${secondary} — ${primary}` : primary;
        return `<option value="${escapeHtml(row.id)}">${escapeHtml(text)}</option>`;
      })
      .join(""),
  );
  if (rows.length === 1) select.value = rows[0].id;
}

async function loadReportOptions() {
  showLoading("Loading report options...");
  try {
    const [schoolYears, semesters, colleges, departments] = await Promise.all([
      requestJson("/api/schoolyear/inuse/active"),
      requestJson("/api/semester/all/active"),
      requestJson("/api/college/all/active"),
      requestJson("/api/department/all/active"),
    ]);
    appendOptions("schoolYear", schoolYears.data || [], "name");
    appendOptions("semester", semesters.data || [], "name");
    appendOptions("college", colleges.data || [], "name", "code");
    appendOptions(
      "department",
      departments.data || [],
      "name",
      "department_code",
    );
  } catch (error) {
    showToast(error.message || "Unable to load the report options.");
  } finally {
    hideLoading();
  }
}

document.getElementById("ranking").addEventListener("change", (event) => {
  const type = event.target.value;
  const collegeField = document.getElementById("collegeSelect");
  const departmentField = document.getElementById("departmentSelect");
  const college = document.getElementById("college");
  const department = document.getElementById("department");
  const needsCollege = type === "collegiate";
  const needsDepartment = type === "departmental";

  collegeField.classList.toggle("hidden", !needsCollege);
  departmentField.classList.toggle("hidden", !needsDepartment);
  college.required = needsCollege;
  department.required = needsDepartment;
  if (!needsCollege) college.value = "";
  if (!needsDepartment) department.value = "";
  document.getElementById("reportHint").textContent =
    reportDescriptions[type] ||
    "Choose how teachers should be grouped in the report.";
});

document
  .getElementById("generateReportForm")
  .addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    const destinations = {
      overall: "overall/index.html",
      overallSHS: "overallShs/index.html",
      collegiate: "collegiate/index.html",
      departmental: "departmental/index.html",
    };
    const destination = destinations[data.rankingReport];
    if (!destination) return showToast("Select a ranking report to continue.");

    localStorage.setItem("genReportSchoolYear", data.school_year);
    localStorage.setItem("genReportSemester", data.semester);
    localStorage.setItem("genReportTeachingStatus", data.teaching_status);
    if (data.college) localStorage.setItem("genReportCollege", data.college);
    if (data.department)
      localStorage.setItem("genReportDepartment", data.department);

    const button = document.getElementById("generateButton");
    button.disabled = true;
    button.lastChild.textContent = " Opening report";
    const reportWindow = window.open(destination, "_blank");
    if (reportWindow) {
      reportWindow.opener = null;
    } else {
      showToast("Allow pop-ups for SATP to open the report in a new tab.");
    }
    button.disabled = false;
    button.lastChild.textContent = " Generate report";
  });

function showLoading(message) {
  document.getElementById("loadingMessage").textContent = message;
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
      location.href = "../../index.html";
    });
  } catch (error) {
    console.error("Sidebar failed:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
  loadReportOptions();
});
