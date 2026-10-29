"use strict";

(() => {
  const get = (id) => document.getElementById(id);
  const setText = (id, text) => {
    if (get(id).textContent !== text) get(id).textContent = text;
  };
  const stages = ["loading", "rendering", "packaging"];
  let clock = null;
  let startedAt = 0;
  let previousFocus = null;
  let previouslyLocked = false;
  let active = false;

  function updateElapsed() {
    const seconds = Math.floor((performance.now() - startedAt) / 1000);
    get("exportElapsed").textContent =
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} elapsed`;
  }

  function update({ stage = "loading", completed = 0, total = 0, percent = 0, teacher = "", course = "" } = {}) {
    const modal = get("loadingModal");
    modal.dataset.stage = stage;
    const stageIndex = stage === "ready" ? stages.length : stages.indexOf(stage);
    modal.querySelectorAll("[data-export-stage]").forEach((step, index) => {
      step.dataset.state = index < stageIndex ? "complete" : index === stageIndex ? "active" : "pending";
      if (index === stageIndex) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });

    const rendering = stage === "rendering";
    const packaging = stage === "packaging";
    const ready = stage === "ready";
    const progress = ready ? 100 : rendering && total ? completed / total * 100 : packaging ? percent : 0;
    const value = Math.max(0, Math.min(100, progress));
    setText("loadingMessage", ready
      ? "Your reports are ready. Starting your download..."
      : rendering ? "Creating a PDF for each course rating."
      : packaging ? "All reports are prepared. Packaging your ZIP file..."
      : "Finding completed ratings for the selected period...");
    get("exportProgressLabel").textContent = ready ? "Ready to download"
      : rendering ? `${completed} of ${total} reports ready`
      : packaging ? "Packaging ZIP" : "Loading ratings";
    get("exportProgressValue").textContent = stage === "loading" ? "Please wait" : `${Math.floor(value)}%`;
    get("exportProgressFill").style.width = `${value}%`;
    const bar = get("exportProgress");
    if (stage === "loading") bar.removeAttribute("aria-valuenow");
    else bar.setAttribute("aria-valuenow", String(Math.floor(value)));
    bar.setAttribute("aria-valuetext", get("exportProgressLabel").textContent);
    get("exportCurrentReport").textContent = rendering
      ? [teacher, course].filter(Boolean).join(" / ")
      : ready ? "Check your browser's downloads for the ZIP file."
      : packaging ? `${total} course report${total === 1 ? "" : "s"} included` : "";
  }

  function open({ message = "Loading report options...", exporting = false, scope = "All teachers", period = "" } = {}) {
    clearInterval(clock);
    clock = null;
    if (!active) {
      previousFocus = document.activeElement;
      previouslyLocked = document.body.classList.contains("overflow-hidden");
    }
    active = true;
    const modal = get("loadingModal");
    modal.dataset.mode = exporting ? "export" : "loading";
    get("loadingTitle").textContent = exporting ? "Exporting rating reports" : "Loading report options";
    get("exportScope").textContent = scope;
    get("exportPeriod").textContent = period;
    update();
    if (!exporting) get("loadingMessage").textContent = message;
    startedAt = performance.now();
    updateElapsed();
    if (exporting) clock = setInterval(updateElapsed, 1000);
    modal.classList.remove("invisible");
    modal.classList.add("opacity-100");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("overflow-hidden");
    get("loadingModalCard").focus({ preventScroll: true });
  }

  function close() {
    if (!active) return;
    active = false;
    clearInterval(clock);
    clock = null;
    const modal = get("loadingModal");
    modal.classList.remove("opacity-100");
    modal.classList.add("invisible");
    modal.setAttribute("aria-hidden", "true");
    if (!previouslyLocked) document.body.classList.remove("overflow-hidden");
    if (previousFocus?.isConnected && !previousFocus.disabled) previousFocus.focus({ preventScroll: true });
  }

  document.addEventListener("keydown", (event) => {
    if (!active || !["Tab", "Escape"].includes(event.key)) return;
    event.preventDefault();
    get("loadingModalCard").focus({ preventScroll: true });
  });
  document.addEventListener("focusin", (event) => {
    if (active && !get("loadingModal").contains(event.target)) get("loadingModalCard").focus({ preventScroll: true });
  });
  window.ratingExportProgress = { open, update, close };
})();
