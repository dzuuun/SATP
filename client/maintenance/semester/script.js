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
let table, rowIdToUpdate;
$(document).ready(() => {
  table = $("#table").DataTable({
    ajax: { url: "/api/semester", dataSrc: "data", cache: true },
    columns: [
      { data: "name", title: "Semester" },
      {
        data: "in_use",
        title: "In use",
        width: "14%",
        className: "dt-center",
        render: (v) =>
          v
            ? '<span class="status-badge active">In use</span>'
            : '<span class="status-badge inactive">Not in use</span>',
      },
      {
        data: "is_active",
        title: "Status",
        width: "14%",
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
          `<button class="table-edit-button" onclick="editFormCall(${id})" aria-label="Edit semester"><svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg></button>`,
      },
    ],
    pageLength: 10,
    dom: '<"flex justify-between items-center mb-4"f>rt<"flex justify-between items-center mt-4"ip>',
    language: { search: "", searchPlaceholder: "Search semesters..." },
  });
});
document
  .getElementById("newSemesterForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!confirm("Create this semester?")) return;
    await save(
      "/api/semester/add",
      "POST",
      payload(e.currentTarget, "isSemesterInUse", "isSemesterActive"),
      "addNewModal",
    );
  });
document
  .getElementById("editSemesterForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!confirm("Save these semester changes?")) return;
    const data = payload(
      e.currentTarget,
      "isSemesterInUseEdit",
      "isSemesterActiveEdit",
    );
    data.id = rowIdToUpdate;
    await save("/api/semester/update", "PUT", data, "editModal");
  });
function payload(form, inUseId, activeId) {
  return {
    ...Object.fromEntries(new FormData(form)),
    in_use: document.getElementById(inUseId).checked ? 1 : 0,
    is_active: document.getElementById(activeId).checked ? 1 : 0,
    user_id: state.userId,
  };
}
async function editFormCall(id) {
  try {
    const response = await requestJson(`/api/semester/${id}`),
      semester = response.data;
    rowIdToUpdate = semester.id;
    document.getElementById("editSemester").value = semester.name;
    document.getElementById("isSemesterInUseEdit").checked =
      semester.in_use == 1;
    document.getElementById("isSemesterActiveEdit").checked =
      semester.is_active == 1;
    toggleModal("editModal", true);
  } catch (e) {
    setErrorMessage("Unable to load the semester.");
  }
}
async function save(url, method, data, modalId) {
  try {
    const response = await requestJson(url, {
      method,
      body: JSON.stringify(data),
    });
    if (!response.success) return setErrorMessage(response.message);
    setSuccessMessage(response.message);
    toggleModal(modalId, false);
    table.ajax.reload(null, false);
  } catch (e) {
    setErrorMessage("Unable to save the semester.");
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
  const modal = document.getElementById(id),
    card = document.getElementById(`${id}Card`);
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
    const container = document.getElementById("sidebar-container"),
      response = await fetch("/sidebar.html");
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
      if (list) list.classList.remove("hidden");
    });
    document.getElementById("signout")?.addEventListener("click", () => {
      localStorage.clear();
      location.href = "../../index.html";
    });
  } catch (e) {
    console.error("Sidebar failed:", e);
  }
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape")
    ["addNewModal", "editModal"].forEach((id) => {
      if (!document.getElementById(id)?.classList.contains("invisible"))
        toggleModal(id, false);
    });
});
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
});
