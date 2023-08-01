const baseURL = "http://localhost:3000";
var semester_id;
var school_year_id;

let table = $("#table").DataTable({
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { width: "1%", data: "username" },
    { width: "5%", data: "student_name" },
    { width: "15%", data: "teachers_name" },
    { width: "2%", data: "subject_code" },
    { width: "1%", data: "school_year" },
    { width: "1%", data: "semester" },
    {
      width: "1%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.status
            ? ` <button class='btn bi fs-4 bi-check-circle' style="color: green" onclick="getRatings(${row.id})" ></button>`
            : `<i class="bi fs-4 bi-x-circle" style="color: red"></i>`
        }
                </td>`;
      },
    },
  ],
});

const searchData = document.querySelector("#loaddata");
searchData.addEventListener("change", (event) => {
  semester_id = document.getElementById("loadSemester").value;
  school_year_id = document.getElementById("loadSchoolYear").value;

  if (semester_id !== "" && school_year_id !== "") {
    loadIncludedData();
  }
});

function loadIncludedData() {
  $.ajax({
    url: `${baseURL}/api/transaction/all/school_year_id=${school_year_id}&semester_id=${semester_id}`,
    type: "get",
  })
    .done(function (response) {
      setSuccessMessage(response.message);
      table.clear().draw();
      table.rows.add(response.data).draw();
    })
    .fail(function (jqXHR, textStatus, errorThrown) {});
}

// Get schoolYear from API
const getSchoolYear = async () => {
  const schoolYearList2 = document.querySelector("#loadSchoolYear");
  const endpoint = `${baseURL}/api/schoolyear/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    schoolYearList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

// Get semester from API
const getSemester = async () => {
  const semesterList2 = document.querySelector("#loadSemester");
  const endpoint = `${baseURL}/api/semester/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    semesterList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

$(document).ready(function () {
  getSchoolYear();
  getSemester();
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