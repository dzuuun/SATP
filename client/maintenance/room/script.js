// Auth and Sidebar Initialization

const state = {
  user: localStorage.getItem("user_id"),
  transactionAccess: localStorage.getItem("transactionAccess"),
  maintenanceAccess: localStorage.getItem("maintenanceAccess"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
  semester_id: "",
  school_year_id: "",
};

if (state.user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

if (state.maintenanceAccess == 0) {
  alert("You don't have permission to access this page. Redirecting...");
  history.back();
}

// --- DATATABLES INITIALIZATION ---
let table;

$(document).ready(function () {
  table = $("#roomTable").DataTable({
    ajax: {
      url: "/api/room",
      dataSrc: "data",
    },
    columns: [
      { data: "name", title: "Room name" },
      {
        data: "is_active",
        title: "Status",
        width: "15%",
        className: "dt-center",
        render: function (data) {
          const isActive = data == 1;
          return isActive
            ? '<span class="status-badge active">Active</span>'
            : '<span class="status-badge inactive">Inactive</span>';
        },
      },
      {
        data: "id",
        title: "Actions",
        width: "10%",
        orderable: false,
        className: "dt-center",
        render: (data) => `
          <button type="button" onclick="editFormCall(${data})" class="table-edit-button" aria-label="Edit room">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"></path>
            </svg>
          </button>`,
      },
    ],
    autoWidth: false,
    pageLength: 10,
    dom: '<"flex justify-between items-center mb-4"f>rt<"flex justify-between items-center mt-4"ip>',
    language: {
      search: "",
      searchPlaceholder: "Search rooms...",
      paginate: { next: "Next", previous: "Previous" },
    },
  });
});

// Replace Grid.js refresh with DataTables reload
function refreshGrid() {
  if (table) {
    table.ajax.reload(null, false);
  } else {
    console.error("DataTable instance not found.");
  }
}

function toggleModal(modalId, show = true) {
  const modal = document.getElementById(modalId);
  const card = document.getElementById(modalId + "Card");

  if (!modal) return;

  if (show) {
    modal.classList.remove("invisible");
    setTimeout(() => {
      modal.classList.add("opacity-100");
      if (card) {
        card.classList.remove("scale-95");
        card.classList.add("scale-100");
      }
    }, 10);
    document.body.classList.add("overflow-hidden");
  } else {
    // --- 1. START THE CLOSE ANIMATION ---
    modal.classList.remove("opacity-100");
    if (card) {
      card.classList.remove("scale-100");
      card.classList.add("scale-95");
    }

    // --- 2. RESET THE UI DATA (New Logic) ---
    if (modalId === "importFileModal") {
      const form = document.getElementById("uploadFileForm");
      const dropZone = document.getElementById("dropZone");
      const dropZoneText = dropZone.querySelector("p");

      if (form) form.reset(); // Clears the hidden file input

      // Revert the styles back to default gray
      if (dropZoneText) {
        dropZoneText.innerText = "Click to upload or drag Excel (XLSX) here";
        dropZoneText.classList.add("text-gray-400");
        dropZoneText.classList.remove("text-[#1a5f35]");
      }
      dropZone.classList.remove("border-[#1a5f35]", "bg-green-50/50");
    }

    modal.querySelectorAll("form").forEach((form) => form.reset());

    // --- 3. FINISH HIDING THE MODAL ---
    setTimeout(() => {
      modal.classList.add("invisible");
    }, 300);
    document.body.classList.remove("overflow-hidden");
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  ["addNewModal", "editModal", "importFileModal", "importPreviewModal"].forEach(
    (modalId) => {
      const modal = document.getElementById(modalId);
      if (modal && !modal.classList.contains("invisible")) {
        toggleModal(modalId, false);
      }
    },
  );
});
// --- ADD ROOM ---
const formAddRoom = document.querySelector("#newRoomForm");

formAddRoom.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(formAddRoom);
  const isActiveInput = document.getElementById("isRoomActive");

  formData.append(
    "is_active",
    isActiveInput && isActiveInput.checked ? "1" : "0",
  );
  formData.append("user_id", state.user);

  const payload = Object.fromEntries(formData);

  if (await satpConfirm("Create this new room?")) {
    try {
      const response = await fetch(`/api/room/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success == 0) {
        setErrorMessage(result.message);
      } else {
        // 1. Show the success notification
        setSuccessMessage(result.message);

        // 2. CLOSE THE MODAL (Tailwind Replacement)
        toggleModal("addNewModal", false);

        // 3. Reset the form fields for next time
        formAddRoom.reset();

        // 4. Refresh your table/grid
        refreshGrid();
      }
    } catch (error) {
      console.error("Submission error:", error);
      setErrorMessage("An error occurred. Please try again.");
    }
  }
});
// --- EDIT ROOM ---
let rowIdToUpdate;
async function editFormCall(id) {
  // 1. Fetch data from your API
  const res = await fetch(`/api/room/${id}`);
  const result = await res.json();
  const data = result.data;

  // 2. Set the global ID for the update payload
  rowIdToUpdate = data.id;

  // 3. Fill the Tailwind Modal inputs
  document.getElementById("editRoom").value = data.name;
  document.getElementById("isRoomActiveEdit").checked = data.is_active == 1;

  // 4. Open the Modal (Tailwind style)
  toggleModal("editModal", true);
}

const formEditRoom = document.querySelector("#editRoomForm");
formEditRoom.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(formEditRoom);
  formData.append(
    "is_active",
    document.getElementById("isRoomActiveEdit").checked ? "1" : "0",
  );
  formData.append("id", rowIdToUpdate);
  formData.append("user_id", state.user);

  if (await satpConfirm("Save changes to this room?")) {
    const response = await fetch(`/api/room/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const result = await response.json();

    if (result.success == 0) {
      setErrorMessage(result.message);
    } else {
      setSuccessMessage(result.message);
      toggleModal("editModal", false);
      refreshGrid();
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("downloadLink").addEventListener("click", (e) => {
    e.preventDefault();

    // 1. Create data array (Headers + Example Row)
    const data = [{ name: "Room 101" }, { name: "Room 102" }];

    // 2. Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // 3. Append worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Rooms");

    // 4. Trigger Download
    XLSX.writeFile(wb, "Room_Import_Template.xlsx");
  });
});

/// --- XLSX IMPORT DRAG AND DROP LOGIC ---

const fileInput = document.getElementById("xlsxInput");
const dropZone = document.getElementById("dropZone");
const dropZoneText = dropZone.querySelector("p");
const dropZoneIcon = dropZone.querySelector("i");

// --- NEW: Sync UI when a file is selected or changed ---
fileInput.addEventListener("change", function () {
  if (this.files && this.files[0]) {
    const fileName = this.files[0].name;

    // Update the UI to show the selected file
    dropZoneText.innerText = `Selected: ${fileName}`;
    dropZoneText.classList.remove("text-gray-400");
    dropZoneText.classList.add("text-[#1a5f35]");

    // Change icon color to green to show success
    dropZoneIcon.classList.remove("text-gray-300");
    dropZoneIcon.classList.add("text-[#1a5f35]");

    // Optional: Add a slight pulse effect to show it was accepted
    dropZone.classList.add("border-[#1a5f35]", "bg-green-50/20");
  }
});

// 1. Prevent default behaviors for all drag events
["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(
    eventName,
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    false,
  );
});

// 2. Add visual feedback when dragging over
["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(
    eventName,
    () => {
      dropZone.classList.add("border-[#1a5f35]", "bg-green-50/50");
    },
    false,
  );
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(
    eventName,
    () => {
      dropZone.classList.remove("border-[#1a5f35]", "bg-green-50/50");
    },
    false,
  );
});

// 3. Handle the dropped files
dropZone.addEventListener("drop", (e) => {
  const droppedFiles = e.dataTransfer.files;

  if (droppedFiles.length > 0) {
    // Assign the dropped file to the actual hidden input
    fileInput.files = droppedFiles;

    // Optional: Trigger a visual cue that the file was received
    const fileName = droppedFiles[0].name;
    dropZone.querySelector("p").innerText = `Selected: ${fileName}`;
    dropZone.querySelector("p").classList.add("text-[#1a5f35]");
  }
});

// --- XLSX IMPORT PREVIEW & EXECUTION ---
const uploadFileForm = document.querySelector("#uploadFileForm");
const runImportButton = document.getElementById("runImportButton");
let pendingImport = { created: [], updated: [], errors: [] };

uploadFileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = fileInput.files[0];
  if (!file) return;

  showSpinner();
  try {
    const rows = await readRoomWorkbook(file);
    const roomsResponse = await fetch("/api/room");
    const roomsResult = await roomsResponse.json();

    pendingImport = classifyRoomRows(rows, roomsResult.data || []);
    renderImportPreview(pendingImport);

    toggleModal("importFileModal", false);
    setTimeout(() => toggleModal("importPreviewModal", true), 300);
  } catch (error) {
    console.error("Import preview error:", error);
    setErrorMessage("Unable to validate the file. Check its format.");
  } finally {
    hideSpinner();
  }
});

function readRoomWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          raw: false,
        });
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function normalizeRoomName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function classifyRoomRows(rows, existingRooms) {
  const existingByName = new Map(
    existingRooms.map((room) => [normalizeRoomName(room.name), room]),
  );
  const seenFileNames = new Set();
  const result = { created: [], updated: [], errors: [] };

  rows.slice(0, 500).forEach((row, index) => {
    const rowNumber = index + 2;
    const nameKey = Object.keys(row).find(
      (key) => key.trim().toLowerCase() === "name",
    );
    const name = String(nameKey ? row[nameKey] : "")
      .trim()
      .replace(/\s+/g, " ");
    const normalizedName = normalizeRoomName(name);

    if (!normalizedName) {
      result.errors.push({
        rowNumber,
        name: "Unnamed room",
        reason: "Room name is required",
        originalRow: row,
      });
      return;
    }

    if (seenFileNames.has(normalizedName)) {
      result.errors.push({
        rowNumber,
        name,
        reason: "Duplicate row in file",
        originalRow: row,
      });
      return;
    }

    seenFileNames.add(normalizedName);
    const existing = existingByName.get(normalizedName);

    if (existing) {
      result.updated.push({
        rowNumber,
        id: existing.id,
        name,
        is_active: 1,
        originalRow: row,
      });
    } else {
      result.created.push({
        rowNumber,
        name,
        is_active: 1,
        originalRow: row,
      });
    }
  });

  if (rows.length > 500) {
    rows.slice(500).forEach((row, index) => {
      const nameKey = Object.keys(row).find(
        (key) => key.trim().toLowerCase() === "name",
      );
      result.errors.push({
        rowNumber: index + 502,
        name: String(nameKey ? row[nameKey] : "Unnamed room"),
        reason: "Import is limited to the first 500 rows",
        originalRow: row,
      });
    });
  }

  return result;
}

function renderImportPreview(result) {
  const groups = [
    ["created", "createdPreview", "createdCount", "Will be created"],
    ["updated", "updatedPreview", "updatedCount", "Existing room"],
    ["errors", "errorPreview", "errorCount", ""],
  ];

  groups.forEach(([key, containerId, countId, defaultDetail]) => {
    const items = result[key];
    const container = document.getElementById(containerId);
    document.getElementById(countId).textContent = items.length;
    container.replaceChildren();

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "preview-empty";
      empty.textContent = `No ${key} found`;
      container.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "preview-row";

      const rowNumber = document.createElement("span");
      rowNumber.className = "row-number";
      rowNumber.textContent = `Row ${item.rowNumber}`;

      const roomName = document.createElement("span");
      roomName.className = "room-name";
      roomName.textContent = item.name;

      const detail = document.createElement("span");
      detail.className = "row-detail";
      detail.textContent = item.reason || defaultDetail;

      row.append(rowNumber, roomName, detail);
      container.appendChild(row);
    });
  });

  const actionableCount = result.created.length + result.updated.length;
  const hasErrors = result.errors.length > 0;
  runImportButton.disabled = actionableCount === 0 && !hasErrors;
  runImportButton.title =
    actionableCount === 0 && !hasErrors ? "There are no rows to process" : "";
}

runImportButton.addEventListener("click", async () => {
  const actions = [
    ...pendingImport.created.map((room) => ({ type: "created", room })),
    ...pendingImport.updated.map((room) => ({ type: "updated", room })),
  ];

  const errorRows = pendingImport.errors.map((item) => ({
    ...item.originalRow,
    Error: item.reason,
  }));

  if (actions.length === 0) {
    downloadImportErrors(errorRows);
    toggleModal("importPreviewModal", false);
    setErrorMessage(`${errorRows.length} invalid rows exported.`);
    return;
  }

  toggleModal("importPreviewModal", false);
  setTimeout(() => toggleModal("spinnerStatusModal", true), 300);

  const completed = { created: 0, updated: 0, skipped: 0, errors: 0 };

  for (let index = 0; index < actions.length; index++) {
    const { type, room } = actions[index];
    const payload = { ...room, user_id: state.user };
    delete payload.rowNumber;
    delete payload.originalRow;

    try {
      const response =
        type === "created"
          ? await postData("/api/room/add", payload)
          : await updateRoomFromImport(payload);

      if (response.success == 1 || response.success === true) {
        response.skipped ? completed.skipped++ : completed[type]++;
      } else {
        completed.errors++;
        errorRows.push({
          ...room.originalRow,
          Error: response.message || `Unable to process ${room.name}`,
        });
      }
    } catch (error) {
      console.error(`Room ${type} import error:`, error);
      completed.errors++;
      errorRows.push({
        ...room.originalRow,
        Error: `Request failed while processing ${room.name}`,
      });
    }

    const progress = Math.round(((index + 1) / actions.length) * 100);
    document.getElementById("statusMessage").textContent = `${progress}%`;
  }

  toggleModal("spinnerStatusModal", false);
  uploadFileForm.reset();
  pendingImport = { created: [], updated: [], errors: [] };
  refreshGrid();

  if (errorRows.length > 0) {
    downloadImportErrors(errorRows);
  }

  setTimeout(() => {
    const errorTotal = errorRows.length;
    const message = `${completed.created} created, ${completed.updated} updated, ${completed.skipped} unchanged${errorTotal ? `, ${errorTotal} errors exported` : ""}.`;
    if (errorTotal) {
      setErrorMessage(message);
    } else {
      setSuccessMessage(message);
    }
  }, 400);
});

function downloadImportErrors(errorRows) {
  if (!errorRows.length) return;

  const worksheet = XLSX.utils.json_to_sheet(errorRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Import Errors");

  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `Room_Import_Errors_${date}.xlsx`);
}

async function updateRoomFromImport(payload) {
  const response = await fetch("/api/room/update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}

// Utility Functions
async function postData(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

function setSuccessMessage(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const id = "toast-" + Date.now();

  // Injecting a Tailwind-styled toast
  container.insertAdjacentHTML(
    "beforeend",
    `
    <div id="${id}" class="room-toast room-toast-success flex items-center w-full max-w-xs p-4 mb-4 text-white rounded-2xl shadow-xl transform transition-all duration-500 translate-y-10 opacity-0 border border-white/10">
        <div class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-green-100 bg-white/20 rounded-lg">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
        </div>
        <div class="ms-3 text-[11px] font-black uppercase tracking-wider">${message}</div>
    </div>
  `,
  );

  // Animate In
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("translate-y-10", "opacity-0");
  }, 10);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => el.remove(), 500);
    }
  }, 4000);
}

function setErrorMessage(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const id = "toast-" + Date.now();
  container.insertAdjacentHTML(
    "beforeend",
    `
    <div id="${id}" class="room-toast room-toast-error flex items-center w-full max-w-xs p-4 mb-4 text-white rounded-2xl shadow-xl transform transition-all duration-500 translate-y-10 opacity-0 border border-white/10">
        <div class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-red-100 bg-white/20 rounded-lg">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 3 20h18L12 4Zm0 5v5m0 3h.01"></path></svg>
        </div>
        <div class="ms-3 text-[11px] font-black uppercase tracking-wider">${message}</div>
    </div>
  `,
  );

  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("translate-y-10", "opacity-0");
  }, 10);

  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => el.remove(), 500);
    }
  }, 5000);
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
  // 1. Set the Fullname (Moved here from DOMContentLoaded)
  const nameEl = document.getElementById("sidebar-fullname");
  if (nameEl) {
    nameEl.textContent = state.fullname || state.username || "User";
  }

  // 2. Re-attach Menu Toggles (Dropdowns)
  const menuToggles = document.querySelectorAll(".menu-toggle");
  menuToggles.forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const targetMenu = document.getElementById(targetId);
      const chevron = this.querySelector(".chevron");

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

  // 3. Set Signout listener
  document.getElementById("signout")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "../../index.html";
  });
}

async function loadSidebar() {
  // document.getElementById("fullname").innerHTML = state.fullname;
  const container = document.getElementById("sidebar-container");
  if (!container) return; // Prevents errors if a page doesn't need a sidebar

  try {
    const response = await fetch("/sidebar.html"); // Fetches your single source file
    const html = await response.text();
    container.innerHTML = html;

    // 1. Get the current filename (e.g., 'room/index.html')
    const currentPath = window.location.pathname;

    // 2. Find all links in the sidebar
    const navLinks = document.querySelectorAll("#mySidenav a");

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");

      // 3. If the link's href is part of the current URL
      if (href && currentPath.includes(href.replace(/\.\.\//g, ""))) {
        // Check if this link is inside a dropdown
        const parentDropdown = link.closest("ul[id^='dropdown-']");

        if (parentDropdown) {
          // HIGHLIGHT SUB-ITEM
          link.classList.add("sub-active");

          // AUTO-OPEN DROPDOWN
          parentDropdown.classList.remove("hidden");

          // ROTATE CHEVRON
          const toggleBtn = document.querySelector(
            `[data-target="${parentDropdown.id}"]`,
          );
          if (toggleBtn) {
            toggleBtn.classList.add("text-gold", "font-bold");
            toggleBtn.setAttribute("aria-expanded", "true");
            const chevron = toggleBtn.querySelector(".chevron");
            if (chevron) chevron.style.transform = "rotate(180deg)";
          }
        } else {
          // HIGHLIGHT MAIN TAB
          link.classList.add("nav-active");
        }
      }
    });

    setupSidebarInteractions();
  } catch (err) {
    console.error("Sidebar failed to load:", err);
  }
}

// Call the loader when the page opens
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
});
