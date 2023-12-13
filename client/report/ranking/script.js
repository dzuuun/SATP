const baseURL = "http://localhost:3000";
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

// Get schoolYear from API
const getSchoolYear = async () => {
  const schoolYearList = document.querySelector("#schoolYear");
  const endpoint = `${baseURL}/api/schoolyear/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    schoolYearList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

// Get semester from API
const getSemester = async () => {
  const semesterList = document.querySelector("#semester");
  const endpoint = `${baseURL}/api/semester/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    semesterList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

const getCollege = async () => {
  const collegeList = document.querySelector("#college");
  const endpoint = `${baseURL}/api/college/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    collegeList.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

const getDepartment = async () => {
  const departmentList = document.querySelector("#department");
  const endpoint = `${baseURL}/api/department/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;
  rows.forEach((row) => {
    departmentList.innerHTML += `<option data-subtext="${row.department_code}" value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

getSemester();
getSchoolYear();
getCollege();
getDepartment();

$("#ranking").change(function () {
  if ($(this).val() == "collegiate") {
    $("#collegeSelect").show();
    $("#college").prop("required", true);
  } else {
    $("#collegeSelect").hide();
    $("#college").prop("required", false);
  }

  if ($(this).val() == "departmental") {
    $("#departmentSelect").show();
    $("#department").prop("required", true);
  } else {
    $("#departmentSelect").hide();
    $("#department").prop("required", false);
  }
});

let generateReport = document.querySelector("#generateReportForm");
generateReport.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(generateReport);
  const data = Object.fromEntries(formData);
  localStorage.setItem("genReportSchoolYear", data.school_year);
  localStorage.setItem("genReportSemester", data.semester);
  localStorage.setItem("genReportTeachingStatus", data.teaching_status);

  switch (data.rankingReport) {
    case "overall":
      window.location.href = "overall/index.html";
      break;
    case "collegiate":
      localStorage.setItem("genReportCollege", data.college);
      window.location.href = "collegiate/index.html";
      break;
    case "departmental":
      localStorage.setItem("genReportDepartment", data.department);
      window.location.href = "departmental/index.html";
      break;
  }
});

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
  localStorage.clear();
  window.location.href = "../../index.html";
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
