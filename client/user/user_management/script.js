const baseURL = "http://localhost:4000";
var user = localStorage.getItem("user_id");
var usersAccess = localStorage.getItem("usersAccess");
var username = localStorage.getItem("username");
document.getElementById("userName").innerHTML = username;

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

if (usersAccess == 0) {
  alert("You don't have permission to access this page. Redirecting...");
  history.back();
}

var data = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `${baseURL}/api/user`,
  },
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { width: "10%", data: "username" },
    { data: "Name" },
    { width: "10%", data: "permission" },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.is_temp_pass
            ? '<span  style="color: red">Yes</span>'
            : "<span>No</span>"
        }
                  </td>`;
      },
    },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.is_student_rater ? "<span>Yes</span>" : "<span>No</span>"
        }
                  </td>`;
      },
    },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.is_admin_rater ? "<span>Yes</span>" : "<span>No</span>"
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
              <div class="dropdown">
              <button class='btn bi fs-5 bi-pencil border-0' onclick="edit(${row.id})")'></button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" onclick="edit(${row.id})">Edit User Info</a></li>
                  <li><a class="delete dropdown-item" >Edit User Control</a></li>
                  <li><a class="delete dropdown-item" >Edit User Log In Credentials</a></li>
                </ul>
               <!-- <button class='btn bi fs-5 bi-trash' onclick="deleteRow(${row.id})")' title="Delete"></button> -->
                </div>
              </div>
            </td> `;
      },
    },
  ],
});

function showPassword() {
  var addPassword = document.getElementById("addPassword");
  if (addPassword.type === "password") {
    addPassword.type = "text";
  } else {
    addPassword.type = "password";
  }

  var editPassword = document.getElementById("editPassword");
  if (editPassword.type === "password") {
    editPassword.type = "text";
  } else {
    editPassword.type = "password";
  }
}

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
  $(".form-control").selectpicker("refresh");
}

// Get permission from API
const getCourse = async () => {
  const courseList = document.querySelector("#addCourse");
  const courseList2 = document.querySelector("#editCourse");
  const endpoint = `${baseURL}/api/course`,
    response = await fetch(endpoint),
    data = await response.json(),
    course = data.data;

  course.forEach((row) => {
    courseList.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
    courseList2.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
  });
};

// Get course from API
const getPermission = async () => {
  const permissionList = document.querySelector("#permissionSelect");
  const permissionList2 = document.querySelector("#editPermissionSelect");
  const endpoint = `${baseURL}/api/permission`,
    response = await fetch(endpoint),
    data = await response.json(),
    permission = data.data;

  permission.forEach((row) => {
    permissionList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    permissionList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
};

// post user to API
const formAddUser = document.querySelector("#newUserForm");
formAddUser.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(formAddUser);
  const role = document.querySelector(
    "input[type='radio'][name=role]:checked"
  ).value;
  if (role == "student") {
    formData.append("is_student_rater", "1");
    formData.append("is_admin_rater", "0");
  } else if (role == "admin") {
    formData.append("is_student_rater", "0");
    formData.append("is_admin_rater", "1");
  }

  if (document.getElementById("addCourse").value === "null") {
    formData.delete("course_id");
  }

  if (document.getElementById("addYearLevel").value === "null") {
    formData.delete("year_level");
  }

  const isActive = document.getElementById("isUserActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("is_temp_pass", "1"); // automatic mark password as temporary after generating a password
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/user/add`, {
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
async function edit(id) {
  await fetch(`${baseURL}/api/user/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      rowIdToUpdate = data.id;
      document.getElementById("editGivenName").value = data.givenname;
      document.getElementById("editMiddleName").value = data.middlename;
      document.getElementById("editLastName").value = data.surname;
      document.getElementById("editGender").value = data.gender;
      document.getElementById("editCourse").value = data.course_id;
      document.getElementById("editYearLevel").value = data.year_level;
      document.getElementById("editUsername").value = data.username;
      // document.getElementById("editPassword").value = data.password;
      document.getElementById("editPermissionSelect").value =
        data.permission_id;

      if (data.is_temp_pass == 0) {
        document.getElementById("editTemporaryPassword").checked = false;
      } else {
        document.getElementById("editTemporaryPassword").checked = true;
      }

      if (data.is_student_rater == 0) {
        document.getElementById("admin").checked = true;
      } else {
        document.getElementById("student").checked = true;
      }

      if (data.is_active == 0) {
        document.getElementById("editIsUserActive").checked = false;
      } else {
        document.getElementById("editIsUserActive").checked = true;
      }

      $(".form-control").selectpicker("refresh");
      $("#editModal").modal("show");
    });
}

const formEditUserInfo = document.querySelector("#editUserInfoForm");
formEditUserInfo.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(formEditUserInfo);

  if (document.getElementById("editCourse").value === "null") {
    formData.delete("course_id");
  }

  if (document.getElementById("editYearLevel").value === "null") {
    formData.delete("year_level");
  }

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/user/update/info`, {
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

const formEditUserCredentials = document.querySelector(
  "#editUserCredentialsForm"
);
formEditUserCredentials.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(formEditUserCredentials);

  const isPassTemp = document.getElementById("editTemporaryPassword").checked;
  if (isPassTemp == false) {
    formData.append("is_temp_pass", "0");
  } else {
    formData.append("is_temp_pass", "1");
  }

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/user/update/credentials`, {
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

const formEditPermission = document.querySelector("#editPermissionForm");
formEditPermission.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(formEditPermission);

  const role = document.querySelector(
    "input[type='radio'][name=role]:checked"
  ).value;
  if (role == "student") {
    formData.append("is_student_rater", "1");
    formData.append("is_admin_rater", "0");
  } else if (role == "admin") {
    formData.append("is_student_rater", "0");
    formData.append("is_admin_rater", "1");
  }
  formData.delete("role");

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/user/update/control`, {
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

const formEditStatus = document.querySelector("#editStatusForm");
formEditStatus.addEventListener("submit", async (event) => {
  event.preventDefault();

  const isActive = document.getElementById("editIsUserActive").checked;
  let status;
  if (isActive == false) {
    status = { is_active: 0, id: rowIdToUpdate, user_id: user };
  } else {
    status = { is_active: 1, id: rowIdToUpdate, user_id: user };
  }

  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/user/update/status`, {
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

$(document).ready(function () {
  getCourse();
  getPermission();
});

$("input[name='role']").change(function () {
  if ($(this).val() == "student") {
    $("#course").show();
    $("#addCourse").prop("required", true);
    $("#yearLevel").show();
    $("#addYearLevel").prop("required", true);
  } else {
    $("#course").hide();
    $("#addCourse").prop("required", false);
    $("#yearLevel").hide();
    $("#addYearLevel").prop("required", false);
  }
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
