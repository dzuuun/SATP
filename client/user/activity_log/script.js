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

const table = $("#table").DataTable({
  serverSide: true,
  processing: true,
  ajax: {
    url: "/api/activitylog",
    type: "POST",
    contentType: "application/json",
    data: (request) =>
      JSON.stringify({
        ...request,
        year: document.getElementById("activityYear").value,
      }),
  },
  columns: [
    { data: "date_time", title: "Date and time", width: "20%" },
    { data: "name", title: "Transacted by", width: "24%" },
    { data: "action", title: "Action performed" },
  ],
  ordering: false,
  pageLength: 15,
  lengthMenu: [15, 25, 50, 100],
  searchDelay: 650,
  deferRender: true,
  language: {
    search: "",
    searchPlaceholder: "Search activity...",
    processing: "Loading activity...",
    paginate: { previous: "Previous", next: "Next" },
  },
});

async function loadActivityYears() {
  const select = document.getElementById("activityYear");
  try {
    const response = await fetch("/api/activitylog/years");
    const payload = await response.json();
    select.replaceChildren();
    (payload.data || []).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.year;
      option.textContent = `${item.year} (${Number(item.total).toLocaleString()})`;
      select.appendChild(option);
    });
    if (!select.options.length) {
      const option = document.createElement("option");
      option.value = new Date().getFullYear();
      option.textContent = option.value;
      select.appendChild(option);
    }
    table.ajax.reload();
  } catch (error) {
    const option = document.createElement("option");
    option.value = new Date().getFullYear();
    option.textContent = option.value;
    select.replaceChildren(option);
  }
}

document.getElementById("activityYear").addEventListener("change", () => {
  table.search("").page("first").ajax.reload();
});

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
        if (arrow) {
          arrow.style.transform = hidden ? "rotate(0deg)" : "rotate(180deg)";
        }
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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
  loadActivityYears();
});
