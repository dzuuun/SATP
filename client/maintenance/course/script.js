const baseURL = "http://localhost:3000";
var user = localStorage.getItem("user_id");
var user_admin = localStorage.getItem("is_admin_rater");
var username = localStorage.getItem("username");
document.getElementById("userName").innerHTML = username;

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

if (user_admin == 0) {
  alert("You don't have permission to access this page. Redirecting...");
  history.back();
}

let data = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `${baseURL}/api/course`,
    cache: true,
  },
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { width: "10%", data: "code" },
    { data: "name" },
    { width: "5%", data: "department_code" },
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

// Get department from API
const getDepartment = async () => {
  const departmentList = document.querySelector("#selectDepartment");
  const departmentList2 = document.querySelector("#selectDepartmentEdit");
  const departmentList3 = document.querySelector("#selectImportDepartment");
  const endpoint = `${baseURL}/api/department/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    departmentList.innerHTML += `<option data-subtext="${row.department_code}" value="${row.id}">${row.name}</option>`;
    departmentList2.innerHTML += `<option data-subtext="${row.department_code}" value="${row.id}">${row.name}</option>`;
    departmentList3.innerHTML += `<option data-subtext="${row.department_code}" value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

getDepartment();

// post course to API
const formAddCourse = document.querySelector("#newCourseForm");
formAddCourse.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(formAddCourse);
  const isActive = document.getElementById("isCourseActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/course/add`, {
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

// update data on the API
var rowIdToUpdate;
async function editFormCall(id) {
  await fetch(`${baseURL}/api/course/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      document.getElementById("editCode").value = data.code;
      document.getElementById("selectDepartmentEdit").value =
        data.department_id;
      document.getElementById("editName").value = data.name;
      rowIdToUpdate = data.id;
      if (data.is_active == 0) {
        document.getElementById("isCourseActiveEdit").checked = false;
      } else {
        document.getElementById("isCourseActiveEdit").checked = true;
      }
      $("#editModal").modal("show");
      $(".form-control").selectpicker("refresh");
    });
}
const formEditCourse = document.querySelector("#editCourseForm");
formEditCourse.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(formEditCourse);
  const isActive = document.getElementById("isCourseActiveEdit").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/course/update`, {
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
  await fetch(`${baseURL}/api/course/delete`, {
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

const csvInput = document.getElementById("csvInput");

const uploadFileForm = document.querySelector("#uploadFileForm");
uploadFileForm.addEventListener("submit", (event) => {
  var department = document.getElementById("selectImportDepartment").value;
  event.preventDefault();
  const file = csvInput.files[0];
  if (file) {
    Papa.parse(file, {
      complete: function (results) {
        const headers = results.data[0];
        const data = [];

        for (let i = 1; i < results.data.length; i++) {
          const values = results.data[i];
          if (
            values.length === headers.length &&
            values.some((value) => value.trim() !== "")
          ) {
            const rowObject = {};
            for (let j = 0; j < headers.length; j++) {
              rowObject[headers[j]] = values[j];
            }
            rowObject["user_id"] = user;
            rowObject["is_active"] = 1;
            rowObject["department_id"] = department;
            data.push(rowObject);
          }
        }

        if (confirm("This action cannot be undone.") == true) {
          uploadData(data);
        }
      },
    });
  }
});

async function uploadData(data) {
  let counter = 0;
  for (let i = 0; i < data.length; i++) {
    await fetch(`${baseURL}/api/course/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data[i]),
    })
      .then((res) => res.json())
      .then((response) => {
        $("#importFileModal").modal("hide");
        $("#spinnerStatusModal").modal("show");
        document.getElementById("statusMessage").innerHTML =
          ((i / data.length) * 100).toFixed(0) + "%";
        if (response.success == 0) {
        } else {
          counter++;
        }
      });
  }
  $("#spinnerStatusModal").modal("hide");
  $("#table").DataTable().ajax.reload();
  setSuccessMessage(
    `${counter} of ${data.length} entries was imported successfully.`
  );
}

document.addEventListener("DOMContentLoaded", function () {
  const downloadLink = document.getElementById("downloadLink");

  downloadLink.addEventListener("click", function () {
    const csvContent = "code,name";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "course_template.csv";
    a.click();

    URL.revokeObjectURL(url);
  });
});

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
  localStorage.clear();
  window.location.href = "../../index.html";
});
