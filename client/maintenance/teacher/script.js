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

let table;
let rowIdToUpdate;
let pendingImport = { created: [], updated: [], errors: [] };
const departmentsByCode = new Map();

$(document).ready(() => {
  table = $("#table").DataTable({
    ajax: { url: "/api/teacher", dataSrc: "data", cache: true },
    columns: [
      { data: "name", title: "Teacher name" },
      {
        data: "department_code",
        title: "Department",
        width: "16%",
        className: "dt-center",
      },
      {
        data: "is_part_time",
        title: "Teaching status",
        width: "18%",
        className: "dt-center",
        render: (value) =>
          Number(value) === 0
            ? "Full Time"
            : Number(value) === 1
              ? "Part Time"
              : "NTPO & Admin",
      },
      {
        data: "is_active",
        title: "Status",
        width: "14%",
        className: "dt-center",
        render: (value) =>
          value
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
          `<button class="table-edit-button" onclick="editFormCall(${id})" aria-label="Edit teacher"><svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg></button>`,
      },
    ],
    pageLength: 10,
    dom: '<"flex justify-between items-center mb-4"f>rt<"flex justify-between items-center mt-4"ip>',
    language: { search: "", searchPlaceholder: "Search teachers..." },
  });
});

async function loadDepartments() {
  try {
    const response = await requestJson("/api/department/all/active");
    const addSelect = document.getElementById("departmentSelect");
    const editSelect = document.getElementById("editDepartmentSelect");
    (response.data || []).forEach((department) => {
      const code = department.department_code || department.code;
      departmentsByCode.set(normalize(code), department);
      [addSelect, editSelect].forEach((select) => {
        const option = document.createElement("option");
        option.value = department.id;
        option.textContent = `${code} — ${department.name}`;
        select.appendChild(option);
      });
    });
  } catch (error) {
    setErrorMessage("Unable to load departments.");
  }
}

document
  .getElementById("newTeacherForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!confirm("Create this teacher?")) return;
    const payload = formPayload(event.currentTarget, "isTeacherActive");
    await saveTeacher("/api/teacher/add", "POST", payload, "addNewModal");
  });

async function editFormCall(id) {
  try {
    const response = await requestJson(`/api/teacher/${id}`);
    const teacher = response.data;
    rowIdToUpdate = teacher.id;
    document.getElementById("editGivenName").value = teacher.givenname || "";
    document.getElementById("editMiddleName").value = teacher.middlename || "";
    document.getElementById("editLastName").value = teacher.surname || "";
    document.getElementById("editDepartmentSelect").value =
      teacher.department_id;
    document.getElementById("editTeachingStatusSelect").value =
      teacher.is_part_time;
    document.getElementById("isTeacherActiveEdit").checked =
      teacher.is_active == 1;
    toggleModal("editModal", true);
  } catch (error) {
    setErrorMessage("Unable to load the teacher.");
  }
}

document
  .getElementById("editTeacherForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!confirm("Save these teacher changes?")) return;
    const payload = formPayload(event.currentTarget, "isTeacherActiveEdit");
    payload.id = rowIdToUpdate;
    await saveTeacher("/api/teacher/update", "PUT", payload, "editModal");
  });

function formPayload(form, checkboxId) {
  return {
    ...Object.fromEntries(new FormData(form)),
    is_active: document.getElementById(checkboxId).checked ? 1 : 0,
    user_id: state.userId,
  };
}

async function saveTeacher(url, method, payload, modalId) {
  try {
    const response = await requestJson(url, {
      method,
      body: JSON.stringify(payload),
    });
    if (!response.success) return setErrorMessage(response.message);
    setSuccessMessage(response.message);
    toggleModal(modalId, false);
    table.ajax.reload(null, false);
  } catch (error) {
    setErrorMessage("Unable to save the teacher.");
  }
}

const xlsxInput = document.getElementById("xlsxInput");
xlsxInput.addEventListener("change", () => {
  const text = document.querySelector("#dropZone p");
  if (xlsxInput.files[0]) {
    text.textContent = `Selected: ${xlsxInput.files[0].name}`;
  }
});

document.getElementById("downloadLink").addEventListener("click", (event) => {
  event.preventDefault();
  const worksheet = XLSX.utils.json_to_sheet([
    {
      surname: "Santos",
      givenname: "Juan",
      middlename: "Reyes",
      department_code: "ENG",
      is_part_time: 0,
    },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");
  XLSX.writeFile(workbook, "teacher_import_template.xlsx");
});

document
  .getElementById("uploadFileForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = xlsxInput.files[0];
    if (!file) return;

    try {
      const [rows, existingResponse] = await Promise.all([
        parseWorkbook(file),
        requestJson("/api/teacher"),
      ]);
      pendingImport = classifyRows(rows, existingResponse.data || []);
      renderPreview();
      toggleModal("importFileModal", false);
      setTimeout(() => toggleModal("importPreviewModal", true), 250);
    } catch (error) {
      setErrorMessage("Unable to validate the Excel file.");
    }
  });

function parseWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(new Uint8Array(event.target.result), {
          type: "array",
        });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        resolve(
          XLSX.utils.sheet_to_json(worksheet, {
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

const normalize = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

function classifyRows(rows, existing) {
  const existingByName = new Map(
    existing.map((item) => [normalize(item.name), item]),
  );
  const seen = new Set();
  const result = { created: [], updated: [], errors: [] };

  rows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const surname = String(raw.surname || "")
      .trim()
      .replace(/\s+/g, " ");
    const givenname = String(raw.givenname || "")
      .trim()
      .replace(/\s+/g, " ");
    const middlename = String(raw.middlename || "")
      .trim()
      .replace(/\s+/g, " ");
    const departmentCode = String(raw.department_code || "")
      .trim()
      .toUpperCase();
    const department = departmentsByCode.get(normalize(departmentCode));
    const teachingStatusValue = String(raw.is_part_time ?? "").trim();
    const isPartTime = Number(teachingStatusValue);
    const key = normalize(`${givenname} ${surname}`);
    const base = {
      rowNumber,
      surname,
      givenname,
      middlename,
      departmentCode,
      department_id: department?.id,
      is_part_time: isPartTime,
      is_active: 1,
      originalRow: raw,
    };
    if (!surname || !givenname || !departmentCode) {
      result.errors.push({
        ...base,
        reason: "Surname, given name, and department code are required",
      });
    } else if (!department) {
      result.errors.push({
        ...base,
        reason: `Department ${departmentCode} was not found`,
      });
    } else if (teachingStatusValue === "" || ![0, 1, 2].includes(isPartTime)) {
      result.errors.push({
        ...base,
        reason: "is_part_time must be 0, 1, or 2",
      });
    } else if (seen.has(key)) {
      result.errors.push({ ...base, reason: "Duplicate teacher in file" });
    } else {
      seen.add(key);
      const current = existingByName.get(key);
      current
        ? result.updated.push({ ...base, id: current.id })
        : result.created.push(base);
    }
  });
  return result;
}

function renderPreview() {
  const groups = [
    ["created", "createdPreview", "createdCount", "Will be created"],
    ["updated", "updatedPreview", "updatedCount", "Existing teacher"],
    ["errors", "errorPreview", "errorCount", ""],
  ];
  groups.forEach(([key, listId, countId, detail]) => {
    const items = pendingImport[key];
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
      row.innerHTML = `<span class="row-number"></span><span class="room-name"></span><span class="row-detail"></span>`;
      row.children[0].textContent = `Row ${item.rowNumber}`;
      row.children[1].textContent = `${item.givenname} ${item.surname} — ${item.departmentCode}`;
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
    ];
    const errors = pendingImport.errors.map((item) => ({
      ...item.originalRow,
      Error: item.reason,
    }));
    if (!actions.length) {
      downloadErrors(errors);
      toggleModal("importPreviewModal", false);
      return setErrorMessage(`${errors.length} invalid rows exported.`);
    }

    toggleModal("importPreviewModal", false);
    setTimeout(() => toggleModal("spinnerStatusModal", true), 250);
    const totals = { created: 0, updated: 0 };
    for (let index = 0; index < actions.length; index++) {
      const { type, item } = actions[index];
      const payload = {
        surname: item.surname,
        givenname: item.givenname,
        middlename: item.middlename,
        department_id: item.department_id,
        is_part_time: item.is_part_time,
        is_active: 1,
        user_id: state.userId,
      };
      if (item.id) payload.id = item.id;
      try {
        const response = await requestJson(
          type === "created" ? "/api/teacher/add" : "/api/teacher/update",
          {
            method: type === "created" ? "POST" : "PUT",
            body: JSON.stringify(payload),
          },
        );
        response.success
          ? totals[type]++
          : errors.push({
              ...item.originalRow,
              Error: response.message || "Server rejected row",
            });
      } catch (error) {
        errors.push({ ...item.originalRow, Error: "Request failed" });
      }
      document.getElementById("statusMessage").textContent =
        `${Math.round(((index + 1) / actions.length) * 100)}%`;
    }
    toggleModal("spinnerStatusModal", false);
    if (errors.length) downloadErrors(errors);
    table.ajax.reload(null, false);
    setTimeout(() => {
      const message = `${totals.created} created, ${totals.updated} updated${errors.length ? `, ${errors.length} errors exported` : ""}.`;
      errors.length ? setErrorMessage(message) : setSuccessMessage(message);
    }, 350);
  });

function downloadErrors(rows) {
  if (!rows.length) return;
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Import Errors");
  XLSX.writeFile(
    book,
    `Teacher_Import_Errors_${new Date().toISOString().split("T")[0]}.xlsx`,
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
  const modal = document.getElementById(id);
  const card = document.getElementById(`${id}Card`);
  if (!modal) return;
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
    setTimeout(() => modal.classList.add("invisible"), 250);
    document.body.classList.remove("overflow-hidden");
  }
}

function setSuccessMessage(message) {
  showToast(message, true);
}
function setErrorMessage(message) {
  showToast(message, false);
}
function showToast(message, success) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "category-toast";
  toast.innerHTML = `<span class="toast-symbol"><svg viewBox="0 0 24 24"><path d="${success ? "m5 12 4 4L19 6" : "M12 8v5m0 3h.01M10.3 4.6 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"}"/></svg></span><span></span>`;
  toast.lastElementChild.textContent = message;
  container.replaceChildren(toast);
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
  const container = document.getElementById("sidebar-container");
  try {
    const response = await fetch("/sidebar.html");
    container.innerHTML = await response.text();
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
    document.querySelectorAll("#mySidenav a").forEach((link) => {
      if (!location.pathname.includes(link.getAttribute("href"))) return;
      const list = link.closest("ul[id^='dropdown-']");
      link.classList.add(list ? "sub-active" : "nav-active");
      if (list) {
        list.classList.remove("hidden");
        document
          .querySelector(`[data-target="${list.id}"]`)
          ?.setAttribute("aria-expanded", "true");
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
  if (event.key === "Escape")
    [
      "addNewModal",
      "editModal",
      "importFileModal",
      "importPreviewModal",
    ].forEach((id) => {
      const modal = document.getElementById(id);
      if (modal && !modal.classList.contains("invisible"))
        toggleModal(id, false);
    });
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
  loadDepartments();
});
