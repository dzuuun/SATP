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
    const brands = [];
    if (root.matches?.(".header-brand > a")) brands.push(root);
    root.querySelectorAll?.(".header-brand > a").forEach((brand) => brands.push(brand));
    brands.forEach((brand) => {
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

  function installSearchableSelect(select) {
    if (!(select instanceof HTMLSelectElement) || select.dataset.searchReady === "true") return;
    select.dataset.searchReady = "true";
    const wrapper = document.createElement("div");
    wrapper.className = "satp-search-select";
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "satp-search-select-trigger";
    const panel = document.createElement("div");
    panel.className = "satp-search-select-panel";
    const search = document.createElement("input");
    search.type = "search";
    search.className = "satp-search-select-search";
    search.placeholder = select.dataset.searchPlaceholder || "Search...";
    search.setAttribute("aria-label", search.placeholder);
    const options = document.createElement("div");
    options.className = "satp-search-select-options";
    panel.append(search, options);
    wrapper.append(trigger, panel);

    const syncTrigger = () => {
      const selected = select.selectedOptions[0];
      trigger.textContent = selected?.textContent?.trim() || "Select an option";
      trigger.classList.toggle("is-placeholder", !selected?.value);
    };
    const render = () => {
      const query = search.value.trim().toLowerCase();
      const matches = [...select.options].filter((option) =>
        option.value && !option.disabled && !option.hidden &&
        (!query || option.textContent.toLowerCase().includes(query)),
      );
      options.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "satp-search-select-empty";
        empty.textContent = "No matching programs";
        options.appendChild(empty);
        return;
      }
      matches.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `satp-search-select-option${option.selected ? " selected" : ""}`;
        button.textContent = option.textContent;
        button.addEventListener("click", () => {
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          wrapper.classList.remove("open");
        });
        options.appendChild(button);
      });
    };
    trigger.addEventListener("click", () => {
      document.querySelectorAll(".satp-search-select.open").forEach((item) => {
        if (item !== wrapper) item.classList.remove("open");
      });
      wrapper.classList.toggle("open");
      if (wrapper.classList.contains("open")) {
        search.value = "";
        render();
        search.focus();
      }
    });
    search.addEventListener("input", render);
    select.addEventListener("change", () => {
      syncTrigger();
      render();
    });
    new MutationObserver(() => {
      syncTrigger();
      render();
    }).observe(select, { childList: true, subtree: true });
    syncTrigger();
    render();
  }

  function installSearchableSelects(root = document) {
    if (!document.getElementById("satp-search-select-style")) {
      const style = document.createElement("style");
      style.id = "satp-search-select-style";
      style.textContent = `
        .satp-search-select { width: 100%; position: relative; }
        .satp-search-select > select { width: 1px !important; height: 1px !important; min-height: 1px !important; position: absolute !important; opacity: 0; pointer-events: none; }
        .satp-search-select-trigger { width: 100%; min-height: 44px; padding: 0 38px 0 13px; color: var(--ink, #183128); background: linear-gradient(45deg, transparent 50%, #718078 50%) calc(100% - 17px) 19px/5px 5px no-repeat, linear-gradient(135deg, #718078 50%, transparent 50%) calc(100% - 12px) 19px/5px 5px no-repeat, #fff; border: 1px solid var(--line, #d8e3dd); border-radius: 9px; text-align: left; cursor: pointer; }
        .satp-search-select-trigger.is-placeholder { color: var(--muted, #718078); }
        .satp-search-select-trigger:focus, .satp-search-select-search:focus { outline: 0; border-color: var(--green-800, #087247); box-shadow: 0 0 0 3px rgba(8,114,71,.11); }
        .satp-search-select-panel { display: none; padding: 7px; position: absolute; inset: calc(100% + 5px) 0 auto; z-index: 300; background: #fff; border: 1px solid var(--line, #d8e3dd); border-radius: 10px; box-shadow: 0 14px 35px rgba(20,48,35,.16); }
        .satp-search-select.open .satp-search-select-panel { display: block; }
        .satp-search-select-search { width: 100%; min-height: 39px; margin: 0 0 6px; padding: 0 10px; border: 1px solid var(--line, #d8e3dd); border-radius: 7px; }
        .satp-search-select-options { max-height: 220px; display: grid; overflow-y: auto; }
        .satp-search-select-option { padding: 9px 10px; color: var(--ink, #183128); background: transparent; border: 0; border-radius: 7px; text-align: left; cursor: pointer; }
        .satp-search-select-option:hover, .satp-search-select-option.selected { background: var(--green-100, #e9f6ef); }
        .satp-search-select-empty { margin: 0; padding: 10px; color: var(--muted, #718078); text-align: center; }
      `;
      document.head.appendChild(style);
    }
    const selects = [];
    if (root.matches?.("select[data-searchable-select]")) selects.push(root);
    root.querySelectorAll?.("select[data-searchable-select]").forEach((select) => selects.push(select));
    selects.forEach(installSearchableSelect);
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
    const buttons = [];
    if (root.matches?.(".site-header .menu-button")) buttons.push(root);
    root.querySelectorAll?.(".site-header .menu-button").forEach((button) => buttons.push(button));
    buttons.forEach((button) => {
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
  installSearchableSelects();
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
          disableSelectPlaceholders(node);
          disableHeaderBrandNavigation(node);
          installHeaderMenuAnimation(node);
          installSearchableSelects(node);
        }
      });
    });
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest?.(".satp-search-select")) {
      document.querySelectorAll(".satp-search-select.open").forEach((item) => item.classList.remove("open"));
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
