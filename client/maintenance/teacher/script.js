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
    url: `${baseURL}/api/teacher`,
    cache: true,
  },
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { data: "name" },
    { width: "10%", data: "department_code" },
    {
      width: "10%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.is_part_time ? "<span>Yes</span>" : "<span>No</span>"
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
                <button class='btn bi fs-5 bi-pencil' onclick="editTeacherInfo(${row.id})")' title="Edit"></button>
              </div>
            </td> `;
      },
    },
  ],
});

// Get department from API
const getDepartment = async () => {
  const departmentList = document.querySelector("#departmentSelect");
  const departmentList2 = document.querySelector("#editDepartmentSelect");
  const endpoint = `${baseURL}/api/department/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    department = data.data;

  department.forEach((row) => {
    departmentList.innerHTML += `<option data-subtext="${row.department_code}" value="${row.id}">${row.department_code}</option>`;
    departmentList2.innerHTML += `<option data-subtext="${row.department_code}" value="${row.id}">${row.department_code}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

getDepartment();

const formAddTeacher = document.querySelector("#newTeacherForm");
formAddTeacher.addEventListener("submit", (event) => {
  var teacher;
  event.preventDefault();

  const formData = new FormData(formAddTeacher);
  const isPartTime = document.getElementById("isTeacherPartTime").checked;
  if (isPartTime == false) {
    formData.append("is_part_time", "0");
  } else {
    formData.append("is_part_time", "1");
  }
  const isActive = document.getElementById("isTeacherActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);

  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/teacher/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
        // console.log(response.data.insertId);
        teacher = response.data.insertId;
        uploadImage(teacher);
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

async function uploadImage(teacher_id) {
  // console.log(teacher_id);
  const image = imageInput.files[0];
  const imageFormData = new FormData();
  imageFormData.append("image", image);

  await fetch(`${baseURL}/upload`, {
    method: "POST",
    body: imageFormData,
  })
    .then((res) => res.json())
    .then((response) => {
      imageData = {
        teacher_id: teacher_id,
        name: response.fileName,
        path: response.imagePath,
      };

      fetch(`${baseURL}/api/teacher/image/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(imageData),
      })
        .then((res) => res.json())
        .then((response) => {
          if (response.success == 0) {
            setErrorMessage(response.message);
          } else {
            setSuccessMessage(response.message);
          }
        });
    });
}

// clear modal form upon closing
$(".modal").on("hidden.bs.modal", function () {
  $(this).find("form").trigger("reset");
  $(".form-control").selectpicker("refresh");
  $("#imageInput").val("");
  $("#preview").empty();
  $("#preview").css("display", "none");
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
async function editTeacherInfo(id) {
  await fetch(`${baseURL}/api/teacher/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      document.getElementById("updatePreview").src = `/${data.path}`;
      document.getElementById("editGivenName").value = data.givenname;
      document.getElementById("editMiddleName").value = data.middlename;
      document.getElementById("editLastName").value = data.surname;
      document.getElementById("editDepartmentSelect").value =
        data.department_id;
      if (data.is_part_time == 0) {
        document.getElementById("editIsTeacherPartTime").checked = false;
      } else {
        document.getElementById("editIsTeacherPartTime").checked = true;
      }

      rowIdToUpdate = data.id;
      if (data.is_active == 0) {
        document.getElementById("editIsTeacherActive").checked = false;
      } else {
        document.getElementById("editIsTeacherActive").checked = true;
      }
      $("#editTeacherInfoModal").modal("show");
      $(".form-control").selectpicker("refresh");
    });
}
const formEditStudent = document.querySelector("#editTeacherInfoForm");
formEditStudent.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(formEditStudent);
  const isPartTime = document.getElementById("editIsTeacherPartTime").checked;
  if (isPartTime == false) {
    formData.append("is_part_time", "0");
  } else {
    formData.append("is_part_time", "1");
  }
  const isActive = document.getElementById("editIsTeacherActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/teacher/update`, {
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
          $("#editTeacherInfoModal").modal("hide");
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
    await fetch(`${baseURL}/api/teacher/delete`, {
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

document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("imageInput");
  const preview = document.getElementById("preview");

  imageInput.addEventListener("change", function () {
    const file = this.files[0];

    const reader = new FileReader();

    reader.onload = function (e) {
      const img = document.createElement("img");
      img.src = e.target.result;
      preview.innerHTML = "";
      preview.appendChild(img);
      preview.style.display = "flex";
    };

    reader.readAsDataURL(file);
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
