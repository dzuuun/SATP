(function installSharedUi() {
  "use strict";

  if (window.__satpSharedUi) return;
  window.__satpSharedUi = true;

  function disableSelectPlaceholders(root = document) {
    const options = [];
    if (root.matches?.("option")) options.push(root);
    root
      .querySelectorAll?.("select option")
      .forEach((option) => options.push(option));
    options.forEach((option) => {
      const isPrompt = /^(select|choose)\b/i.test(option.textContent.trim());
      if (option.value === "" && isPrompt) option.disabled = true;
    });
  }

  function disableHeaderBrandNavigation(root = document) {
    root.querySelectorAll?.(".header-brand > a").forEach((brand) => {
      brand.removeAttribute("href");
      brand.removeAttribute("aria-label");
      brand.removeAttribute("target");
      brand.removeAttribute("rel");
      brand.setAttribute("tabindex", "-1");
      brand.setAttribute("aria-disabled", "true");
      brand.style.cursor = "default";
      brand.style.pointerEvents = "none";
    });
  }

  function installHeaderMenuAnimation(root = document) {
    if (!document.getElementById("satp-menu-animation-style")) {
      const style = document.createElement("style");
      style.id = "satp-menu-animation-style";
      style.textContent = `
        .site-header .menu-button svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
        .site-header .menu-button .satp-menu-line { transform-box: fill-box; transform-origin: center; transition: transform .24s ease, opacity .16s ease; }
        .site-header .menu-button.is-open .satp-menu-line-top { transform: translateX(2px); }
        .site-header .menu-button.is-open .satp-menu-line-middle { transform: scaleX(.7); }
        .site-header .menu-button.is-open .satp-menu-line-bottom { transform: translateX(-2px); }
        @media (prefers-reduced-motion: reduce) { .site-header .menu-button .satp-menu-line { transition: none; } }
      `;
      document.head.appendChild(style);
    }
    root.querySelectorAll?.(".site-header .menu-button").forEach((button) => {
      if (button.dataset.menuAnimationReady === "true") return;
      button.dataset.menuAnimationReady = "true";
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="satp-menu-line satp-menu-line-top" d="M4 7h16" /><path class="satp-menu-line satp-menu-line-middle" d="M4 12h16" /><path class="satp-menu-line satp-menu-line-bottom" d="M4 17h16" /></svg>`;
    });
  }

  function syncHeaderMenuState() {
    const isOpen =
      document.getElementById("mySidenav")?.style.width === "280px";
    document.querySelectorAll(".site-header .menu-button").forEach((button) => {
      button.classList.toggle("is-open", isOpen);
      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation",
      );
    });
  }

  disableSelectPlaceholders();
  disableHeaderBrandNavigation();
  installHeaderMenuAnimation();
  syncHeaderMenuState();
  document.addEventListener("click", (event) => {
    if (event.target.closest?.('[onclick*="toggleNav"]')) {
      requestAnimationFrame(syncHeaderMenuState);
    }
  });
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          disableSelectPlaceholders(node.parentElement || node);
          disableHeaderBrandNavigation(node.parentElement || node);
          installHeaderMenuAnimation(node.parentElement || node);
        }
      });
    });
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
