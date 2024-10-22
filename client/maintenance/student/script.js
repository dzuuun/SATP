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
  // const courseList3 = document.querySelector("#selectImportCourse");
  const endpoint = `${baseURL}/api/course/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    course = data.data;

  course.forEach((row) => {
    courseList.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
    courseList2.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
    // courseList3.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
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
formAddStudent.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(formAddStudent);
  const isActive = document.getElementById("isStudentActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }
  formData.append("permission_id", "5");
  formData.append("is_temp_pass", "0");
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/student/add`, {
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
formEditStudent.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(formEditStudent);

  formData.append("id", rowIdToUpdate);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/student/update/info`, {
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
formEditStudentStatus.addEventListener("submit", async (event) => {
  event.preventDefault();

  const isActive = document.getElementById("editIsStudentStatusActive").checked;
  let status;
  if (isActive == false) {
    status = { is_active: 0, id: rowIdToUpdate, user_id: user };
  } else {
    status = { is_active: 1, id: rowIdToUpdate, user_id: user };
  }

  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/student/update/status`, {
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
uploadFileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (confirm("This action cannot be undone.")) {
    $("#importFileModal").modal("hide");
    $("#spinnerStatusModal").modal("show");
    const file = csvInput.files[0];

    if (file) {
      try {
        const results = await parseCSV(file);

        const headers = results.data[0];
        const data = [];
        const failedData = []; // To store failed rows

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
            rowObject["permission_id"] = 5;
            rowObject["is_temp_pass"] = 1;

            document.getElementById("statusMessage").innerHTML =
              ((i / results.data.length) * 100).toFixed(0) + "%";

            console.log(((i / results.data.length) * 100).toFixed(0) + "%");
            document.getElementById(
              "spinnerMessage"
            ).innerHTML = `Preparing the data. Import will begin soon. Do not refresh the page...`;

            try {
              // Fetch course_id from API
              const response = await postData(`${baseURL}/api/course/get`, {
                course_code: rowObject.course_code,
              });
              if (!response.data || !response.data.id) {
                throw new Error("Course not found");
              }
              rowObject["course_id"] = response.data.id;

              // Add row to data if everything is valid
              data.push(rowObject);
            } catch (error) {
              console.error("Failed to process row:", error);
              failedData.push({ ...rowObject, error: error.message }); // Add row to failed data with error message
              continue; // Skip to the next iteration if this one fails
            }
          }
        }

        let counter = 0;
        for (let i = 0; i < data.length; i++) {
          try {
            const response = await postData(`${baseURL}/api/student/add`, data[i]);

            document.getElementById("statusMessage").innerHTML =
              ((i / data.length) * 100).toFixed(0) + "%";
            document.getElementById(
              "spinnerMessage"
            ).innerHTML = `Import in progress. Do not refresh the page...`;

            if (response.success === 0) {
              failedData.push(data[i]); // Capture failed row on error
            } else {
              counter++;
            }
          } catch (error) {
            console.error(error);
            failedData.push(data[i]); // Capture failed row on error
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

          // Optionally, export failed rows to CSV
          exportFailedDataToCSV(failedData);
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

// Function to export failed rows to CSV
function exportFailedDataToCSV(failedData) {
  const csvHeaders = Object.keys(failedData[0]);
  const csvRows = [
    csvHeaders.join(","), // Header row
    ...failedData.map(row =>
      csvHeaders.map(header => `"${row[header] || ''}"`).join(",")
    )
  ].join("\n");

  // Create a Blob from the CSV data
  const csvBlob = new Blob([csvRows], { type: "text/csv" });

  // Create a link element to download the CSV file
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(csvBlob);
  downloadLink.download = "failed_data.csv";

  // Append the link to the body, trigger click, and remove the link
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}


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
