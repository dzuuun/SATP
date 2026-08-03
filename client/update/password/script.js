"use strict";

const state = {
  userId: localStorage.getItem("user_id"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
};

if (!state.userId) {
  alert("Log in to continue.");
  location.href = "../../index.html";
}

const form = document.getElementById("passwordForm");
const currentPassword = document.getElementById("currentPassword");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmNewPassword");
const matchField = document.getElementById("passwordMatchField");
const submitButton = document.getElementById("submit");
const submitLabel = document.getElementById("submitLabel");

function checkMatch() {
  if (!confirmPassword.value) {
    matchField.textContent = "";
    matchField.classList.remove("match");
    return false;
  }
  const matches = newPassword.value === confirmPassword.value;
  matchField.textContent = matches
    ? "Passwords match"
    : "Passwords do not match";
  matchField.classList.toggle("match", matches);
  return matches;
}

newPassword.addEventListener("input", checkMatch);
confirmPassword.addEventListener("input", checkMatch);
document.getElementById("showPassword").addEventListener("change", (event) => {
  [currentPassword, newPassword, confirmPassword].forEach((input) => {
    input.type = event.target.checked ? "text" : "password";
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (!checkMatch()) return showToast("The new passwords do not match.");
  if (currentPassword.value === newPassword.value)
    return showToast("Choose a password different from your current password.");
  if (!confirm("Update your password?")) return;

  setSubmitting(true);
  try {
    const response = await requestJson("/api/login/update/password", {
      method: "PUT",
      body: JSON.stringify({
        current_password: currentPassword.value,
        password: newPassword.value,
      }),
    });
    showToast(response.message);
    if (!response.success) return;
    form.reset();
    matchField.textContent = "";
    setTimeout(() => history.back(), 900);
  } catch {
    showToast("Unable to update the password.");
  } finally {
    setSubmitting(false);
  }
});

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  return response.json();
}
function setSubmitting(active) {
  submitButton.disabled = active;
  submitLabel.textContent = active ? "Updating..." : "Update password";
}
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "category-toast";
  toast.innerHTML =
    '<span class="toast-symbol"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><span></span>';
  toast.lastElementChild.textContent = message;
  document.getElementById("toast-container").replaceChildren(toast);
  setTimeout(() => toast.remove(), 4000);
}
function toggleNav() {
  const side = document.getElementById("mySidenav");
  if (!side) return;
  const open = side.style.width === "280px";
  side.style.width = open ? "0" : "280px";
  document.getElementById("main").style.marginLeft =
    innerWidth <= 760 || open ? "0" : "280px";
}
async function loadSidebar() {
  try {
    const container = document.getElementById("sidebar-container");
    container.innerHTML = await (await fetch("/sidebar.html")).text();
    const name = document.getElementById("sidebar-fullname");
    if (name) name.textContent = state.fullname || state.username || "User";
    document.querySelectorAll(".menu-toggle").forEach((toggle) =>
      toggle.addEventListener("click", function () {
        const menu = document.getElementById(this.dataset.target);
        menu?.classList.toggle("hidden");
        const hidden = menu?.classList.contains("hidden");
        this.setAttribute("aria-expanded", String(!hidden));
        const arrow = this.querySelector(".chevron");
        if (arrow)
          arrow.style.transform = hidden ? "rotate(0deg)" : "rotate(180deg)";
      }),
    );
    document
      .getElementById("update-password-action")
      ?.classList.add("profile-current");
    document.getElementById("signout")?.addEventListener("click", () => {
      localStorage.clear();
      location.href = "../../index.html";
    });
  } catch (error) {
    console.error("Sidebar failed:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
});
