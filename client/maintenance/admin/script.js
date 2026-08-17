var user = localStorage.getItem("user_id");
var maintenanceAccess = localStorage.getItem("maintenanceAccess");
var username = localStorage.getItem("username");
var fullname = localStorage.getItem("fullname");
var adminPermissions = [];
var pendingAdminImport = {
  created: [],
  updated: [],
  unchanged: [],
  errors: [],
};

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

if (maintenanceAccess == 0) {
  alert("You don't have permission to access this page. Redirecting...");
  history.back();
}

let data = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `/api/admin`,
    cache: true,
  },
  columnDefs: [{ className: "dt-center", targets: [4, 5, 6] }],
  columns: [
    { width: "15%", data: "username", title: "Username" },
    { data: "name", title: "Admin name" },
    {
      width: "20%",
      data: "google_email",
      title: "Institutional email",
      defaultContent: "",
    },
    { width: "20%", data: "permission", title: "Permission" },
    {
      width: "10%",
      data: "admin_academic_scope",
      title: "Academic scope",
      render: (value) => value || "All",
    },
    {
      width: "10%",
      data: null,
      title: "Status",
      render: function (data, type, row) {
        return row.is_active
          ? '<span class="status-badge active">Active</span>'
          : '<span class="status-badge inactive">Inactive</span>';
      },
    },
    {
      width: "10%",
      data: null,
      title: "Actions",
      orderable: false,
      render: function (data, type, row) {
        return `<div class="text-nowrap">
          <button class="table-edit-button" type="button" onclick="edit(${row.id})" title="Edit administrator" aria-label="Edit administrator">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg>
          </button>
        </div>`;
      },
    },
  ],
  pageLength: 10,
  dom: '<"flex justify-between items-center mb-4"f>rt<"flex justify-between items-center mt-4"ip>',
  language: {
    search: "",
    searchPlaceholder: "Search admin accounts...",
    paginate: { previous: "Previous", next: "Next" },
  },
});

function showPassword() {
  var x = document.getElementById("addPassword");
  if (x.type === "password") {
    x.type = "text";
  } else {
    x.type = "password";
  }
}

// Get permission from API
const getPermission = async () => {
  const permissionLists = [
    document.querySelector("#permissionSelect"),
    document.querySelector("#editPermissionSelect"),
  ];

  const endpoint = `/api/permission/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    result = (data.data || []).filter(
      (permission) =>
        String(permission.name || "").trim().toLowerCase() !== "rater",
    );

  adminPermissions = result;

  result.forEach((row) => {
    permissionLists.forEach((permissionList) => {
      permissionList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    });
  });
};

const permissionsReady = getPermission();

function normalizeAdminImportRow(raw) {
  const row = {};
  Object.entries(raw || {}).forEach(([key, value]) => {
    row[String(key).trim().toLowerCase().replace(/[\s-]+/g, "_")] = value;
  });
  row.username = String(row.username || "").trim();
  row.password = String(row.password || "").trim();
  row.givenname = String(row.givenname || row.first_name || "").trim();
  row.middlename = String(row.middlename || row.middle_name || "").trim();
  row.surname = String(row.surname || row.last_name || "").trim();
  row.gender = String(row.gender || "").trim().toUpperCase();
  row.google_email = String(row.google_email || row.email || "")
    .trim()
    .toLowerCase();
  row.admin_academic_scope = String(
    row.admin_academic_scope || row.academic_scope || "ALL",
  )
    .trim()
    .toUpperCase();
  row.permission_id = String(row.permission_id || "").trim();
  row.is_active = ["0", "false", "inactive", "no"].includes(
    String(row.is_active ?? "1").trim().toLowerCase(),
  )
    ? 0
    : 1;
  return row;
}

function readAdminWorkbook(file) {
  if (!file) return Promise.reject(new Error("Select an Excel workbook."));
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      defval: "",
      raw: false,
    });
  });
}

function adminImportChanged(row, current) {
  const fields = [
    "givenname",
    "middlename",
    "surname",
    "gender",
    "google_email",
    "permission_id",
    "admin_academic_scope",
    "is_active",
  ];
  return fields.some((field) => {
    const incoming = String(row[field] ?? "").trim().toUpperCase();
    const existing = String(current[field] ?? "").trim().toUpperCase();
    return incoming !== existing;
  });
}

function classifyAdminImport(rows, existingAdmins) {
  const existing = new Map(
    existingAdmins.map((admin) => [admin.username.trim().toLowerCase(), admin]),
  );
  const seen = new Set();
  const result = { created: [], updated: [], unchanged: [], errors: [] };
  rows.forEach((raw, index) => {
    const row = normalizeAdminImportRow(raw);
    const key = row.username.toLowerCase();
    const permission = adminPermissions.find(
      (item) => String(item.id) === row.permission_id,
    );
    let reason = "";
    if (!row.username || !row.givenname || !row.surname || !row.gender || !row.permission_id)
      reason = "Required administrator fields are incomplete";
    else if (seen.has(key)) reason = "Duplicate username in workbook";
    else if (!["MALE", "FEMALE"].includes(row.gender))
      reason = "Gender must be Male or Female";
    else if (!permission) reason = "Permission is inactive, Rater, or not found";
    else if (!["COLLEGE", "SHS", "ALL"].includes(row.admin_academic_scope))
      reason = "Academic scope must be COLLEGE, SHS, or ALL";
    else if (row.google_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.google_email))
      reason = "Institutional email is invalid";
    const current = existing.get(key);
    if (!reason && !current && !row.password && !row.google_email)
      reason = "Password or institutional email is required for a new admin";
    seen.add(key);
    const item = { ...row, rowNumber: index + 2, originalRow: raw };
    if (reason) result.errors.push({ ...item, reason });
    else if (!current) result.created.push(item);
    else if (adminImportChanged(row, current))
      result.updated.push({ ...item, id: current.id, current });
    else result.unchanged.push({ ...item, id: current.id });
  });
  return result;
}

function renderAdminImportPreview() {
  [
    ["created", "createdPreview", "createdCount", "Will be created"],
    ["updated", "updatedPreview", "updatedCount", "Will be updated"],
    ["unchanged", "unchangedPreview", "unchangedCount", "No changes"],
    ["errors", "errorPreview", "errorCount", ""],
  ].forEach(([key, listId, countId, detail]) => {
    const items = pendingAdminImport[key];
    const list = document.getElementById(listId);
    document.getElementById(countId).textContent = items.length;
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "preview-empty";
      empty.textContent = `No ${key} found`;
      return list.appendChild(empty);
    }
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "preview-row";
      row.innerHTML = '<span class="row-number"></span><span class="room-name"></span><span class="row-detail"></span>';
      row.children[0].textContent = `Row ${item.rowNumber}`;
      row.children[1].textContent = `${item.username} — ${item.givenname} ${item.surname}`;
      row.children[2].textContent = item.reason || detail;
      list.appendChild(row);
    });
  });
  document.getElementById("runAdminImportButton").disabled =
    !pendingAdminImport.created.length && !pendingAdminImport.updated.length;
}

document.getElementById("adminXlsxInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) document.querySelector("#adminDropZone p").textContent = `Selected: ${file.name}`;
});

document.getElementById("downloadAdminTemplate").addEventListener("click", (event) => {
  event.preventDefault();
  const sheet = XLSX.utils.json_to_sheet([
    {
      username: "admin.user",
      password: "Temporary123",
      givenname: "Admin",
      middlename: "",
      surname: "User",
      gender: "Male",
      google_email: "admin.user@ndmu.edu.ph",
      permission_id: 2,
      admin_academic_scope: "COLLEGE",
      is_active: 1,
    },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Administrators");
  XLSX.writeFile(workbook, "admin_import_template.xlsx");
});

document.getElementById("uploadAdminForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  toggleModal("importFileModal", false);
  document.querySelector("#spinnerStatusModal .eyebrow").textContent = "Validating workbook";
  document.getElementById("statusMessage").textContent = "Please wait";
  document.getElementById("progressDetail").textContent = "Refreshing administrators and permissions.";
  setTimeout(() => toggleModal("spinnerStatusModal", true), 250);
  try {
    const [rows, adminResponse, permissionResponse] = await Promise.all([
      readAdminWorkbook(document.getElementById("adminXlsxInput").files[0]),
      fetch("/api/admin").then((response) => response.json()),
      fetch("/api/permission/all/active").then((response) => response.json()),
    ]);
    adminPermissions = (permissionResponse.data || []).filter(
      (permission) => String(permission.name).trim().toLowerCase() !== "rater",
    );
    pendingAdminImport = classifyAdminImport(rows, adminResponse.data || []);
    renderAdminImportPreview();
    toggleModal("spinnerStatusModal", false);
    setTimeout(() => toggleModal("importPreviewModal", true), 250);
  } catch (error) {
    toggleModal("spinnerStatusModal", false);
    setTimeout(() => toggleModal("importFileModal", true), 250);
    setErrorMessage(error.message || "Unable to validate the workbook.");
  }
});

async function adminImportRequest(url, method, payload) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Import failed");
  return result;
}

function downloadAdminImportErrors(errors) {
  if (!errors.length) return;
  const rows = errors.map((item) => ({ ...item.originalRow, Error: item.reason }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Import Errors");
  XLSX.writeFile(workbook, `admin_import_errors_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

document.getElementById("runAdminImportButton").addEventListener("click", async () => {
  const actions = [
    ...pendingAdminImport.created.map((item) => ({ type: "created", item })),
    ...pendingAdminImport.updated.map((item) => ({ type: "updated", item })),
  ];
  toggleModal("importPreviewModal", false);
  document.querySelector("#spinnerStatusModal .eyebrow").textContent = "Import in progress";
  document.getElementById("statusMessage").textContent = "0%";
  document.getElementById("progressDetail").textContent = "Preparing administrator records.";
  setTimeout(() => toggleModal("spinnerStatusModal", true), 250);
  const totals = { created: 0, updated: 0 };
  const failures = [...pendingAdminImport.errors];
  for (let index = 0; index < actions.length; index++) {
    const { type, item } = actions[index];
    try {
      const payload = {
        username: item.username,
        password: type === "created" ? item.password : "",
        givenname: item.givenname,
        middlename: item.middlename,
        surname: item.surname,
        gender: item.gender,
        google_email: item.google_email,
        permission_id: item.permission_id,
        admin_academic_scope: item.admin_academic_scope,
        is_active: item.is_active,
        is_temp_pass: 1,
        user_id: user,
      };
      if (type === "created") {
        await adminImportRequest("/api/admin/add", "POST", payload);
      } else {
        await adminImportRequest("/api/admin/update/info", "PUT", {
          ...payload,
          id: item.id,
        });
        if (Number(item.current.is_active) !== Number(item.is_active)) {
          await adminImportRequest("/api/admin/update/status", "PUT", {
            id: item.id,
            is_active: item.is_active,
            user_id: user,
          });
        }
      }
      totals[type]++;
    } catch (error) {
      failures.push({ ...item, reason: error.message });
    }
    const completed = index + 1;
    document.getElementById("statusMessage").textContent = `${Math.round((completed / actions.length) * 100)}%`;
    document.getElementById("progressDetail").textContent = `Processing ${completed} of ${actions.length} administrator records.`;
  }
  toggleModal("spinnerStatusModal", false);
  downloadAdminImportErrors(failures);
  data.ajax.reload(null, false);
  setSuccessMessage(
    `${totals.created} created, ${totals.updated} updated, ${pendingAdminImport.unchanged.length} unchanged, ${failures.length} errors.`,
  );
});

function generatePassword() {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < 10) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  document.getElementById("addPassword").value = result;
}

// post school year to API
const formAddAdmin = document.querySelector("#newAdminForm");
formAddAdmin.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(formAddAdmin);
  const isActive = document.getElementById("isAdminActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }
  formData.append("is_temp_pass", "0");
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (!String(data.password || "").trim() && !String(data.google_email || "").trim()) {
    return setErrorMessage("Enter a temporary password or an institutional email.");
  }
  if (await satpConfirm("Create this administrator account?")) {
    await fetch(`/api/admin/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success == 0) {
          setErrorMessage(response.message);
        } else {
          setSuccessMessage(response.message);
          toggleModal("addNewModal", false);
          $("#table").DataTable().ajax.reload();
        }
      });
  }
});

function setSuccessMessage(message) {
  showToast(message, "success");
}

function setErrorMessage(message) {
  showToast(message, "error");
}

function showToast(message, type) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  const icon = document.createElement("span");
  const text = document.createElement("span");

  toast.className = "admin-toast";
  toast.setAttribute("role", "status");
  icon.className = "toast-symbol";
  icon.innerHTML =
    type === "success"
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5m0 3h.01M10.3 4.6 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"/></svg>';
  text.textContent = message;
  toast.append(icon, text);
  container.replaceChildren(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// update information on the API
var rowIdToUpdate;
async function edit(id) {
  await permissionsReady;
  await fetch(`/api/admin/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      const adminData = response.data;
      document.getElementById("editGivenName").value = adminData.givenname;
      document.getElementById("editMiddleName").value = adminData.middlename;
      document.getElementById("editLastName").value = adminData.surname;
      document.getElementById("editGenderSelect").value = adminData.gender;
      document.getElementById("editPermissionSelect").value =
        String(adminData.permission_id);
      document.getElementById("editGoogleEmail").value =
        adminData.google_email || "";
      document.getElementById("editAdminAcademicScope").value =
        adminData.admin_academic_scope || "ALL";
      if (adminData.is_active == 0) {
        document.getElementById("editIsAdminStatusActive").checked = false;
      } else {
        document.getElementById("editIsAdminStatusActive").checked = true;
      }
      rowIdToUpdate = adminData.id;
      switchAdminTab("personalInformation");
      toggleModal("editModal", true);
    });
}
const formEditAdmin = document.querySelector("#editAdminInfoForm");
formEditAdmin.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(formEditAdmin);

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (await satpConfirm("Save these administrator changes?")) {
    await fetch(`/api/admin/update/info`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success == 0) {
          setErrorMessage(response.message);
        } else {
          setSuccessMessage(response.message);
          toggleModal("editModal", false);
          $("#table").DataTable().ajax.reload();
        }
      });
  }
});

const formEditAdminStatus = document.querySelector("#editAdminStatusForm");
formEditAdminStatus.addEventListener("submit", async (event) => {
  event.preventDefault();

  const isActive = document.getElementById("editIsAdminStatusActive").checked;
  let status;
  if (isActive == false) {
    status = { is_active: 0, id: rowIdToUpdate, user_id: user };
  } else {
    status = { is_active: 1, id: rowIdToUpdate, user_id: user };
  }

  if (await satpConfirm("Change this administrator's status?")) {
    await fetch(`/api/admin/update/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(status),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success == 0) {
          setErrorMessage(response.message);
        } else {
          setSuccessMessage(response.message);
          toggleModal("editModal", false);
          $("#table").DataTable().ajax.reload();
        }
      });
  }
});

// delete function
var rowIdToDelete;
function deleteRow(id) {
  rowIdToDelete = id;
  toggleModal("deleteModal", true);
}

async function confirmDelete() {
  const data = { id: rowIdToDelete, user_id: user };
  if (
    await satpConfirm("Delete this administrator account?", {
      title: "Delete administrator",
      confirmText: "Delete",
    })
  ) {
    await fetch(`/api/admin/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success == 0) {
          setErrorMessage(response.message);
        } else {
          setSuccessMessage(response.message);
          toggleModal("deleteModal", false);
          $("#table").DataTable().ajax.reload();
        }
      });
  }
}

function toggleNav() {
  const sidenav = document.getElementById("mySidenav");
  const main = document.getElementById("main");
  if (!sidenav) return;

  const isOpen = sidenav.style.width === "280px";
  sidenav.style.width = isOpen ? "0" : "280px";
  if (main) {
    main.style.marginLeft = window.innerWidth <= 760 || isOpen ? "0" : "280px";
  }
}

function toggleModal(modalId, show = true) {
  const modal = document.getElementById(modalId);
  const card = document.getElementById(`${modalId}Card`);
  if (!modal) return;

  if (show) {
    modal.classList.remove("invisible");
    setTimeout(() => {
      modal.classList.add("opacity-100");
      card?.classList.remove("scale-95");
      card?.classList.add("scale-100");
    }, 10);
    document.body.classList.add("overflow-hidden");
    return;
  }

  modal.classList.remove("opacity-100");
  card?.classList.remove("scale-100");
  card?.classList.add("scale-95");

  setTimeout(() => {
    modal.classList.add("invisible");
    modal.querySelectorAll("form").forEach((form) => form.reset());
  }, 250);
  document.body.classList.remove("overflow-hidden");
}

function switchAdminTab(tabId) {
  document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== tabId);
  });
  document.querySelectorAll(".modal-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  ["addNewModal", "editModal"].forEach((modalId) => {
    const modal = document.getElementById(modalId);
    if (modal && !modal.classList.contains("invisible")) {
      toggleModal(modalId, false);
    }
  });
});

function setupSidebarInteractions() {
  const nameEl = document.getElementById("sidebar-fullname");
  if (nameEl) nameEl.textContent = fullname || username || "User";

  document.querySelectorAll(".menu-toggle").forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const targetMenu = document.getElementById(this.dataset.target);
      if (!targetMenu) return;
      targetMenu.classList.toggle("hidden");
      const isHidden = targetMenu.classList.contains("hidden");
      this.setAttribute("aria-expanded", String(!isHidden));
      const chevron = this.querySelector(".chevron");
      if (chevron) {
        chevron.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
      }
    });
  });

  document.getElementById("signout")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "../../index.html";
  });
}

async function loadSidebar() {
  const container = document.getElementById("sidebar-container");
  if (!container) return;

  try {
    const response = await fetch("/sidebar.html");
    container.innerHTML = await response.text();

    document.querySelectorAll("#mySidenav a").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      const currentPath = location.pathname
        .replace(/\/index\.html$/, "")
        .replace(/\/$/, "");
      const linkPath = new URL(link.href, location.origin).pathname
        .replace(/\/index\.html$/, "")
        .replace(/\/$/, "");
      if (linkPath !== currentPath) return;

      const parentDropdown = link.closest("ul[id^='dropdown-']");
      if (parentDropdown) {
        link.classList.add("sub-active");
        parentDropdown.classList.remove("hidden");
        const toggle = document.querySelector(
          `[data-target="${parentDropdown.id}"]`,
        );
        if (toggle) {
          toggle.setAttribute("aria-expanded", "true");
          const chevron = toggle.querySelector(".chevron");
          if (chevron) chevron.style.transform = "rotate(180deg)";
        }
      } else {
        link.classList.add("nav-active");
      }
    });

    setupSidebarInteractions();
  } catch (error) {
    console.error("Sidebar failed to load:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
});
