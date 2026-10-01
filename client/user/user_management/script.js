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
  permissions: [],
  editTemporaryPassword: false,
  superAdmin: false,
};

if (!state.userId) {
  alert("Log in to continue.");
  location.href = "../../index.html";
} else if (state.usersAccess == 0) {
  alert("You don't have permission to access this page.");
  history.back();
}

fetch("/api/login/session", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .then((session) => {
    state.superAdmin =
      String(session?.data?.permission_name || "")
        .trim()
        .toLowerCase() === "super admin";
    if (!state.superAdmin) return;
    document
      .getElementById("deactivateUsersButton")
      ?.classList.remove("hidden");
    document
      .getElementById("updatePasswordsButton")
      ?.classList.remove("hidden");
  })
  .catch(() => {});

const yesNo = (value) =>
  `<span class="boolean-badge ${Number(value) ? "" : "off"}">${Number(value) ? "Yes" : "No"}</span>`;
const loginMethod = (_, __, row) => {
  const hasEmail = Boolean(String(row.google_email || "").trim());
  const hasPassword = Number(row.has_password) === 1;
  const label =
    hasEmail && hasPassword
      ? "Both"
      : hasEmail
        ? "Email"
        : hasPassword
          ? "Password"
          : "None";
  return `<span class="login-method login-method-${label.toLowerCase()}">${label}</span>`;
};

async function loadOnlineUserCount() {
  try {
    const response = await requestJson("/api/user/online/count");
    if (!response.success) throw new Error(response.message);
    document.getElementById("onlineUserCount").textContent = Number(
      response.data?.online_count || 0,
    ).toLocaleString();
  } catch {
    document.getElementById("onlineUserCount").textContent = "—";
  }
}

loadOnlineUserCount();
setInterval(loadOnlineUserCount, 30 * 1000);

const table = $("#table").DataTable({
  ajax: { url: "/api/user", dataSrc: "data", cache: false },
  columns: [
    { data: "username", title: "Username", width: "10%" },
    { data: "Name", title: "Name" },
    { data: "permission", title: "Permission", width: "13%" },
    {
      data: null,
      title: "Login Method",
      className: "dt-center",
      render: loginMethod,
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
  document.getElementById("adminScopeField").classList.add("hidden");
  document.getElementById("addRole").value = "";
  configurePermissionSelect("permissionSelect", "");
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
  const role = event.target.value;
  const student = role === "student";
  document.getElementById("studentFields").classList.toggle("hidden", !student);
  document
    .getElementById("adminScopeField")
    .classList.toggle("hidden", role !== "admin");
  document.getElementById("addCourse").required = student;
  document.getElementById("addYearLevel").required = student;
  configurePermissionSelect("permissionSelect", role);
});

function configurePermissionSelect(selectId, role, selectedId = "") {
  const select = document.getElementById(selectId);
  const permissions = state.permissions.filter((permission) => {
    const isRater = String(permission.name).trim().toLowerCase() === "rater";
    return role === "student" ? isRater : role === "admin" ? !isRater : false;
  });
  select.replaceChildren();
  const prompt = document.createElement("option");
  prompt.value = "";
  prompt.textContent = role ? "Select permission" : "Select account type first";
  prompt.disabled = true;
  prompt.selected = true;
  select.appendChild(prompt);
  permissions.forEach((permission) => {
    const option = document.createElement("option");
    option.value = permission.id;
    option.textContent = permission.name;
    select.appendChild(option);
  });
  if (role === "student" && permissions[0]) select.value = permissions[0].id;
  else if (
    selectedId &&
    permissions.some((item) => String(item.id) === String(selectedId))
  )
    select.value = selectedId;
  select.disabled = !role || role === "student";
}

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
    state.permissions = permissionResponse.data || [];
    configurePermissionSelect("permissionSelect", "");
    configurePermissionSelect("editPermissionSelect", "");
  } catch {
    showToast("Unable to load program or permission options.");
  }
}

document
  .getElementById("newUserForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(await satpConfirm("Create this user?"))) return;
    const payload = Object.fromEntries(new FormData(form));
    if (
      !String(payload.password || "").trim() &&
      !String(payload.google_email || "").trim()
    ) {
      return showToast("Enter a temporary password or an institutional email.");
    }
    const student = document.getElementById("addRole").value === "student";
    payload.permission_id = document.getElementById("permissionSelect").value;
    Object.assign(payload, {
      is_student_rater: student ? 1 : 0,
      is_admin_rater: student ? 0 : 1,
      admin_academic_scope: student
        ? null
        : document.getElementById("addAdminAcademicScope").value || "ALL",
      is_active: document.getElementById("isUserActive").checked ? 1 : 0,
      is_temp_pass: student ? 0 : 1,
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
    setValue("editGoogleEmail", row.google_email);
    setValue("editPassword", "");
    const hasPassword = Number(row.has_password) === 1;
    const passwordStatus = document.getElementById("editPasswordStatus");
    passwordStatus.textContent = hasPassword
      ? "Password sign-in is configured. Leave the field blank to keep it."
      : "No password is set. This account can sign in with its institutional Google email only.";
    passwordStatus.classList.toggle("password-missing", !hasPassword);
    const role = Number(row.is_student_rater) ? "student" : "admin";
    setValue("editRole", role);
    configurePermissionSelect("editPermissionSelect", role, row.permission_id);
    setValue("editAdminAcademicScope", row.admin_academic_scope || "ALL");
    document
      .getElementById("editAdminScopeField")
      .classList.toggle("hidden", Number(row.is_student_rater) === 1);
    document
      .getElementById("editTemporaryPasswordField")
      .classList.toggle("hidden", Number(row.is_student_rater) === 1);
    state.editTemporaryPassword = Number(row.is_temp_pass) === 1;
    updateTemporaryPasswordStatus();
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
    const hasNewPassword = Boolean(String(payload.password || "").trim());
    payload.permission_id = document.getElementById(
      "editPermissionSelect",
    ).value;
    Object.assign(payload, {
      id: state.editId,
      user_id: state.userId,
      course_id: payload.course_id || null,
      year_level: payload.year_level || null,
      is_student_rater: student ? 1 : 0,
      is_admin_rater: student ? 0 : 1,
      admin_academic_scope: student
        ? null
        : document.getElementById("editAdminAcademicScope").value || "ALL",
      is_temp_pass: student
        ? 0
        : hasNewPassword || state.editTemporaryPassword
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

document.getElementById("editRole").addEventListener("change", (event) => {
  configurePermissionSelect("editPermissionSelect", event.target.value);
  document
    .getElementById("editAdminScopeField")
    .classList.toggle("hidden", event.target.value === "student");
  const isStudent = event.target.value === "student";
  document
    .getElementById("editTemporaryPasswordField")
    .classList.toggle("hidden", isStudent);
  updateTemporaryPasswordStatus();
});

document
  .getElementById("editPassword")
  .addEventListener("input", updateTemporaryPasswordStatus);

function updateTemporaryPasswordStatus() {
  const isStudent = document.getElementById("editRole").value === "student";
  const hasNewPassword = Boolean(
    String(document.getElementById("editPassword").value || "").trim(),
  );
  const isTemporary =
    !isStudent && (hasNewPassword || state.editTemporaryPassword);
  document.getElementById("editTemporaryPassword").checked = isTemporary;
  document.getElementById("editTemporaryPasswordHint").textContent = isTemporary
    ? hasNewPassword
      ? "Enabled automatically because a new password is being set."
      : "Currently enabled."
    : "Currently disabled. A new password will enable it automatically.";
}

async function save(url, method, payload, modalId) {
  if (!(await satpConfirm("Save these changes?"))) return;
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
document
  .getElementById("deactivateImportForm")
  .addEventListener("submit", (event) => prepareImport(event, "deactivate"));

[
  ["userXlsxInput", "userDropZone"],
  ["passwordXlsxInput", "passwordDropZone"],
  ["deactivateXlsxInput", "deactivateDropZone"],
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
          google_email: "juan.delacruz@ndmu.edu.ph",
          givenname: "Juan",
          middlename: "",
          surname: "Dela Cruz",
          gender: "MALE",
          role: "student",
          permission_id: 5,
          admin_academic_scope: "",
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

document
  .getElementById("downloadDeactivateTemplate")
  .addEventListener("click", (event) => {
    event.preventDefault();
    downloadTemplate(
      [{ username: "2026-00001" }],
      "user_deactivation_template.xlsx",
      "Deactivate Users",
    );
  });

async function prepareImport(event, mode) {
  event.preventDefault();
  if ((mode === "passwords" || mode === "deactivate") && !state.superAdmin) {
    return showToast("Only Super Admin accounts can use this feature.");
  }
  const inputIds = {
    users: "userXlsxInput",
    passwords: "passwordXlsxInput",
    deactivate: "deactivateXlsxInput",
  };
  const modalIds = {
    users: "userImportModal",
    passwords: "passwordImportModal",
    deactivate: "deactivateImportModal",
  };
  const input = document.getElementById(inputIds[mode]);
  try {
    const rows = await readXlsx(input.files[0]);
    const required =
      mode === "users"
        ? [
            "username",
            "givenname",
            "surname",
            "gender",
            "role",
            "permission_id",
          ]
        : mode === "passwords"
          ? ["username", "password"]
          : ["username"];
    let usersByUsername = new Map();
    if (mode === "users" || mode === "deactivate") {
      const [response, permissionResponse] = await Promise.all([
        requestJson("/api/user"),
        mode === "users"
          ? requestJson("/api/permission/all/active")
          : Promise.resolve(null),
      ]);
      if (permissionResponse) state.permissions = permissionResponse.data || [];
      usersByUsername = new Map(
        (response.data || []).map((user) => [
          String(user.username || "")
            .trim()
            .toLowerCase(),
          user,
        ]),
      );
    }
    state.importMode = mode;
    state.validRows = [];
    state.errorRows = [];
    const seenUsernames = new Set();
    rows.forEach((original, index) => {
      const row = normalizeRow(original);
      row.google_email = String(row.google_email || row.email || "")
        .trim()
        .toLowerCase();
      const missing = required.filter((key) => !String(row[key] ?? "").trim());
      const usernameKey = String(row.username || "")
        .trim()
        .toLowerCase();
      const role = String(row.role || "").toLowerCase();
      const requestedAdminScope = String(
        row.admin_academic_scope || row.academic_scope || "",
      )
        .trim()
        .toUpperCase();
      row.admin_academic_scope =
        role === "admin" ? requestedAdminScope || "ALL" : null;
      if (
        mode === "users" &&
        role === "student" &&
        (!row.course_id || !row.year_level)
      ) {
        missing.push("course_id", "year_level");
      }
      const invalidRole =
        mode === "users" && !["student", "admin"].includes(role);
      const invalidAdminScope =
        mode === "users" &&
        role === "admin" &&
        !["COLLEGE", "SHS", "ALL"].includes(row.admin_academic_scope);
      const selectedPermission = state.permissions.find(
        (permission) => String(permission.id) === String(row.permission_id),
      );
      const selectedPermissionIsRater =
        String(selectedPermission?.name || "")
          .trim()
          .toLowerCase() === "rater";
      const invalidPermission =
        mode === "users" &&
        (!selectedPermission ||
          (role === "student" && !selectedPermissionIsRater) ||
          (role === "admin" && selectedPermissionIsRater));
      const invalidEmail =
        mode === "users" &&
        row.google_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.google_email);
      const uploadedUser = usersByUsername.get(usernameKey);
      const missingNewPassword =
        mode === "users" &&
        !uploadedUser &&
        !row.google_email &&
        !String(row.password || "").trim();
      const error = missing.length
        ? `Missing: ${[...new Set(missing)].join(", ")}`
        : missingNewPassword
          ? "Password or institutional email is required for a new user"
          : invalidRole
            ? "Role must be Student or Admin"
            : invalidAdminScope
              ? "Admin academic scope must be COLLEGE, SHS, or ALL"
              : invalidPermission
                ? role === "student"
                  ? "Student accounts must use the Rater permission"
                  : "Admin accounts cannot use the Rater permission"
                : invalidEmail
                  ? "School Google email is invalid"
                  : mode === "deactivate" && seenUsernames.has(usernameKey)
                    ? "Duplicate username in file"
                    : mode === "deactivate" && !uploadedUser
                      ? "Username not found"
                      : mode === "deactivate" &&
                          usernameKey ===
                            String(state.username || "")
                              .trim()
                              .toLowerCase()
                        ? "You cannot deactivate your current account"
                        : mode === "deactivate" &&
                            Number(uploadedUser.is_active) !== 1
                          ? "User is already inactive"
                          : "";
      if (mode === "deactivate" && usernameKey) seenUsernames.add(usernameKey);
      if (error)
        state.errorRows.push({
          ...original,
          Error: error,
          __row: index + 2,
          ...(mode === "deactivate"
            ? {
                __previewName: uploadedUser?.Name || "",
                __previewPermission: uploadedUser?.permission || "",
              }
            : {}),
        });
      else
        state.validRows.push({
          ...row,
          __row: index + 2,
          __existingId: uploadedUser?.id || null,
          ...(mode === "deactivate"
            ? {
                __previewName: uploadedUser?.Name || "",
                __previewPermission: uploadedUser?.permission || "",
              }
            : {}),
        });
    });
    renderPreview();
    toggleModal(modalIds[mode], false);
    setTimeout(() => toggleModal("importPreviewModal", true), 260);
  } catch (error) {
    showToast(error.message || "Unable to read the XLSX file.");
  }
}

function renderPreview() {
  const action =
    state.importMode === "users"
      ? "created"
      : state.importMode === "deactivate"
        ? "will be deactivated"
        : "updated";
  document.getElementById("successPreviewTitle").textContent =
    action[0].toUpperCase() + action.slice(1);
  document.getElementById("previewSummary").textContent =
    state.importMode === "deactivate"
      ? `${state.validRows.length} accounts ready to deactivate; ${state.errorRows.length} errors.`
      : `${state.validRows.length + state.errorRows.length} rows checked: ${state.validRows.length} ready and ${state.errorRows.length} with errors.`;
  renderPreviewTable("successPreview", state.validRows, false);
  renderPreviewTable("errorPreview", state.errorRows, true);
  document.getElementById("runImportButton").disabled =
    state.validRows.length === 0;
  document.getElementById("runImportButton").textContent =
    state.importMode === "deactivate" ? "Deactivate users" : "Run import";
}

document
  .getElementById("runImportButton")
  .addEventListener("click", async () => {
    if (
      (state.importMode === "passwords" || state.importMode === "deactivate") &&
      !state.superAdmin
    ) {
      return showToast("Only Super Admin accounts can use this feature.");
    }
    if (
      state.importMode === "deactivate" &&
      !(await satpConfirm(
        `Deactivate ${state.validRows.length} uploaded user account${state.validRows.length === 1 ? "" : "s"}?`,
        {
          title: "Deactivate accounts",
          confirmText: "Deactivate",
        },
      ))
    )
      return;
    toggleModal("importPreviewModal", false);
    await delay(260);
    toggleModal("loadingModal", true);
    await delay(30);
    let completed = 0;
    if (state.importMode === "deactivate") {
      try {
        const response = await requestJson("/api/user/bulk/deactivate", {
          method: "PUT",
          body: JSON.stringify({
            usernames: state.validRows.map((row) => row.username),
          }),
        });
        if (!response.success)
          throw new Error(response.message || "Deactivation failed");
        completed = Number(response.data?.deactivated || 0);
      } catch (error) {
        state.validRows.forEach((row) => {
          const clean = { ...row };
          delete clean.__row;
          state.errorRows.push({ ...clean, Error: error.message });
        });
      }
    } else
      for (const row of state.validRows) {
        try {
          let response;
          if (state.importMode === "users") {
            const student = String(row.role).toLowerCase() === "student";
            const existing = Boolean(row.__existingId);
            const payload = {
              ...row,
              id: row.__existingId,
              password: existing ? "" : row.password,
              is_student_rater: student ? 1 : 0,
              is_admin_rater: student ? 0 : 1,
              admin_academic_scope: student
                ? null
                : row.admin_academic_scope || "ALL",
              is_active: row.is_active ?? 1,
              is_temp_pass: student
                ? 0
                : existing
                  ? Number(row.is_temp_pass ?? 0)
                  : 1,
              course_id: student ? row.course_id : null,
              year_level: student ? row.year_level : null,
              user_id: state.userId,
            };
            delete payload.__row;
            delete payload.__existingId;
            response = await requestJson(
              existing ? "/api/user/update" : "/api/user/add",
              {
                method: existing ? "PUT" : "POST",
                body: JSON.stringify({
                  ...payload,
                }),
              },
            );
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
function renderPreviewTable(containerId, rows, isError) {
  const container = document.getElementById(containerId);
  container.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "preview-empty";
    empty.textContent = "No rows in this section.";
    container.appendChild(empty);
    return;
  }
  const deactivation = state.importMode === "deactivate";
  const columns = deactivation
    ? [
        ["Username", (row) => row.username],
        ["Name", (row) => row.__previewName || "—"],
        [
          isError ? "Error" : "Permission",
          (row) => (isError ? row.Error : row.__previewPermission || "—"),
        ],
      ]
    : Object.keys(rows[0])
        .filter((key) => !key.startsWith("__"))
        .slice(0, 8)
        .map((key) => [key, (row) => row[key]]);
  const scroll = document.createElement("div");
  scroll.className = "preview-table-scroll";
  const controls = document.createElement("div");
  controls.className = "preview-page-controls";
  container.append(scroll, controls);
  let pageStart = 0;
  const pageSize = 250;
  const renderPage = () => {
    scroll.scrollTop = 0;
    scroll.innerHTML = `<table class="preview-table"><thead><tr>${columns.map(([heading]) => `<th>${escapeHtml(heading)}</th>`).join("")}</tr></thead><tbody>${rows
      .slice(pageStart, pageStart + pageSize)
      .map(
        (row) =>
          `<tr>${columns.map(([, getValue]) => `<td>${escapeHtml(getValue(row))}</td>`).join("")}</tr>`,
      )
      .join("")}</tbody></table>`;
    controls.replaceChildren();
    if (rows.length <= pageSize) return;
    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "Previous 250";
    previous.disabled = pageStart === 0;
    previous.addEventListener("click", () => {
      pageStart = Math.max(0, pageStart - pageSize);
      renderPage();
    });
    const count = document.createElement("span");
    count.textContent = `${pageStart + 1}-${Math.min(pageStart + pageSize, rows.length)} of ${rows.length}`;
    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "Next 250";
    next.disabled = pageStart + pageSize >= rows.length;
    next.addEventListener("click", () => {
      pageStart += pageSize;
      renderPage();
    });
    controls.append(previous, count, next);
  };
  renderPage();
}
function downloadFailedRows(rows) {
  const clean = rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).filter(([key]) => !key.startsWith("__")),
    ),
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
  const field = document.getElementById(id);
  field.value = value ?? "";
  if (field.matches("select[data-searchable-select]")) {
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
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
