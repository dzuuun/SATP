
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
    url: `/api/teacher`,
    cache: true,
  },
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { data: "name" },
    { width: "10%", data: "department_code" },
    {
      width: "15%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.is_part_time === 0
            ? "<span>Full Time</span>"
            : row.is_part_time === 1
            ? "<span>Part Time</span>"
            : row.is_part_time === 2
            ? "<span>NTPO & Admin</span>"
            : ""
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
  const endpoint = `/api/department/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    department = data.data;

  department.forEach((row) => {
    departmentList.innerHTML += `<option data-subtext="${row.department_code}" value="${row.id}">${row.name}</option>`;
    departmentList2.innerHTML += `<option data-subtext="${row.department_code}" value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

getDepartment();

const formAddTeacher = document.querySelector("#newTeacherForm");
formAddTeacher.addEventListener("submit", async (event) => {
  var teacher;
  event.preventDefault();

  const formData = new FormData(formAddTeacher);
  // const isPartTime = document.getElementById("isTeacherPartTime").checked;
  // if (isPartTime == false) {
  //   formData.append("is_part_time", "0");
  // } else {
  //   formData.append("is_part_time", "1");
  // }
  const isActive = document.getElementById("isTeacherActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);

  if (confirm("This action cannot be undone.") == true) {
    await fetch(`/api/teacher/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
        // teacher = response.data.insertId;
        // uploadImage(teacher);
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

      fetch(`/api/teacher/image/upload`, {
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
  await fetch(`/api/teacher/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;

      // document.getElementById("updatePreview").src = `/${data.path}`;
      document.getElementById("editGivenName").value = data.givenname;
      document.getElementById("editMiddleName").value = data.middlename;
      document.getElementById("editLastName").value = data.surname;
      document.getElementById("editDepartmentSelect").value =
        data.department_id;
      // if (data.is_part_time == 0) {
      //   document.getElementById("editIsTeacherPartTime").checked = false;
      // } else {
      //   document.getElementById("editIsTeacherPartTime").checked = true;
      // }
      document.getElementById("editTeachingStatusSelect").value =
        data.is_part_time;

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
formEditStudent.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(formEditStudent);
  // const isPartTime = document.getElementById("editIsTeacherPartTime").checked;
  // if (isPartTime == false) {
  //   formData.append("is_part_time", "0");
  // } else {
  //   formData.append("is_part_time", "1");
  // }
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
    await fetch(`/api/teacher/update`, {
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
    await fetch(`/api/teacher/delete`, {
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

// document.addEventListener("DOMContentLoaded", function () {
//   const imageInput = document.getElementById("imageInput");
//   const preview = document.getElementById("preview");

//   imageInput.addEventListener("change", function () {
//     const file = this.files[0];

//     const reader = new FileReader();

//     reader.onload = function (e) {
//       const img = document.createElement("img");
//       img.src = e.target.result;
//       preview.innerHTML = "";
//       preview.appendChild(img);
//       preview.style.display = "flex";
//     };

//     reader.readAsDataURL(file);
//   });
// });

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

            document.getElementById("statusMessage").innerHTML =
              ((i / results.data.length) * 100).toFixed(0) + "%";
            document.getElementById(
              "spinnerMessage"
            ).innerHTML = `Preparing the data. Import will begin soon. Do not refresh the page...`;

            try {
              // Fetch department_id from API
              const response = await postData(`/api/department/get`, {
                department_code: rowObject.department_code,
              });
              if (!response.data || !response.data.id) {
                throw new Error("Department not found");
              }
              rowObject["department_id"] = response.data.id;

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
            const response = await postData(`/api/teacher/add`, data[i]);

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
    const csvContent = "surname,givenname,middlename,department_code,is_part_time";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "teacher_template.csv";
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
