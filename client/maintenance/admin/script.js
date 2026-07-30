var user = localStorage.getItem("user_id");
var maintenanceAccess = localStorage.getItem("maintenanceAccess");
var username = localStorage.getItem("username");
var fullname = localStorage.getItem("fullname");

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

if (maintenanceAccess == 0) {
  alert("You don't have permission to access this page. Redirecting...");
  history.back();
}

let data = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `/api/admin`,
    cache: true,
  },
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { width: "5%", data: "username" },
    { data: "name" },
    { width: "15%", data: "permission" },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.is_active
            ? "<span>Yes</span>"
            : '<span style="color: red">No</span>'
        }
                </td>`;
      },
    },
    {
      width: "5%",
      data: null,
      render: function (data, type, row) {
        return `<td  class="text-center">
        <div class="text-nowrap">              
          <button class="table-edit-button" type="button" onclick="edit(${row.id})" title="Edit administrator" aria-label="Edit administrator">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg>
          </button>
        </div>
      </td> `;
      },
    },
  ],
});

function showPassword() {
  var x = document.getElementById("addPassword");
  if (x.type === "password") {
    x.type = "text";
  } else {
    x.type = "password";
  }
}

// Get permission from API
const getPermission = async () => {
  const permissionList = document.querySelector("#permissionSelect");

  const endpoint = `/api/permission/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    result = data.data;

  result.forEach((row) => {
    permissionList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
};

getPermission();

function generatePassword() {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < 10) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  document.getElementById("addPassword").value = result;
}

// post school year to API
const formAddAdmin = document.querySelector("#newAdminForm");
formAddAdmin.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(formAddAdmin);
  const isActive = document.getElementById("isAdminActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }
  formData.append("is_temp_pass", "0");
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`/api/admin/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success == 0) {
          setErrorMessage(response.message);
        } else {
          setSuccessMessage(response.message);
          toggleModal("addNewModal", false);
          $("#table").DataTable().ajax.reload();
        }
      });
  }
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

  toast.className = "admin-toast";
  toast.setAttribute("role", "status");
  icon.className = "toast-symbol";
  icon.innerHTML =
    type === "success"
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5m0 3h.01M10.3 4.6 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"/></svg>';
  text.textContent = message;
  toast.append(icon, text);
  container.replaceChildren(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// update information on the API
var rowIdToUpdate;
async function edit(id) {
  await fetch(`/api/admin/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      document.getElementById("editGivenName").value = data.givenname;
      document.getElementById("editMiddleName").value = data.middlename;
      document.getElementById("editLastName").value = data.surname;
      document.getElementById("editGenderSelect").value = data.gender;
      if (data.is_active == 0) {
        document.getElementById("editIsAdminStatusActive").checked = false;
      } else {
        document.getElementById("editIsAdminStatusActive").checked = true;
      }
      rowIdToUpdate = data.id;
      switchAdminTab("personalInformation");
      toggleModal("editModal", true);
    });
}
const formEditAdmin = document.querySelector("#editAdminInfoForm");
formEditAdmin.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(formEditAdmin);

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`/api/admin/update/info`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success == 0) {
          setErrorMessage(response.message);
        } else {
          setSuccessMessage(response.message);
          toggleModal("editModal", false);
          $("#table").DataTable().ajax.reload();
        }
      });
  }
});

const formEditAdminStatus = document.querySelector("#editAdminStatusForm");
formEditAdminStatus.addEventListener("submit", async (event) => {
  event.preventDefault();

  const isActive = document.getElementById("editIsAdminStatusActive").checked;
  let status;
  if (isActive == false) {
    status = { is_active: 0, id: rowIdToUpdate, user_id: user };
  } else {
    status = { is_active: 1, id: rowIdToUpdate, user_id: user };
  }

  if (confirm("This action cannot be undone.") == true) {
    await fetch(`/api/admin/update/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(status),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success == 0) {
          setErrorMessage(response.message);
        } else {
          setSuccessMessage(response.message);
          toggleModal("editModal", false);
          $("#table").DataTable().ajax.reload();
        }
      });
  }
});

// delete function
var rowIdToDelete;
function deleteRow(id) {
  rowIdToDelete = id;
  toggleModal("deleteModal", true);
}

async function confirmDelete() {
  const data = { id: rowIdToDelete, user_id: user };
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`/api/admin/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success == 0) {
          setErrorMessage(response.message);
        } else {
          setSuccessMessage(response.message);
          toggleModal("deleteModal", false);
          $("#table").DataTable().ajax.reload();
        }
      });
  }
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

function switchAdminTab(tabId) {
  document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== tabId);
  });
  document.querySelectorAll(".modal-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
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

function setupSidebarInteractions() {
  const nameEl = document.getElementById("sidebar-fullname");
  if (nameEl) nameEl.textContent = fullname || username || "User";

  document.querySelectorAll(".menu-toggle").forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const targetMenu = document.getElementById(this.dataset.target);
      if (!targetMenu) return;
      targetMenu.classList.toggle("hidden");
      const isHidden = targetMenu.classList.contains("hidden");
      this.setAttribute("aria-expanded", String(!isHidden));
      const chevron = this.querySelector(".chevron");
      if (chevron) {
        chevron.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
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

      const parentDropdown = link.closest("ul[id^='dropdown-']");
      if (parentDropdown) {
        link.classList.add("sub-active");
        parentDropdown.classList.remove("hidden");
        const toggle = document.querySelector(
          `[data-target="${parentDropdown.id}"]`,
        );
        if (toggle) {
          toggle.setAttribute("aria-expanded", "true");
          const chevron = toggle.querySelector(".chevron");
          if (chevron) chevron.style.transform = "rotate(180deg)";
        }
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
