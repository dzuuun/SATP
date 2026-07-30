"use strict";

const state = {
  userId: localStorage.getItem("user_id"),
  maintenanceAccess: localStorage.getItem("maintenanceAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
};

if (!state.userId) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
} else if (state.maintenanceAccess == 0) {
  alert("You don't have permission to access this page.");
  history.back();
}

let table;
let rowIdToUpdate;

$(document).ready(() => {
  table = $("#table").DataTable({
    ajax: {
      type: "GET",
      url: "/api/category",
      dataSrc: "data",
      cache: true,
    },
    columns: [
      { data: "name", title: "Category" },
      {
        data: "is_active",
        title: "Status",
        width: "15%",
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
        render: (id) => `
          <button class="table-edit-button" type="button" onclick="editFormCall(${id})" title="Edit category" aria-label="Edit category">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg>
          </button>`,
      },
    ],
    pageLength: 10,
    dom: '<"flex justify-between items-center mb-4"f>rt<"flex justify-between items-center mt-4"ip>',
    language: {
      search: "",
      searchPlaceholder: "Search categories...",
      paginate: { previous: "Previous", next: "Next" },
    },
  });
});

document
  .getElementById("newCategoryForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!confirm("Create this category?")) return;

    const payload = {
      ...Object.fromEntries(new FormData(event.currentTarget)),
      is_active: document.getElementById("isCategoryActive").checked ? 1 : 0,
      user_id: state.userId,
    };

    try {
      const response = await requestJson("/api/category/add", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setSuccessMessage(response.message);
      toggleModal("addNewModal", false);
      table.ajax.reload(null, false);
    } catch (error) {
      console.error("Category creation failed:", error);
      setErrorMessage("Unable to create the category.");
    }
  });

async function editFormCall(id) {
  try {
    const response = await requestJson(`/api/category/${id}`);
    const category = response.data;

    rowIdToUpdate = category.id;
    document.getElementById("editCategory").value = category.name;
    document.getElementById("isCategoryActiveEdit").checked =
      category.is_active == 1;
    toggleModal("editModal", true);
  } catch (error) {
    console.error("Category load failed:", error);
    setErrorMessage("Unable to load the category.");
  }
}

document
  .getElementById("editCategoryForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!confirm("Save these category changes?")) return;

    const payload = {
      ...Object.fromEntries(new FormData(event.currentTarget)),
      id: rowIdToUpdate,
      is_active: document.getElementById("isCategoryActiveEdit").checked
        ? 1
        : 0,
      user_id: state.userId,
    };

    try {
      const response = await requestJson("/api/category/update", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setSuccessMessage(response.message);
      toggleModal("editModal", false);
      table.ajax.reload(null, false);
    } catch (error) {
      console.error("Category update failed:", error);
      setErrorMessage("Unable to update the category.");
    }
  });

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return response.json();
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

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  ["addNewModal", "editModal"].forEach((modalId) => {
    const modal = document.getElementById(modalId);
    if (modal && !modal.classList.contains("invisible")) {
      toggleModal(modalId, false);
    }
  });
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

  toast.className = "category-toast";
  toast.setAttribute("role", "status");
  icon.className = "toast-symbol";
  icon.innerHTML =
    type === "success"
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5m0 3h.01M10.3 4.6 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"/></svg>';
  text.textContent = message;
  toast.append(icon, text);
  container.replaceChildren(toast);
  setTimeout(() => toast.remove(), 4000);
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
  if (name) name.textContent = state.fullname || state.username || "User";

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
      if (!href || !window.location.pathname.includes(href)) return;

      const dropdown = link.closest("ul[id^='dropdown-']");
      if (dropdown) {
        link.classList.add("sub-active");
        dropdown.classList.remove("hidden");
        const toggle = document.querySelector(`[data-target="${dropdown.id}"]`);
        toggle?.setAttribute("aria-expanded", "true");
        const chevron = toggle?.querySelector(".chevron");
        if (chevron) chevron.style.transform = "rotate(180deg)";
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
