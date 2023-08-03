const baseURL = "http://localhost:3000";
var user = sessionStorage.getItem("user_id");
var user_admin = sessionStorage.getItem("is_admin_rater");

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

if (user_admin == 0) {
  alert("You don't have permission to access this page. Redirecting...");
  window.location.href = "../../rating/index.html";
}

let data = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `${baseURL}/api/item`,
    cache: true,
  },
  ordering: false,
  paging: false,
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { data: "category" },
    { width: "5%", data: "number" },
    { data: "question" },
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

// Get category from API
const getCategory = async () => {
  const categoryList = document.querySelector("#categorySelect");
  const categoryList2 = document.querySelector("#categorySelectEdit");
  const endpoint = `${baseURL}/api/category/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    category = data.data;

  category.forEach((row) => {
    categoryList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    categoryList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

getCategory();

// post item to API
const formAddItem = document.querySelector("#newItemForm");
formAddItem.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(formAddItem);
  const isActive = document.getElementById("isQuestionActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/item/add`, {
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

function initializeTable() {
  table1.innerHTML = '<td colspan="5"> <strong>TEACHER</strong> </td>';
  table2.innerHTML =
    '<td colspan="5"> <strong>TEACHING PROCEDURES</strong> </td>';
  table3.innerHTML = '<td colspan="5"> <strong>STUDENTS</strong> </td>';
  table4.innerHTML = '<td colspan="5"> <strong>METHODOLOGY</strong> </td>';
  table5.innerHTML =
    '<td colspan="5"> <strong>GENERAL OBSERVATION</strong> </td>';
}

// update data on the API
var rowIdToUpdate;
async function editFormCall(id) {
  await fetch(`${baseURL}/api/item/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      document.getElementById("itemNumberEditForm").value = data.number;
      document.getElementById("categorySelectEdit").value = data.category_id;
      document.getElementById("itemQuestionEdit").value = data.question;
      rowIdToUpdate = data.id;
      if (data.is_active == 0) {
        document.getElementById("isQuestionActiveEdit").checked = false;
      } else {
        document.getElementById("isQuestionActiveEdit").checked = true;
      }
      $("#editModal").modal("show");
      $(".form-control").selectpicker("refresh");
    });
}
const formEditItem = document.querySelector("#editItemForm");
formEditItem.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(formEditItem);

  const isActive = document.getElementById("isQuestionActiveEdit").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/item/update`, {
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
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/item/delete`, {
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

function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
  document.getElementById("main").style.marginLeft = "250px";
  nav = true;
}

var nav = false;

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.getElementById("main").style.marginLeft = "0";
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
