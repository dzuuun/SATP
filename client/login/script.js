/** * Elements
 */
const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const messageEl = document.getElementById("message");
const showPasswordBtn = document.getElementById("showPassword");
const forgotPasswordBtn = document.getElementById("forgotPassword");
const eyeIconContainer = document.getElementById("eyeIcon");

// Set footer year immediately
document.getElementById("year").textContent = new Date().getFullYear();

/** * UI Icons (Heroicons SVGs)
 */
const ICONS = {
  eye: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>`,
  eyeSlash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>`,
};

/** * Helper: Update Status Message
 */
const updateStatus = (text = "&nbsp;", colorClass = "") => {
  messageEl.innerHTML = text;
  messageEl.classList.remove("text-red-600", "text-green-600");
  if (colorClass) messageEl.classList.add(colorClass);
};

/** * Event: Password Toggle
 */
showPasswordBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  eyeIconContainer.innerHTML = isHidden ? ICONS.eyeSlash : ICONS.eye;
});

/** * Event: Forgot Password Click
 */
forgotPasswordBtn.addEventListener("click", () => {
  alert("Please visit the MIS Office to reset your password.");
});

/** * Event: Login Submission
 */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Reset UI
  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";
  updateStatus(); // Clear previous messages

  try {
    const res = await fetch(`/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput.value,
        password: passwordInput.value,
      }),
    });

    const response = await res.json();

    if (!response.success) {
      updateStatus(response.message, "text-red-600");
      loginButton.disabled = false;
      loginButton.textContent = "Sign In";
      return;
    }

    // Success UI
    updateStatus(response.message, "text-green-600");

    // Bulk store data
    const { data, user_id } = response;
    const storageData = {
      user_id,
      username: data.username,
      is_student_rater: data.is_student_rater,
      transactionAccess: data.transaction_access,
      maintenanceAccess: data.maintenance_access,
      reportsAccess: data.reports_access,
      usersAccess: data.users_access,
    };

    Object.entries(storageData).forEach(([key, val]) =>
      localStorage.setItem(key, val),
    );

    // Optional legacy calls
    if (typeof getSchoolYear === "function") getSchoolYear();
    if (typeof getSemester === "function") getSemester();

    // Redirect Logic
    setTimeout(() => {
      if ([1, 2].includes(data.is_student_rater)) {
        window.location.href = "../rating/index.html";
      } else if (data.transaction_access == 1) {
        window.location.href = "../transaction/index.html";
      } else {
        window.location.href = "../user/user_management/index.html";
      }
    }, 800);
  } catch (err) {
    updateStatus("Server error. Please try again.", "text-red-600");
    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
  }
});
