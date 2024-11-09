const baseURL = "http://satp.ndmu.edu.ph";
var semester_id;
var school_year_id;
var user = localStorage.getItem("user_id");
var transactionAccess = localStorage.getItem("transactionAccess");
var username = localStorage.getItem("username");
document.getElementById("userName").innerHTML = username;

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../index.html";
}

if (transactionAccess == 0) {
  alert("You don't have permission to access this page. Redirecting...");
  history.back();
}

let table = $("#table").DataTable({
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { width: "1%", data: "username" },
    { width: "10%", data: "student_name" },
    { width: "15%", data: "teachers_name" },
    { width: "2%", data: "subject_code" },
    { width: "2%", data: "college_code" },
    {
      width: "1%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.status
            ? ` <button class='btn bi fs-4 bi-check-circle' style="color: green"></button>`
            : `<i class="bi fs-4 bi-x-circle" style="color: red"></i>`
        }
                </td>`;
      },
    },
  ],
});

const searchData = document.querySelector("#loaddata");
searchData.addEventListener("change", async (event) => {
  semester_id = document.getElementById("loadSemester").value;
  school_year_id = document.getElementById("loadSchoolYear").value;

  if (semester_id !== "" && school_year_id !== "") {
    loadIncludedData();
  }
});

let totalTransactions = document.getElementById("totalTransactions");
let TransactionsAccomplished = document.getElementById(
  "TransactionsAccomplished"
);
let transactionsToAccomplish = document.getElementById(
  "transactionsToAccomplish"
);
function loadIncludedData() {
  loadSpinner();
  $.ajax({
    url: `${baseURL}/api/transaction/all/school_year_id=${school_year_id}&semester_id=${semester_id}`,
    type: "get",
  })
    .done(function (response) {
      totalTransactions.innerHTML = response.count;
      TransactionsAccomplished.innerHTML = response.data.filter(
        (item) => item.status === 1
      ).length;
      transactionsToAccomplish.innerHTML = response.data.filter(
        (item) => item.status === 0
      ).length;
      document.getElementById("generateList").style.display = "inline";
      hideSpinner();
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
  const endpoint = `${baseURL}/api/semester/inuse/active`,
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

let generateList = document.getElementById("generateList");
generateList.addEventListener("click", async (e) => {
  e.preventDefault();
  // console.log(school_year_id, semester_id);
  // localStorage.setItem("transListSchoolYear", school_year_id);
  // localStorage.setItem("transListSemester", semester_id);

  // window.location.href = "unrated/index.html";

  var query = {
    school_year_id: school_year_id,
    semester_id: semester_id,
  };
  await fetch(`${baseURL}/api/transaction/notrated`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  })
    .then((res) => res.json())
    .then((response) => {
      if (response.count === 0) {
        alert("no data found");
        window.location.href = `../index.html`;
      } else {
        const csv = Papa.unparse(response.data);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");

        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute("download", "SATP Unrated Transactions.csv");

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);
        alert("File downloaded.");
      }
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
  window.location.href = "../index.html";
});

document.addEventListener("DOMContentLoaded", function () {
  loadSpinner();

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
