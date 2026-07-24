(function (window, document) {
  "use strict";

  const moduleMeta = {
    dashboard: {
      title: "Dashboard",
      description: "Enterprise research management overview.",
      action: "New Project"
    },
    projects: {
      title: "Research Projects",
      description: "Create, manage, publish and archive research projects.",
      action: "New Project"
    },
    questionnaires: {
      title: "Questionnaire Builder",
      description: "Build structured questionnaires and audio research instruments.",
      action: "New Questionnaire"
    },
    respondents: {
      title: "Respondents",
      description: "Manage respondents and field interview records.",
      action: "Add Respondent"
    },
    analytics: {
      title: "Analytics",
      description: "Review completion, audio, GPS and response statistics.",
      action: "Refresh"
    },
    reports: {
      title: "Reports",
      description: "Prepare project, fieldwork and research intelligence reports.",
      action: "Generate Report"
    },
    settings: {
      title: "Settings",
      description: "Configure storage, synchronization, language and security.",
      action: "Save Settings"
    }
  };

  const App = {
    init() {
      window.V301Store.init();
      window.V301Core.init();
      this.loadModule(location.hash.replace("#", "") || "dashboard", false);

      window.V301Core.ui.primaryAction.addEventListener("click", () => {
        this.handlePrimaryAction();
      });

      window.addEventListener("hashchange", () => {
        this.loadModule(location.hash.replace("#", "") || "dashboard", false);
      });

      window.V301Core.showApplication();
      console.info("V301 Starter Package initialized successfully.");
    },

    loadModule(name, updateHash = true) {
      const moduleName = moduleMeta[name] ? name : "dashboard";
      const meta = moduleMeta[moduleName];

      window.V301Core.state.currentModule = moduleName;
      window.V301Core.ui.navItems.forEach(item => {
        item.classList.toggle("active", item.dataset.module === moduleName);
      });

      window.V301Core.ui.moduleTitle.textContent = meta.title;
      window.V301Core.ui.moduleDescription.textContent = meta.description;
      window.V301Core.ui.primaryAction.textContent = meta.action;

      if (updateHash && location.hash !== "#" + moduleName) {
        history.pushState(null, "", "#" + moduleName);
      }

      if (moduleName === "dashboard") {
        this.renderDashboard();
      } else {
        this.renderPlaceholder(meta);
      }
    },

    renderDashboard() {
      const stats = window.V301Store.stats();

      window.V301Core.ui.workspaceContent.innerHTML = `
        <div class="dashboard-grid">
          ${this.metric("Projects", stats.projects, "Research projects")}
          ${this.metric("Questionnaires", stats.questionnaires, "Research instruments")}
          ${this.metric("Respondents", stats.respondents, "Registered participants")}
          ${this.metric("Responses", stats.responses, "Saved interviews")}
        </div>

        <div class="dashboard-row">
          <section class="panel">
            <div class="panel-header">Recent Activity</div>
            <div class="panel-body">
              <div class="empty-state">
                No research activity has been recorded yet. Create the first project to begin.
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">Quick Actions</div>
            <div class="panel-body quick-actions">
              <button class="button button-primary" data-go="projects">Create Project</button>
              <button class="button button-secondary" data-go="questionnaires">Build Questionnaire</button>
              <button class="button button-secondary" data-go="respondents">Open Respondents</button>
            </div>
          </section>
        </div>
      `;

      document.querySelectorAll("[data-go]").forEach(button => {
        button.addEventListener("click", () => this.loadModule(button.dataset.go));
      });
    },

    metric(label, value, note) {
      return `
        <article class="metric-card">
          <div class="metric-label">${this.escape(label)}</div>
          <div class="metric-value">${Number(value) || 0}</div>
          <div class="metric-note">${this.escape(note)}</div>
        </article>
      `;
    },

    renderPlaceholder(meta) {
      window.V301Core.ui.workspaceContent.innerHTML = `
        <section class="placeholder-card">
          <h2>${this.escape(meta.title)}</h2>
          <p>${this.escape(meta.description)}</p>
          <p>This module is connected to the V301 framework and is ready for functional development.</p>
        </section>
      `;
    },

    handlePrimaryAction() {
      const moduleName = window.V301Core.state.currentModule;
      if (moduleName === "dashboard" || moduleName === "projects") {
        const project = window.V301Store.add("projects", {
          name: "Untitled Research Project",
          status: "Draft"
        });
        window.V301Core.toast("Draft project created.", "success");
        this.renderDashboard();
        return;
      }

      window.V301Core.toast(moduleMeta[moduleName].action + " will be enabled in the next module.", "info");
    },

    escape(value) {
      return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char]));
    }
  };

  window.V301App = App;

  function start() {
    try {
      App.init();
    } catch (error) {
      console.error("V301 startup failure:", error);
      const loader = document.getElementById("loadingScreen");
      const app = document.getElementById("application");
      if (loader) loader.remove();
      if (app) app.hidden = false;
      alert("V301 could not initialize. Open the browser console for details.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  setTimeout(() => {
    const loader = document.getElementById("loadingScreen");
    const app = document.getElementById("application");
    if (loader) loader.remove();
    if (app) app.hidden = false;
  }, 4000);
})(window, document);
