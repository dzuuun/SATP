const baseURL = "http://localhost:4000";
var user = localStorage.getItem("user_id");
var reportsAccess = localStorage.getItem("reportsAccess");
var username = localStorage.getItem("username");

document.getElementById("userName").innerHTML = username;

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

if (reportsAccess == 0) {
  alert("You don't have permission to access this page. Redirecting...");
  history.back();
}

// Get schoolYear from API
const getSchoolYear = async () => {
  const schoolYearList = document.querySelector("#schoolYear");
  const endpoint = `${baseURL}/api/schoolyear/inuse/active`,
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
  const endpoint = `${baseURL}/api/semester/inuse/active`,
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

const getTeacher = async () => {
  const teacherList = document.querySelector("#teacher");
  const endpoint = `${baseURL}/api/teacher/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    teacherList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};

getSemester();
getSchoolYear();
getCollege();
getDepartment();
getTeacher();

$("#rating").change(function () {
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

  if ($(this).val() == "individual" || $(this).val() == "institutional") {
    $("#teacherSelect").show();
    $("#teacher").prop("required", true);
    $("#subjectSelect").show();
    $("#subject").prop("required", true);
  } else {
    $("#teacherSelect").hide();
    $("#teacher").prop("required", false);
    $("#subjectSelect").hide();
    $("#subject").prop("required", false);
  }
});

let generateReport = document.querySelector("#generateReportForm");
generateReport.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(generateReport);
  const data = Object.fromEntries(formData);

  localStorage.setItem("genReportSchoolYear", data.school_year);
  localStorage.setItem("genReportSemester", data.semester);
  localStorage.setItem("genReportteacher", data.teacher);
  localStorage.setItem("genReportSubject", data.subject);

  switch (data.ratingReport) {
    case "institutional":
      console.log("institutional");
      // for (let i = 0; i < subjectsArray.length; i++) {
      //   let subject = encodeURIComponent(subjectsArray[i]);
      //   setTimeout(() => {
      //   window.open(`institutional/index.html?subject=${subject}`, "_blank");
      //   }, i * 500);
      // }
    
      window.location.href = "institutional/index.html";
      break;
    case "collegiate":
      console.log("collegiate");
      localStorage.setItem("genReportCollege", data.college);
      window.location.href = "collegiate/index.html";
      break;
    case "departmental":
      console.log("departmental");
      localStorage.setItem("genReportDepartment", data.department);
      window.location.href = "departmental/index.html";
      break;
    case "individual":
      console.log("individual");
      window.location.href = "individual/index.html";
    
      // for (let i = 0; i < subjectsArray.length; i++) {
      //   let subject = encodeURIComponent(subjectsArray[i]);
      //   setTimeout(() => {
      //   window.open(`individual/index.html?subject=${subject}`, "_blank");
      //   }, i * 500);
      // }
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

let subjectsArray = [];
let subjectList = document.getElementById("subjectList");

// Get the dropdowns and add event listeners
const teacherDropdown = document.querySelector("#teacher");
const schoolYearDropdown = document.querySelector("#schoolYear");
const semesterDropdown = document.querySelector("#semester");

// const updateSubjects = async () => {
//   // Get values from all dropdowns
//   const query = {
//     school_year_id: schoolYearDropdown.value,
//     semester_id: semesterDropdown.value,
//     teacher_id: teacherDropdown.value,
//   };

//   // Show subject dropdown if subjects are available
//   document.getElementById("subject").style.display = "block";

//   // Fetch subjects based on selected values
//   await fetch(`${baseURL}/api/report/rating/teacher/subjects`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(query),
//   })
//     .then((res) => res.json())
//     .then((response) => {
//       rows = response.data;
//       subjectsArray = [];
//       subjectList.innerHTML = "";
//       document.getElementById("genReportButton").disabled = false;

//       // Add subjects to the list
//       response.data.forEach((row) => {
//         subjectsArray.push(row.subject_id); // Store subject IDs

//         let li = document.createElement("li");
//         li.innerHTML = `<strong>${row.subject_name}</strong> <small class="text-muted">(${row.subject_code})</small>`;
//         li.classList.add("list-group-item"); // Bootstrap styling (optional)
//         subjectList.appendChild(li);
//       });

//       // If no subjects are found, show a message
//       if (response.data.length === 0) {
//         document.getElementById("genReportButton").disabled = true;
//         let li = document.createElement("li");
//         li.textContent = "No subjects available";
//         li.classList.add("list-group-item", "text-muted", "text-center");
//         subjectList.appendChild(li);
//       }

//       $(".form-control").selectpicker("refresh");
//     });
// };

// // Add event listeners for each dropdown to trigger subject update
// teacherDropdown.addEventListener("change", updateSubjects);
// schoolYearDropdown.addEventListener("change", updateSubjects);
// semesterDropdown.addEventListener("change", updateSubjects);

// // Call updateSubjects on initial load to populate the list if needed
// updateSubjects();


const searchData = document.querySelector("#teacher");
searchData.addEventListener("change", async () => {
  document.getElementById("subject").innerHTML = ``;
  var query = {
    school_year_id: document.getElementById("schoolYear").value,
    semester_id: document.getElementById("semester").value,
    teacher_id: document.getElementById("teacher").value,
    subject_id: document.getElementById("subject").value,
  };

  await fetch(`${baseURL}/api/report/rating/teacher/subjects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  })
    .then((res) => res.json())
    .then((response) => {
      rows = response.data;
      response.data.forEach((row) => {
        document.getElementById(
          "subject"
        ).innerHTML += `<option data-subtext="${row.subject_code}" value="${row.subject_id}">${row.subject_name}</option>`;
      });
      $(".form-control").selectpicker("refresh");
    });
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
