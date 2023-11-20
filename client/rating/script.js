const baseURL = "http://192.168.118.170:3000";
var school_year_id = localStorage.getItem("school_year_id");
var semester_id = localStorage.getItem("semester_id");
var student_id = localStorage.getItem("user_id");
var username = localStorage.getItem("username");
var user = localStorage.getItem("user_id");
var user_admin = localStorage.getItem("is_admin_rater");
var username = localStorage.getItem("username");

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

document.getElementById("userName").innerHTML = username;

let table = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `${baseURL}/api/transaction/student/subjects/school_year_id=${school_year_id}&semester_id=${semester_id}&student_id=${student_id}`,
    cache: true,
  },
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { width: "2%", data: "subject_code" },
    { width: "15%", data: "subject_name" },
    { width: "15%", data: "teachers_name" },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.status
            ? '<i class="bi fs-4 bi-check-circle-fill" style="color: darkgreen"></i>'
            : `<button type="button" class="btn text-white text-nowrap" style="background-color: darkgreen" title="Rate" onclick="rate(${row.id})">Rate</button>`
        }
                </td>`;
      },
    },
  ],
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

async function rate(id) {
  localStorage.setItem("transactionToRate", id);
  window.open("../rate/index.html", "_self");
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
  window.location.href = "../index.html";
});
