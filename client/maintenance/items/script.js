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
let categoriesByName = new Map();
let pendingImport = { created: [], updated: [], errors: [] };
const normalize = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

$(document).ready(() => {
  table = $("#table").DataTable({
    ajax: { url: "/api/item", dataSrc: "data", cache: true },
    columns: [
      { data: "category", title: "Category", width: "20%" },
      { data: "number", title: "Number", width: "10%", className: "dt-center" },
      { data: "question", title: "Question", className: "item-question-cell" },
      {
        data: "is_active",
        title: "Status",
        width: "12%",
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
          `<button class="table-edit-button" onclick="editFormCall(${id})" aria-label="Edit item"><svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg></button>`,
      },
    ],
    pageLength: 10,
    order: [
      [0, "asc"],
      [1, "asc"],
    ],
    dom: '<"flex justify-between items-center mb-4"f>rt<"flex justify-between items-center mt-4"ip>',
    language: { search: "", searchPlaceholder: "Search items..." },
  });
});

document
  .getElementById("newItemForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!confirm("Create this item?")) return;
    await saveItem(
      "/api/item/add",
      "POST",
      formPayload(event.currentTarget, "isQuestionActive"),
      "addNewModal",
    );
  });

document
  .getElementById("editItemForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!confirm("Save these item changes?")) return;
    const payload = formPayload(event.currentTarget, "isQuestionActiveEdit");
    payload.id = rowIdToUpdate;
    await saveItem("/api/item/update", "PUT", payload, "editModal");
  });

function formPayload(form, checkboxId) {
  return {
    ...Object.fromEntries(new FormData(form)),
    is_active: document.getElementById(checkboxId).checked ? 1 : 0,
    user_id: state.userId,
  };
}

async function editFormCall(id) {
  try {
    const response = await requestJson(`/api/item/${id}`);
    const item = response.data;
    rowIdToUpdate = item.id;
    document.getElementById("itemNumberEditForm").value = item.number;
    document.getElementById("categorySelectEdit").value = item.category_id;
    document.getElementById("itemQuestionEdit").value = item.question;
    document.getElementById("isQuestionActiveEdit").checked =
      item.is_active == 1;
    toggleModal("editModal", true);
  } catch (error) {
    setErrorMessage("Unable to load the item.");
  }
}

async function saveItem(url, method, payload, modalId) {
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
    setErrorMessage("Unable to save the item.");
  }
}

async function loadCategories() {
  try {
    const response = await requestJson("/api/category/all/active");
    const categories = response.data || [];
    categoriesByName = new Map(
      categories.map((category) => [normalize(category.name), category]),
    );
    ["categorySelect", "categorySelectEdit"].forEach((selectId) => {
      const select = document.getElementById(selectId);
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
      });
    });
  } catch (error) {
    setErrorMessage("Unable to load categories.");
  }
}

async function refreshImportCategories() {
  const response = await requestJson("/api/category/all/active");
  categoriesByName = new Map(
    (response.data || []).map((category) => [normalize(category.name), category]),
  );
}

const xlsxInput = document.getElementById("xlsxInput");
xlsxInput.addEventListener("change", () => {
  if (xlsxInput.files[0])
    document.querySelector("#dropZone p").textContent =
      `Selected: ${xlsxInput.files[0].name}`;
});

document.getElementById("downloadLink").addEventListener("click", (event) => {
  event.preventDefault();
  const sheet = XLSX.utils.json_to_sheet([
    {
      category: "Teacher",
      number: 1,
      question: "Demonstrates mastery of the subject matter.",
    },
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Items");
  XLSX.writeFile(book, "item_import_template.xlsx");
});

document
  .getElementById("uploadFileForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!xlsxInput.files[0]) return;
    try {
      const [rows, existingResponse] = await Promise.all([
        parseWorkbook(xlsxInput.files[0]),
        requestJson("/api/item"),
        refreshImportCategories(),
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
        const book = XLSX.read(new Uint8Array(event.target.result), {
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

function classifyRows(rows, existing) {
  const existingByKey = new Map(
    existing.map((item) => [
      `${normalize(item.category)}|${normalize(item.number)}`,
      item,
    ]),
  );
  const seen = new Set();
  const result = { created: [], updated: [], errors: [] };
  rows.forEach((raw, index) => {
    const categoryName = String(raw.category || "")
      .trim()
      .replace(/\s+/g, " ");
    const number = Number(String(raw.number || "").trim());
    const question = String(raw.question || "")
      .trim()
      .replace(/\s+/g, " ");
    const category = categoriesByName.get(normalize(categoryName));
    const key = `${normalize(categoryName)}|${number}`;
    const base = {
      rowNumber: index + 2,
      categoryName,
      category_id: category?.id,
      number,
      question,
      is_active: 1,
      originalRow: raw,
    };
    if (!categoryName || !number || !question) {
      result.errors.push({
        ...base,
        reason: "Category, number, and question are required",
      });
    } else if (!Number.isInteger(number) || number < 1) {
      result.errors.push({
        ...base,
        reason: "Number must be a positive whole number",
      });
    } else if (!category) {
      result.errors.push({
        ...base,
        reason: `Category ${categoryName} was not found`,
      });
    } else if (seen.has(key)) {
      result.errors.push({
        ...base,
        reason: "Duplicate category and number in file",
      });
    } else {
      seen.add(key);
      const current = existingByKey.get(key);
      current
        ? result.updated.push({ ...base, id: current.id })
        : result.created.push(base);
    }
  });
  return result;
}

function renderPreview() {
  [
    ["created", "createdPreview", "createdCount", "Will be created"],
    [
      "updated",
      "updatedPreview",
      "updatedCount",
      "Existing category and number",
    ],
    ["errors", "errorPreview", "errorCount", ""],
  ].forEach(([key, listId, countId, detail]) => {
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
      row.innerHTML =
        '<span class="row-number"></span><span class="item-question"></span><span class="row-detail"></span>';
      row.children[0].textContent = `Row ${item.rowNumber}`;
      row.children[1].textContent = `${item.categoryName} #${item.number} — ${item.question}`;
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
    const totals = { created: 0, updated: 0, skipped: 0 };
    for (let index = 0; index < actions.length; index++) {
      const { type, item } = actions[index];
      const payload = {
        number: item.number,
        question: item.question,
        category_id: item.category_id,
        is_active: 1,
        user_id: state.userId,
      };
      if (item.id) payload.id = item.id;
      try {
        const response = await requestJson(
          type === "created" ? "/api/item/add" : "/api/item/update",
          {
            method: type === "created" ? "POST" : "PUT",
            body: JSON.stringify(payload),
          },
        );
        response.success
          ? response.skipped
            ? totals.skipped++
            : totals[type]++
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
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Import Errors");
  XLSX.writeFile(
    book,
    `Item_Import_Errors_${new Date().toISOString().split("T")[0]}.xlsx`,
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

function setSuccessMessage(message) {
  showToast(message, true);
}
function setErrorMessage(message) {
  showToast(message, false);
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
    const container = document.getElementById("sidebar-container");
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
      const currentPath = location.pathname
        .replace(/\/index\.html$/, "")
        .replace(/\/$/, "");
      const linkPath = new URL(link.href, location.origin).pathname
        .replace(/\/index\.html$/, "")
        .replace(/\/$/, "");
      if (linkPath !== currentPath) return;
      const list = link.closest("ul[id^='dropdown-']");
      link.classList.add(list ? "sub-active" : "nav-active");
      if (list) list.classList.remove("hidden");
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
      if (!document.getElementById(id)?.classList.contains("invisible"))
        toggleModal(id, false);
    });
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadCategories();
  loadSidebar();
});
