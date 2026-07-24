(function (window, document) {
  "use strict";

  const Core = {
    state: {
      currentModule: "dashboard",
      theme: localStorage.getItem("v301.theme") || "light"
    },

    init() {
      this.cache();
      this.bind();
      this.applyTheme(this.state.theme);
      this.updateNetwork();
    },

    cache() {
      this.ui = {
        app: document.getElementById("application"),
        loader: document.getElementById("loadingScreen"),
        menuButton: document.getElementById("menuButton"),
        themeButton: document.getElementById("themeButton"),
        logoutButton: document.getElementById("logoutButton"),
        globalSearch: document.getElementById("globalSearch"),
        navItems: Array.from(document.querySelectorAll(".nav-item")),
        moduleTitle: document.getElementById("moduleTitle"),
        moduleDescription: document.getElementById("moduleDescription"),
        workspaceContent: document.getElementById("workspaceContent"),
        primaryAction: document.getElementById("primaryAction"),
        networkState: document.getElementById("networkState"),
        footerNetwork: document.getElementById("footerNetwork"),
        toastContainer: document.getElementById("toastContainer")
      };
    },

    bind() {
      this.ui.menuButton.addEventListener("click", () => {
        document.body.classList.toggle("sidebar-open");
      });

      this.ui.themeButton.addEventListener("click", () => {
        this.applyTheme(this.state.theme === "dark" ? "light" : "dark");
      });

      this.ui.logoutButton.addEventListener("click", () => {
        this.toast("Authentication will be added in a later module.", "info");
      });

      this.ui.globalSearch.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          const query = event.target.value.trim();
          this.toast(query ? "Search requested: " + query : "Enter a search term.", "info");
        }
      });

      this.ui.navItems.forEach(item => {
        item.addEventListener("click", () => {
          const moduleName = item.dataset.module || "dashboard";
          window.V301App.loadModule(moduleName);
          document.body.classList.remove("sidebar-open");
        });
      });

      window.addEventListener("online", () => this.updateNetwork());
      window.addEventListener("offline", () => this.updateNetwork());
    },

    applyTheme(theme) {
      const safeTheme = theme === "dark" ? "dark" : "light";
      document.body.classList.toggle("dark", safeTheme === "dark");
      this.state.theme = safeTheme;
      localStorage.setItem("v301.theme", safeTheme);
    },

    updateNetwork() {
      const online = navigator.onLine;
      this.ui.networkState.textContent = online ? "Online" : "Offline";
      this.ui.footerNetwork.textContent = "Network: " + (online ? "online" : "offline");
    },

    showApplication() {
      this.ui.app.hidden = false;
      this.ui.loader.style.opacity = "0";
      setTimeout(() => this.ui.loader.remove(), 260);
    },

    toast(message, type) {
      const toast = document.createElement("div");
      toast.className = "toast toast-" + (type || "info");
      toast.textContent = message;
      this.ui.toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  window.V301Core = Core;
})(window, document);
