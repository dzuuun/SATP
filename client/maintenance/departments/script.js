const baseURL = "http://localhost:3000";
const table = document.querySelector("#table");

var array = [];
var data = [];
const pageSize = 10;
let curPage = 1;

async function renderTable(page = 1) {
  await getData();
  if (page == 1) {
    prevButton.style.visibility = "hidden";
  } else {
    prevButton.style.visibility = "visible";
  }

  if (page == numPages()) {
    nextButton.style.visibility = "hidden";
  } else {
    nextButton.style.visibility = "visible";
  }

  if (data.success == 0) {
    const banner = document.querySelector("#banner");
    banner.innerHTML = "<p>No record found.</p>";
  } else {
    // create html
    table.innerHTML = "";
    array
      .filter((row, index) => {
        let start = (curPage - 1) * pageSize;
        let end = curPage * pageSize;

        if (index >= start && index < end) return true;
      })
      .forEach((row) => {
        table.innerHTML += `<tr>
      <td class="fw-medium">${row.department_code}</td>
      <td class="fw-medium">${row.name}</td>
      <td class="text-center fw-medium">${row.college_code}</td>
      <td class="text-center fw-medium">${
        row.is_active
          ? "<span>Yes</span>"
          : '<span style="color: red">No</span>'
      }
      </td>
        <td  class="text-center">
          <div class="dropdown">
            <button class='btn bi bi-three-dots-vertical border-0' data-bs-toggle="dropdown" )'></button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" onclick="editFormCall(${
                  row.id
                })">Edit</a></li>
                <li><a class="dropdown-item" onclick=deleteRow(${
                  row.id
                })>Delete</a></li>
              </ul>
          </div>
        </td> 
          </tr>`;
      });
    document.getElementById(
      "pageNumber"
    ).innerHTML = `Page ${curPage} of ${numPages()}`;
    if (array.length == 0) {
      document.getElementById(
        "numberOfEntries"
      ).innerHTML = `${array.length} total entries`;
    } else if (array.length == 1) {
      document.getElementById(
        "numberOfEntries"
      ).innerHTML = `${array.length} total entry`;
    } else {
      document.getElementById(
        "numberOfEntries"
      ).innerHTML = `${array.length} total entries`;
    }
  }
}

//Fetch Data from API
async function getData() {
  const response = await fetch(`${baseURL}/api/department`);
  data = await response.json();
  array = data.data;
}

function previousPage() {
  if (curPage > 1) {
    curPage--;
    renderTable(curPage);
  }
}

function nextPage() {
  if (curPage * pageSize < array.length) {
    curPage++;
    renderTable(curPage);
  }
}

function numPages() {
  return Math.ceil(array.length / pageSize);
}

// Get college from API
const getCollege = async () => {
  const collegeList = document.querySelector("#selectCollege");
  const collegeList2 = document.querySelector("#selectCollegeEdit");
  const endpoint = `${baseURL}/api/college`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    collegeList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    collegeList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
};

// NEED UPDATE
// search table
function searchTable() {
  // Declare variables
  var input, filter, table, tr, td, i, txtValue;
  input = document.getElementById("search");
  filter = input.value.toUpperCase();
  table = document.getElementById("dataTable");
  tr = table.getElementsByTagName("tr");

  for (var i = 0; i < tr.length; i++) {
    var all_columns = tr[i].getElementsByTagName("td");
    for (j = 0; j < all_columns.length; j++) {
      if (all_columns[j]) {
        var column_value =
          all_columns[j].textContent || all_columns[j].innerText;
        column_value = column_value.toUpperCase();
        if (column_value.toUpperCase().indexOf(filter) > -1) {
          tr[i].style.display = ""; // show
          break;
        } else {
          tr[i].style.display = "none"; // hide
        }
      }
    }
  }
}

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

        renderTable(curPage);
      }
    });
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

        renderTable(curPage);
      }
    });
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

        renderTable(curPage);
      }
    });
}

// initialize datas on page load
renderTable();
getCollege();
