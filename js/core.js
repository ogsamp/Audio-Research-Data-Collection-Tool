/*!
 * V301 Enterprise Research Platform
 * Version: 301.0.2A-HOTFIX
 * File: js/core.js
 */
(function (window, document) {
"use strict";

const Core = {
  version: "301.0.2A-HOTFIX",
  state: {
    currentModule: "dashboard",
    theme: localStorage.getItem("v301.theme") || "light",
    initialized: false
  },

  init() {
    try {
      this.cache();
      this.bind();
      this.applyTheme(this.state.theme);
      const initial = location.hash.replace("#", "") || "dashboard";
      this.loadModule(initial, false);
      this.state.initialized = true;
      console.info("V301 Core initialized:", this.version);
    } catch (error) {
      console.error("V301 Core initialization failed:", error);
      this.showFatalError(error);
    } finally {
      this.hideLoader();
    }
  },

  cache() {
    this.ui = {
      sidebar: document.getElementById("sideBar"),
      menuButton: document.getElementById("menuButton"),
      navItems: Array.from(document.querySelectorAll(".navItem")),
      moduleTitle: document.getElementById("moduleTitle"),
      moduleDescription: document.getElementById("moduleDescription"),
      workspace: document.getElementById("workspaceContent"),
      loading: document.getElementById("loadingScreen"),
      themeButton: document.getElementById("themeButton"),
      logoutButton: document.getElementById("logoutButton"),
      globalSearch: document.getElementById("globalSearch"),
      networkState: document.getElementById("networkState"),
      offlineBanner: document.getElementById("offlineBanner")
    };
  },

  bind() {
    this.ui.menuButton?.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-open");
    });

    this.ui.navItems.forEach((button) => {
      button.addEventListener("click", () => {
        this.loadModule(button.dataset.module || "dashboard");
        document.body.classList.remove("sidebar-open");
      });
    });

    this.ui.themeButton?.addEventListener("click", () => this.toggleTheme());

    this.ui.logoutButton?.addEventListener("click", () => {
      this.toast("Logout will be connected in the authentication module.", "info");
    });

    this.ui.globalSearch?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const query = event.target.value.trim();
        this.toast(query ? `Search: ${query}` : "Enter a search term.", "info");
      }
    });

    window.addEventListener("hashchange", () => {
      this.loadModule(location.hash.replace("#", "") || "dashboard", false);
    });

    window.addEventListener("online", () => this.updateNetwork(true));
    window.addEventListener("offline", () => this.updateNetwork(false));
    this.updateNetwork(navigator.onLine);

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === "/") {
        event.preventDefault();
        this.ui.globalSearch?.focus();
      }
      if (event.key === "Escape") {
        document.body.classList.remove("sidebar-open");
      }
    });
  },

  loadModule(name, updateHash = true) {
    const safeName = String(name || "dashboard").replace(/[^a-z0-9-]/gi, "");
    this.state.currentModule = safeName;

    this.ui.navItems.forEach((item) => item.classList.remove("active"));
    const active = this.ui.navItems.find((item) => item.dataset.module === safeName);
    active?.classList.add("active");

    if (updateHash && location.hash !== `#${safeName}`) {
      history.pushState(null, "", `#${safeName}`);
    }

    const title = safeName.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

    if (this.ui.moduleTitle) this.ui.moduleTitle.textContent = title;
    if (this.ui.moduleDescription) {
      this.ui.moduleDescription.textContent = `Enterprise module: ${title}`;
    }

    if (this.ui.workspace) {
      this.ui.workspace.innerHTML = `
        <div class="placeholderCard">
          <h3>${this.escapeHTML(title)}</h3>
          <p>The ${this.escapeHTML(title)} module is ready for the next implementation stage.</p>
        </div>`;
    }
  },

  applyTheme(theme) {
    const selected = theme === "dark" ? "dark" : "light";
    document.body.classList.toggle("dark", selected === "dark");
    this.state.theme = selected;
    localStorage.setItem("v301.theme", selected);
  },

  toggleTheme() {
    this.applyTheme(this.state.theme === "dark" ? "light" : "dark");
  },

  updateNetwork(isOnline) {
    if (this.ui.networkState) this.ui.networkState.textContent = isOnline ? "Online" : "Offline";
    this.ui.offlineBanner?.classList.toggle("hidden", isOnline);
  },

  hideLoader() {
    const loader = document.getElementById("loadingScreen");
    if (!loader) return;
    loader.style.opacity = "0";
    loader.style.pointerEvents = "none";
    setTimeout(() => loader.remove(), 300);
  },

  toast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  },

  showFatalError(error) {
    const boundary = document.getElementById("errorBoundary");
    if (boundary) {
      boundary.hidden = false;
      const paragraph = boundary.querySelector("p");
      if (paragraph) paragraph.textContent = `Startup error: ${error.message || error}`;
    }
  },

  escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }
};

window.V301Core = Core;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Core.init(), { once: true });
} else {
  Core.init();
}

/* Emergency fail-safe: never leave the application trapped behind the loader. */
window.setTimeout(() => {
  const loader = document.getElementById("loadingScreen");
  if (loader) {
    loader.style.display = "none";
    console.warn("V301 loader removed by fail-safe.");
  }
}, 4000);

})(window, document);
