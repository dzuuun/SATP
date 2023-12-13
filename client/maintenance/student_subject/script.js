const baseURL = "http://satp.ndmu.edu.ph:3000";
var student_id;
var semester_id;
var school_year_id;
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

let table = $("#table").DataTable({
  columnDefs: [{ className: "dt-center", targets: "_all" }],
  // ordering: false,
  columns: [
    { data: "subject_code" },
    { data: "subject_name" },
    { data: "teacher_name" },
    { data: "schedule_code" },
    { data: "time_start" },
    { data: "time_end" },
    { data: "day" },
    { data: "room" },
    // {
    //   width: "5%",
    //   data: "null",
    //   render: function (data, type, row) {
    //     return `<td class="text-center fw-medium">${
    //       row.is_excluded
    //         ? `<span  style="color: red">Yes</span>`
    //         : "<span>No</span>"
    //     }
    //             </td>`;
    //   },
    // },
    {
      width: "5%",
      data: null,
      render: function (data, type, row) {
        return `<td class="text-center">
                  <div class="text-nowrap">
                    <div class="dropdown">
                      <ul class="dropdown-menu">
                        <li><a class="dropdown-item" onclick="deactivateSubject(${row.id})">Deactivate</a></li>
                      </ul>
                    </div>
                      <button class='btn bi fs-5 bi-pencil' data-bs-toggle="dropdown" title="Manage"></button>
                     <!-- <button class='btn bi fs-5 bi-plus-circle' onclick="generateTransaction(${row.id})" title="Create Transaction"></button> -->
                  </div>
                </td> `;
      },
    },
  ],
});

let tableExcluded = $("#tableExcluded").DataTable({
  columnDefs: [{ className: "dt-center", targets: "_all" }],
  ordering: false,
  columns: [
    { data: "subject_code" },
    { data: "subject_name" },
    { data: "teacher_name" },
    { data: "schedule_code" },
    { data: "time_start" },
    { data: "time_end" },
    { data: "day" },
    { data: "room" },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.is_excluded
            ? `<span  style="color: red">Yes</span>`
            : "<span>No</span>"
        }
                </td>`;
      },
    },
    { data: "reason" },
  ],
});

const searchData = document.querySelector("#loaddata");
searchData.addEventListener("change", async (event) => {
  student_id = document.getElementById("loadStudent").value;
  semester_id = document.getElementById("loadSemester").value;
  school_year_id = document.getElementById("loadSchoolYear").value;

  if (student_id !== "" && semester_id !== "" && school_year_id !== "") {
    loadIncludedData();
    loadExcludedData();
    document.querySelector(".excluded").disabled = false;
  }
});

function loadIncludedData() {
  loadSpinner();
  $.ajax({
    url: `${baseURL}/api/studentsubject/included/student_id=${student_id}&school_year_id=${school_year_id}&semester_id=${semester_id}`,
    type: "get",
  })
    .done(function (response) {
      hideSpinner();
      setSuccessMessage(response.message);
      table.clear().draw();
      table.rows.add(response.data).draw();
    })
    .fail(function (jqXHR, textStatus, errorThrown) {});
}

function loadExcludedData() {
  $.ajax({
    url: `${baseURL}/api/studentsubject/overall/student_id=${student_id}&school_year_id=${school_year_id}&semester_id=${semester_id}`,
    type: "get",
  })
    .done(function (response) {
      tableExcluded.clear().draw();
      tableExcluded.rows.add(response.data).draw();
    })
    .fail(function (jqXHR, textStatus, errorThrown) {});
}

function addNew() {
  document.getElementById("selectStudent").value = student_id;
  document.getElementById("selectSemester").value = semester_id;
  document.getElementById("selectSchoolYear").value = school_year_id;
  $(".form-control").selectpicker("refresh");
  $("#addNewModal").modal("show");
}

// post student subject to API
const formAddStudentSubject = document.querySelector("#newStudentSubjectForm");
formAddStudentSubject.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(formAddStudentSubject);
  const isIncluded = document.getElementById("isIncluded").checked;
  if (isIncluded == true) {
    formData.append("is_excluded", "0");
  } else {
    formData.append("is_excluded", "1");
  }

  formData.append("user_id", user);
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/studentsubject/add`, {
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
          confirmGenerateTransaction(response.id);
          loadExcludedData();
          loadIncludedData();
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

// create transaction function
var rowId;
function generateTransaction(id) {
  rowId = id;
  // $("#transactionModal").modal("show");
}

var body;
async function confirmGenerateTransaction(rowId) {
  await fetch(`${baseURL}/api/studentsubject/` + rowId, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      data = response.data;
      body = {
        school_year_id: data[0].school_year_id,
        semester_id: data[0].semester_id,
        subject_id: data[0].subject_id,
        teacher_id: data[0].teacher_id,
        user_id: user,
        id: data[0].student_id,
      };
    });
  // if (confirm("This action cannot be undone.") == true) {
  await fetch(`${baseURL}/api/transaction/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .then((response) => {
      if (response.success == 0) {
        setErrorMessage(response.message);
        $("#transactionModal").modal("hide");
      } else {
        $("#transactionModal").modal("hide");
        // setSuccessMessage(response.message);
        // loadExcludedData();
        // loadIncludedData();
      }
    });
  // }
}

// update status on the API
var rowIdToDeact;
function deactivateSubject(id) {
  rowIdToDeact = id;
  $("#deactivateModal").modal("show");
}
const formDeactivateSubject = document.querySelector(
  "#deactivateStudentSubjectForm"
);
formDeactivateSubject.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(formDeactivateSubject);

  formData.append("id", rowIdToDeact);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);

  if (confirm("This action cannot be undone.") == true) {
    await fetch(`${baseURL}/api/studentsubject/deactivate`, {
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
          $("#deactivateModal").modal("hide");
          loadIncludedData();
          loadExcludedData();
        }
      });
  }
});

// Get schoolYear from API
const getSchoolYear = async () => {
  const schoolYearList = document.querySelector("#selectSchoolYear");
  const schoolYearList2 = document.querySelector("#loadSchoolYear");
  const endpoint = `${baseURL}/api/schoolyear/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    schoolYearList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    schoolYearList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

// Get semester from API
const getSemester = async () => {
  const semesterList = document.querySelector("#selectSemester");
  const semesterList2 = document.querySelector("#loadSemester");
  const endpoint = `${baseURL}/api/semester/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    semesterList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    semesterList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

// Get subject from API
const getSubject = async () => {
  const subjectList = document.getElementById("selectSubject");
  const endpoint = `${baseURL}/api/subject/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  var optionRow = "";
  rows.forEach((row) => {
    optionRow += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
  });
  subjectList.innerHTML += optionRow;
  $(".form-control").selectpicker("refresh");
};

// Get teacher from API
const getTeacher = async () => {
  const teacherList = document.querySelector("#selectTeacher");
  const endpoint = `${baseURL}/api/teacher/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  var optionRow = "";
  rows.forEach((row) => {
    optionRow += `<option value="${row.id}">${row.name}</option>`;
  });
  teacherList.innerHTML += optionRow;
  $(".form-control").selectpicker("refresh");
};

// Get student from API
const getStudent = async () => {
  const studentList = document.querySelector("#selectStudent");
  const studentList2 = document.querySelector("#loadStudent");
  const endpoint = `${baseURL}/api/student/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  var optionRow = "";
  rows.forEach((row) => {
    optionRow += `<option data-subtext="${row.username}" value="${row.id}">${row.name}</option>`;
  });
  studentList.innerHTML += optionRow;
  studentList2.innerHTML += optionRow;
  $(".form-control").selectpicker("refresh");
};

// Get room from API
const getRoom = async () => {
  const roomList = document.querySelector("#selectRoom");
  const endpoint = `${baseURL}/api/room/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    roomList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

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

            document.getElementById("statusMessage").innerHTML =
              ((i / results.data.length) * 100).toFixed(0) + "%";
            document.getElementById(
              "spinnerMessage"
            ).innerHTML = `Preparing the data. Import will begin soon. Do not refresh the page...`;
            rowObject["user_id"] = user;
            rowObject["is_active"] = 1;
            console.log(rowObject);
            const subject = await postData(`${baseURL}/api/subject/get`, {
              subject_code: rowObject.SubjectCode,
            });
            rowObject["subject_id"] = subject.data.id;
            const room = await postData(`${baseURL}/api/room/get`, {
              room_name: rowObject.RoomCode,
            });
            rowObject["room_id"] = room.data.id;
            const schoolYear = await postData(`${baseURL}/api/schoolyear/get`, {
              school_year: rowObject.SchoolYear,
            });
            rowObject["school_year_id"] = schoolYear.data.id;
            const teacher = await postData(`${baseURL}/api/teacher/get`, {
              givenname: rowObject.TeacherFirstName,
              surname: rowObject.TeacherLastName,
            });
            rowObject["teacher_id"] = teacher.data.id;
            const student = await postData(`${baseURL}/api/student/get`, {
              username: rowObject.StudentID,
            });
            rowObject["student_id"] = student.data.id;
            rowObject["is_excluded"] = 0;
            data.push(rowObject);
            // console.log(data)
          }
        }
        console.log(data);
        const failedData = [];
        let counter = 0;
        for (let i = 0; i < data.length; i++) {
          try {
            const response = await postData(
              `${baseURL}/api/studentsubject/add`,
              data[i]
            );

            document.getElementById("statusMessage").innerHTML =
              ((i / data.length) * 100).toFixed(0) + "%";
            document.getElementById(
              "spinnerMessage"
            ).innerHTML = `Import in progress. Do not refresh the page...`;
            if (response.success === 0) {
              failedData.push(data[i]);
              console.log(data[i]);
              console.log(response);
            } else {
              counter++;
              // console.log(response);
              confirmGenerateTransaction(response.id);
            }
          } catch (error) {
            console.error(error);
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
        }
        $("#spinnerStatusModal").modal("hide");
        // $("#table").DataTable().ajax.reload();
        setSuccessMessage(
          `${counter} of ${data.length} entries were imported successfully.`
        );
      } catch (error) {
        console.error(error);
      }
    }
  }
});

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

document.addEventListener("DOMContentLoaded", function () {
  loadSpinner();
  getRoom();
  getSchoolYear();
  getSemester();
  getTeacher();
  getSubject();
  getStudent();

  window.addEventListener("load", function () {
    hideSpinner();
  });
});

function loadSpinner() {
  document.getElementById("overlay").style.display = "flex";
}

function hideSpinner() {
  document.getElementById("overlay").style.display = "none";
}
