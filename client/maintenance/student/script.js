"use strict";
const state = {
  userId: localStorage.getItem("user_id"),
  maintenanceAccess: localStorage.getItem("maintenanceAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
};
if (!state.userId) {
  alert("Log in to continue.");
  location.href = "../../index.html";
} else if (state.maintenanceAccess == 0) {
  alert("You don't have permission to access this page.");
  history.back();
}
let table,
  rowIdToUpdate,
  coursesByCode = new Map(),
  pendingImport = { created: [], updated: [], errors: [] };
const normalize = (v) =>
  String(v || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
const formatYearLevel = (value) => {
  const normalized = String(value ?? "").trim();
  const ordinalYears = {
    1: "1st Year",
    2: "2nd Year",
    3: "3rd Year",
    4: "4th Year",
    5: "5th Year",
    6: "6th Year",
  };
  return ordinalYears[normalized] || normalized;
};
$(document).ready(() => {
  table = $("#table").DataTable({
    ajax: { url: "/api/student", dataSrc: "data", cache: true },
    columns: [
      {
        data: "username",
        title: "Username",
        width: "10%",
        className: "student-username-cell",
      },
      { data: "name", title: "Student name" },
      { data: "course", title: "Program", width: "14%" },
      {
        data: "is_active",
        title: "Status",
        width: "12%",
        className: "dt-center",
        render: (v) =>
          v
            ? '<span class="status-badge active">Active</span>'
            : '<span class="status-badge inactive">Inactive</span>',
      },
      {
        data: "id",
        title: "Actions",
        width: "10%",
        orderable: false,
        className: "dt-center",
        render: (id) =>
          `<button class="table-edit-button" onclick="editFormCall(${id})" aria-label="Edit student"><svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg></button>`,
      },
    ],
    pageLength: 10,
    dom: '<"flex justify-between items-center mb-4"f>rt<"flex justify-between items-center mt-4"ip>',
    language: { search: "", searchPlaceholder: "Search students..." },
  });
});

document
  .getElementById("exportStudentsButton")
  .addEventListener("click", () => {
    if (!table) return setErrorMessage("The student list is still loading.");
    const students = table.rows({ search: "applied" }).data().toArray();
    if (!students.length) return setErrorMessage("No students to export.");
    const exportRows = students.map((student) => ({
      username: student.username || "",
      password: "",
      surname: student.surname || "",
      givenname: student.givenname || "",
      middlename: student.middlename || "",
      google_email: student.google_email || "",
      year_level: formatYearLevel(student.year_level),
      gender: student.gender || "",
      course_code: student.course || "",
    }));
    const sheet = XLSX.utils.json_to_sheet(exportRows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Students");
    XLSX.writeFile(
      book,
      `Students_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    setSuccessMessage(`${exportRows.length} students exported successfully.`);
  });

async function loadCourses() {
  try {
    const r = await requestJson("/api/course/all/active"),
      courses = r.data || [];
    coursesByCode = new Map(
      courses.map((c) => [normalize(c.code || c.course_code), c]),
    );
    ["courseSelect", "editCourseSelect"].forEach((id) => {
      const select = document.getElementById(id);
      courses.forEach((c) => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = `${c.code || c.course_code} — ${c.name}`;
        select.appendChild(option);
      });
    });
  } catch (e) {
    setErrorMessage("Unable to load programs.");
  }
}

async function refreshImportCourses() {
  const response = await requestJson("/api/course/all/active");
  coursesByCode = new Map(
    (response.data || []).map((course) => [
      normalize(course.code || course.course_code),
      course,
    ]),
  );
}
function addPayload(form) {
  return {
    ...Object.fromEntries(new FormData(form)),
    is_active: document.getElementById("isStudentActive").checked ? 1 : 0,
    permission_id: 5,
    is_temp_pass: 0,
    user_id: state.userId,
  };
}
document
  .getElementById("newStudentForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = addPayload(e.currentTarget);
    if (!String(payload.password || "").trim() && !String(payload.google_email || "").trim()) {
      return setErrorMessage("Enter a temporary password or an institutional email.");
    }
    if (!(await satpConfirm("Create this student?"))) return;
    try {
      const r = await requestJson("/api/student/add", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!r.success) return setErrorMessage(r.message);
      setSuccessMessage(r.message);
      toggleModal("addNewModal", false);
      table.ajax.reload(null, false);
    } catch (error) {
      setErrorMessage("Unable to create the student.");
    }
  });
async function editFormCall(id) {
  try {
    const r = await requestJson(`/api/student/${id}`),
      s = r.data;
    rowIdToUpdate = s.id;
    ["GivenName", "MiddleName", "LastName"].forEach(
      (key, i) =>
        (document.getElementById(`edit${key}`).value = [
          s.givenname,
          s.middlename || "",
          s.surname,
        ][i]),
    );
    document.getElementById("editGenderSelect").value = String(
      s.gender || "",
    )
      .trim()
      .toUpperCase();
    document.getElementById("editCourseSelect").value = s.course_id;
    document.getElementById("editCourseSelect").dispatchEvent(
      new Event("change", { bubbles: true }),
    );
    document.getElementById("editYearLevel").value = s.year_level;
    document.getElementById("editGoogleEmail").value = s.google_email || "";
    document.getElementById("editIsStudentStatusActive").checked =
      s.is_active == 1;
    toggleModal("editModal", true);
  } catch (e) {
    setErrorMessage("Unable to load the student.");
  }
}
document
  .getElementById("editStudentForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!(await satpConfirm("Save these student changes?"))) return;
    const info = {
        ...Object.fromEntries(new FormData(form)),
        id: rowIdToUpdate,
        user_id: state.userId,
      },
      status = {
        id: rowIdToUpdate,
        user_id: state.userId,
        is_active: document.getElementById("editIsStudentStatusActive").checked
          ? 1
          : 0,
      };
    try {
      const [first, second] = await Promise.all([
        requestJson("/api/student/update/info", {
          method: "PUT",
          body: JSON.stringify(info),
        }),
        requestJson("/api/student/update/status", {
          method: "PUT",
          body: JSON.stringify(status),
        }),
      ]);
      if (!first.success && !second.success) {
        return setErrorMessage("No student information or status changed.");
      }
      setSuccessMessage(
        first.success && second.success
          ? "Student information and status updated successfully."
          : first.success
            ? first.message
            : second.message,
      );
      toggleModal("editModal", false);
      table.ajax.reload(null, false);
    } catch (error) {
      setErrorMessage("Unable to save the student.");
    }
  });
function togglePassword() {
  const input = document.getElementById("addPassword");
  input.type = input.type === "password" ? "text" : "password";
}

const xlsxInput = document.getElementById("xlsxInput");
xlsxInput.addEventListener("change", () => {
  if (xlsxInput.files[0])
    document.querySelector("#dropZone p").textContent =
      `Selected: ${xlsxInput.files[0].name}`;
});
document.getElementById("downloadLink").addEventListener("click", (e) => {
  e.preventDefault();
  const sheet = XLSX.utils.json_to_sheet([
      {
        username: "2026-00001",
        password: "Temp1234",
        surname: "Dela Cruz",
        givenname: "Juan",
        middlename: "Santos",
        google_email: "juan.delacruz@ndmu.edu.ph",
        year_level: "1st Year",
        gender: "Male",
        course_code: "BSIT",
      },
    ]),
    book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Students");
  XLSX.writeFile(book, "student_import_template.xlsx");
});
function parseWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const book = XLSX.read(new Uint8Array(e.target.result), {
          type: "array",
        });
        resolve(
          XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], {
            defval: "",
            raw: false,
          }),
        );
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
document
  .getElementById("uploadFileForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!xlsxInput.files[0]) return;
    document.querySelector("#spinnerStatusModal .eyebrow").textContent =
      "Validating file";
    document.getElementById("statusMessage").textContent = "Please wait";
    toggleModal("importFileModal", false);
    setTimeout(() => toggleModal("spinnerStatusModal", true), 250);
    try {
      const [rows, current] = await Promise.all([
        parseWorkbook(xlsxInput.files[0]),
        requestJson("/api/student"),
        refreshImportCourses(),
      ]);
      pendingImport = classifyRows(rows, current.data || []);
      renderPreview();
      toggleModal("spinnerStatusModal", false);
      setTimeout(() => toggleModal("importPreviewModal", true), 250);
    } catch (error) {
      toggleModal("spinnerStatusModal", false);
      setTimeout(() => toggleModal("importFileModal", true), 250);
      setErrorMessage("Unable to validate the Excel file.");
    }
  });
function classifyRows(rows, existing) {
  const yearLevelAliases = new Map([
    ["1st year", "1"],
    ["first year", "1"],
    ["2nd year", "2"],
    ["second year", "2"],
    ["3rd year", "3"],
    ["third year", "3"],
    ["4th year", "4"],
    ["fourth year", "4"],
    ["5th year", "5"],
    ["fifth year", "5"],
  ]);
  const byUsername = new Map(existing.map((s) => [normalize(s.username), s])),
    seen = new Set(),
    result = { created: [], updated: [], errors: [] },
    allowedYears = ["1", "2", "3", "4", "5", "6", "grade 11", "grade 12"];
  rows.forEach((raw, index) => {
    const idNumber = String(raw.id_number || raw.username || "").trim(),
      password = String(raw.password || "").trim(),
      surname = String(raw.surname || "").trim(),
      givenname = String(raw.givenname || "").trim(),
      middlename = String(raw.middlename || "").trim(),
      google_email = String(raw.google_email || raw.email || "").trim(),
      suppliedYearLevel = String(raw.year_level || "").trim(),
      year_level =
        yearLevelAliases.get(normalize(suppliedYearLevel)) || suppliedYearLevel,
      gender = String(raw.gender || "")
        .trim()
        .toUpperCase(),
      courseCode = String(raw.course_code || "")
        .trim()
        .toUpperCase(),
      course = coursesByCode.get(normalize(courseCode)),
      key = normalize(idNumber),
      base = {
        rowNumber: index + 2,
        idNumber,
        username: idNumber,
        password,
        surname,
        givenname,
        middlename,
        google_email,
        year_level,
        gender,
        courseCode,
        course_id: course?.id,
        is_active: 1,
        originalRow: raw,
      };
    if (
      !idNumber ||
      !surname ||
      !givenname ||
      !year_level ||
      !gender ||
      !courseCode
    )
      result.errors.push({
        ...base,
        reason: "Required student fields are incomplete",
      });
    else if (!allowedYears.includes(normalize(year_level)))
      result.errors.push({
        ...base,
        reason: "Year level must be 1–6, Grade 11, or Grade 12",
      });
    else if (!["male", "female"].includes(normalize(gender)))
      result.errors.push({ ...base, reason: "Gender must be Male or Female" });
    else if (
      google_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(google_email)
    )
      result.errors.push({
        ...base,
        reason: "School Google email is invalid",
      });
    else if (!course)
      result.errors.push({
        ...base,
        reason: `Program ${courseCode} was not found`,
      });
    else if (seen.has(key))
      result.errors.push({ ...base, reason: "Duplicate ID number in file" });
    else {
      seen.add(key);
      const current = byUsername.get(key);
      if (current) result.updated.push({ ...base, id: current.id });
      else if (!password && !google_email)
        result.errors.push({
          ...base,
          reason:
            "Password or institutional email is required when creating a new student",
        });
      else result.created.push(base);
    }
  });
  return result;
}
function renderPreview() {
  [
    ["created", "createdPreview", "createdCount", "Will be created"],
    ["updated", "updatedPreview", "updatedCount", "Ready to update"],
    ["errors", "errorPreview", "errorCount", ""],
  ].forEach(([key, listId, countId, detail]) => {
    const items = pendingImport[key],
      list = document.getElementById(listId);
    document.getElementById(countId).textContent = items.length;
    list.replaceChildren();
    if (!items.length) {
      const p = document.createElement("p");
      p.className = "preview-empty";
      p.textContent = `No ${key} found`;
      return list.appendChild(p);
    }
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "preview-row";
      row.innerHTML =
        '<span class="row-number"></span><span class="room-name"></span><span class="row-detail"></span>';
      row.children[0].textContent = `Row ${item.rowNumber}`;
      row.children[1].textContent = `${item.idNumber} — ${item.givenname} ${item.surname}`;
      row.children[2].textContent = item.reason || detail;
      list.appendChild(row);
    });
  });
  document.getElementById("runImportButton").disabled =
    !pendingImport.created.length &&
    !pendingImport.updated.length &&
    !pendingImport.errors.length;
}
document
  .getElementById("runImportButton")
  .addEventListener("click", async () => {
    const actions = [
        ...pendingImport.created.map((item) => ({ type: "created", item })),
        ...pendingImport.updated.map((item) => ({ type: "updated", item })),
      ],
      errors = pendingImport.errors.map((x) => ({
        ...x.originalRow,
        Error: x.reason,
      }));
    if (!actions.length) {
      downloadErrors(errors);
      toggleModal("importPreviewModal", false);
      return setErrorMessage(`${errors.length} invalid rows exported.`);
    }
    toggleModal("importPreviewModal", false);
    document.querySelector("#spinnerStatusModal .eyebrow").textContent =
      "Import in progress";
    document.getElementById("statusMessage").textContent = "0%";
    setTimeout(() => toggleModal("spinnerStatusModal", true), 250);
    const totals = { created: 0, updated: 0, skipped: 0 };
    for (let i = 0; i < actions.length; i++) {
      const { type, item } = actions[i];
      try {
        const r =
          type === "created"
            ? await requestJson("/api/student/add", {
                method: "POST",
                body: JSON.stringify({
                  username: item.username,
                  password: item.password,
                  surname: item.surname,
                  givenname: item.givenname,
                  middlename: item.middlename,
                  google_email: item.google_email,
                  course_id: item.course_id,
                  year_level: item.year_level,
                  gender: item.gender,
                  is_active: 1,
                  permission_id: 5,
                  is_temp_pass: 1,
                }),
              })
            : await requestJson("/api/student/update/info", {
                method: "PUT",
                body: JSON.stringify({
                  id: item.id,
                  surname: item.surname,
                  givenname: item.givenname,
                  middlename: item.middlename,
                  google_email: item.google_email,
                  course_id: item.course_id,
                  year_level: item.year_level,
                  gender: item.gender,
                }),
              });
        r.success
          ? r.skipped
            ? totals.skipped++
            : totals[type]++
          : errors.push({
              ...item.originalRow,
              Error: r.message || "Server rejected row",
            });
      } catch (e) {
        errors.push({ ...item.originalRow, Error: "Request failed" });
      }
      document.getElementById("statusMessage").textContent =
        `${Math.round(((i + 1) / actions.length) * 100)}%`;
    }
    toggleModal("spinnerStatusModal", false);
    if (errors.length) downloadErrors(errors);
    table.ajax.reload(null, false);
    setTimeout(
      () =>
        setSuccessMessage(
          `${totals.created} created, ${totals.updated} updated, ${totals.skipped} unchanged${errors.length ? `, ${errors.length} errors exported` : ""}.`,
        ),
      350,
    );
  });
function downloadErrors(rows) {
  if (!rows.length) return;
  const sheet = XLSX.utils.json_to_sheet(rows),
    book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Import Errors");
  XLSX.writeFile(
    book,
    `Student_Import_Errors_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}
async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  return response.json();
}
function toggleModal(id, show = true) {
  const modal = document.getElementById(id),
    card = document.getElementById(`${id}Card`);
  if (!modal) return;
  const dropZoneText = modal.querySelector("#dropZone p");
  if (show && dropZoneText && !dropZoneText.dataset.defaultText) {
    dropZoneText.dataset.defaultText = dropZoneText.textContent.trim();
  }
  if (show) {
    modal.classList.remove("invisible");
    setTimeout(() => {
      modal.classList.add("opacity-100");
      card?.classList.replace("scale-95", "scale-100");
    }, 10);
    document.body.classList.add("overflow-hidden");
  } else {
    modal.classList.remove("opacity-100");
    card?.classList.replace("scale-100", "scale-95");
    setTimeout(() => {
      modal.classList.add("invisible");
      modal.querySelectorAll("form").forEach((form) => form.reset());
      if (dropZoneText?.dataset.defaultText)
        dropZoneText.textContent = dropZoneText.dataset.defaultText;
    }, 250);
    document.body.classList.remove("overflow-hidden");
  }
}
function setSuccessMessage(m) {
  showToast(m, true);
}
function setErrorMessage(m) {
  showToast(m, false);
}
function showToast(message, success) {
  const toast = document.createElement("div");
  toast.className = "category-toast";
  toast.innerHTML = `<span class="toast-symbol"><svg viewBox="0 0 24 24"><path d="${success ? "m5 12 4 4L19 6" : "M12 8v5m0 3h.01M10.3 4.6 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"}"/></svg></span><span></span>`;
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
    const c = document.getElementById("sidebar-container"),
      r = await fetch("/sidebar.html");
    c.innerHTML = await r.text();
    const n = document.getElementById("sidebar-fullname");
    if (n) n.textContent = state.fullname || state.username || "User";
    document.querySelectorAll(".menu-toggle").forEach((t) =>
      t.addEventListener("click", function () {
        const m = document.getElementById(this.dataset.target);
        m?.classList.toggle("hidden");
        const hidden = m?.classList.contains("hidden");
        this.setAttribute("aria-expanded", String(!hidden));
        const arrow = this.querySelector(".chevron");
        if (arrow) {
          arrow.style.transform = hidden ? "rotate(0deg)" : "rotate(180deg)";
        }
      }),
    );
    const currentPath = location.pathname
      .replace(/\/index\.html$/, "")
      .replace(/\/$/, "");
    document.querySelectorAll("#mySidenav a[href]").forEach((link) => {
      const linkPath = new URL(link.href, location.origin).pathname
        .replace(/\/index\.html$/, "")
        .replace(/\/$/, "");
      if (linkPath !== currentPath) return;
      const list = link.closest("ul[id^='dropdown-']");
      link.classList.add(list ? "sub-active" : "nav-active");
      if (list) {
        list.classList.remove("hidden");
        const toggle = document.querySelector(`[data-target="${list.id}"]`);
        toggle?.setAttribute("aria-expanded", "true");
        const arrow = toggle?.querySelector(".chevron");
        if (arrow) arrow.style.transform = "rotate(180deg)";
      }
    });
    document.getElementById("signout")?.addEventListener("click", () => {
      localStorage.clear();
      location.href = "../../index.html";
    });
  } catch (e) {
    console.error(e);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("addPassword").value = Math.random()
    .toString(36)
    .slice(-8);
  loadCourses();
  loadSidebar();
});
