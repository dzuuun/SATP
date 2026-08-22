"use strict";

const maintenanceAccess = localStorage.getItem("maintenanceAccess");
if (!localStorage.getItem("user_id")) location.href = "../../login/index.html";
else if (maintenanceAccess == 0) history.back();

let table;
let selectedAssignment;
let actionConfirmationResolver;

function toggleModal(id, show) {
  const modal = document.getElementById(id);
  const card = modal.querySelector(".modal-card");
  if (show) {
    modal.classList.remove("invisible");
    requestAnimationFrame(() => {
      modal.classList.add("opacity-100");
      card.classList.replace("scale-95", "scale-100");
    });
    return;
  }
  modal.classList.remove("opacity-100");
  card.classList.replace("scale-100", "scale-95");
  setTimeout(() => modal.classList.add("invisible"), 180);
}

function toast(message, error = false) {
  const item = document.createElement("div");
  item.className = `category-toast${error ? " error" : ""}`;
  item.innerHTML = `<span class="toast-symbol"><svg viewBox="0 0 24 24"><path d="${error ? "M12 8v5m0 3h.01M10.3 4.6 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" : "m5 12 4 4L19 6"}"/></svg></span><span></span>`;
  item.lastElementChild.textContent = message;
  document.getElementById("toast-container").replaceChildren(item);
  setTimeout(() => item.remove(), 4000);
}

function setLoading(show, message = "Loading...") {
  document.getElementById("loadingMessage").textContent = message;
  toggleModal("loadingModal", show);
}

function confirmScheduleAction({ title, message, confirmLabel, destructive = false }) {
  document.getElementById("confirmActionTitle").textContent = title;
  document.getElementById("confirmActionMessage").textContent = message;
  const button = document.getElementById("confirmActionButton");
  button.textContent = confirmLabel;
  button.classList.toggle("danger-button", destructive);
  toggleModal("confirmActionModal", true);
  return new Promise((resolve) => {
    actionConfirmationResolver = resolve;
  });
}

function resolveActionConfirmation(confirmed) {
  toggleModal("confirmActionModal", false);
  const resolve = actionConfirmationResolver;
  actionConfirmationResolver = null;
  resolve?.(confirmed);
}

async function loadTeachers() {
  const response = await fetch("/api/teacher/all/active");
  const payload = await response.json();
  const select = document.getElementById("teacherSelect");
  (payload.data || []).forEach((teacher) => {
    const label = teacher.name || `${teacher.givenname || ""} ${teacher.surname || ""}`.trim();
    const option = document.createElement("option");
    option.value = teacher.id;
    option.textContent = label;
    option.dataset.baseLabel = label;
    option.dataset.departmentIds = String(
      teacher.department_ids || teacher.department_id || "",
    );
    option.dataset.departmentStatuses = String(
      teacher.department_teaching_statuses ?? teacher.is_part_time ?? "0",
    );
    option.dataset.schoolIds = String(teacher.department_school_ids || "");
    select.appendChild(option);
  });
  enhanceSearchableSelect(select);
}

async function loadPeriods() {
  const [schoolYearResponse, currentSchoolYearResponse, semesterResponse, currentSemesterResponse] = await Promise.all([
    fetch("/api/schoolyear/all/active"),
    fetch("/api/schoolyear/current"),
    fetch("/api/semester/all/active"),
    fetch("/api/semester/current/admin"),
  ]);
  const [schoolYearPayload, currentSchoolYearPayload, semesterPayload, currentSemesterPayload] = await Promise.all([
    schoolYearResponse.json(),
    currentSchoolYearResponse.json(),
    semesterResponse.json(),
    currentSemesterResponse.json(),
  ]);
  const populate = (selectId, rows, currentId = null) => {
    const select = document.getElementById(selectId);
    rows.forEach((row) => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = row.name;
      select.appendChild(option);
    });
    const current =
      rows.find((row) => Number(row.id) === Number(currentId)) ||
      rows.find((row) => Number(row.is_active) === 1) ||
      rows[0];
    if (current) select.value = String(current.id);
  };
  populate(
    "schoolYearSelect",
    schoolYearPayload.data || [],
    currentSchoolYearPayload.data?.id,
  );
  populate(
    "semesterSelect",
    semesterPayload.data || [],
    currentSemesterPayload.data?.id,
  );
  enhanceSearchableSelect(document.getElementById("schoolYearSelect"));
  enhanceSearchableSelect(document.getElementById("semesterSelect"));
}

function selectedPeriodUrl() {
  const schoolYearId = document.getElementById("schoolYearSelect").value;
  const semesterId = document.getElementById("semesterSelect").value;
  if (!schoolYearId || !semesterId) return null;
  return `/api/studentsubject/schedule-assignments?school_year_id=${encodeURIComponent(schoolYearId)}&semester_id=${encodeURIComponent(semesterId)}`;
}

function loadSelectedPeriod() {
  const url = selectedPeriodUrl();
  if (!url) {
    toast("Select a school year and semester first.", true);
    return;
  }
  setLoading(true, "Loading schedule assignments...");
  table.ajax.url(url).load();
}

function enhanceSearchableSelect(select) {
  if (!select || select.dataset.searchable === "true") return;
  select.dataset.searchable = "true";
  const wrapper = document.createElement("div");
  wrapper.className = "search-select";
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  const display = document.createElement("input");
  display.type = "text";
  display.readOnly = true;
  display.className = "search-select-input";
  display.placeholder =
    select.options[0]?.disabled && select.options[0]?.textContent
      ? select.options[0].textContent
      : "Search and select";
  display.autocomplete = "off";
  const list = document.createElement("div");
  list.className = "search-select-list";
  const search = document.createElement("input");
  search.type = "search";
  search.className = "search-select-search";
  search.placeholder =
    select.id === "teacherSelect"
      ? "Search teachers..."
      : select.id === "schoolYearSelect"
        ? "Search school years..."
        : "Search semesters...";
  search.autocomplete = "off";
  const options = document.createElement("div");
  options.className = "search-select-options";
  list.append(search, options);
  wrapper.append(display, list);

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const matches = [...select.options].filter(
      (option) =>
        !option.disabled &&
        !option.hidden &&
        (!query || option.textContent.toLowerCase().includes(query)),
    );
    options.replaceChildren();
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "search-select-empty";
      empty.textContent = "No matching teachers";
      options.appendChild(empty);
      return;
    }
    matches.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `search-select-option${option.value === select.value ? " selected" : ""}`;
      button.textContent = option.textContent;
      button.addEventListener("click", () => {
        select.value = option.value;
        display.value = option.textContent;
        wrapper.classList.remove("open");
      });
      options.appendChild(button);
    });
  };
  display.addEventListener("click", () => {
    wrapper.classList.add("open");
    search.value = "";
    render();
    search.focus();
  });
  display.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      display.click();
    }
  });
  search.addEventListener("input", render);
  wrapper.addEventListener("click", (event) => event.stopPropagation());
  syncSearchableSelect(select);
  document.addEventListener("click", () => wrapper.classList.remove("open"));
}

function syncSearchableSelect(select) {
  const input = select
    ?.closest(".search-select")
    ?.querySelector(".search-select-input");
  if (!input) return;
  input.value = select.selectedOptions[0]?.disabled
    ? ""
    : select.selectedOptions[0]?.textContent || "";
}

function getAssignmentAcademicScope(assignment) {
  return String(assignment?.academic_scope || "COLLEGE").toUpperCase() === "SHS"
    ? "SHS"
    : "College";
}

function openReassign(assignment) {
  selectedAssignment = assignment;
  const assignedTeacherIds = new Set(
    table
      .rows()
      .data()
      .toArray()
      .filter(
        (record) =>
          String(record.schedule_code || "").trim().toLowerCase() ===
            String(selectedAssignment.schedule_code || "").trim().toLowerCase() &&
          Number(record.subject_id) === Number(selectedAssignment.subject_id),
      )
      .map((record) => Number(record.teacher_id)),
  );
  [...document.getElementById("teacherSelect").options].forEach((option) => {
    if (!option.value) return;
    const isAssigned = assignedTeacherIds.has(Number(option.value));
    const schoolIds = option.dataset.schoolIds
      .split(",")
      .map(Number);
    const schoolIndex = schoolIds.indexOf(
      Number(selectedAssignment.teaching_school_id),
    );
    const matchesSchool = schoolIndex >= 0;
    const teachingStatus = Number(
      option.dataset.departmentStatuses.split(",")[schoolIndex],
    );
    const statusLabel =
      ({ 0: "Full Time", 1: "Part Time", 2: "NTPO & Admin" })[
        teachingStatus
      ] || "Unknown status";
    option.textContent = matchesSchool
      ? `${option.dataset.baseLabel} — ${statusLabel}`
      : option.dataset.baseLabel;
    option.hidden = isAssigned || !matchesSchool;
    option.disabled = isAssigned || !matchesSchool;
  });
  document.getElementById("sectionCode").textContent = selectedAssignment.schedule_code;
  document.getElementById("sectionSubject").textContent = `${selectedAssignment.subject_code} — ${selectedAssignment.subject_name}`;
  document.getElementById("currentTeacher").textContent = `Current teacher: ${selectedAssignment.teacher_name}`;
  const schoolLabel = `${selectedAssignment.teaching_school_code} — ${selectedAssignment.teaching_school_name}`;
  const academicScope = getAssignmentAcademicScope(selectedAssignment);
  document.getElementById("assignmentAcademicScope").textContent =
    academicScope;
  document.getElementById("teachingSchool").textContent = schoolLabel;
  document.getElementById("teacherSchoolLabel").textContent =
    `(${selectedAssignment.teaching_school_code})`;
  document.getElementById("teacherSelect").value = "";
  syncSearchableSelect(document.getElementById("teacherSelect"));
  toggleModal("reassignModal", true);
}

$(document).ready(async () => {
  try {
    await Promise.all([loadTeachers(), loadPeriods()]);
  } catch (error) {
    setLoading(false);
    toast("Unable to load teachers or academic periods.", true);
  }
  table = $("#table").DataTable({
    ajax: {
      url: selectedPeriodUrl(),
      dataSrc: (payload) => {
        const first = payload.data?.[0];
        document.getElementById("periodLabel").textContent = first ? `${first.school_year} — ${first.semester}` : "No schedule assignments found for the active period.";
        setLoading(false);
        return payload.data || [];
      },
    },
    columns: [
      { data: "schedule_code", title: "Schedule code" },
      { data: "subject_code", title: "Course code" },
      { data: "subject_name", title: "Course" },
      { data: "teacher_name", title: "Assigned teacher" },
      { data: "student_count", title: "Students", className: "dt-center", width: "72px" },
      {
        data: null,
        title: "Status",
        className: "dt-center",
        width: "100px",
        render: (record) => Number(record.dissolved_count) > 0
          ? '<span class="schedule-status dissolved">Dissolved</span>'
          : '<span class="schedule-status active">Active</span>',
      },
      {
        data: null,
        title: "Actions",
        orderable: false,
        className: "dt-center schedule-actions",
        width: "190px",
        render: (record) => {
          const dissolved = Number(record.dissolved_count) > 0;
          return `<button type="button" class="section-reassign-button" aria-label="Reassign teacher"${dissolved ? " disabled" : ""}>Reassign</button><button type="button" class="section-dissolve-button${dissolved ? " restore" : ""}" aria-label="${dissolved ? "Restore" : "Dissolve"} schedule">${dissolved ? "Restore" : "Dissolve"}</button>`;
        },
      },
    ],
    pageLength: 10,
    language: { search: "", searchPlaceholder: "Search schedule codes…" },
  });
  $("#table tbody").on("click", ".section-reassign-button", function () {
    openReassign(table.row($(this).closest("tr")).data());
  });
  $("#table tbody").on("click", ".section-dissolve-button", async function () {
    const assignment = table.row($(this).closest("tr")).data();
    const dissolved = Number(assignment.dissolved_count) > 0;
    const action = dissolved ? "restore" : "dissolve";
    const confirmed = await confirmScheduleAction({
      title: dissolved ? "Restore schedule?" : "Dissolve schedule?",
      message: dissolved
        ? `Restore ${assignment.schedule_code} and include its student courses again?`
        : `Dissolve ${assignment.schedule_code} and exclude its student courses from rating and reports?`,
      confirmLabel: dissolved ? "Restore schedule" : "Dissolve schedule",
      destructive: !dissolved,
    });
    if (!confirmed) return;
    setLoading(true, `${dissolved ? "Restoring" : "Dissolving"} schedule...`);
    try {
      const response = await fetch("/api/studentsubject/schedule-assignments/dissolve", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_year_id: assignment.school_year_id,
          semester_id: assignment.semester_id,
          subject_id: assignment.subject_id,
          schedule_code: assignment.schedule_code,
          dissolved: !dissolved,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || `Unable to ${action} schedule.`);
      await new Promise((resolve) => table.ajax.reload(resolve, false));
      toast(`${payload.data.enrollments_updated} enrollment(s) ${dissolved ? "restored" : "dissolved"}.`);
    } catch (error) {
      toast(error.message || `Unable to ${action} schedule.`, true);
    } finally {
      setLoading(false);
    }
  });
  document
    .getElementById("loadRecordsButton")
    .addEventListener("click", loadSelectedPeriod);
});

document.getElementById("reassignForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const teacherId = Number(document.getElementById("teacherSelect").value);
  if (!teacherId) return toast("Select a teacher from the list.", true);
  if (teacherId === Number(selectedAssignment.teacher_id)) return toast("That teacher is already assigned to this section.", true);
  const selectedTeacher = document.getElementById("teacherSelect").selectedOptions[0]?.textContent || "the selected teacher";
  const academicScope = getAssignmentAcademicScope(selectedAssignment);
  const confirmed = await confirmScheduleAction({
    title: "Reassign teacher?",
    message: `Reassign ${selectedAssignment.schedule_code} to ${selectedTeacher} for ${academicScope}, under ${selectedAssignment.teaching_school_code} — ${selectedAssignment.teaching_school_name}?`,
    confirmLabel: "Reassign teacher",
  });
  if (!confirmed) return;
  toggleModal("reassignModal", false);
  setLoading(true, "Reassigning teacher...");
  try {
    const response = await fetch("/api/studentsubject/schedule-assignments/reassign", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...selectedAssignment, current_teacher_id: selectedAssignment.teacher_id, teacher_id: teacherId }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Unable to reassign teacher.");
    await new Promise((resolve) => table.ajax.reload(resolve, false));
    toast(`${payload.data.enrollments_updated} enrollment(s) reassigned successfully.`);
  } catch (error) {
    toast(error.message || "Unable to reassign teacher.", true);
  } finally {
    setLoading(false);
  }
});

fetch("../../sidebar.html").then((response) => response.text()).then((html) => {
  const container = document.getElementById("sidebar-container");
  container.innerHTML = html;
  document.getElementById("sidebar-fullname").textContent = localStorage.getItem("fullname") || "User";
  const currentPath = location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "");
  container.querySelectorAll("#mySidenav a").forEach((link) => {
    const linkPath = new URL(link.href, location.origin).pathname
      .replace(/\/index\.html$/, "")
      .replace(/\/$/, "");
    if (linkPath !== currentPath) return;
    const submenu = link.closest("ul[id^='dropdown-']");
    link.classList.add(submenu ? "sub-active" : "nav-active");
    if (!submenu) return;
    submenu.classList.remove("hidden");
    const parentToggle = container.querySelector(`[data-target="${submenu.id}"]`);
    parentToggle?.classList.add("nav-active");
    parentToggle?.setAttribute("aria-expanded", "true");
    const arrow = parentToggle?.querySelector(".chevron");
    if (arrow) arrow.style.transform = "rotate(180deg)";
  });
  container.addEventListener("click", (event) => {
    const toggle = event.target.closest(".menu-toggle");
    if (!toggle) return;
    const menu = document.getElementById(toggle.dataset.target);
    menu?.classList.toggle("hidden");
    const hidden = menu?.classList.contains("hidden");
    toggle.setAttribute("aria-expanded", String(!hidden));
    const arrow = toggle.querySelector(".chevron");
    if (arrow) arrow.style.transform = hidden ? "rotate(0deg)" : "rotate(180deg)";
  });
});
function toggleNav() {
  const nav = document.getElementById("mySidenav");
  const main = document.getElementById("main");
  if (!nav) return;
  const isOpen = nav.style.width === "280px";
  nav.style.width = isOpen ? "0" : "280px";
  if (main) {
    main.style.marginLeft = window.innerWidth <= 1100 || isOpen ? "0" : "280px";
  }
}
document.getElementById("year").textContent = new Date().getFullYear();
