/*
 V300 Enterprise - app.js
 Parts 1 and 2
 - Application bootstrap
 - Navigation and login
 - Theme handling
 - Dashboard statistics
 - Research project management
*/

const V300 = {
  version: "1.0.0",

  state: {
    projects: [],
    questionnaires: [],
    respondents: [],
    responses: [],
    settings: {
      pin: "3000",
      theme: "light"
    }
  },

  init() {
    this.load();
    this.applySavedTheme();
    this.bindNavigation();
    this.bindLogin();
    this.bindTheme();
    this.bindProjectActions();
    this.renderProjects();
    this.updateDashboard();
    console.log(`V300 Enterprise ${this.version} started`);
  },

  load() {
    const saved = localStorage.getItem("V300_STATE");

    if (!saved) {
      this.save();
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      this.state = {
        ...this.state,
        ...parsed,
        settings: {
          ...this.state.settings,
          ...(parsed.settings || {})
        },
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        questionnaires: Array.isArray(parsed.questionnaires) ? parsed.questionnaires : [],
        respondents: Array.isArray(parsed.respondents) ? parsed.respondents : [],
        responses: Array.isArray(parsed.responses) ? parsed.responses : []
      };
    } catch (error) {
      console.error("Could not load V300 data:", error);
      this.toast("Saved data could not be loaded.");
    }
  },

  save() {
    try {
      localStorage.setItem("V300_STATE", JSON.stringify(this.state));
    } catch (error) {
      console.error("Could not save V300 data:", error);
      this.toast("Data could not be saved.");
    }
  },

  bindNavigation() {
    document.querySelectorAll(".menu").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".menu").forEach(item => {
          item.classList.remove("active");
        });

        button.classList.add("active");

        document.querySelectorAll(".page").forEach(page => {
          page.classList.add("hidden");
        });

        const pageName = button.dataset.page;
        const page = document.getElementById(`${pageName}Page`);

        if (page) {
          page.classList.remove("hidden");
        }

        const title = document.getElementById("pageTitle");

        if (title) {
          title.textContent = button.textContent.trim();
        }

        if (pageName === "projects") {
          this.renderProjects();
        }
      });
    });
  },

  bindLogin() {
    const loginButton = document.getElementById("btnLogin");
    const loginInput = document.getElementById("loginPIN");
    const logoutButton = document.getElementById("btnLogout");

    if (loginButton) {
      loginButton.addEventListener("click", () => {
        this.login();
      });
    }

    if (loginInput) {
      loginInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          this.login();
        }
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        const dialog = document.getElementById("loginDialog");

        if (dialog) {
          dialog.style.display = "flex";
        }

        if (loginInput) {
          loginInput.value = "";
          loginInput.focus();
        }

        this.toast("You have logged out.");
      });
    }
  },

  login() {
    const loginInput = document.getElementById("loginPIN");
    const dialog = document.getElementById("loginDialog");

    if (!loginInput) {
      return;
    }

    if (loginInput.value.trim() === String(this.state.settings.pin)) {
      if (dialog) {
        dialog.style.display = "none";
      }

      loginInput.value = "";
      this.toast("Login successful.");
      return;
    }

    this.toast("Invalid researcher PIN.");
    loginInput.select();
  },

  bindTheme() {
    const button = document.getElementById("btnTheme");

    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      const darkModeEnabled = document.body.classList.toggle("dark");

      this.state.settings.theme = darkModeEnabled ? "dark" : "light";
      this.save();
      this.toast(`${darkModeEnabled ? "Dark" : "Light"} theme enabled.`);
    });
  },

  applySavedTheme() {
    document.body.classList.toggle(
      "dark",
      this.state.settings.theme === "dark"
    );
  },

  bindProjectActions() {
    const newProjectButton =
      document.getElementById("btnNewProject") ||
      document.getElementById("btnCreateProject");

    if (newProjectButton) {
      newProjectButton.addEventListener("click", () => {
        this.openProjectForm();
      });
    }

    const projectList = document.getElementById("projectList");

    if (projectList) {
      projectList.addEventListener("click", event => {
        const actionButton = event.target.closest("[data-project-action]");

        if (!actionButton) {
          return;
        }

        const projectId = actionButton.dataset.projectId;
        const action = actionButton.dataset.projectAction;

        if (action === "open") {
          this.openProject(projectId);
        } else if (action === "edit") {
          this.openProjectForm(projectId);
        } else if (action === "archive") {
          this.archiveProject(projectId);
        } else if (action === "delete") {
          this.deleteProject(projectId);
        }
      });
    }
  },

  openProjectForm(projectId = null) {
    const existingProject = projectId
      ? this.state.projects.find(project => project.id === projectId)
      : null;

    const formData = {
      name: existingProject?.name || "",
      studyTitle: existingProject?.studyTitle || "",
      principalInvestigator: existingProject?.principalInvestigator || "",
      organization: existingProject?.organization || "",
      country: existingProject?.country || "Uganda",
      startDate: existingProject?.startDate || "",
      endDate: existingProject?.endDate || "",
      targetRespondents: existingProject?.targetRespondents || "",
      status: existingProject?.status || "Draft"
    };

    const overlay = document.createElement("div");
    overlay.className = "v300-modal-overlay";
    overlay.innerHTML = `
      <div class="v300-modal" role="dialog" aria-modal="true">
        <div class="v300-modal-header">
          <div>
            <h2>${existingProject ? "Edit Research Project" : "Create Research Project"}</h2>
            <p>Enter the main administrative details for this study.</p>
          </div>
          <button type="button" class="v300-icon-button" data-close-project-form aria-label="Close">×</button>
        </div>

        <form id="projectForm" class="v300-form">
          <div class="v300-form-grid">
            <label>
              Project name
              <input name="name" type="text" required maxlength="100"
                     value="${this.escapeAttribute(formData.name)}">
            </label>

            <label>
              Study title
              <input name="studyTitle" type="text" required maxlength="180"
                     value="${this.escapeAttribute(formData.studyTitle)}">
            </label>

            <label>
              Principal investigator
              <input name="principalInvestigator" type="text" maxlength="120"
                     value="${this.escapeAttribute(formData.principalInvestigator)}">
            </label>

            <label>
              Organization
              <input name="organization" type="text" maxlength="150"
                     value="${this.escapeAttribute(formData.organization)}">
            </label>

            <label>
              Country
              <input name="country" type="text" maxlength="80"
                     value="${this.escapeAttribute(formData.country)}">
            </label>

            <label>
              Target respondents
              <input name="targetRespondents" type="number" min="0" step="1"
                     value="${this.escapeAttribute(formData.targetRespondents)}">
            </label>

            <label>
              Start date
              <input name="startDate" type="date"
                     value="${this.escapeAttribute(formData.startDate)}">
            </label>

            <label>
              End date
              <input name="endDate" type="date"
                     value="${this.escapeAttribute(formData.endDate)}">
            </label>

            <label>
              Status
              <select name="status">
                ${["Draft", "Published", "Closed", "Archived"]
                  .map(status => `
                    <option value="${status}" ${formData.status === status ? "selected" : ""}>
                      ${status}
                    </option>
                  `)
                  .join("")}
              </select>
            </label>
          </div>

          <div class="v300-modal-actions">
            <button type="button" class="v300-secondary-button" data-close-project-form>
              Cancel
            </button>
            <button type="submit">
              ${existingProject ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelectorAll("[data-close-project-form]").forEach(button => {
      button.addEventListener("click", () => overlay.remove());
    });

    overlay.addEventListener("click", event => {
      if (event.target === overlay) {
        overlay.remove();
      }
    });

    const form = overlay.querySelector("#projectForm");

    form.addEventListener("submit", event => {
      event.preventDefault();

      const data = new FormData(form);
      const startDate = String(data.get("startDate") || "");
      const endDate = String(data.get("endDate") || "");

      if (startDate && endDate && endDate < startDate) {
        this.toast("End date cannot be earlier than start date.");
        return;
      }

      const projectData = {
        name: String(data.get("name") || "").trim(),
        studyTitle: String(data.get("studyTitle") || "").trim(),
        principalInvestigator: String(
          data.get("principalInvestigator") || ""
        ).trim(),
        organization: String(data.get("organization") || "").trim(),
        country: String(data.get("country") || "").trim(),
        targetRespondents: Number(data.get("targetRespondents") || 0),
        startDate,
        endDate,
        status: String(data.get("status") || "Draft")
      };

      if (existingProject) {
        this.updateProject(existingProject.id, projectData);
      } else {
        this.createProject(projectData);
      }

      overlay.remove();
    });

    setTimeout(() => {
      form.querySelector('input[name="name"]')?.focus();
    }, 0);
  },

  createProject(projectData) {
    const now = new Date().toISOString();

    const project = {
      id: this.makeId("PRJ"),
      ...projectData,
      createdAt: now,
      updatedAt: now
    };

    this.state.projects.unshift(project);
    this.save();
    this.renderProjects();
    this.updateDashboard();
    this.toast("Research project created.");
  },

  updateProject(projectId, projectData) {
    const project = this.state.projects.find(item => item.id === projectId);

    if (!project) {
      this.toast("Project could not be found.");
      return;
    }

    Object.assign(project, projectData, {
      updatedAt: new Date().toISOString()
    });

    this.save();
    this.renderProjects();
    this.updateDashboard();
    this.toast("Project changes saved.");
  },

  archiveProject(projectId) {
    const project = this.state.projects.find(item => item.id === projectId);

    if (!project) {
      return;
    }

    const confirmed = window.confirm(
      `Archive "${project.name}"? You can still keep it in browser storage.`
    );

    if (!confirmed) {
      return;
    }

    project.status = "Archived";
    project.updatedAt = new Date().toISOString();

    this.save();
    this.renderProjects();
    this.updateDashboard();
    this.toast("Project archived.");
  },

  deleteProject(projectId) {
    const project = this.state.projects.find(item => item.id === projectId);

    if (!project) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete "${project.name}" from this browser?`
    );

    if (!confirmed) {
      return;
    }

    this.state.projects = this.state.projects.filter(
      item => item.id !== projectId
    );

    this.save();
    this.renderProjects();
    this.updateDashboard();
    this.toast("Project deleted.");
  },

  openProject(projectId) {
    const project = this.state.projects.find(item => item.id === projectId);

    if (!project) {
      this.toast("Project could not be found.");
      return;
    }

    localStorage.setItem("V300_ACTIVE_PROJECT", project.id);

    const title = document.getElementById("pageTitle");

    if (title) {
      title.textContent = project.name;
    }

    this.toast(`Opened project: ${project.name}`);
  },

  renderProjects() {
    const container = document.getElementById("projectList");

    if (!container) {
      return;
    }

    if (this.state.projects.length === 0) {
      container.innerHTML = `
        <div class="v300-empty-state">
          <h3>No research projects yet</h3>
          <p>Create the first project to begin building a questionnaire.</p>
          <button type="button" id="emptyCreateProject">Create Project</button>
        </div>
      `;

      container
        .querySelector("#emptyCreateProject")
        ?.addEventListener("click", () => this.openProjectForm());

      return;
    }

    container.innerHTML = `
      <div class="v300-project-grid">
        ${this.state.projects.map(project => this.projectCard(project)).join("")}
      </div>
    `;
  },

  projectCard(project) {
    const statusClass = String(project.status || "Draft")
      .toLowerCase()
      .replace(/\s+/g, "-");

    return `
      <article class="v300-project-card">
        <div class="v300-project-card-top">
          <span class="v300-status ${statusClass}">
            ${this.escapeHtml(project.status || "Draft")}
          </span>
          <small>${this.formatDate(project.updatedAt)}</small>
        </div>

        <h3>${this.escapeHtml(project.name)}</h3>
        <p>${this.escapeHtml(project.studyTitle)}</p>

        <dl class="v300-project-details">
          <div>
            <dt>Lead</dt>
            <dd>${this.escapeHtml(project.principalInvestigator || "Not specified")}</dd>
          </div>
          <div>
            <dt>Organization</dt>
            <dd>${this.escapeHtml(project.organization || "Not specified")}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>${Number(project.targetRespondents || 0).toLocaleString()} respondents</dd>
          </div>
        </dl>

        <div class="v300-project-actions">
          <button type="button"
                  data-project-action="open"
                  data-project-id="${this.escapeAttribute(project.id)}">
            Open
          </button>

          <button type="button"
                  class="v300-secondary-button"
                  data-project-action="edit"
                  data-project-id="${this.escapeAttribute(project.id)}">
            Edit
          </button>

          <button type="button"
                  class="v300-secondary-button"
                  data-project-action="archive"
                  data-project-id="${this.escapeAttribute(project.id)}">
            Archive
          </button>

          <button type="button"
                  class="v300-danger-button"
                  data-project-action="delete"
                  data-project-id="${this.escapeAttribute(project.id)}">
            Delete
          </button>
        </div>
      </article>
    `;
  },

  updateDashboard() {
    const setValue = (id, value) => {
      const element = document.getElementById(id);

      if (element) {
        element.textContent = value;
      }
    };

    setValue("totalProjects", this.state.projects.length);
    setValue("totalQuestionnaires", this.state.questionnaires.length);
    setValue("totalRespondents", this.state.respondents.length);
    setValue("totalResponses", this.state.responses.length);
  },

  makeId(prefix = "ID") {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${Date.now()}-${random}`;
  },

  formatDate(value) {
    if (!value) {
      return "Not updated";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not updated";
    }

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  },

  escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },

  escapeAttribute(value) {
    return this.escapeHtml(value);
  },

  toast(message) {
    const toast = document.getElementById("toast");

    if (!toast) {
      console.log(message);
      return;
    }

    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {
      toast.style.display = "none";
    }, 2800);
  }
};

window.addEventListener("DOMContentLoaded", () => {
  V300.init();
});
