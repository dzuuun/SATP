// 1. GLOBAL STATE & AUTH
const state = {
  user_id: localStorage.getItem("user_id"),
  transactionAccess: localStorage.getItem("transactionAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
  semester_id: "",
  school_year_id: "",
};

// Security Gate
if (!state.user_id) {
  alert("Log in to continue.");
  window.location.href = "../index.html";
} else if (state.transactionAccess == 0) {
  alert("Access Denied.");
  history.back();
}

// 2. API & DATA SERVICES
const API = {
  async fetchOptions(endpoint, elementId) {
    try {
      const res = await fetch(`/api/${endpoint}/inuse/active`);
      const result = await res.json();
      const data = result.data || [];
      const select = document.getElementById(elementId);

      if (!select) return;

      select.innerHTML = `<option value="">Select ${endpoint.includes("year") ? "School Year" : "Semester"}</option>`;

      data.forEach((row) => {
        const opt = document.createElement("option");
        opt.value = row.id;
        opt.textContent = row.name;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error(`Error loading ${endpoint}:`, err);
    }
  },

  async loadData() {
    if (!state.semester_id || !state.school_year_id) {
      alert("Please select both School Year and Semester.");
      return;
    }

    showSpinner();
    try {
      const res = await fetch(
        `/api/transaction/all/school_year_id=${state.school_year_id}&semester_id=${state.semester_id}`,
      );
      const response = await res.json();
      document.getElementById("generateList")?.classList.remove("hidden");
      document.getElementById("refresh")?.classList.remove("hidden");

      // Update DataTable
      if (mainTable) {
        mainTable
          .clear()
          .rows.add(response.data || [])
          .draw();
      }

      API.loadDashboardStats();
    } catch (err) {
      alert("Failed to load table data.");
    } finally {
      hideSpinner();
    }
  },

  async loadDashboardStats() {
    if (!state.semester_id || !state.school_year_id) return;

    try {
      const res = await fetch(
        `/api/transaction/stats/school_year_id=${state.school_year_id}&semester_id=${state.semester_id}`,
      );
      const response = await res.json();

      if (response.success && response.data && response.data.length > 0) {
        const stats = response.data[0];
        const totalEl = document.getElementById("totalTransactions");
        const accEl = document.getElementById("TransactionsAccomplished");
        const toAccEl = document.getElementById("transactionsToAccomplish");

        if (totalEl) totalEl.textContent = stats.TotalStudents || 0;
        if (accEl) accEl.textContent = stats.FullyRatedCount || 0;
        if (toAccEl) toAccEl.textContent = stats.IncompleteCount || 0;
      }
    } catch (err) {
      console.error("Dashboard Stat Error:", err);
    }
  },
};

// 3. DATATABLES INITIALIZATION
let mainTable;
let modalTable;

$(document).ready(function () {
  mainTable = $("#mainTable").DataTable({
    autoWidth: false, // Forces the table to follow the 100% CSS rule
    responsive: true,

    columns: [
      { data: "IDNumber", title: "ID Number", width: "15%" },
      { data: "FullName", title: "Student Name", width: "35%" },
      {
        data: "Course",
        title: "Course",
        width: "30%",
        className: "text-wrap-column",
      },
      {
        data: "TotalSubjects",
        title: "Total Subjects",
        className: "text-center font-bold",
        width: "10%",
      },
      {
        data: "PendingStatusCount",
        title: "Status",
        className: "text-center",
        width: "15%",
        render: function (data, type, row) {
          const total = parseInt(row.TotalSubjects);
          const pending = parseInt(data);
          const isComplete = pending === 0 && total > 0;
          const color = isComplete ? "text-green-600" : "text-red-500";
          const icon = isComplete ? "bi-check-circle-fill" : "bi-x-circle-fill";

          return `
                        <div class="flex flex-col items-center justify-center gap-1 group cursor-pointer" onclick="showSubjectModal('${row.IDNumber}')">
                            <i class="bi ${icon} ${color} text-2xl transition-transform group-hover:scale-110"></i>
                            <span class="text-[10px] font-black uppercase ${color}">
                                ${total - pending} / ${total}
                            </span>
                        </div>`;
        },
      },
    ],

    dom: '<"flex justify-between items-center mb-4"f>rt<"flex justify-between items-center mt-4"ip>',
    pageLength: 10,
    responsive: true,
    autoWidth: false, // CRITICAL: Allows CSS to dictate width
    language: {
      search: "",
      searchPlaceholder: "Type a keyword...",
      paginate: {
        previous: "Previous",
        next: "Next",
      },
    },
  });
});

// 4. MODAL LOGIC
async function showSubjectModal(studentId) {
  showSpinner();
  const modal = document.getElementById("subjectModal");
  modal.classList.remove("hidden");

  const url = `/api/transaction/student/subjects/school_year_id=${state.school_year_id}&semester_id=${state.semester_id}&student_id=${studentId}`;

  if ($.fn.DataTable.isDataTable("#modalTable")) {
    modalTable.ajax.url(url).load(() => hideSpinner());
  } else {
    modalTable = $("#modalTable").DataTable({
      ajax: { url: url, dataSrc: "data" },
      columns: [
        { data: "subject_code", title: "CODE" },
        {
          data: "subject_name",
          title: "SUBJECT",
          width: "45%",
          className: "text-wrap-column",
        },
        { data: "teachers_name", title: "INSTRUCTOR" },
        {
          data: "status",
          title: "STATUS",
          className: "text-center",
          render: (data) =>
            data == 1
              ? '<span class="text-green-600 font-bold">RATED</span>'
              : '<span class="text-red-500 font-bold">PENDING</span>',
        },
      ],
      lengthChange: false,
      paging: true,
      searching: false,
      info: false,
      responsive: true,
      autoWidth: false,
    });
    setTimeout(() => hideSpinner(), 600);
  }
}

function closeModal() {
  document.getElementById("subjectModal").classList.add("hidden");
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

// 5. EVENT LISTENERS & INITIALIZATION
function toggleNav() {
  const isOpen = $("#mySidenav").width() > 0;
  $("#mySidenav").width(isOpen ? 0 : 280);
  $("#main").css("margin-left", isOpen ? 0 : 280);
}

const showSpinner = () => $("#overlay").css("display", "flex");
const hideSpinner = () => $("#overlay").hide();

function setupSidebarInteractions() {
  const nameEl = document.getElementById("sidebar-fullname");
  if (nameEl) nameEl.textContent = state.fullname || state.username || "User";

  document.querySelectorAll(".menu-toggle").forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const targetMenu = document.getElementById(targetId);
      const chevron = this.querySelector(".bi-chevron-down");

      if (targetMenu) {
        targetMenu.classList.toggle("hidden");
        const isHidden = targetMenu.classList.contains("hidden");
        this.setAttribute("aria-expanded", String(!isHidden));
        if (chevron) {
          chevron.style.transform = isHidden
            ? "rotate(0deg)"
            : "rotate(180deg)";
        }
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
    const html = await response.text();
    container.innerHTML = html;

    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll("#mySidenav a");

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (href && currentPath.includes(href.replace(/\.\.\//g, ""))) {
        const parentDropdown = link.closest("ul[id^='dropdown-']");
        if (parentDropdown) {
          link.classList.add("sub-active");
          parentDropdown.classList.remove("hidden");
          const toggleBtn = document.querySelector(
            `[data-target="${parentDropdown.id}"]`,
          );
          if (toggleBtn) {
            toggleBtn.classList.add("text-gold", "font-bold");
            toggleBtn.setAttribute("aria-expanded", "true");
            const chevron = toggleBtn.querySelector(".bi-chevron-down");
            if (chevron) chevron.style.transform = "rotate(180deg)";
          }
        } else {
          link.classList.add("nav-active");
        }
      }
    });
    setupSidebarInteractions();
  } catch (err) {
    console.error("Sidebar failed to load:", err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  showSpinner();
  try {
    await Promise.all([
      loadSidebar(),
      API.fetchOptions("schoolyear", "loadSchoolYear"),
      API.fetchOptions("semester", "loadSemester"),
    ]);

    const loadSchoolYear = document.getElementById("loadSchoolYear");
    const loadSemester = document.getElementById("loadSemester");
    const filterRefresh = document.getElementById("filterRefresh");

    const handleDropdownChange = () => {
      state.school_year_id = loadSchoolYear.value;
      state.semester_id = loadSemester.value;
      if (state.school_year_id && state.semester_id) {
        filterRefresh?.classList.replace("hidden", "flex");
      }
    };

    loadSchoolYear?.addEventListener("change", handleDropdownChange);
    loadSemester?.addEventListener("change", handleDropdownChange);

    document
      .getElementById("btnSearch")
      ?.addEventListener("click", function () {
        const icon = this.querySelector("i");
        icon?.classList.add("animate-spin");
        API.loadData();
        setTimeout(() => icon?.classList.remove("animate-spin"), 600);
      });

    ["#filterRefresh", "#refresh"].forEach((selector) => {
      document.querySelector(selector)?.addEventListener("click", function () {
        const icon = this.querySelector("i");
        icon?.classList.add("animate-spin");
        API.loadData();
        setTimeout(() => icon?.classList.remove("animate-spin"), 800);
      });
    });

    document
      .getElementById("gridLimit")
      ?.addEventListener("change", function () {
        mainTable.page.len(parseInt(this.value)).draw();
      });

    document
      .getElementById("generateList")
      ?.addEventListener("click", async (e) => {
        e.preventDefault();
        showSpinner();
        try {
          const res = await fetch(`/api/transaction/notrated`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              school_year_id: state.school_year_id,
              semester_id: state.semester_id,
            }),
          });
          const response = await res.json();
          if (!response.data || response.data.length === 0)
            return alert("No data found.");

          const ws = XLSX.utils.json_to_sheet(response.data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Unrated");
          XLSX.writeFile(wb, `Unrated_List_${new Date().getTime()}.xlsx`);
        } catch (err) {
          alert("Export failed.");
        } finally {
          hideSpinner();
        }
      });
  } catch (error) {
    console.error("Error during initial load:", error);
  } finally {
    hideSpinner();
  }
});
