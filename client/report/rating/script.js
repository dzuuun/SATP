"use strict";

const state = {
  userId: localStorage.getItem("user_id"),
  reportsAccess: localStorage.getItem("reportsAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
  subjectRequest: 0,
  teacherRequest: 0,
};

if (!state.userId) {
  alert("Log in to continue.");
  location.href = "../../index.html";
} else if (state.reportsAccess == 0) {
  alert("You don't have permission to access this page.");
  history.back();
}

const reportDescriptions = {
  institutional:
    "Shows the selected teacher and subject within the institutional rating framework.",
  collegiate: "Summarizes assessment ratings for a selected college.",
  departmental: "Summarizes assessment ratings for a selected department.",
  individual: "Shows the detailed rating for a selected teacher and subject.",
};

function updateTeacherExportState() {
  const ratingType = document.getElementById("rating").value;
  const teacher = document.getElementById("teacher");
  const button = document.getElementById("teacherExportButton");
  const hint = document.getElementById("teacherExportHint");
  const selectedOption = teacher.options[teacher.selectedIndex];
  const teacherName = selectedOption?.dataset.name || "";
  const enabled = ratingType === "individual" && Boolean(teacher.value);

  button.disabled = !enabled;
  button.setAttribute("aria-disabled", String(!enabled));
  button.title = enabled
    ? `Export all subjects for ${teacherName} in the selected school year and semester`
    : "Select a teacher to export all of their subjects";
  hint.textContent = enabled
    ? `All subjects for ${teacherName} in the selected period`
    : "Select a teacher to export all subjects for the selected period";
}

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
        const secondary = secondaryLabel ? row[secondaryLabel] : "";
        const text = secondary
          ? `${secondary} — ${row[label] ?? ""}`
          : (row[label] ?? "");
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
        requestJson("/api/semester/inuse/active"),
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
    await loadTeachersForPeriod();
  } catch (error) {
    showToast(error.message || "Unable to load the report options.");
  } finally {
    hideLoading();
  }
}

function toggleConditionalField(fieldId, inputId, visible) {
  document.getElementById(fieldId).classList.toggle("hidden", !visible);
  const input = document.getElementById(inputId);
  input.required = visible;
  if (!visible) input.value = "";
}

document.getElementById("rating").addEventListener("change", (event) => {
  const type = event.target.value;
  const needsTeacher = type === "institutional" || type === "individual";
  toggleConditionalField("collegeSelect", "college", type === "collegiate");
  toggleConditionalField(
    "departmentSelect",
    "department",
    type === "departmental",
  );
  toggleConditionalField("teacherSelect", "teacher", needsTeacher);
  toggleConditionalField("subjectSelect", "subject", needsTeacher);
  document
    .getElementById("exportMenuWrap")
    .classList.toggle("hidden", type !== "individual");
  if (type !== "individual") closeExportMenu();
  updateTeacherExportState();
  document.getElementById("reportHint").textContent =
    reportDescriptions[type] ||
    "Choose the scope of assessment results to include.";
  if (needsTeacher) updateSubjects();
});

async function updateSubjects() {
  const subject = document.getElementById("subject");
  const hint = document.getElementById("subjectHint");
  const schoolYearId = document.getElementById("schoolYear").value;
  const semesterId = document.getElementById("semester").value;
  const teacherId = document.getElementById("teacher").value;
  const requestId = ++state.subjectRequest;
  subject.disabled = true;
  subject.innerHTML =
    '<option value="">Select the period and teacher first</option>';
  hint.dataset.state = "";
  hint.textContent =
    "Subjects are based on the selected teacher and academic period.";
  if (!schoolYearId || !semesterId || !teacherId) return;

  subject.innerHTML = '<option value="">Loading subjects...</option>';
  hint.textContent = "Loading the teacher's subjects...";
  try {
    const response = await requestJson("/api/report/rating/teacher/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_year_id: schoolYearId,
        semester_id: semesterId,
        teacher_id: teacherId,
      }),
    });
    if (requestId !== state.subjectRequest) return;
    const rows = response.data || [];
    subject.innerHTML = rows.length
      ? '<option value="">Select a subject</option>' +
        rows
          .map(
            (row) =>
              `<option value="${escapeHtml(row.subject_id)}">${escapeHtml(row.subject_code)} — ${escapeHtml(row.subject_name)}</option>`,
          )
          .join("")
      : '<option value="">No subjects available</option>';
    subject.disabled = !rows.length;
    hint.dataset.state = rows.length ? "ready" : "error";
    hint.textContent = rows.length
      ? `${rows.length} subject${rows.length === 1 ? "" : "s"} available.`
      : "No subjects were found for this teacher and period.";
  } catch (error) {
    if (requestId !== state.subjectRequest) return;
    subject.innerHTML = '<option value="">Unable to load subjects</option>';
    hint.dataset.state = "error";
    hint.textContent =
      error.message || "Unable to load the teacher's subjects.";
  }
}

async function loadTeachersForPeriod() {
  const teacher = document.getElementById("teacher");
  const subject = document.getElementById("subject");
  const schoolYearId = document.getElementById("schoolYear").value;
  const semesterId = document.getElementById("semester").value;
  const requestId = ++state.teacherRequest;
  state.subjectRequest += 1;
  teacher.disabled = true;
  teacher.innerHTML =
    '<option value="">Select the school year and semester first</option>';
  updateTeacherExportState();
  subject.disabled = true;
  subject.innerHTML = '<option value="">Select a teacher first</option>';
  if (!schoolYearId || !semesterId) return;

  teacher.innerHTML = '<option value="">Loading teachers...</option>';
  try {
    const response = await requestJson("/api/report/rating/teacher/period", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_year_id: schoolYearId,
        semester_id: semesterId,
      }),
    });
    if (requestId !== state.teacherRequest) return;
    const rows = response.data || [];
    teacher.innerHTML = rows.length
      ? '<option value="">Select a teacher</option>' +
        rows
          .map(
            (row) =>
              `<option value="${escapeHtml(row.id)}" data-name="${escapeHtml(row.name)}">${escapeHtml(row.name)} (${Number(row.subject_count)} subject${Number(row.subject_count) === 1 ? "" : "s"})</option>`,
          )
          .join("")
      : '<option value="">No teachers available</option>';
    teacher.disabled = !rows.length;
  } catch (error) {
    if (requestId !== state.teacherRequest) return;
    teacher.innerHTML = '<option value="">Unable to load teachers</option>';
    showToast(error.message || "Unable to load teachers for this period.");
  }
}

["schoolYear", "semester"].forEach((id) =>
  document.getElementById(id).addEventListener("change", loadTeachersForPeriod),
);
document.getElementById("teacher").addEventListener("change", () => {
  updateTeacherExportState();
  updateSubjects();
});

function closeExportMenu() {
  document.getElementById("exportMenu").classList.add("hidden");
  document.getElementById("exportMenuButton").setAttribute("aria-expanded", "false");
}

document.getElementById("exportMenuButton").addEventListener("click", () => {
  const menu = document.getElementById("exportMenu");
  const willOpen = menu.classList.contains("hidden");
  menu.classList.toggle("hidden", !willOpen);
  document
    .getElementById("exportMenuButton")
    .setAttribute("aria-expanded", String(willOpen));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#exportMenuWrap")) closeExportMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeExportMenu();
});

document
  .getElementById("bulkExportButton")
  .addEventListener("click", async () => {
    closeExportMenu();
    const schoolYear = document.getElementById("schoolYear");
    const semester = document.getElementById("semester");
    if (!schoolYear.value || !semester.value) {
      showToast(
        "Select the school year and semester before exporting.",
        "error",
      );
      return;
    }
    await exportAllIndividualRatings({
      schoolYearId: schoolYear.value,
      semesterId: semester.value,
      schoolYearName: schoolYear.options[schoolYear.selectedIndex]?.text || "",
      semesterName: semester.options[semester.selectedIndex]?.text || "",
    });
  });

document
  .getElementById("teacherExportButton")
  .addEventListener("click", async () => {
    closeExportMenu();
    const schoolYear = document.getElementById("schoolYear");
    const semester = document.getElementById("semester");
    const teacher = document.getElementById("teacher");
    if (!schoolYear.value || !semester.value || !teacher.value) {
      showToast(
        "Select the school year, semester, and teacher before exporting.",
        "error",
      );
      return;
    }
    const selectedTeacher = teacher.options[teacher.selectedIndex];
    await exportTeacherIndividualRatings({
      schoolYearId: schoolYear.value,
      semesterId: semester.value,
      schoolYearName: schoolYear.options[schoolYear.selectedIndex]?.text || "",
      semesterName: semester.options[semester.selectedIndex]?.text || "",
      teacherId: teacher.value,
      teacherName: selectedTeacher?.dataset.name || selectedTeacher?.text || "Teacher",
    });
  });

document
  .getElementById("generateReportForm")
  .addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    const needsSubject =
      data.ratingReport === "institutional" ||
      data.ratingReport === "individual";
    if (needsSubject && !data.subject) {
      showToast("Select an available subject to continue.");
      return;
    }
    const destinations = {
      institutional: "institutional/index.html",
      collegiate: "collegiate/index.html",
      departmental: "departmental/index.html",
      individual: "individual/index.html",
    };
    const destination = destinations[data.ratingReport];
    if (!destination) return showToast("Select a rating report to continue.");

    localStorage.setItem("genReportSchoolYear", data.school_year);
    localStorage.setItem("genReportSemester", data.semester);
    if (data.teacher) localStorage.setItem("genReportteacher", data.teacher);
    if (data.subject) localStorage.setItem("genReportSubject", data.subject);
    if (data.college) localStorage.setItem("genReportCollege", data.college);
    if (data.department)
      localStorage.setItem("genReportDepartment", data.department);

    const reportWindow = window.open(destination, "_blank");
    if (reportWindow) reportWindow.opener = null;
    else showToast("Allow pop-ups for SATP to open the report in a new tab.");
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

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `category-toast${type === "error" ? " toast-error" : ""}`;
  const icon =
    type === "error"
      ? '<path d="M12 8v5M12 17h.01M10.3 4.5 2.7 18a2 2 0 0 0 1.75 3h15.1a2 2 0 0 0 1.75-3L13.7 4.5a2 2 0 0 0-3.4 0Z"/>'
      : '<path d="m5 12 4 4L19 6"/>';
  toast.innerHTML = `<span class="toast-symbol"><svg viewBox="0 0 24 24">${icon}</svg></span><span></span>`;
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
      .querySelector('#mySidenav a[href="/report/rating/index.html"]')
      ?.classList.add("sub-active");
    const menu = document.getElementById("dropdown-rating");
    menu?.classList.remove("hidden");
    const toggle = document.querySelector('[data-target="dropdown-rating"]');
    toggle?.setAttribute("aria-expanded", "true");
    const arrow = toggle?.querySelector(".chevron");
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
