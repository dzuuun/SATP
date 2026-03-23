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

// 2. GRID.JS INITIALIZATION (Main Table)
const grid = new gridjs.Grid({
  columns: [
    { name: "ID Number", id: "IDNumber", width: "120px" },
    { name: "Student Name", id: "FullName", width: "200px" },
    { name: "College", id: "College", width: "180px" },
    {
      name: "Total Subjects",
      id: "TotalSubjects",
      width: "120px",
      formatter: (cell) =>
        gridjs.html(
          `<div class="text-center w-full font-medium">${cell}</div>`,
        ),
    },
    {
      name: "Status",
      id: "PendingStatusCount",
      width: "120px",
      formatter: (cell, row) => {
        const studentId = row.cells[0].data;
        const total = parseInt(row.cells[3].data); // Total Subjects
        const pending = parseInt(cell); // Pending Count

        // Calculate completed based on your specific logic
        // If 'cell' represents pending items:
        const isComplete = pending === 0 && total > 0;

        // If your 'cell' actually represents completed items, use:
        // const isComplete = (pending === total && total > 0);

        const colorClass = isComplete ? "text-green-600" : "text-red-500";
        const icon = isComplete ? "bi-check-circle-fill" : "bi-x-circle-fill";

        return gridjs.html(`
            <div class="flex flex-col items-center justify-center gap-1">
                <button onclick="showSubjectModal('${studentId}')" class="hover:scale-110 transition-transform">
                    <i class="bi ${icon} ${colorClass} text-xl cursor-pointer"></i>
                </button>
                <span class="text-[10px] font-bold ${colorClass}">
                    ${total - pending}/${total}
                </span>
            </div>
        `);
      },
    },
  ],
  data: [],
  fixedHeader: true,
  pagination: { limit: 10 },
  search: true,
  sort: true,
  className: {
    table: "w-full text-sm text-left text-base",
    th: "bg-gray-50 text-gray-500 font-bold uppercase text-xs p-4",
  },
}).render(document.getElementById("table-container"));

// 3. API & DATA SERVICES
const API = {
  async fetchOptions(endpoint, elementId) {
    try {
      const res = await fetch(`/api/${endpoint}/inuse/active`);
      const { data } = await res.json();
      const $select = $(`#${elementId}`);

      $select.html(
        `<option value="">Select ${endpoint.includes("year") ? "School Year" : "Semester"}</option>`,
      );
      data.forEach((row) =>
        $select.append(`<option value="${row.id}">${row.name}</option>`),
      );
    } catch (err) {
      console.error(`Error loading ${endpoint}:`, err);
    }
  },

  loadData() {
    if (!state.semester_id || !state.school_year_id) return;

    showSpinner();
    $.get(
      `/api/transaction/all/school_year_id=${state.school_year_id}&semester_id=${state.semester_id}`,
    )
      .done((response) => {
        $("#generateList, #refresh").removeClass("hidden");
        grid.updateConfig({ data: response.data }).forceRender();
      })
      .fail((err) => alert("Failed to load table data."))
      .always(hideSpinner);
  },
  // Inside your API object in the script
loadDashboardStats() {
    if (!state.semester_id || !state.school_year_id) return;

    $.get(`/api/transaction/stats/school_year_id=${state.school_year_id}&semester_id=${state.semester_id}`)
        .done((response) => {
        
            if (response.success && response.data) {
                const stats = response.data;
            
                // Mapping to your specific HTML IDs
              $("#totalTransactions").text(stats[0].TotalStudents || 0);
                $("#TransactionsAccomplished").text(stats[0].FullyRatedCount || 0);
                $("#transactionsToAccomplish").text(stats[0].IncompleteCount || 0);
            }
        })
        .fail(err => console.error("Dashboard Stat Error:", err));
},

};

// 4. MODAL LOGIC
let subjectGridInstance = null;

async function showSubjectModal(studentId) {
  const { school_year_id: sy, semester_id: sem } = state;
  if (!sy || !sem) return alert("Please select filters first.");

  document.getElementById("subjectModal").classList.remove("hidden");
  const wrapper = document.getElementById("modalTableWrapper");

  if (subjectGridInstance) subjectGridInstance.destroy();
  wrapper.innerHTML = "";

  subjectGridInstance = new gridjs.Grid({
    columns: [
      { name: "Code", id: "subject_code" },
      { name: "Subject", id: "subject_name" },
      { name: "Instructor", id: "teachers_name" },
      {
        name: "Status",
        formatter: (cell) =>
          gridjs.html(
            cell == 1
              ? '<span class="text-green-600 font-bold">RATED</span>'
              : '<span class="text-red-500 font-bold">PENDING</span>',
          ),
      },
    ],
    server: {
      url: `/api/transaction/student/subjects/school_year_id=${sy}&semester_id=${sem}&student_id=${studentId}`,
      then: (res) =>
        res.data.map((item) => [
          item.subject_code,
          item.subject_name,
          item.teachers_name,
          item.status,
        ]),
    },
    pagination: { limit: 10 },
    style: { table: { width: "100%" } },
  }).render(wrapper);
}

function closeModal() {
  document.getElementById("subjectModal").classList.add("hidden");
  if (subjectGridInstance) subjectGridInstance.destroy();
}

// 5. EVENT LISTENERS & INITIALIZATION
$(document).ready(() => {
  API.fetchOptions("schoolyear", "loadSchoolYear");
  API.fetchOptions("semester", "loadSemester");
  updateUserUI();

  // Dropdown Changes
  $("#loadSchoolYear, #loadSemester").on("change", function () {
    state.school_year_id = $("#loadSchoolYear").val();
    state.semester_id = $("#loadSemester").val();

    if (state.school_year_id && state.semester_id) {
      $("#filterRefresh").removeClass("hidden").addClass("flex");
      API.loadData();
      API.loadDashboardStats();
    }
  });

  // Refresh & Limit Handlers
  $("#filterRefresh, #refresh").on("click", function () {
    $(this).find("i").addClass("animate-spin");
    API.loadData();
    setTimeout(() => $(this).find("i").removeClass("animate-spin"), 800);
  });

  $("#gridLimit").on("change", function () {
    grid
      .updateConfig({ pagination: { limit: parseInt($(this).val()) } })
      .forceRender();
  });

  // Excel Export
  $("#generateList").on("click", async (e) => {
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
      if (!response.data?.length) return alert("No data found.");

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
});

// 6. UI UTILITIES
function updateUserUI() {
    console.log(state)
  // Use 'fullname' for the sidebar display (ID)
  $("#userName").text(state.fullname || "User Not Found"); 
  
  // Use 'fullname' for any other elements using the class (Class)
  $(".userName").text(state.fullname || "Guest");
  
  $("#year").text(new Date().getFullYear());
}

function toggleNav() {
  const isOpen = $("#mySidenav").width() > 0;
  $("#mySidenav").width(isOpen ? 0 : 280);
  $("#main").css("margin-left", isOpen ? 0 : 280);
}

$("#signout").on("click", () => {
  localStorage.clear();
  window.location.href = "../index.html";
});

const showSpinner = () => $("#overlay").css("display", "flex");
const hideSpinner = () => $("#overlay").hide();

$(document).ready(function() {
    $('.menu-toggle').on('click', function() {
        const targetId = $(this).data('target');
        const $targetMenu = $('#' + targetId);
        const $chevron = $(this).find('.bi-chevron-down');

        // Toggle the 'hidden' class on the menu
        $targetMenu.toggleClass('hidden');

        // Optional: Rotate the chevron icon when expanded
        if ($targetMenu.hasClass('hidden')) {
            $chevron.css('transform', 'rotate(0deg)');
        } else {
            $chevron.css('transform', 'rotate(180deg)');
        }
    });
});

