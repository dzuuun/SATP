"use strict";

const state = {
  userId: localStorage.getItem("user_id"),
  recordId: localStorage.getItem("transactionToRate"),
  username: localStorage.getItem("username"),
  fullname: localStorage.getItem("fullname"),
  items: [],
  submitting: false,
};

if (!state.userId || !state.recordId) {
  alert("Select a course before starting an assessment.");
  location.href = "../rating/index.html";
}

async function initializeAssessment() {
  showLoading({
    label: "Please wait",
    title: "Preparing assessment",
    message: "Loading the assessment questions...",
  });
  try {
    const [information, itemResponse, ratingAccessResponse] = await Promise.all([
      requestJson(`/api/transaction/${encodeURIComponent(state.recordId)}`),
      requestJson("/api/item/active/rate"),
      requestJson("/api/transaction/rating-access/status"),
    ]);
    if (ratingAccessResponse.data?.enabled === false) {
      throw new Error("Student rating is currently closed.");
    }
    const details = information.data?.[0];
    if (!details) throw new Error("This academic record is not available.");
    if (Number(details.student_id) !== Number(state.userId)) {
      throw new Error("This assessment does not belong to your account.");
    }
    if (Number(details.status) !== 0) {
      throw new Error("This course has already been assessed.");
    }
    state.items = itemResponse.data || [];
    if (!state.items.length)
      throw new Error("No active assessment items are configured.");
    renderDetails(details);
    renderQuestions(state.items);
    updateProgress();
    hideLoading();
  } catch (error) {
    hideLoading();
    showToast(error.message || "Unable to prepare the assessment.");
    setTimeout(() => (location.href = "../rating/index.html"), 1500);
  }
}

function renderDetails(details) {
  document.getElementById("schoolYear").textContent = details.school_year;
  document.getElementById("semester").textContent = details.semester;
  document.getElementById("teacherRatee").textContent = details.teachers_name;
  document.getElementById("subjectCode").textContent = details.subject_code;
  document.getElementById("subjectName").textContent =
    details.subject_name || "";
  document.getElementById("studentRater").textContent = details.student_name;
}

function renderQuestions(items) {
  const groups = Object.groupBy
    ? Object.groupBy(items, (item) => item.category)
    : items.reduce((result, item) => {
        (result[item.category] ||= []).push(item);
        return result;
      }, {});
  document.getElementById("questionGroups").innerHTML = Object.entries(groups)
    .map(
      ([category, categoryItems]) => `
        <section class="category-card">
          <header class="category-heading"><h2>${escapeHtml(category)}</h2><span>${categoryItems.length} items</span></header>
          ${categoryItems.map((item) => questionTemplate(item)).join("")}
        </section>`,
    )
    .join("");
}

function questionTemplate(item) {
  return `<div class="question-row" data-item-id="${Number(item.id)}">
    <span class="question-number">${escapeHtml(item.number)}</span>
    <p class="question-text">${escapeHtml(item.question)}</p>
    <div class="rating-options" role="radiogroup" aria-label="Rate item ${escapeHtml(item.number)}">
      ${[5, 4, 3, 2, 1].map((value) => `<input type="radio" id="item-${item.id}-${value}" name="item-${item.id}" value="${value}" required><label for="item-${item.id}-${value}" title="${value} — ${scaleLabel(value)}" aria-label="${value} — ${scaleLabel(value)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg></label>`).join("")}
    </div>
  </div>`;
}

document
  .getElementById("ratingForm")
  .addEventListener("change", updateProgress);
document
  .getElementById("ratingForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.submitting) return;
    const ratings = collectRatings();
    if (ratings.length !== state.items.length) {
      showToast("Please answer every assessment item.");
      document
        .querySelector(".question-row:not(:has(input:checked))")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (
      !(await satpConfirm(
        "Submit this assessment? Your answers cannot be changed afterward.",
        { title: "Submit assessment", confirmText: "Submit" },
      ))
    )
      return;

    state.submitting = true;
    document.getElementById("submitButton").disabled = true;
    showLoading({
      label: "Submitting assessment",
      title: "Uploading your ratings",
      message: "Your responses are being securely saved...",
      protectNavigation: true,
    });
    try {
      const completion = await requestJson(
        "/api/transaction/submit-assessment",
        {
          method: "POST",
          body: JSON.stringify({
            academic_record_id: state.recordId,
            user_id: state.userId,
            ratings,
            comment: document.getElementById("comment").value.trim() || null,
          }),
        },
      );
      if (!completion.success)
        throw new Error(
          completion.message || "Unable to complete the assessment.",
        );
      hideLoading();
      toggleModal("successModal", true);
    } catch (error) {
      hideLoading();
      showToast(error.message || "Unable to submit the assessment.");
    } finally {
      state.submitting = false;
      document.getElementById("submitButton").disabled = false;
    }
  });

function collectRatings() {
  return state.items.flatMap((item) => {
    const selected = document.querySelector(
      `input[name="item-${item.id}"]:checked`,
    );
    return selected ? [{ item_id: item.id, rate: Number(selected.value) }] : [];
  });
}
function updateProgress() {
  const answered = collectRatings().length;
  const total = state.items.length;
  document.getElementById("progressText").textContent =
    `${answered} of ${total} answered`;
  document.getElementById("progressFill").style.width = total
    ? `${(answered / total) * 100}%`
    : "0";
}
function scaleLabel(value) {
  return ["", "Very rarely", "Sometimes", "Regularly", "Often", "Very often"][
    value
  ];
}

const comment = document.getElementById("comment");
comment.addEventListener("input", () => {
  comment.value = comment.value.replace(
    /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/gu,
    "",
  );
  document.getElementById("commentCount").textContent =
    `${comment.value.length} / 2000`;
});

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.message || `Request failed with status ${response.status}.`);
  return result;
}
function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value ?? "";
  return span.innerHTML;
}
function showLoading({ label, title, message, protectNavigation = false }) {
  const overlay = document.getElementById("loadingOverlay");
  document.getElementById("loadingLabel").textContent = label;
  document.getElementById("loadingTitle").textContent = title;
  document.getElementById("loadingMessage").textContent = message;
  document
    .getElementById("loadingNotice")
    .classList.toggle("invisible", !protectNavigation);
  overlay.classList.remove("invisible");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => overlay.classList.add("opacity-100"));
}
function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  overlay.classList.remove("opacity-100");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  setTimeout(() => overlay.classList.add("invisible"), 250);
}

window.addEventListener("beforeunload", (event) => {
  if (!state.submitting) return;
  event.preventDefault();
  event.returnValue = "";
});
function toggleModal(id, show = true) {
  const modal = document.getElementById(id);
  const card = document.getElementById(`${id}Card`);
  if (show) {
    modal.classList.remove("invisible");
    setTimeout(() => {
      modal.classList.add("opacity-100");
      card?.classList.replace("scale-95", "scale-100");
    }, 10);
  } else {
    modal.classList.remove("opacity-100");
    card?.classList.replace("scale-100", "scale-95");
    setTimeout(() => modal.classList.add("invisible"), 250);
  }
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
function closeRating() {
  location.href = "../rating/index.html";
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
    if (name) name.textContent = state.fullname || state.username || "Student";
    const portalLabel = document.querySelector(".sidebar-brand small");
    if (portalLabel) portalLabel.textContent = "Student portal";
    document.querySelectorAll(".nav-list > li").forEach((item) => {
      item.style.display = item.id === "student-rating-nav" ? "" : "none";
    });
    document
      .querySelector("#student-rating-nav a")
      ?.classList.add("nav-active");
    document.getElementById("signout")?.addEventListener("click", () => {
      localStorage.clear();
      location.href = "../index.html";
    });
  } catch (error) {
    console.error("Sidebar failed:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadSidebar();
  initializeAssessment();
});
