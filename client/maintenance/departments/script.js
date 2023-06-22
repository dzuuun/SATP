const baseURL = "http://localhost:3000";

let data = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `${baseURL}/api/department`,
    cache: true, 
  },
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { width: "5%", data: "department_code" },
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
  const endpoint = `${baseURL}/api/college/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    collegeList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    collegeList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $('.form-control').selectpicker('refresh');
};

getCollege(); // Initialize college dropdown

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

  formData.append("user_id", "1"); // get user id from cookie (mock data)
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
      $('.form-control').selectpicker('refresh');
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
  formData.append("user_id", "1"); // get user id from localStorage (mock data)
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
  const data = { id: rowIdToDelete, user_id: 1 };
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
