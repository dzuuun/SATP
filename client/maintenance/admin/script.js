const baseURL = "http://localhost:3000";

let data = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `${baseURL}/api/admin`,
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
          <button class='btn bi fs-5 bi-pencil' dropdown-toggle" type="button" data-bs-toggle="dropdown" title="Edit"></button>
          <div class="dropdown">
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" onclick="editAdminInfo(${row.id})")'>Information</a></li>
              <li><a class="dropdown-item"  onclick="editAdminStatus(${row.id})")'>Status</a></li>
            </ul>
          </div>
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

  const endpoint = `${baseURL}/api/permission/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    result = data.data;

  result.forEach((row) => {
    permissionList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
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
formAddAdmin.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(formAddAdmin);
  const isActive = document.getElementById("isAdminActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }
  formData.append("is_temp_pass", "0");
  formData.append("user_id", "1"); // get user id from cookie (mock data)
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/admin/add`, {
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
  $(".form-control").selectpicker("refresh");
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

// update information on the API
var rowIdToUpdate;
async function editAdminInfo(id) {
  await fetch(`${baseURL}/api/admin/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      document.getElementById("editGivenName").value = data.givenname;
      document.getElementById("editMiddleName").value = data.middlename;
      document.getElementById("editLastName").value = data.surname;
      document.getElementById("editGenderSelect").value = data.gender;

      rowIdToUpdate = data.id;
      $("#editAdminInfoModal").modal("show");
    });
}
const formEditAdmin = document.querySelector("#editAdminInfoForm");
formEditAdmin.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(formEditAdmin);

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", "1"); // get user id from localStorage (mock data)
  const data = Object.fromEntries(formData);
  console.log(data);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/admin/update/info`, {
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
          $("#editAdminInfoModal").modal("hide");
          $("#table").DataTable().ajax.reload();
        }
      });
  }
});

// update status on the API
var rowIdToUpdate;
async function editAdminStatus(id) {
  await fetch(`${baseURL}/api/admin/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      rowIdToUpdate = data.id;
      if (data.is_active == 0) {
        document.getElementById("editIsAdminStatusActive").checked = false;
      } else {
        document.getElementById("editIsAdminStatusActive").checked = true;
      }
      $("#editAdminStatusModal").modal("show");
    });
}
const formEditAdminStatus = document.querySelector("#editAdminStatusForm");
formEditAdminStatus.addEventListener("submit", (event) => {
  event.preventDefault();

  const isActive = document.getElementById("editIsAdminStatusActive").checked;
  let status;
  if (isActive == false) {
    status = { is_active: 0, id: rowIdToUpdate, user_id: 1 };
  } else {
    status = { is_active: 1, id: rowIdToUpdate, user_id: 1 };
  }

  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/admin/update/status`, {
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
          $("#editAdminStatusModal").modal("hide");
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
  const data = { id: rowIdToDelete, user_id: 1 };
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/admin/delete`, {
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
}