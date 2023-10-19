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
    url: `${baseURL}/api/student`,
    cache: true,
  },
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { width: "5%", data: "username" },
    { data: "name" },
    { width: "10%", data: "course" },
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
                <button class='btn bi fs-5 bi-pencil'" type="button" onclick="edit(${row.id})" title="Edit"></button>
              </div>
            </td> `;
      },
    },
  ],
  order: [[1, "asc"]],
});

function showPassword() {
  var x = document.getElementById("addPassword");
  if (x.type === "password") {
    x.type = "text";
  } else {
    x.type = "password";
  }
}

// Get course from API
const getCourse = async () => {
  const courseList = document.querySelector("#courseSelect");
  const courseList2 = document.querySelector("#editCourseSelect");
  const courseList3 = document.querySelector("#selectImportCourse");
  const endpoint = `${baseURL}/api/course/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    course = data.data;

  course.forEach((row) => {
    courseList.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
    courseList2.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
    courseList3.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

getCourse();

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
  return result;
}

// post school year to API
const formAddStudent = document.querySelector("#newStudentForm");
formAddStudent.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(formAddStudent);
  const isActive = document.getElementById("isStudentActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }
  formData.append("permission_id", "12");
  formData.append("is_temp_pass", "0");
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/student/add`, {
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
async function edit(id) {
  await fetch(`${baseURL}/api/student/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      document.getElementById("editGivenName").value = data.givenname;
      document.getElementById("editMiddleName").value = data.middlename;
      document.getElementById("editLastName").value = data.surname;
      document.getElementById("editGenderSelect").value = data.gender;
      document.getElementById("editCourseSelect").value = data.course_id;
      document.getElementById("editYearLevel").value = data.year_level;
      if (data.is_active == 0) {
        document.getElementById("editIsStudentStatusActive").checked = false;
      } else {
        document.getElementById("editIsStudentStatusActive").checked = true;
      }
      rowIdToUpdate = data.id;
      $("#editModal").modal("show");
      $(".form-control").selectpicker("refresh");
    });
}
const formEditStudent = document.querySelector("#editStudentInfoForm");
formEditStudent.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(formEditStudent);

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/student/update/info`, {
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

const formEditStudentStatus = document.querySelector("#editStudentStatusForm");
formEditStudentStatus.addEventListener("submit", (event) => {
  event.preventDefault();

  const isActive = document.getElementById("editIsStudentStatusActive").checked;
  let status;
  if (isActive == false) {
    status = { is_active: 0, id: rowIdToUpdate, user_id: user };
  } else {
    status = { is_active: 1, id: rowIdToUpdate, user_id: user };
  }

  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/student/update/status`, {
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
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/student/delete`, {
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

const csvInput = document.getElementById("csvInput");
const uploadFileForm = document.querySelector("#uploadFileForm");
uploadFileForm.addEventListener("submit", (event) => {
  var course = document.getElementById("selectImportCourse").value;
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
            // rowObject["course_id"] = course; // do not use
            rowObject["permission_id"] = 5; // 5 for deployment, 12 on test db
            rowObject["is_temp_pass"] = 1;
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
    await fetch(`${baseURL}/api/student/add`, {
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
    const csvContent =
      "username,password,surname,givenname,middlename,year_level,gender";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "student_template.csv";
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

$(document).ready(function () {
  console.log("ready!");
  // $("#spinnerStatusModal").modal("show");
});
