(function installSessionExpiryHandler() {
  "use strict";

  if (window.__satpSessionExpiryHandler) return;
  window.__satpSessionExpiryHandler = true;

  window.satpLogout = () => {
    fetch("/api/login/logout", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {});
  };

  function installHeaderMenuAnimation(root = document) {
    if (!document.getElementById("satp-menu-animation-style")) {
      const style = document.createElement("style");
      style.id = "satp-menu-animation-style";
      style.textContent = `
        .site-header .menu-button svg {
          width: 22px;
          height: 22px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
        }
        .site-header .menu-button .satp-menu-line {
          transform-box: fill-box;
          transform-origin: center;
          transition: transform .24s ease, opacity .16s ease;
        }
        .site-header .menu-button.is-open .satp-menu-line-top {
          transform: translateX(2px);
        }
        .site-header .menu-button.is-open .satp-menu-line-middle {
          transform: scaleX(.7);
        }
        .site-header .menu-button.is-open .satp-menu-line-bottom {
          transform: translateX(-2px);
        }
        @media (prefers-reduced-motion: reduce) {
          .site-header .menu-button .satp-menu-line { transition: none; }
        }
      `;
      document.head.appendChild(style);
    }

    root.querySelectorAll?.(".site-header .menu-button").forEach((button) => {
      if (button.dataset.menuAnimationReady === "true") return;
      button.dataset.menuAnimationReady = "true";
      button.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path class="satp-menu-line satp-menu-line-top" d="M4 7h16" />
          <path class="satp-menu-line satp-menu-line-middle" d="M4 12h16" />
          <path class="satp-menu-line satp-menu-line-bottom" d="M4 17h16" />
        </svg>`;
    });
  }

  function syncHeaderMenuState() {
    const isOpen = document.getElementById("mySidenav")?.style.width === "280px";
    document.querySelectorAll(".site-header .menu-button").forEach((button) => {
      button.classList.toggle("is-open", isOpen);
      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation",
      );
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

  function applySidebarPermissions(root = document) {
    root.querySelectorAll?.("[data-required-access]").forEach((item) => {
      const accessKey = item.dataset.requiredAccess;
      const permitted = Number(localStorage.getItem(accessKey)) === 1;
      item.hidden = !permitted;
      item.setAttribute("aria-hidden", String(!permitted));
    });
  }

  applySidebarPermissions();
  disableHeaderBrandNavigation();
  installHeaderMenuAnimation();
  syncHeaderMenuState();
  document.addEventListener("click", (event) => {
    if (!event.target.closest?.('[onclick*="toggleNav"]')) return;
    requestAnimationFrame(syncHeaderMenuState);
  });
  const sidebarObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        disableHeaderBrandNavigation(node.parentElement || node);
        installHeaderMenuAnimation(node.parentElement || node);
        if (node.matches("[data-required-access]")) {
          applySidebarPermissions(node.parentElement || node);
        } else if (node.querySelector("[data-required-access]")) {
          applySidebarPermissions(node);
        }
      });
    });
  });
  sidebarObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  let promptVisible = false;
  const loginUrl = "/login/index.html?reason=session-expired";

  function isApiRequest(input) {
    try {
      const value =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : String(input?.url || "");
      return new URL(value, window.location.href).pathname.startsWith("/api/");
    } catch {
      return false;
    }
  }

  function showSessionExpiredPrompt() {
    if (promptVisible) return;
    promptVisible = true;
    localStorage.clear();

    const overlay = document.createElement("div");
    overlay.id = "session-expired-prompt";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "session-expired-title");
    overlay.innerHTML = `
      <div class="session-expired-card">
        <span class="session-expired-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 8v4l2.5 1.5M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Z"/></svg>
        </span>
        <p class="session-expired-label">SESSION EXPIRED</p>
        <h2 id="session-expired-title">Please sign in again</h2>
        <p>Your secure session has ended. Sign in again to continue using SATP.</p>
        <button type="button" id="session-expired-login">Go to login</button>
      </div>`;

    const style = document.createElement("style");
    style.textContent = `
      #session-expired-prompt {
        position: fixed; inset: 0; z-index: 2147483647;
        display: grid; place-items: center; padding: 24px;
        background: rgba(20, 38, 31, .72); backdrop-filter: blur(7px);
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #session-expired-prompt .session-expired-card {
        width: min(100%, 410px); padding: 34px; text-align: center;
        color: #17251f; background: #fff; border: 1px solid #dbe5e0;
        border-radius: 20px; box-shadow: 0 24px 70px rgba(7, 41, 29, .28);
      }
      #session-expired-prompt .session-expired-icon {
        width: 58px; height: 58px; margin: 0 auto 18px; display: grid;
        place-items: center; color: #08784e; background: #e8f6ef; border-radius: 50%;
      }
      #session-expired-prompt svg { width: 30px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
      #session-expired-prompt .session-expired-label { margin: 0 0 8px; color: #08784e; font-size: 11px; font-weight: 800; letter-spacing: .14em; }
      #session-expired-prompt h2 { margin: 0 0 10px; font-family: Georgia, serif; font-size: 30px; font-weight: 500; }
      #session-expired-prompt .session-expired-card > p:last-of-type { margin: 0 auto 24px; color: #66736d; font-size: 14px; line-height: 1.6; }
      #session-expired-prompt button {
        width: 100%; min-height: 46px; color: #fff; background: #076b47;
        border: 0; border-radius: 11px; font: inherit; font-size: 14px;
        font-weight: 750; cursor: pointer; box-shadow: 0 8px 20px rgba(7, 107, 71, .2);
      }
      #session-expired-prompt button:hover { background: #055b3c; }
      #session-expired-prompt button:focus-visible { outline: 3px solid rgba(7, 107, 71, .25); outline-offset: 3px; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);
    const loginButton = document.getElementById("session-expired-login");
    loginButton.addEventListener("click", () => window.location.assign(loginUrl));
    loginButton.focus();
  }

  function installDataTableSessionHandler() {
    const dataTable = window.jQuery?.fn?.dataTable;
    if (!dataTable?.ext) return false;

    dataTable.ext.errMode = (settings, _techNote, message) => {
      const status = Number(settings?.jqXHR?.status || 0);
      const ajaxSource =
        typeof settings?.ajax === "string"
          ? settings.ajax
          : settings?.ajax?.url || settings?.sAjaxSource || "";

      if (status === 401 && isApiRequest(ajaxSource)) {
        showSessionExpiredPrompt();
        return;
      }

      window.alert(message || "Unable to load the table data.");
    };
    return true;
  }

  if (!installDataTableSessionHandler()) {
    document.addEventListener("DOMContentLoaded", installDataTableSessionHandler, {
      once: true,
    });
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function guardedFetch(...args) {
    const response = await originalFetch(...args);
    if (response.status === 401 && isApiRequest(args[0])) {
      showSessionExpiredPrompt();
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function guardedOpen(method, url, ...args) {
    this.__satpRequestUrl = url;
    return originalOpen.call(this, method, url, ...args);
  };

  XMLHttpRequest.prototype.send = function guardedSend(...args) {
    this.addEventListener(
      "load",
      () => {
        if (this.status === 401 && isApiRequest(this.__satpRequestUrl)) {
          showSessionExpiredPrompt();
        }
      },
      { once: true },
    );
    return originalSend.apply(this, args);
  };
})();
