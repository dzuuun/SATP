// 1. AUTH & GLOBAL STATE
const state = {
    user_id: localStorage.getItem("user_id"),
    transactionAccess: localStorage.getItem("transactionAccess"),
    username: localStorage.getItem("username"),
    semester_id: "",
    school_year_id: ""
};

// Security Gate
if (!state.user_id) {
    alert("Log in to continue.");
    window.location.href = "../index.html";
}
if (state.transactionAccess == 0) {
    alert("Access Denied.");
    history.back();
}

// 2. GRID.JS INITIALIZATION
const grid = new gridjs.Grid({
    columns: [
        { name: "Username", id: 'username', width: '120px' },
        { name: "Rater", id: 'student_name', width: '200px' },
        { name: "Ratee", id: 'teachers_name', width: '200px' },
        { name: "Subject", id: 'subject_code', width: '100px' },
        { name: "College", id: 'college_code', width: '100px' },
        { 
            name: "Status", 
            id: 'status',
            width: '80px',
            formatter: (cell) => gridjs.html(cell == 1 
                ? '<i class="bi bi-check-circle-fill text-green-600 text-xl"></i>' 
                : '<i class="bi bi-x-circle-fill text-red-500 text-xl"></i>')
        }
    ],
    fixedHeader: true,
    pagination: { limit: 10 },
    search: true,
    sort: true,
    language: { 'search': { 'placeholder': 'Search records...' } },
    className: {
        table: 'w-full text-sm text-left',
        td: 'p-4 border-b border-gray-50',
        th: 'bg-gray-50 text-gray-500 font-bold uppercase text-[10px] p-4'
    },
    data: [] 
}).render(document.getElementById("table-container"));

// 3. API SERVICES
const API = {
    async fetchOptions(endpoint, elementId) {
        try {
            const res = await fetch(`/api/${endpoint}/inuse/active`);
            const json = await res.json();
            const select = document.getElementById(elementId);
            
            select.innerHTML = `<option value="">Select ${endpoint.replace('year', ' Year')}</option>`;
            json.data.forEach(row => {
                select.innerHTML += `<option value="${row.id}">${row.name}</option>`;
            });
        } catch (err) { console.error(`Error loading ${endpoint}:`, err); }
    },

    loadData() {
        if (!state.semester_id || !state.school_year_id) return;

        showSpinner();
        $.ajax({
            url: `/api/transaction/all/school_year_id=${state.school_year_id}&semester_id=${state.semester_id}`,
            type: "get",
        })
        .done(response => {
            // Update Stats
            document.getElementById("totalTransactions").textContent = response.count;
            document.getElementById("TransactionsAccomplished").textContent = response.data.filter(i => i.status === 1).length;
            document.getElementById("transactionsToAccomplish").textContent = response.data.filter(i => i.status === 0).length;

            // UI Adjustments
            $('#generateList, #refresh').removeClass('hidden').show();
            
            // Update Table
            grid.updateConfig({ data: response.data }).forceRender();
        })
        .always(hideSpinner);
    }
};

// 4. CORE EVENT CONTROLLER
$(document).ready(function () {
    // Initial Setup
    API.fetchOptions('schoolyear', 'loadSchoolYear');
    API.fetchOptions('semester', 'loadSemester');
    updateUserUI();

    // Combined Change Listener for Dropdowns
    $('#loadSchoolYear, #loadSemester').on('change', function() {
        state.school_year_id = $('#loadSchoolYear').val();
        state.semester_id = $('#loadSemester').val();

        if (state.school_year_id && state.semester_id) {
            $('#filterRefresh').removeClass('hidden').addClass('flex');
            API.loadData();
        } else {
            $('#filterRefresh').addClass('hidden').removeClass('flex');
        }
    });

    // Refresh Button Click
    $('#filterRefresh, #refresh').on('click', function() {
        const $icon = $(this).find('i');
        $icon.addClass('animate-spin');
        API.loadData();
        setTimeout(() => $icon.removeClass('animate-spin'), 800);
    });

    // Grid Limit Change
    $('#gridLimit').on('change', function() {
        grid.updateConfig({ pagination: { limit: parseInt($(this).val()) } }).forceRender();
    });
});

// 5. EXPORT LOGIC
document.getElementById("generateList").addEventListener("click", async (e) => {
    e.preventDefault();
    showSpinner();
    try {
        const res = await fetch(`/api/transaction/notrated`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ school_year_id: state.school_year_id, semester_id: state.semester_id }),
        });
        const response = await res.json();

        if (!response.data || response.data.length === 0) {
            alert("No data found to export.");
        } else {
            const ws = XLSX.utils.json_to_sheet(response.data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Unrated");
            XLSX.writeFile(wb, `SATP_Unrated_${state.school_year_id}.xlsx`);
        }
    } catch (err) { alert("Export failed."); }
    hideSpinner();
});

// 6. UI UTILITIES
function updateUserUI() {
    if (state.username) {
        ['userName', 'sidebarUserName'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = state.username;
        });
    }
    if(document.getElementById("year")) document.getElementById("year").textContent = new Date().getFullYear();
}

function toggleNav() {
    const side = document.getElementById("mySidenav");
    const main = document.getElementById("main");
    const isOpen = side.style.width === "280px";
    
    side.style.width = isOpen ? "0" : "280px";
    main.style.marginLeft = isOpen ? "0" : "280px";
}

document.getElementById("signout").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "../index.html";
});

function showSpinner() { document.getElementById("overlay").style.display = "flex"; }
function hideSpinner() { document.getElementById("overlay").style.display = "none"; }