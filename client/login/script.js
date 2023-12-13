const baseURL = "http://localhost:3000";
var schoolyear, semester;

let username = document.getElementById("username");
let password = document.getElementById("password");
let loginButton = document.querySelector("#loginForm");
// let signupButton = document.getElementById("signup");

// signupButton.addEventListener("click", () => {
//   window.location.href = "http://localhost:5000/register";
// });
let forgotPass = document.getElementById("forgot-pass");
forgotPass.addEventListener("click", () => {
  alert("Visit MIS Office for password reset.");
});

loginButton.addEventListener("submit", async (e) => {
  e.preventDefault();
  let data = {
    username: username.value,
    password: password.value,
  };
  await fetch(`${baseURL}/api/login`, {
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

        localStorage.setItem("user_id", response.user_id);
        localStorage.setItem("username", response.data.username);
        localStorage.setItem("is_admin_rater", response.data.is_admin_rater);
        getSchoolYear();
        getSemester();

        setTimeout(function () {
          if (response.data.is_student_rater === 1) {
            window.location.href = "../rating/index.html";
          } else {
            window.location.href = "../user/user_management/index.html";
          }
        }, 1000);
      }
    });
});

let showPassword = document.getElementById("showPassword");
showPassword.addEventListener("click", async (e) => {
  var x = document.getElementById("password");
  if (x.type === "password") {
    x.type = "text";
    showPassword.innerHTML = '<i class="bi bi-eye-slash-fill"></i>';
  } else {
    x.type = "password";
    showPassword.innerHTML = '<i class="bi bi-eye"></i>';
  }
});

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

async function getSchoolYear() {
  await fetch(`${baseURL}/api/schoolyear/all/active`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((response) => {
      if (response.success == 0) {
        setErrorMessage(response.message);
      } else {
        localStorage.setItem("schoolyear", response.data[0].name);
        localStorage.setItem("school_year_id", response.data[0].id);
      }
    });
}

async function getSemester() {
  await fetch(`${baseURL}/api/semester/all/active`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((response) => {
      if (response.success == 0) {
        setErrorMessage(response.message);
      } else {
        localStorage.setItem("semester", response.data[0].name);
        localStorage.setItem("semester_id", response.data[0].id);
      }
    });
}
