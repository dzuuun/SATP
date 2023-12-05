const baseURL = "http://satp.ndmu.edu.ph:3000";
var user = localStorage.getItem("user_id");
var user_admin = localStorage.getItem("is_admin_rater");
var currentPassword, newPassword, currentPassword;

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

let submitButton = document.getElementById("submit");

submitButton.addEventListener("click", async (e) => {
  newPassword = document.getElementById("newPassword").value;
  confirmedNewPassword = document.getElementById("confirmNewPassword").value;
  currentPassword = document.getElementById("currentPassword").value;

  e.preventDefault();

  if (newPassword === confirmedNewPassword) {
    checkPassword();
  } else {
    setErrorMessage("New Password doesn't match");
  }
});

function change() {
  var newPassword = document.getElementById("newPassword").value;
  var confirmedNewPassword =
    document.getElementById("confirmNewPassword").value;

  if (newPassword === confirmedNewPassword) {
    document.getElementById("passwordMatchField").innerHTML = "";
  } else {
    document.getElementById("passwordMatchField").innerHTML =
      "Password confirmation doesn't match.";
  }
}

async function checkPassword() {
  await fetch(`${baseURL}/api/login/user/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: user, password: currentPassword }),
  })
    .then((res) => res.json())
    .then((response) => {
      if (response.success == 0) {
        setErrorMessage(response.message);
      } else {
        if (confirm("This action cannot be undone.") == true) {
          updatePassword();
        }
      }
    });
}

async function updatePassword() {
  await fetch(`${baseURL}/api/login/update/password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: user,
      password: confirmedNewPassword,
      user_id: user,
    }),
  })
    .then((res) => res.json())
    .then((response) => {
      if (response.success == 0) {
        setErrorMessage(response.message);
      } else {
        setSuccessMessage(response.message);
        setTimeout(function () {
          history.back();
        }, 1000);
      }
    });
}

let showPassword = document.getElementById("showPassword");

showPassword.addEventListener("click", async (e) => {
  var x = document.getElementsByName("password");
  for (let i = 0; i < x.length; i++) {
    if (x[i].type === "password") {
      x[i].type = "text";
      showPassword.innerHTML = '<i class="bi bi-eye-slash-fill"></i>';
    } else {
      x[i].type = "password";
      showPassword.innerHTML = '<i class="bi bi-eye"></i>';
    }
  }
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
