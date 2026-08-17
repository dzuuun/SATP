"use strict";

const state = {
  schoolYearId: null,
  semesterId: null,
  userId: localStorage.getItem("user_id"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
  ratingEnabled: false,
};

if (!state.userId) {
  alert("Log in to continue.");
  location.href = "../index.html";
}

let table;

async function initializeSubjects() {
  try {
    const [schoolYearResponse, semesterResponse, ratingAccessResponse] = await Promise.all([
      requestJson("/api/schoolyear/current"),
      requestJson("/api/semester/current/student"),
      requestJson("/api/transaction/rating-access/status"),
    ]);
    state.ratingEnabled = ratingAccessResponse.data?.enabled !== false;
    const availability = document.getElementById("ratingAvailability");
    availability.textContent = state.ratingEnabled
      ? "Rating open"
      : "Rating closed";
    availability.classList.toggle("open", state.ratingEnabled);
    const schoolYear = schoolYearResponse.data;
    const semester = semesterResponse.data;
    if (!schoolYear || !semester) {
      throw new Error("No active academic period is configured.");
    }

    state.schoolYearId = schoolYear.id;
    state.semesterId = semester.id;
    localStorage.setItem("school_year_id", schoolYear.id);
    localStorage.setItem("semester_id", semester.id);
    document.getElementById("periodName").textContent =
      `${schoolYear.name} — ${semester.name}`;

    const endpoint = `/api/transaction/student/academic-records/school_year_id=${schoolYear.id}&semester_id=${semester.id}&student_id=${encodeURIComponent(state.userId)}`;
    table = $("#table").DataTable({
      ajax: {
        url: endpoint,
        dataSrc(response) {
          const rows = response.data || [];
          updateSummary(rows);
          return rows;
        },
        error() {
          hideLoading();
          showToast("Unable to load your courses.");
        },
      },
      columns: [
        { data: "subject_code", title: "Course code", width: "16%" },
        { data: "subject_name", title: "Course name" },
        { data: "teachers_name", title: "Teacher", width: "28%" },
        {
          data: null,
          title: "Assessment",
          width: "14%",
          orderable: false,
          className: "dt-center",
          render(_data, type, row) {
            if (type !== "display") {
              return Number(row.status) ? "Completed" : "Pending";
            }
            return Number(row.status)
              ? '<span class="completed-mark"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>Completed</span>'
              : state.ratingEnabled
                ? `<button type="button" class="rate-button" onclick="rate(${Number(row.id)})"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Zm9-13 4 4"/></svg>Rate now</button>`
                : '<span class="rating-closed">Rating closed</span>';
          },
        },
      ],
      order: [[0, "asc"]],
      pageLength: 10,
      language: {
        search: "",
        searchPlaceholder: "Search courses...",
        emptyTable: "No courses are available for this academic period.",
        paginate: { previous: "Previous", next: "Next" },
      },
      initComplete: hideLoading,
    });
  } catch (error) {
    hideLoading();
    document.getElementById("periodName").textContent =
      "No active academic period";
    showToast(error.message || "Unable to load the active academic period.");
  }
}

function updateSummary(rows) {
  const completed = rows.filter((row) => Number(row.status) !== 0).length;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("pendingCount").textContent = rows.length - completed;
}

function hideLoading() {
  document.getElementById("tableLoading")?.remove();
}

function rate(id) {
  if (!state.ratingEnabled) {
    showToast("Student rating is currently closed.");
    return;
  }
  localStorage.setItem("transactionToRate", id);
  location.href = "../rate/index.html";
}

async function requestJson(url) {
  const response = await fetch(url);
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.message || `Request failed with status ${response.status}.`);
  return result;
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
    if (name) name.textContent = state.fullname || state.username || "Student";
    const portalLabel = document.querySelector(".sidebar-brand small");
    if (portalLabel) portalLabel.textContent = "Student portal";
    document.querySelectorAll(".nav-list > li").forEach((item) => {
      item.style.display = item.id === "student-rating-nav" ? "" : "none";
    });
    document
      .querySelector("#student-rating-nav a")
      ?.classList.add("nav-active");
    document.getElementById("signout")?.addEventListener("click", () => {
      localStorage.clear();
      location.href = "../index.html";
    });
  } catch (error) {
    console.error("Sidebar failed:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
  initializeSubjects();
});
