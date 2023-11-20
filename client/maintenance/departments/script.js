const baseURL = "http://192.168.118.170:3000";
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
    url: `${baseURL}/api/department`,
    cache: true,
  },
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { width: "10%", data: "department_code" },
    { data: "name" },
    { width: "5%", data: "college_code" },
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

// Get college from API
const getCollege = async () => {
  const collegeList = document.querySelector("#selectCollege");
  const collegeList2 = document.querySelector("#selectCollegeEdit");
  // const collegeList3 = document.querySelector("#selectImportCollege");
  const endpoint = `${baseURL}/api/college/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    collegeList.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
    collegeList2.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
    // collegeList3.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

getCollege();

// post department to API
const formAddDepartment = document.querySelector("#newDepartmentForm");
formAddDepartment.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(formAddDepartment);
  const isActive = document.getElementById("isDepartmentActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/department/add`, {
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
  await fetch(`${baseURL}/api/department/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      document.getElementById("editCode").value = data.code;
      document.getElementById("selectCollegeEdit").value = data.college_id;
      document.getElementById("editName").value = data.name;
      rowIdToUpdate = data.id;
      if (data.is_active == 0) {
        document.getElementById("isDepartmentActiveEdit").checked = false;
      } else {
        document.getElementById("isDepartmentActiveEdit").checked = true;
      }
      $("#editModal").modal("show");
      $(".form-control").selectpicker("refresh");
    });
}
const formEditDepartment = document.querySelector("#editDepartmentForm");
formEditDepartment.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(formEditDepartment);
  const isActive = document.getElementById("isDepartmentActiveEdit").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/department/update`, {
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
  await fetch(`${baseURL}/api/department/delete`, {
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
uploadFileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (confirm("This action cannot be undone.")) {
    $("#importFileModal").modal("hide");
    // $("#spinnerStatusModal").modal("show");
    const file = csvInput.files[0];

    if (file) {
      try {
        const results = await parseCSV(file);

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

            const response = await postData(`${baseURL}/api/college/get`, {
              college_code: rowObject.college_code,
            });
            rowObject["college_id"] = response.data.id;
            data.push(rowObject);
          }
        }

        const failedData = [];
        let counter = 0;

        for (let i = 0; i < data.length; i++) {
          try {
            const response = await postData(
              `${baseURL}/api/department/add`,
              data[i]
            );

            document.getElementById("statusMessage").innerHTML =
              ((i / data.length) * 100).toFixed(0) + "%";
            if (response.success === 0) {
              failedData.push(data[i].code);
            } else {
              counter++;
            }
          } catch (error) {
            console.error(error);
          }
        }

        // Show the failed data in the modal
        if (failedData.length > 0) {
          document.getElementById("totalFailedData").innerHTML =
            `Total: ` + failedData.length;
          const failedDataList = document.getElementById("failedDataList");
          failedDataList.innerHTML = "";

          for (const item of failedData) {
            const listItem = document.createElement("li");
            listItem.textContent = JSON.stringify(item);
            failedDataList.appendChild(listItem);
          }
          $("#failedDataModal").modal("show");
        }

        $("#spinnerStatusModal").modal("hide");
        $("#table").DataTable().ajax.reload();
        setSuccessMessage(
          `${counter} of ${data.length} entries were imported successfully.`
        );
      } catch (error) {
        console.error(error);
      }
    }
  }
});

async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: function (results) {
        resolve(results);
      },
      error: function (error) {
        reject(error);
      },
    });
  });
}

async function postData(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

document.addEventListener("DOMContentLoaded", function () {
  const downloadLink = document.getElementById("downloadLink");

  downloadLink.addEventListener("click", function () {
    const csvContent = "code,name";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "department_template.csv";
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
