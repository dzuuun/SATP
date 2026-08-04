"use strict";

const state = {
  userId: localStorage.getItem("user_id"),
  usersAccess: localStorage.getItem("usersAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
  editId: null,
  importMode: null,
  validRows: [],
  errorRows: [],
};

if (!state.userId) {
  alert("Log in to continue.");
  location.href = "../../index.html";
} else if (state.usersAccess == 0) {
  alert("You don't have permission to access this page.");
  history.back();
}

const yesNo = (value) =>
  `<span class="boolean-badge ${Number(value) ? "" : "off"}">${Number(value) ? "Yes" : "No"}</span>`;
const table = $("#table").DataTable({
  ajax: { url: "/api/user", dataSrc: "data", cache: true },
  columns: [
    { data: "username", title: "Username", width: "10%" },
    { data: "Name", title: "Name" },
    { data: "permission", title: "Permission", width: "13%" },
    {
      data: "is_temp_pass",
      title: "Temporary",
      className: "dt-center",
      render: yesNo,
    },
    {
      data: "is_student_rater",
      title: "Student",
      className: "dt-center",
      render: yesNo,
    },
    {
      data: "is_admin_rater",
      title: "Admin",
      className: "dt-center",
      render: yesNo,
    },
    {
      data: "is_active",
      title: "Status",
      className: "dt-center",
      render: (value) =>
        Number(value)
          ? '<span class="status-badge active">Active</span>'
          : '<span class="status-badge inactive">Inactive</span>',
    },
    {
      data: "id",
      title: "Actions",
      width: "7%",
      orderable: false,
      className: "dt-center",
      render: (id) =>
        `<button class="table-edit-button" type="button" onclick="editUser(${id})" aria-label="Edit user"><svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg></button>`,
    },
  ],
  pageLength: 10,
  language: {
    search: "",
    searchPlaceholder: "Search users...",
    paginate: { previous: "Previous", next: "Next" },
  },
});

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  document.getElementById("addPassword").value = Array.from(
    { length: 10 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

function openAddModal() {
  document.getElementById("newUserForm").reset();
  document.getElementById("isUserActive").checked = true;
  document.getElementById("showAddPassword").checked = true;
  document.getElementById("addPassword").type = "text";
  document.getElementById("studentFields").classList.add("hidden");
  generatePassword();
  toggleModal("addNewModal", true);
}

document
  .getElementById("showAddPassword")
  .addEventListener("change", (event) => {
    document.getElementById("addPassword").type = event.target.checked
      ? "text"
      : "password";
  });
document
  .getElementById("showEditPassword")
  .addEventListener("change", (event) => {
    document.getElementById("editPassword").type = event.target.checked
      ? "text"
      : "password";
  });
document.getElementById("addRole").addEventListener("change", (event) => {
  const student = event.target.value === "student";
  document.getElementById("studentFields").classList.toggle("hidden", !student);
  document.getElementById("addCourse").required = student;
  document.getElementById("addYearLevel").required = student;
});

async function loadOptions() {
  try {
    const [courseResponse, permissionResponse] = await Promise.all([
      requestJson("/api/course"),
      requestJson("/api/permission/all/active"),
    ]);
    const courseOptions = (courseResponse.data || [])
      .map(
        (row) =>
          `<option value="${row.id}">${escapeHtml(row.code)} — ${escapeHtml(row.name)}</option>`,
      )
      .join("");
    document
      .getElementById("addCourse")
      .insertAdjacentHTML("beforeend", courseOptions);
    document
      .getElementById("editCourse")
      .insertAdjacentHTML("beforeend", courseOptions);
    const permissionOptions = (permissionResponse.data || [])
      .map(
        (row) => `<option value="${row.id}">${escapeHtml(row.name)}</option>`,
      )
      .join("");
    document
      .getElementById("permissionSelect")
      .insertAdjacentHTML("beforeend", permissionOptions);
    document
      .getElementById("editPermissionSelect")
      .insertAdjacentHTML("beforeend", permissionOptions);
  } catch {
    showToast("Unable to load course or permission options.");
  }
}

document
  .getElementById("newUserForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!confirm("Create this user?")) return;
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    const student = document.getElementById("addRole").value === "student";
    Object.assign(payload, {
      is_student_rater: student ? 1 : 0,
      is_admin_rater: student ? 0 : 1,
      is_active: document.getElementById("isUserActive").checked ? 1 : 0,
      is_temp_pass: 1,
      user_id: state.userId,
    });
    if (!student) {
      payload.course_id = null;
      payload.year_level = null;
    }
    await save("/api/user/add", "POST", payload, "addNewModal");
  });

async function editUser(id) {
  try {
    const response = await requestJson(`/api/user/${id}`);
    if (!response.success) throw new Error(response.message);
    const row = response.data;
    state.editId = row.id;
    setValue("editGivenName", row.givenname);
    setValue("editMiddleName", row.middlename);
    setValue("editLastName", row.surname);
    setValue("editGender", String(row.gender || "").toUpperCase());
    setValue("editCourse", row.course_id ?? "");
    setValue("editYearLevel", row.year_level ?? "");
    setValue("editUsername", row.username);
    setValue("editPassword", "");
    setValue("editPermissionSelect", row.permission_id);
    setValue("editRole", Number(row.is_student_rater) ? "student" : "admin");
    document.getElementById("editTemporaryPassword").checked =
      Number(row.is_temp_pass) === 1;
    document.getElementById("editIsUserActive").checked =
      Number(row.is_active) === 1;
    toggleModal("editModal", true);
  } catch {
    showToast("Unable to load this user.");
  }
}

document
  .getElementById("editUserForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    const student = payload.role === "student";
    Object.assign(payload, {
      id: state.editId,
      user_id: state.userId,
      course_id: payload.course_id || null,
      year_level: payload.year_level || null,
      is_student_rater: student ? 1 : 0,
      is_admin_rater: student ? 0 : 1,
      is_temp_pass: document.getElementById("editTemporaryPassword").checked
        ? 1
        : 0,
      is_active: document.getElementById("editIsUserActive").checked ? 1 : 0,
    });
    if (!student) {
      payload.course_id = null;
      payload.year_level = null;
    }
    await save("/api/user/update", "PUT", payload, "editModal");
  });

async function save(url, method, payload, modalId) {
  if (!confirm("Save these changes?")) return;
  try {
    const response = await requestJson(url, {
      method,
      body: JSON.stringify(payload),
    });
    showToast(response.message);
    if (!response.success) return;
    toggleModal(modalId, false);
    table.ajax.reload(null, false);
  } catch {
    showToast("Unable to save the user.");
  }
}

function openUserImport() {
  toggleModal("addNewModal", false);
  setTimeout(() => toggleModal("userImportModal", true), 260);
}
document
  .getElementById("userImportForm")
  .addEventListener("submit", (event) => prepareImport(event, "users"));
document
  .getElementById("passwordImportForm")
  .addEventListener("submit", (event) => prepareImport(event, "passwords"));

[
  ["userXlsxInput", "userDropZone"],
  ["passwordXlsxInput", "passwordDropZone"],
].forEach(([inputId, zoneId]) => {
  const input = document.getElementById(inputId);
  input.addEventListener("change", () => {
    const text = document.querySelector(`#${zoneId} p`);
    if (input.files[0]) text.textContent = `Selected: ${input.files[0].name}`;
  });
});

document
  .getElementById("downloadUserTemplate")
  .addEventListener("click", (event) => {
    event.preventDefault();
    downloadTemplate(
      [
        {
          username: "2026-00001",
          password: "Temporary123",
          givenname: "Juan",
          middlename: "",
          surname: "Dela Cruz",
          gender: "MALE",
          role: "student",
          permission_id: 1,
          course_id: 1,
          year_level: 1,
          is_active: 1,
        },
      ],
      "user_import_template.xlsx",
      "Users",
    );
  });

document
  .getElementById("downloadPasswordTemplate")
  .addEventListener("click", (event) => {
    event.preventDefault();
    downloadTemplate(
      [{ username: "2026-00001", password: "NewPassword123" }],
      "password_update_template.xlsx",
      "Passwords",
    );
  });

async function prepareImport(event, mode) {
  event.preventDefault();
  const input = document.getElementById(
    mode === "users" ? "userXlsxInput" : "passwordXlsxInput",
  );
  try {
    const rows = await readXlsx(input.files[0]);
    const required =
      mode === "users"
        ? [
            "username",
            "password",
            "givenname",
            "surname",
            "gender",
            "role",
            "permission_id",
          ]
        : ["username", "password"];
    state.importMode = mode;
    state.validRows = [];
    state.errorRows = [];
    rows.forEach((original, index) => {
      const row = normalizeRow(original);
      const missing = required.filter((key) => !String(row[key] ?? "").trim());
      const role = String(row.role || "").toLowerCase();
      if (
        mode === "users" &&
        role === "student" &&
        (!row.course_id || !row.year_level)
      ) {
        missing.push("course_id", "year_level");
      }
      const invalidRole =
        mode === "users" && !["student", "admin"].includes(role);
      const error = missing.length
        ? `Missing: ${[...new Set(missing)].join(", ")}`
        : invalidRole
          ? "Role must be Student or Admin"
          : "";
      if (error)
        state.errorRows.push({ ...original, Error: error, __row: index + 2 });
      else state.validRows.push({ ...row, __row: index + 2 });
    });
    renderPreview();
    toggleModal(
      mode === "users" ? "userImportModal" : "passwordImportModal",
      false,
    );
    setTimeout(() => toggleModal("importPreviewModal", true), 260);
  } catch (error) {
    showToast(error.message || "Unable to read the XLSX file.");
  }
}

function renderPreview() {
  const action = state.importMode === "users" ? "created" : "updated";
  document.getElementById("successPreviewTitle").textContent =
    action[0].toUpperCase() + action.slice(1);
  document.getElementById("previewSummary").textContent =
    `${state.validRows.length + state.errorRows.length} rows checked: ${state.validRows.length} ready and ${state.errorRows.length} with errors.`;
  document.getElementById("successPreview").innerHTML = previewTable(
    state.validRows,
  );
  document.getElementById("errorPreview").innerHTML = previewTable(
    state.errorRows,
  );
  document.getElementById("runImportButton").disabled =
    state.validRows.length === 0;
}

document
  .getElementById("runImportButton")
  .addEventListener("click", async () => {
    toggleModal("importPreviewModal", false);
    await delay(260);
    toggleModal("loadingModal", true);
    await delay(30);
    let completed = 0;
    for (const row of state.validRows) {
      try {
        let response;
        if (state.importMode === "users") {
          const student = String(row.role).toLowerCase() === "student";
          response = await requestJson("/api/user/add", {
            method: "POST",
            body: JSON.stringify({
              ...row,
              is_student_rater: student ? 1 : 0,
              is_admin_rater: student ? 0 : 1,
              is_active: row.is_active ?? 1,
              is_temp_pass: 1,
              course_id: student ? row.course_id : null,
              year_level: student ? row.year_level : null,
              user_id: state.userId,
            }),
          });
        } else {
          const found = await requestJson("/api/user/get", {
            method: "POST",
            body: JSON.stringify({ username: row.username }),
          });
          if (!found.success)
            throw new Error(found.message || "User not found");
          response = await requestJson("/api/user/update/password", {
            method: "PUT",
            body: JSON.stringify({
              username: row.username,
              password: row.password,
              id: found.data.id,
              user_id: state.userId,
            }),
          });
        }
        if (!response.success)
          throw new Error(response.message || "Import failed");
        completed++;
      } catch (error) {
        const clean = { ...row };
        delete clean.__row;
        state.errorRows.push({ ...clean, Error: error.message });
      }
      document.getElementById("loadingMessage").textContent =
        `Processing ${completed + state.errorRows.length} of ${state.validRows.length + state.errorRows.length}...`;
    }
    toggleModal("loadingModal", false);
    if (state.errorRows.length) downloadFailedRows(state.errorRows);
    table.ajax.reload(null, false);
    showToast(
      `${completed} rows processed successfully. ${state.errorRows.length} failed.`,
    );
  });

function readXlsx(file) {
  if (!file) return Promise.reject(new Error("Select an XLSX file."));
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      defval: "",
    });
  });
}
function normalizeRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      String(key).trim().toLowerCase().replace(/\s+/g, "_"),
      value,
    ]),
  );
}
function previewTable(rows) {
  if (!rows.length)
    return '<p class="preview-empty">No rows in this section.</p>';
  const keys = Object.keys(rows[0])
    .filter((key) => key !== "__row")
    .slice(0, 8);
  return `<table class="preview-table"><thead><tr>${keys.map((key) => `<th>${escapeHtml(key)}</th>`).join("")}</tr></thead><tbody>${rows
    .slice(0, 100)
    .map(
      (row) =>
        `<tr>${keys.map((key) => `<td>${escapeHtml(row[key])}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody></table>`;
}
function downloadFailedRows(rows) {
  const clean = rows.map((row) =>
    Object.fromEntries(Object.entries(row).filter(([key]) => key !== "__row")),
  );
  const sheet = XLSX.utils.json_to_sheet(clean);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Failed Rows");
  XLSX.writeFile(
    book,
    `failed_user_import_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
function downloadTemplate(rows, filename, sheetName) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  XLSX.writeFile(book, filename);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  return response.json();
}
function setValue(id, value) {
  document.getElementById(id).value = value ?? "";
}
function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value ?? "";
  return span.innerHTML;
}

function toggleModal(id, show = true) {
  const modal = document.getElementById(id);
  const card = document.getElementById(`${id}Card`);
  if (!modal) return;
  const dropZoneTexts = modal.querySelectorAll('[id$="DropZone"] p');
  if (show) {
    dropZoneTexts.forEach((text) => {
      if (!text.dataset.defaultText)
        text.dataset.defaultText = text.textContent.trim();
    });
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
      dropZoneTexts.forEach((text) => {
        if (text.dataset.defaultText)
          text.textContent = text.dataset.defaultText;
      });
    }, 250);
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
    const normalize = (path) =>
      path.replace(/\/index\.html$/, "").replace(/\/$/, "");
    const currentPath = normalize(location.pathname);
    document.querySelectorAll("#mySidenav a[href]").forEach((link) => {
      if (
        normalize(new URL(link.href, location.origin).pathname) !== currentPath
      )
        return;
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
  } catch (error) {
    console.error("Sidebar failed:", error);
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document
    .querySelectorAll(".room-modal:not(.invisible)")
    .forEach((modal) => toggleModal(modal.id, false));
});
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
  loadOptions();
});
