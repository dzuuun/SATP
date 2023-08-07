const baseURL = "http://localhost:3000";
var user = sessionStorage.getItem("user_id");
var user_admin = sessionStorage.getItem("is_admin_rater");
var username = sessionStorage.getItem("username");
document.getElementById("userName").innerHTML = username;

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

if (user_admin == 0) {
  alert("You don't have permission to access this page. Redirecting...");
  window.location.href = "../../rating/index.html";
}

var data = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `${baseURL}/api/permission`,
    cache: true,
  },
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { data: "name" },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.transaction_access
            ? "<span>Yes</span>"
            : '<span style="color: red">No</span>'
        }
                  </td>`;
      },
    },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.maintenance_access
            ? "<span>Yes</span>"
            : '<span style="color: red">No</span>'
        }
                  </td>`;
      },
    },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.reports_access
            ? "<span>Yes</span>"
            : '<span style="color: red">No</span>'
        }
                  </td>`;
      },
    },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.users_access
            ? "<span>Yes</span>"
            : '<span style="color: red">No</span>'
        }
                  </td>`;
      },
    },
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
                <button class='btn bi fs-5 bi-pencil' onclick="editFormCall(${row.id})")' title="Edit"></button>

              </div>
            </td> `;
      },
    },
  ],
});

// post permission to API
const formAddPermission = document.querySelector("#newPermissionForm");
formAddPermission.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(formAddPermission);

  const transaction_access =
    document.getElementById("transaction_access").checked;
  if (transaction_access == false) {
    formData.append("transaction_access", "0");
  } else {
    formData.append("transaction_access", "1");
  }

  const maintenance_access =
    document.getElementById("maintenance_access").checked;
  if (maintenance_access == false) {
    formData.append("maintenance_access", "0");
  } else {
    formData.append("maintenance_access", "1");
  }

  const reports_access = document.getElementById("reports_access").checked;
  if (reports_access == false) {
    formData.append("reports_access", "0");
  } else {
    formData.append("reports_access", "1");
  }

  const users_access = document.getElementById("users_access").checked;
  if (users_access == false) {
    formData.append("users_access", "0");
  } else {
    formData.append("users_access", "1");
  }

  const isActive = document.getElementById("isPermissionActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/permission/add`, {
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
          $("#addNewModal").modal("hide");
          $("#table").DataTable().ajax.reload();
        }
      });
  }
});

// clear modal form upon closing
$(".modal").on("hidden.bs.modal", function () {
  $(this).find("form").trigger("reset");
});

function setSuccessMessage(message) {
  document.getElementById(
    "toast-container"
  ).innerHTML = `<div id="toastContainer" class="toast bg-success text-white" role="alert" aria-live="assertive" aria-atomic="true">
                  <div id="toast-header" class="toast-header border-0 bg-success text-white">
                    <i class="bi bi-check-circle me-2"></i>
                    <strong id="toastLabel" class="me-auto">Success</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                  </div>
                
                  <div class="d-flex">
                    <div class="toast-body">
                      ${message}
                    </div>
                  </div>

                </div>`;
  $("#toastContainer").toast("show");
  setTimeout(() => {
    $(".alert").alert("close");
  }, 2000);
}

function setErrorMessage(message) {
  document.getElementById(
    "toast-container"
  ).innerHTML = `<div id="toastContainer" class="toast bg-danger text-white" role="alert" aria-live="assertive" aria-atomic="true">
                  <div id="toast-header" class="toast-header border-0 bg-danger text-white">
                    <i class="bi bi-check-circle me-2"></i>
                    <strong id="toastLabel" class="me-auto">Error</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                  </div>
                
                  <div class="d-flex">
                    <div class="toast-body">
                      ${message}
                    </div>
                  </div>
                  
                </div>`;
  $("#toastContainer").toast("show");
  setTimeout(() => {
    $(".alert").alert("close");
  }, 2000);
}

// update data on the API
var rowIdToUpdate;
async function editFormCall(id) {
  await fetch(`${baseURL}/api/permission/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      rowIdToUpdate = data.id;
      document.getElementById("editDescription").value = data.name;
      if (data.transaction_access == 0) {
        document.getElementById("transaction_accessEdit").checked = false;
      } else {
        document.getElementById("transaction_accessEdit").checked = true;
      }

      if (data.maintenance_access == 0) {
        document.getElementById("maintenance_accessEdit").checked = false;
      } else {
        document.getElementById("maintenance_accessEdit").checked = true;
      }

      if (data.reports_access == 0) {
        document.getElementById("reports_accessEdit").checked = false;
      } else {
        document.getElementById("reports_accessEdit").checked = true;
      }

      if (data.users_access == 0) {
        document.getElementById("users_accessEdit").checked = false;
      } else {
        document.getElementById("users_accessEdit").checked = true;
      }

      if (data.is_active == 0) {
        document.getElementById("isPermissionActiveEdit").checked = false;
      } else {
        document.getElementById("isPermissionActiveEdit").checked = true;
      }
      $("#editModal").modal("show");
    });
}
const formEditPermission = document.querySelector("#editPermissionForm");
formEditPermission.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(formEditPermission);

  const transaction_access = document.getElementById(
    "transaction_accessEdit"
  ).checked;
  if (transaction_access == false) {
    formData.append("transaction_access", "0");
  } else {
    formData.append("transaction_access", "1");
  }

  const maintenance_access = document.getElementById(
    "maintenance_accessEdit"
  ).checked;
  if (maintenance_access == false) {
    formData.append("maintenance_access", "0");
  } else {
    formData.append("maintenance_access", "1");
  }

  const reports_access = document.getElementById("reports_accessEdit").checked;
  if (reports_access == false) {
    formData.append("reports_access", "0");
  } else {
    formData.append("reports_access", "1");
  }

  const users_access = document.getElementById("users_accessEdit").checked;
  if (users_access == false) {
    formData.append("users_access", "0");
  } else {
    formData.append("users_access", "1");
  }

  const isActive = document.getElementById("isPermissionActiveEdit").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/permission/update`, {
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
          $("#editModal").modal("hide");
          $("#table").DataTable().ajax.reload();
        }
      });
  }
});

// delete function
var rowIdToDelete;
function deleteRow(id) {
  rowIdToDelete = id;
  $("#deleteModal").modal("show");
}

async function confirmDelete() {
  const data = { id: rowIdToDelete, user_id: user };
  await fetch(`${baseURL}/api/permission/delete`, {
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
        $("#deleteModal").modal("hide");
        $("#table").DataTable().ajax.reload();
      }
    });
}

function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
  document.getElementById("main").style.marginLeft = "250px";
  document.querySelector("footer").style.marginLeft = "250px";
  nav = true;
}

var nav = false;

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.getElementById("main").style.marginLeft = "0";
  document.querySelector("footer").style.marginLeft = "0";
  nav = false;
}
function toggleNav() {
  nav ? closeNav() : openNav();
}

let signOutButton = document.getElementById("signout");

signOutButton.addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "../../index.html";
});
