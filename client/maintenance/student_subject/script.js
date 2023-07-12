const baseURL = "http://localhost:3000";
var student_id;
var semester_id;
var school_year_id;

let table = $("#table").DataTable({
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
searchData.addEventListener("change", (event) => {
  student_id = document.getElementById("loadStudent").value;
  semester_id = document.getElementById("loadSemester").value;
  school_year_id = document.getElementById("loadSchoolYear").value;

  if (student_id !== "" && semester_id !== "" && school_year_id !== "") {
    loadIncludedData();
    loadExcludedData();
    document.querySelector('.excluded').disabled = false;
  }
});

function loadIncludedData() {
  $.ajax({
    url: `${baseURL}/api/studentsubject/included/student_id=${student_id}&school_year_id=${school_year_id}&semester_id=${semester_id}`,
    type: "get",
  })
    .done(function (response) {
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
formAddStudentSubject.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(formAddStudentSubject);
  const isIncluded = document.getElementById("isIncluded").checked;
  if (isIncluded == true) {
    formData.append("is_excluded", "0");
  } else {
    formData.append("is_excluded", "1");
  }

  formData.append("user_id", "1"); // get user id from cookie (mock data)
  const data = Object.fromEntries(formData);
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/studentsubject/add`, {
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
          generateTransaction(response.id);
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
  $("#transactionModal").modal("show");
}

var body;
async function confirmGenerateTransaction() {
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
        user_id: 1, // GET FROM LOCAL STORAGE, ID OF THE SIGNED IN USER
        id: data[0].student_id,
      };
    });
  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/transaction/add`, {
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
          setSuccessMessage(response.message);
        }
      });
  }
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
formDeactivateSubject.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(formDeactivateSubject);

  formData.append("id", rowIdToDeact);
  formData.append("user_id", "1"); // get user id from cookie (mock data)
  const data = Object.fromEntries(formData);

  if (confirm("This action cannot be undone.") == true) {
    fetch(`${baseURL}/api/studentsubject/deactivate`, {
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

// function showReason(id) {
//   fetch(`${baseURL}/api/studentsubject/excluded/` + id, {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(body),
//   })
//     .then((res) => res.json())
//     .then((response) => {
//       if (response.success == 0) {
//         setErrorMessage(response.message);
//       } else {
//         $("#reasonModal").modal("show");
//         console.log(response);
//         document.getElementById("reason").innerHTML = response.data[0].reason;
//       }
//     });
// }

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
  const subjectList = document.querySelector("#selectSubject");
  const endpoint = `${baseURL}/api/subject/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    subjectList.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

// Get teacher from API
const getTeacher = async () => {
  const teacherList = document.querySelector("#selectTeacher");
  const endpoint = `${baseURL}/api/teacher/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    teacherList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
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

  rows.forEach((row) => {
    studentList.innerHTML += `<option data-subtext="${row.username}" value="${row.id}">${row.name}</option>`;
    studentList2.innerHTML += `<option data-subtext="${row.username}" value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

// Get student from API
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

$(document).ready(function () {
  getRoom();
  getSchoolYear();
  getSemester();
  getSubject();
  getTeacher();
  getStudent();
});
