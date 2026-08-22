"use strict";

const state = {
  userId: localStorage.getItem("user_id"),
  maintenanceAccess: localStorage.getItem("maintenanceAccess"),
  fullname: localStorage.getItem("fullname"),
};

if (!state.userId) location.href = "../../";
else if (state.maintenanceAccess == 0) location.href = "../../404.html";

let table;
let rowIdToUpdate;

$(document).ready(() => {
  table = $("#table").DataTable({
    ajax: { url: "/api/school", dataSrc: "data", cache: true },
    columns: [
      { data: "code", title: "School code", width: "15%" },
      { data: "name", title: "School" },
      {
        data: "college_count",
        title: "Colleges",
        width: "10%",
        className: "dt-center",
      },
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
          `<button class="table-edit-button" type="button" onclick="editFormCall(${id})" aria-label="Edit school"><svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg></button>`,
      },
    ],
    pageLength: 10,
    dom: '<"flex justify-between items-center mb-4"f>rt<"flex justify-between items-center mt-4"ip>',
    language: { search: "", searchPlaceholder: "Search schools..." },
  });
});

function formPayload(form, checkboxId) {
  return {
    ...Object.fromEntries(new FormData(form)),
    is_active: document.getElementById(checkboxId).checked ? 1 : 0,
    user_id: state.userId,
  };
}

async function saveSchool(url, method, payload, modalId) {
  try {
    const response = await requestJson(url, {
      method,
      body: JSON.stringify(payload),
    });
    if (!response.success) return showToast(response.message, false);
    showToast(response.message, true);
    toggleModal(modalId, false);
    table.ajax.reload(null, false);
  } catch (error) {
    showToast(error.message || "Unable to save the school.", false);
  }
}

document.getElementById("newSchoolForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(await satpConfirm("Create this school?"))) return;
  await saveSchool(
    "/api/school/add",
    "POST",
    formPayload(form, "isSchoolActive"),
    "addNewModal",
  );
});

async function editFormCall(id) {
  try {
    const response = await requestJson(`/api/school/${id}`);
    const school = response.data;
    rowIdToUpdate = school.id;
    document.getElementById("editSchoolCode").value = school.code;
    document.getElementById("editSchoolName").value = school.name;
    document.getElementById("isSchoolActiveEdit").checked = school.is_active == 1;
    toggleModal("editModal", true);
  } catch (error) {
    showToast("Unable to load the school.", false);
  }
}

document.getElementById("editSchoolForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const statusChanged =
    Number(document.getElementById("isSchoolActiveEdit").checked) !==
    Number((await requestJson(`/api/school/${rowIdToUpdate}`)).data.is_active);
  const message = statusChanged
    ? "Save this status change? It will also update every college, department, and program under this school."
    : "Save these school changes?";
  if (!(await satpConfirm(message))) return;
  const payload = formPayload(form, "isSchoolActiveEdit");
  payload.id = rowIdToUpdate;
  await saveSchool("/api/school/update", "PUT", payload, "editModal");
});

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "Request failed.");
  return payload;
}

function toggleModal(id, show = true) {
  const modal = document.getElementById(id);
  const card = document.getElementById(`${id}Card`);
  if (show) {
    modal.classList.remove("invisible");
    requestAnimationFrame(() => {
      modal.classList.add("opacity-100");
      card?.classList.replace("scale-95", "scale-100");
    });
    document.body.classList.add("overflow-hidden");
  } else {
    modal.classList.remove("opacity-100");
    card?.classList.replace("scale-100", "scale-95");
    setTimeout(() => {
      modal.classList.add("invisible");
      modal.querySelectorAll("form").forEach((form) => form.reset());
    }, 250);
    document.body.classList.remove("overflow-hidden");
  }
}

function showToast(message, success = true) {
  const toast = document.createElement("div");
  toast.className = "category-toast";
  toast.innerHTML = `<span class="toast-icon">${success ? "✓" : "!"}</span><strong></strong>`;
  toast.querySelector("strong").textContent = message;
  document.getElementById("toast-container").appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 4200);
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

function setupSidebarInteractions() {
  const name = document.getElementById("sidebar-fullname");
  if (name) name.textContent = state.fullname || "User";

  document.querySelectorAll(".menu-toggle").forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const menu = document.getElementById(this.dataset.target);
      if (!menu) return;
      menu.classList.toggle("hidden");
      const hidden = menu.classList.contains("hidden");
      this.setAttribute("aria-expanded", String(!hidden));
      const chevron = this.querySelector(".chevron");
      if (chevron) {
        chevron.style.transform = hidden ? "rotate(0deg)" : "rotate(180deg)";
      }
    });
  });

  document.getElementById("signout")?.addEventListener("click", () => {
    localStorage.clear();
    location.href = "../../";
  });
}

async function loadSidebar() {
  const container = document.getElementById("sidebar-container");
  if (!container) return;
  try {
    const response = await fetch("/sidebar.html");
    if (!response.ok) throw new Error("Unable to load sidebar.");
    container.innerHTML = await response.text();
    const currentPath = location.pathname
      .replace(/\/index\.html$/, "")
      .replace(/\/$/, "");
    container.querySelectorAll("#mySidenav a").forEach((link) => {
      const linkPath = new URL(link.href, location.origin).pathname
        .replace(/\/index\.html$/, "")
        .replace(/\/$/, "");
      if (linkPath !== currentPath) return;
      const submenu = link.closest("ul[id^='dropdown-']");
      link.classList.add(submenu ? "sub-active" : "nav-active");
      if (!submenu) return;
      submenu.classList.remove("hidden");
      const parentToggle = container.querySelector(
        `[data-target="${submenu.id}"]`,
      );
      parentToggle?.setAttribute("aria-expanded", "true");
      const chevron = parentToggle?.querySelector(".chevron");
      if (chevron) chevron.style.transform = "rotate(180deg)";
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
