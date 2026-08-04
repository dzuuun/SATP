"use strict";

const state = {
  userId: localStorage.getItem("user_id"),
  usersAccess: localStorage.getItem("usersAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
};

if (!state.userId) {
  alert("Log in to continue.");
  location.href = "../../index.html";
} else if (state.usersAccess == 0) {
  alert("You don't have permission to access this page.");
  history.back();
}

let rowIdToUpdate;
const accessFields = [
  "transaction_access",
  "maintenance_access",
  "reports_access",
  "users_access",
];
const badge = (value) =>
  `<span class="access-badge ${Number(value) ? "" : "off"}">${Number(value) ? "Yes" : "No"}</span>`;

const table = $("#table").DataTable({
  ajax: { url: "/api/permission", dataSrc: "data", cache: true },
  columns: [
    { data: "name", title: "Description" },
    {
      data: "transaction_access",
      title: "Transactions",
      className: "dt-center",
      render: badge,
    },
    {
      data: "maintenance_access",
      title: "Maintenance",
      className: "dt-center",
      render: badge,
    },
    {
      data: "reports_access",
      title: "Reports",
      className: "dt-center",
      render: badge,
    },
    {
      data: "users_access",
      title: "Users",
      className: "dt-center",
      render: badge,
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
      width: "8%",
      orderable: false,
      className: "dt-center",
      render: (id) =>
        `<button class="table-edit-button" onclick="editFormCall(${id})" aria-label="Edit permission"><svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg></button>`,
    },
  ],
  pageLength: 10,
  language: {
    search: "",
    searchPlaceholder: "Search permissions...",
    paginate: { previous: "Previous", next: "Next" },
  },
});

function permissionPayload(form, suffix = "") {
  const payload = {
    ...Object.fromEntries(new FormData(form)),
    user_id: state.userId,
  };
  accessFields.forEach((field) => {
    payload[field] = document.getElementById(`${field}${suffix}`).checked
      ? 1
      : 0;
  });
  payload.is_active = document.getElementById(`isPermissionActive${suffix}`)
    .checked
    ? 1
    : 0;
  return payload;
}

document
  .getElementById("newPermissionForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!confirm("Create this permission?")) return;
    await savePermission(
      "/api/permission/add",
      "POST",
      permissionPayload(event.currentTarget),
      "addNewModal",
    );
  });

async function editFormCall(id) {
  try {
    const response = await requestJson(`/api/permission/${id}`);
    if (!response.success) throw new Error(response.message);
    const permission = response.data;
    rowIdToUpdate = permission.id;
    document.getElementById("editDescription").value = permission.name;
    accessFields.forEach((field) => {
      document.getElementById(`${field}Edit`).checked =
        Number(permission[field]) === 1;
    });
    document.getElementById("isPermissionActiveEdit").checked =
      Number(permission.is_active) === 1;
    toggleModal("editModal", true);
  } catch (error) {
    setErrorMessage("Unable to load the permission.");
  }
}

document
  .getElementById("editPermissionForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!confirm("Save these permission changes?")) return;
    const payload = permissionPayload(event.currentTarget, "Edit");
    payload.id = rowIdToUpdate;
    await savePermission("/api/permission/update", "PUT", payload, "editModal");
  });

async function savePermission(url, method, payload, modalId) {
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
    setErrorMessage("Unable to save the permission.");
  }
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
    setTimeout(() => {
      modal.classList.add("invisible");
      modal.querySelectorAll("form").forEach((form) => form.reset());
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
const setSuccessMessage = showToast;
const setErrorMessage = showToast;

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
  } catch (error) {
    console.error("Sidebar failed:", error);
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape")
    ["addNewModal", "editModal"].forEach((id) => {
      if (!document.getElementById(id).classList.contains("invisible"))
        toggleModal(id, false);
    });
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
});
