const baseURL = "http://localhost:3000";

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
                <button class='btn bi fs-5 bi-pencil' dropdown-toggle" type="button" data-bs-toggle="dropdown" title="Edit"></button>
                <div class="dropdown">
                  <ul class="dropdown-menu">
                    <li><a class="dropdown-item" onclick="editStudentInfo(${row.id})")'>Information</a></li>
                    <li><a class="dropdown-item" onclick="editStudentStatus(${row.id})")'>Status</a></li>
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

// Get course from API
const getCourse = async () => {
  const courseList = document.querySelector("#courseSelect");
  const courseList2 = document.querySelector("#editCourseSelect");
  const endpoint = `${baseURL}/api/course/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    course = data.data;

  course.forEach((row) => {
    courseList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    courseList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $('.form-control').selectpicker('refresh');
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
  formData.append("user_id", "1"); // get user id from cookie (mock data)
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
  $('.form-control').selectpicker('refresh');
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
async function editStudentInfo(id) {
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

      rowIdToUpdate = data.id;
      $("#editStudentInfoModal").modal("show");
      $('.form-control').selectpicker('refresh');
    });
}
const formEditStudent = document.querySelector("#editStudentInfoForm");
formEditStudent.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(formEditStudent);

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", "1"); // get user id from localStorage (mock data)
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
          $("#editStudentInfoModal").modal("hide");
          $("#table").DataTable().ajax.reload();
        }
      });
  }
});

// update student status on the API
var rowIdToUpdate;
async function editStudentStatus(id) {
  await fetch(`${baseURL}/api/student/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      rowIdToUpdate = data.id;
      if (data.is_active == 0) {
        document.getElementById("editIsStudentStatusActive").checked = false;
      } else {
        document.getElementById("editIsStudentStatusActive").checked = true;
      }
      $("#editStudentStatusModal").modal("show");
    });
}
const formEditStudentStatus = document.querySelector("#editStudentStatusForm");
formEditStudentStatus.addEventListener("submit", (event) => {
  event.preventDefault();

  const isActive = document.getElementById("editIsStudentStatusActive").checked;
  let status;
  if (isActive == false) {
    status = { is_active: 0, id: rowIdToUpdate, user_id: 1 };
  } else {
    status = { is_active: 1, id: rowIdToUpdate, user_id: 1 };
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
          $("#editStudentStatusModal").modal("hide");
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
