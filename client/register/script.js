const baseURL = "http://localhost:3000";


let showPassword = document.getElementById("showPassword");
showPassword.addEventListener("click", async (e) => {
  var x = document.getElementById("createPassword");
  if (x.type === "password") {
    x.type = "text";
    showPassword.innerHTML = '<i class="bi bi-eye-slash-fill"></i>';
  } else {
    x.type = "password";
    showPassword.innerHTML = '<i class="bi bi-eye"></i>';
  }
});

let showConfirmPassword = document.getElementById("showConfirmPassword");
showConfirmPassword.addEventListener("click", async (e) => {
  var x = document.getElementById("confirmPassword");
  if (x.type === "password") {
    x.type = "text";
    showConfirmPassword.innerHTML = '<i class="bi bi-eye-slash-fill"></i>';
  } else {
    x.type = "password";
    showConfirmPassword.innerHTML = '<i class="bi bi-eye"></i>';
  }
});


const getCourse = async () => {
  const courseList = document.querySelector("#course");
  const endpoint = `${baseURL}/api/course`,
    response = await fetch(endpoint),
    data = await response.json(),
    course = data.data;

  course.forEach((row) => {
    courseList.innerHTML += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
  });
  $(".form-control").selectpicker("refresh");
};
getCourse();

var permission_id;
async function raterId() {
  const endpoint = `${baseURL}/api/permission/rater/id`,
    response = await fetch(endpoint),
    data = await response.json();
  permission_id = data.rater_id;
}
raterId();

const registerForm = document.querySelector("#registerForm");
registerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(registerForm);
  var createPassword = document.getElementById("createPassword").value;
  var confirmPassword = document.getElementById("confirmPassword").value;

  formData.append("permission_id", permission_id);
  formData.append("is_student_rater", 1);
  formData.append("is_admin_rater", 0);

  formData.append("is_active", "1");
  formData.append("is_temp_pass", "1");

  const data = Object.fromEntries(formData);
  if (createPassword === confirmPassword) {
    document.getElementById("passwordMatchField").innerHTML = "";
    console.log(data);
    if (confirm("This action cannot be undone.") == true) {
      fetch(`${baseURL}/api/login/register`, {
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
            setTimeout(function () {
                window.location.href = "../index.html";
            }, 1000);
          }
        });
    }
  } else {
    document.getElementById("passwordMatchField").innerHTML =
      "--- Doesn't match.";
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