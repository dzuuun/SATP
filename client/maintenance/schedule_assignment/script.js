"use strict";

const maintenanceAccess = localStorage.getItem("maintenanceAccess");
if (!localStorage.getItem("user_id")) location.href = "../../login/index.html";
else if (maintenanceAccess == 0) history.back();

let table;
let selectedAssignment;

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

async function loadTeachers() {
  const response = await fetch("/api/teacher/all/active");
  const payload = await response.json();
  const select = document.getElementById("teacherSelect");
  (payload.data || []).forEach((teacher) => {
    const label = teacher.name || `${teacher.givenname || ""} ${teacher.surname || ""}`.trim();
    const option = document.createElement("option");
    option.value = teacher.id;
    option.textContent = label;
    select.appendChild(option);
  });
  enhanceSearchableSelect(select);
}

async function loadPeriods() {
  const [schoolYearResponse, semesterResponse] = await Promise.all([
    fetch("/api/schoolyear"),
    fetch("/api/semester"),
  ]);
  const [schoolYearPayload, semesterPayload] = await Promise.all([
    schoolYearResponse.json(),
    semesterResponse.json(),
  ]);
  const populate = (selectId, rows) => {
    const select = document.getElementById(selectId);
    rows.forEach((row) => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = row.name;
      select.appendChild(option);
    });
    const current = rows.find((row) => Number(row.is_active) === 1) || rows[0];
    if (current) select.value = String(current.id);
  };
  populate("schoolYearSelect", schoolYearPayload.data || []);
  populate("semesterSelect", semesterPayload.data || []);
}

function selectedPeriodUrl() {
  const schoolYearId = document.getElementById("schoolYearSelect").value;
  const semesterId = document.getElementById("semesterSelect").value;
  if (!schoolYearId || !semesterId) return null;
  return `/api/studentsubject/schedule-assignments?school_year_id=${encodeURIComponent(schoolYearId)}&semester_id=${encodeURIComponent(semesterId)}`;
}

function enhanceSearchableSelect(select) {
  const wrapper = document.createElement("div");
  wrapper.className = "search-select";
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  const display = document.createElement("input");
  display.type = "text";
  display.readOnly = true;
  display.className = "search-select-input";
  display.placeholder = "Select a teacher";
  const list = document.createElement("div");
  list.className = "search-select-list";
  const search = document.createElement("input");
  search.type = "search";
  search.className = "search-select-search";
  search.placeholder = "Search teachers...";
  const options = document.createElement("div");
  options.className = "search-select-options";
  list.append(search, options);
  wrapper.append(display, list);

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const matches = [...select.options].filter(
      (option) =>
        option.value &&
        !option.hidden &&
        !option.disabled &&
        (!query || option.textContent.toLowerCase().includes(query)),
    );
    options.replaceChildren();
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "search-select-empty";
      empty.textContent = "No matching teachers";
      return options.appendChild(empty);
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
  search.addEventListener("input", render);
  wrapper.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", () => wrapper.classList.remove("open"));
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
    option.hidden = isAssigned;
    option.disabled = isAssigned;
  });
  document.getElementById("sectionCode").textContent = selectedAssignment.schedule_code;
  document.getElementById("sectionSubject").textContent = `${selectedAssignment.subject_code} — ${selectedAssignment.subject_name}`;
  document.getElementById("currentTeacher").textContent = `Current teacher: ${selectedAssignment.teacher_name}`;
  document.getElementById("teacherSelect").value = "";
  document.querySelector(".search-select-input").value = "";
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
      { data: "student_count", title: "Students", className: "dt-center" },
      { data: null, title: "Actions", orderable: false, className: "dt-center", render: () => `<button type="button" class="section-reassign-button" aria-label="Reassign teacher">Reassign</button>` },
    ],
    pageLength: 10,
    language: { search: "", searchPlaceholder: "Search schedule codes…" },
  });
  $("#table tbody").on("click", ".section-reassign-button", function () {
    openReassign(table.row($(this).closest("tr")).data());
  });
  ["schoolYearSelect", "semesterSelect"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      const url = selectedPeriodUrl();
      if (!url) return;
      setLoading(true, "Loading schedule assignments...");
      table.ajax.url(url).load();
    });
  });
});

document.getElementById("reassignForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const teacherId = Number(document.getElementById("teacherSelect").value);
  if (!teacherId) return toast("Select a teacher from the list.", true);
  if (teacherId === Number(selectedAssignment.teacher_id)) return toast("That teacher is already assigned to this section.", true);
  if (!confirm(`Reassign ${selectedAssignment.schedule_code} to the selected teacher?`)) return;
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
