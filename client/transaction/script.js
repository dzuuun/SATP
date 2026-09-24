// 1. GLOBAL STATE & AUTH
const state = {
  user_id: localStorage.getItem("user_id"),
  transactionAccess: localStorage.getItem("transactionAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
  adminAcademicScope: (localStorage.getItem("adminAcademicScope") || "ALL").toUpperCase(),
  availableSemesters: [],
  currentSchoolYearId: "",
  currentSchoolYearName: "",
  loadSequence: 0,
  semester_id: "",
  school_year_id: "",
  rating_access: { shs: false, non_shs: false },
};

function showTransactionStatus(message, error = false) {
  const status = document.getElementById("transactionLoadStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("hidden", !message);
  status.classList.toggle("error", error);
}

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
  async fetchCurrentAdminSemester() {
    try {
      const response = await fetch("/api/semester/current/admin");
      const payload = await response.json();
      return response.ok && payload.success ? payload.data : null;
    } catch (error) {
      console.error("Error loading the administrator's current term:", error);
      return null;
    }
  },

  async fetchOptions(endpoint, elementId) {
    try {
      const isSchoolYear = endpoint === "schoolyear";
      const [res, currentRes] = await Promise.all([
        fetch(`/api/${endpoint}/all/active`),
        isSchoolYear ? fetch("/api/schoolyear/current") : Promise.resolve(null),
      ]);
      const result = await res.json();
      const data = result.data || [];
      const currentResult = currentRes?.ok ? await currentRes.json() : null;
      const select = document.getElementById(elementId);

      if (!select) return;

      select.innerHTML = `<option value="">Select ${endpoint.includes("year") ? "School Year" : "Semester"}</option>`;

      data.forEach((row) => {
        const opt = document.createElement("option");
        opt.value = row.id;
        opt.textContent = row.name;
        select.appendChild(opt);
      });
      if (!isSchoolYear) state.availableSemesters = data;
      const currentOption = isSchoolYear
        ? data.find((row) => Number(row.id) === Number(currentResult?.data?.id)) || null
        : null;
      if (currentOption) select.value = String(currentOption.id);
      return currentOption || null;
    } catch (err) {
      console.error(`Error loading ${endpoint}:`, err);
      return null;
    }
  },

  async loadData(filters = state) {
    if (!filters.semester_id || !filters.school_year_id) {
      alert("Please select both School Year and Semester.");
      return;
    }

    const selected = {
      school_year_id: filters.school_year_id,
      semester_id: filters.semester_id,
    };
    const sequence = ++state.loadSequence;
    showTransactionStatus("");
    showSpinner();
    try {
      const [res, stats] = await Promise.all([
        fetch(
          `/api/transaction/all/school_year_id=${selected.school_year_id}&semester_id=${selected.semester_id}`,
        ),
        API.loadDashboardStats({ render: false, filters: selected }),
      ]);
      const response = await res.json();
      if (!res.ok || !response.success) throw new Error(response.message || "Unable to load transactions.");
      if (sequence !== state.loadSequence) return;
      const rows = response.data || [];
      state.school_year_id = selected.school_year_id;
      state.semester_id = selected.semester_id;
      document.getElementById("generateList")?.classList.remove("hidden");
      document.getElementById("refresh")?.classList.remove("hidden");

      // Update DataTable
      if (mainTable) {
        mainTable
          .clear()
          .rows.add(rows)
          .draw();
      }

      API.renderDashboardStats(stats);
      if (!rows.length) {
        const year = document.querySelector(`#loadSchoolYear option[value="${selected.school_year_id}"]`)?.textContent || "selected school year";
        const semester = document.querySelector(`#loadSemester option[value="${selected.semester_id}"]`)?.textContent || "selected semester";
        showTransactionStatus(`No transactions found for ${year}, ${semester}.`);
      }
    } catch (err) {
      if (sequence === state.loadSequence) {
        showTransactionStatus(err.message || "Unable to load transactions.", true);
        showToast(err.message || "Unable to load transactions.", true);
      }
    } finally {
      if (sequence === state.loadSequence) hideSpinner();
    }
  },

  async loadDashboardStats({ render = true, filters = state } = {}) {
    if (!filters.semester_id || !filters.school_year_id) return null;

    const res = await fetch(
      `/api/transaction/stats/school_year_id=${filters.school_year_id}&semester_id=${filters.semester_id}`,
    );
    const response = await res.json();
    if (!res.ok || !response.success || !response.data?.length) {
      throw new Error(response.message || "Unable to load transaction totals.");
    }
    const stats = response.data[0];
    if (render) API.renderDashboardStats(stats);
    return stats;
  },

  renderDashboardStats(stats) {
    stats ||= {};
    const totalEl = document.getElementById("totalTransactions");
    const accEl = document.getElementById("TransactionsAccomplished");
    const toAccEl = document.getElementById("transactionsToAccomplish");

    if (totalEl) totalEl.textContent = stats.TotalStudents || 0;
    if (accEl) accEl.textContent = stats.FullyRatedCount || 0;
    if (toAccEl) toAccEl.textContent = stats.IncompleteCount || 0;
  },
};

function renderRatingAccess(group, enabled) {
  state.rating_access[group] = Boolean(enabled);
  const shs = group === "shs";
  const toggle = document.getElementById(
    shs ? "shsRatingAccessToggle" : "nonShsRatingAccessToggle",
  );
  const status = document.getElementById(
    shs ? "shsRatingAccessStatus" : "nonShsRatingAccessStatus",
  );
  toggle.checked = state.rating_access[group];
  toggle.disabled = false;
  status.textContent = state.rating_access[group] ? "Open" : "Closed";
  status.classList.toggle("open", state.rating_access[group]);
  status.classList.toggle("closed", !state.rating_access[group]);
}

async function readApiJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const message =
      response.status === 404
        ? "The rating access API is unavailable. Deploy and restart the latest server API."
        : `The server returned an invalid response (${response.status}).`;
    throw new Error(message);
  }
  return response.json();
}

async function loadRatingAccess() {
  try {
    const response = await fetch(
      `/api/transaction/rating-access/status?user_id=${encodeURIComponent(state.user_id)}`,
    );
    const result = await readApiJson(response);
    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to load student rating access.",
      );
    }
    const card = document.getElementById("ratingAccessCard");
    if (!result.data?.can_manage) {
      card?.classList.add("hidden");
      return false;
    }
    card?.classList.remove("hidden");
    renderRatingAccess("shs", result.data?.shs_enabled !== false);
    renderRatingAccess("non_shs", result.data?.non_shs_enabled !== false);
    return true;
  } catch (error) {
    document.getElementById("ratingAccessCard")?.classList.add("hidden");
    console.warn(error.message || "Unable to load student rating access controls.");
    return false;
  }
}

async function updateRatingAccess(group, enabled) {
  const toggle = document.getElementById(
    group === "shs" ? "shsRatingAccessToggle" : "nonShsRatingAccessToggle",
  );
  toggle.disabled = true;
  try {
    const response = await fetch("/api/transaction/rating-access/status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group, enabled, user_id: state.user_id }),
    });
    const result = await readApiJson(response);
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to update student rating access.");
    }
    renderRatingAccess(group, result.data?.enabled === true);
    showToast(result.message);
  } catch (error) {
    renderRatingAccess(group, state.rating_access[group]);
    showToast(error.message || "Unable to update student rating access.", true);
  }
}

function showToast(message, error = false) {
  const toast = document.createElement("div");
  toast.className = `transaction-toast${error ? " error" : ""}`;
  toast.innerHTML = `<i class="bi ${error ? "bi-exclamation-triangle" : "bi-check2-circle"}" aria-hidden="true"></i><span></span>`;
  toast.lastElementChild.textContent = message;
  document.getElementById("toast-container").replaceChildren(toast);
  setTimeout(() => toast.remove(), 4000);
}

// 3. DATATABLES INITIALIZATION
let mainTable;
let modalTable;

$(document).ready(function () {
  mainTable = $("#mainTable").DataTable({
    autoWidth: false,
    responsive: true,

    columns: [
      { data: "IDNumber", title: "ID Number", width: "15%" },
      { data: "FullName", title: "Student Name", width: "35%" },
      {
        data: "Program",
        title: "Program",
        width: "30%",
        className: "text-wrap-column",
      },
      {
        data: "TotalSubjects",
        title: "Total Courses",
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
          const icon = isComplete
            ? "bi-check-circle-fill"
            : "bi-x-circle-fill";

          return `
            <div class="flex flex-col items-center justify-center gap-1">
              <i class="bi ${icon} ${color} text-2xl"></i>
              <span class="text-[10px] font-black uppercase ${color}">
                ${total - pending} / ${total}
              </span>
            </div>`;
        },
      },
    ],

    createdRow: function (row) {
      $(row)
        .addClass("cursor-pointer hover:bg-gray-100 transition-colors")
        .css("cursor", "pointer");
    },

    dom: '<"flex justify-between items-center mb-4"f>rt<"flex justify-between items-center mt-4"ip>',
    pageLength: 10,
    language: {
      search: "",
      searchPlaceholder: "Type a keyword...",
      paginate: {
        previous: "Previous",
        next: "Next",
      },
    },
  });

  // Click anywhere on the row to view the student's subjects
  $("#mainTable tbody").on("click", "tr", function () {
    const data = mainTable.row(this).data();

    if (!data) return;

    showSubjectModal(data.IDNumber);
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
          title: "COURSE",
          width: "45%",
          className: "text-wrap-column",
        },
        { data: "teachers_name", title: "INSTRUCTOR" },
        {
          data: "status",
          title: "STATUS",
          className: "text-center",
          render: (data, type) => {
            const isRated = Number(data) === 1;
            if (type === "sort" || type === "type") return isRated ? 1 : 0;
            if (type === "filter") return isRated ? "RATED" : "PENDING";
            return isRated
              ? '<span class="text-green-600 font-bold">RATED</span>'
              : '<span class="text-red-500 font-bold">PENDING</span>';
          },
        },
      ],
      lengthChange: false,
      paging: true,
      pageLength: 8,
      searching: false,
      info: false,
      responsive: true,
      autoWidth: false,
      drawCallback: function () {
        const modalBody = document.querySelector("#subjectModal .modal-body");
        if (modalBody) modalBody.scrollTop = 0;
      },
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
  $("#main").css(
    "margin-left",
    window.innerWidth <= 760 || isOpen ? 0 : 280,
  );
}

const showSpinner = () => $("#overlay").css("display", "flex");
const hideSpinner = () => $("#overlay").hide();

function promptForAcademicGroup() {
  const prompt = document.getElementById("transactionGroupPrompt");
  const buttons = [...prompt.querySelectorAll("[data-academic-group]")];
  buttons.forEach((button) => {
    const flag = button.dataset.academicGroup === "SHS" ? "is_current_shs" : "is_current_college";
    const semester = state.availableSemesters.find((row) => Number(row[flag]) === 1);
    const year = state.currentSchoolYearName || "No active school year";
    button.querySelector(".academic-group-current").textContent = semester
      ? `${year} · ${semester.name}`
      : `${year} · No active semester`;
  });
  const previousFocus = document.activeElement;
  const previousOverflow = document.body.style.overflow;
  hideSpinner();
  prompt.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  buttons[0].focus();
  return new Promise((resolve) => {
    prompt.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault();
        buttons.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
        event.preventDefault();
        buttons[0].focus();
      }
    });
    buttons.forEach((button) => button.addEventListener("click", () => {
      const group = button.dataset.academicGroup;
      prompt.classList.add("hidden");
      document.body.style.overflow = previousOverflow;
      (document.getElementById("loadSchoolYear") || previousFocus)?.focus();
      resolve(group);
    }, { once: true }));
  });
}

function selectAcademicGroup(group, currentSemester = null) {
  const schoolYear = document.getElementById("loadSchoolYear");
  if (schoolYear) {
    schoolYear.value = state.currentSchoolYearId;
    schoolYear.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const currentFlag = group === "SHS" ? "is_current_shs" : "is_current_college";
  const current = state.availableSemesters.find((row) => Number(row[currentFlag]) === 1);
  const semester = document.getElementById("loadSemester");
  const semesterId = current?.id || (currentSemester?.academic_scope === group ? currentSemester.id : "");
  semester.value = semesterId ? String(semesterId) : "";
  semester.dispatchEvent(new Event("change", { bubbles: true }));
  if (!semester.value) showToast(`No active ${group === "SHS" ? "SHS" : "College"} semester is configured.`, true);
}

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
    const [, currentSchoolYear, , canManageRatingAccess, currentSemester] = await Promise.all([
      loadSidebar(),
      API.fetchOptions("schoolyear", "loadSchoolYear"),
      API.fetchOptions("semester", "loadSemester"),
      loadRatingAccess(),
      API.fetchCurrentAdminSemester(),
    ]);

    const loadSchoolYear = document.getElementById("loadSchoolYear");
    const loadSemester = document.getElementById("loadSemester");
    state.currentSchoolYearId = currentSchoolYear?.id ? String(currentSchoolYear.id) : "";
    state.currentSchoolYearName = currentSchoolYear?.name || "";

    if (canManageRatingAccess) {
      [
        ["shsRatingAccessToggle", "shs"],
        ["nonShsRatingAccessToggle", "non_shs"],
      ].forEach(([id, group]) => {
        document.getElementById(id)?.addEventListener("change", (event) => {
          updateRatingAccess(group, event.currentTarget.checked);
        });
      });
    }

    const hasBothGroups = state.adminAcademicScope === "ALL";
    const initialGroup = hasBothGroups
      ? await promptForAcademicGroup()
      : state.adminAcademicScope === "SHS" ? "SHS" : "COLLEGE";
    selectAcademicGroup(initialGroup, currentSemester);

    const invalidatePendingLoad = () => {
      state.loadSequence++;
      hideSpinner();
    };
    loadSchoolYear.addEventListener("change", invalidatePendingLoad);
    loadSemester.addEventListener("change", invalidatePendingLoad);

    if (loadSchoolYear.value && loadSemester.value) {
      await API.loadData({
        school_year_id: loadSchoolYear.value,
        semester_id: loadSemester.value,
      });
    }

    document
      .getElementById("btnSearch")
      ?.addEventListener("click", function () {
        const icon = this.querySelector("i");
        icon?.classList.add("animate-spin");
        API.loadData({
          school_year_id: loadSchoolYear.value,
          semester_id: loadSemester.value,
        });
        setTimeout(() => icon?.classList.remove("animate-spin"), 600);
      });

    document.getElementById("refresh")?.addEventListener("click", function () {
      const icon = this.querySelector("i");
      icon?.classList.add("animate-spin");
      API.loadData();
      setTimeout(() => icon?.classList.remove("animate-spin"), 800);
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
