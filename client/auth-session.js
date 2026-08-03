(function installSessionExpiryHandler() {
  "use strict";

  if (window.__satpSessionExpiryHandler) return;
  window.__satpSessionExpiryHandler = true;

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
