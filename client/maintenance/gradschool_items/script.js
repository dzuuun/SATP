const baseURL = "http://localhost:4000";
var user = localStorage.getItem("user_id");
var maintenanceAccess = localStorage.getItem("maintenanceAccess");
var username = localStorage.getItem("username");
document.getElementById("userName").innerHTML = username;

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

if (maintenanceAccess == 0) {
  alert("You don't have permission to access this page. Redirecting...");
  history.back();
}

let data = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `${baseURL}/api/gradschool/item`,
    cache: true,
  },
  ordering: false,
  paging: false,
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { width: "5%", data: "number" },
    { data: "question" },
    {
      width: "7%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.star_rating
            ? "<span>Star</span>"
            : '<span>Essay</span>'
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
                <button class='btn bi fs-5 bi-pencil' onclick="editFormCall(${row.id})")' title="Edit"></button>
              </div>
            </td> `;
      },
    },
  ],
});


// post item to API
const formAddItem = document.querySelector("#newItemForm");
formAddItem.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(formAddItem);
  const isStarRating = document.getElementById("isQuestionStarRating").checked;
  if (isStarRating == false) {
    formData.append("star_rating", "0");
  } else {
    formData.append("star_rating", "1");
  }
  const isActive = document.getElementById("isQuestionActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/gradschool/item/add`, {
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
  await fetch(`${baseURL}/api/gradschool/item/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      document.getElementById("itemNumberEditForm").value = data.number;
      document.getElementById("itemQuestionEdit").value = data.question;
      rowIdToUpdate = data.id;
      if (data.star_rating == 0) {
        document.getElementById("isQuestionStarRatingEdit").checked = false;
      } else {
        document.getElementById("isQuestionStarRatingEdit").checked = true;
      }
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
formEditItem.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(formEditItem);

  const isStarRating = document.getElementById("isQuestionStarRatingEdit").checked;
  if (isStarRating == false) {
    formData.append("star_rating", "0");
  } else {
    formData.append("star_rating", "1");
  }

  const isActive = document.getElementById("isQuestionActiveEdit").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  console.log(data)
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/gradschool/item/update`, {
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
    await fetch(`${baseURL}/api/gradschool/item/delete`, {
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
  event.preventDefault();
  var category = document.getElementById("selectImportCategory").value;

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
            rowObject["category_id"] = category;
            data.push(rowObject);
          }
        }

        if (confirm("This action cannot be undone.") == true) {
          for (let i = 0; i < data.length; i++) {
            fetch(`${baseURL}/api/gradschool/item/add`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data[i]),
            })
              .then((res) => res.json())
              .then((response) => {
                if (response.success == 0) {
                  setErrorMessage(response.message);
                } else {
                  $("#table").DataTable().ajax.reload();
                }
              });
            $("#importFileModal").modal("hide");
            setSuccessMessage(
              `${data.length} entries were imported successfully.`
            );
          }
        }
      },
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const downloadLink = document.getElementById("downloadLink");

  downloadLink.addEventListener("click", function () {
    const csvContent = "number,question";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "item_template.csv";
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
