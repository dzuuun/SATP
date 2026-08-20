(function installSharedUi() {
  "use strict";

  if (window.__satpSharedUi) return;
  window.__satpSharedUi = true;

  let activeConfirmation = null;

  function installConfirmationModal() {
    if (document.getElementById("satp-confirm-modal")) return;
    const style = document.createElement("style");
    style.id = "satp-confirm-modal-style";
    style.textContent = `
      .satp-confirm-modal[hidden] { display: none; }
      .satp-confirm-modal { position: fixed; inset: 0; z-index: 10000; padding: 20px; display: grid; place-items: center; background: rgba(10, 31, 23, .62); backdrop-filter: blur(5px); }
      .satp-confirm-card { width: min(430px, 100%); overflow: hidden; color: var(--ink, #183128); background: #fff; border: 1px solid var(--line, #d8e3dd); border-radius: 18px; box-shadow: 0 24px 70px rgba(7, 35, 24, .28); }
      .satp-confirm-header { padding: 24px 26px 14px; }
      .satp-confirm-eyebrow { margin: 0 0 7px; color: var(--green-800, #087247); font-size: .72rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
      .satp-confirm-title { margin: 0; font: 500 1.7rem/1.15 Georgia, 'Times New Roman', serif; }
      .satp-confirm-message { margin: 0; padding: 0 26px 24px; color: var(--muted, #65736c); font-size: .9rem; line-height: 1.55; overflow-wrap: anywhere; }
      .satp-confirm-actions { padding: 16px 26px; display: flex; justify-content: flex-end; gap: 10px; background: #fafcfb; border-top: 1px solid var(--line, #d8e3dd); }
      .satp-confirm-actions button { min-height: 44px; padding: 0 18px; border-radius: 10px; font: inherit; font-weight: 750; cursor: pointer; }
      .satp-confirm-cancel { color: var(--ink, #183128); background: #fff; border: 1px solid var(--line, #d8e3dd); }
      .satp-confirm-accept { color: #fff; background: var(--green-900, #075c3b); border: 1px solid var(--green-900, #075c3b); }
      .satp-confirm-cancel:focus-visible, .satp-confirm-accept:focus-visible { outline: 3px solid rgba(243, 201, 77, .8); outline-offset: 2px; }
      @media (max-width: 480px) { .satp-confirm-modal { padding: 14px; } .satp-confirm-actions { flex-direction: column-reverse; } .satp-confirm-actions button { width: 100%; } }
    `;
    const modal = document.createElement("div");
    modal.id = "satp-confirm-modal";
    modal.className = "satp-confirm-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "satp-confirm-title");
    modal.setAttribute("aria-describedby", "satp-confirm-message");
    modal.innerHTML = `
      <div class="satp-confirm-card">
        <header class="satp-confirm-header">
          <p class="satp-confirm-eyebrow">Please confirm</p>
          <h2 id="satp-confirm-title" class="satp-confirm-title">Confirm action</h2>
        </header>
        <p id="satp-confirm-message" class="satp-confirm-message"></p>
        <footer class="satp-confirm-actions">
          <button type="button" class="satp-confirm-cancel">Cancel</button>
          <button type="button" class="satp-confirm-accept">Confirm</button>
        </footer>
      </div>`;
    document.head.appendChild(style);
    document.body.appendChild(modal);

    const finish = (confirmed) => {
      if (!activeConfirmation) return;
      const { resolve, previousFocus, previousOverflow } = activeConfirmation;
      activeConfirmation = null;
      modal.hidden = true;
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
      resolve(confirmed);
    };
    modal.querySelector(".satp-confirm-cancel").addEventListener("click", () => finish(false));
    modal.querySelector(".satp-confirm-accept").addEventListener("click", () => finish(true));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) finish(false);
    });
    document.addEventListener("keydown", (event) => {
      if (!modal.hidden && event.key === "Escape") finish(false);
    });
  }

  window.satpConfirm = (message, options = {}) => {
    installConfirmationModal();
    const modal = document.getElementById("satp-confirm-modal");
    if (activeConfirmation) activeConfirmation.resolve(false);
    modal.querySelector(".satp-confirm-title").textContent =
      options.title || "Confirm action";
    modal.querySelector(".satp-confirm-message").textContent = message;
    const accept = modal.querySelector(".satp-confirm-accept");
    accept.textContent = options.confirmText || "Confirm";
    modal.querySelector(".satp-confirm-cancel").textContent =
      options.cancelText || "Cancel";
    const previousOverflow = document.body.style.overflow;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    return new Promise((resolve) => {
      activeConfirmation = {
        resolve,
        previousFocus: document.activeElement,
        previousOverflow,
      };
      requestAnimationFrame(() => accept.focus());
    });
  };

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
    if (
      !(select instanceof HTMLSelectElement) ||
      select.multiple ||
      select.dataset.noSearch === "true" ||
      select.dataset.searchReady === "true" ||
      select.dataset.searchable === "true" ||
      select.closest(".dataTables_length, .search-select, .satp-search-select")
    )
      return;
    select.dataset.searchReady = "true";
    select.dataset.searchable = "true";
    const wrapper = document.createElement("div");
    wrapper.className = "search-select satp-search-select";
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    const trigger = document.createElement("input");
    trigger.type = "text";
    trigger.readOnly = true;
    trigger.autocomplete = "off";
    trigger.className = "search-select-input satp-search-select-trigger";
    const panel = document.createElement("div");
    panel.className = "search-select-list satp-search-select-panel";
    const search = document.createElement("input");
    search.type = "search";
    search.autocomplete = "off";
    search.className = "search-select-search satp-search-select-search";
    search.placeholder = select.dataset.searchPlaceholder || "Search...";
    search.setAttribute("aria-label", search.placeholder);
    const options = document.createElement("div");
    options.className = "search-select-options satp-search-select-options";
    panel.append(search, options);
    wrapper.append(trigger, panel);

    const syncTrigger = () => {
      const selected = select.selectedOptions[0];
      trigger.placeholder =
        select.options[0]?.textContent?.trim() || "Search and select";
      trigger.value = selected?.value
        ? selected.textContent?.trim() || ""
        : "";
      trigger.disabled = select.disabled;
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
        empty.className = "search-select-empty satp-search-select-empty";
        empty.textContent = "No matching options";
        options.appendChild(empty);
        return;
      }
      matches.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `search-select-option satp-search-select-option${option.selected ? " selected" : ""}`;
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
    trigger.addEventListener("keydown", (event) => {
      if (["Enter", " ", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        trigger.click();
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
    }).observe(select, {
      attributes: true,
      attributeFilter: ["disabled"],
      childList: true,
      subtree: true,
    });
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
    if (root.matches?.("select")) selects.push(root);
    root.querySelectorAll?.("select").forEach((select) => selects.push(select));
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
  if (!location.pathname.toLowerCase().includes("gradschool")) {
    installSearchableSelects();
  }
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
          if (!location.pathname.toLowerCase().includes("gradschool")) {
            installSearchableSelects(node);
          }
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
