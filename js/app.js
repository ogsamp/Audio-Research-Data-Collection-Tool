/*
 V300 Enterprise - app.js
 Parts 1, 2 and 3
 - Application shell, login, navigation and theme
 - Research project management
 - Questionnaire builder with text questions, audio upload/recording,
   editing, deletion, reordering and publishing
*/

const V300 = {
  version: "1.0.0-part3",

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

  mediaRecorder: null,
  recordingChunks: [],
  recordingStream: null,
  activeRecordingQuestionId: null,

  init() {
    this.load();
    this.injectComponentStyles();
    this.applySavedTheme();
    this.bindNavigation();
    this.bindLogin();
    this.bindTheme();
    this.bindProjectActions();
    this.bindQuestionnaireActions();
    this.renderProjects();
    this.renderQuestionnaire();
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
      console.error("Could not load saved data:", error);
      this.toast("Saved data could not be loaded.");
    }
  },

  save() {
    try {
      localStorage.setItem("V300_STATE", JSON.stringify(this.state));
    } catch (error) {
      console.error("Could not save data:", error);
      this.toast("Browser storage is full. Remove large audio files or export the project.");
    }
  },

  getActiveProjectId() {
    return localStorage.getItem("V300_ACTIVE_PROJECT") || "";
  },

  getActiveProject() {
    const activeId = this.getActiveProjectId();
    return this.state.projects.find(project => project.id === activeId) || null;
  },

  getQuestionnaire(projectId, createIfMissing = true) {
    if (!projectId) return null;

    let questionnaire = this.state.questionnaires.find(
      item => item.projectId === projectId
    );

    if (!questionnaire && createIfMissing) {
      questionnaire = {
        id: this.makeId("QNR"),
        projectId,
        title: "Main Questionnaire",
        status: "Draft",
        version: 1,
        questions: [],
        publishedAt: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.state.questionnaires.push(questionnaire);
      this.save();
    }

    return questionnaire || null;
  },

  bindNavigation() {
    document.querySelectorAll(".menu").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".menu").forEach(item => item.classList.remove("active"));
        button.classList.add("active");

        document.querySelectorAll(".page").forEach(page => page.classList.add("hidden"));

        const pageName = button.dataset.page;
        const page = document.getElementById(`${pageName}Page`);
        if (page) page.classList.remove("hidden");

        const title = document.getElementById("pageTitle");
        if (title) title.textContent = button.textContent.trim();

        if (pageName === "projects") this.renderProjects();
        if (pageName === "questionnaire") this.renderQuestionnaire();
      });
    });
  },

  bindLogin() {
    const loginButton = document.getElementById("btnLogin");
    const loginInput = document.getElementById("loginPIN");
    const logoutButton = document.getElementById("btnLogout");

    loginButton?.addEventListener("click", () => this.login());

    loginInput?.addEventListener("keydown", event => {
      if (event.key === "Enter") this.login();
    });

    logoutButton?.addEventListener("click", () => {
      const dialog = document.getElementById("loginDialog");
      if (dialog) dialog.style.display = "flex";
      if (loginInput) {
        loginInput.value = "";
        loginInput.focus();
      }
      this.toast("You have logged out.");
    });
  },

  login() {
    const input = document.getElementById("loginPIN");
    const dialog = document.getElementById("loginDialog");
    if (!input) return;

    if (input.value.trim() === String(this.state.settings.pin)) {
      if (dialog) dialog.style.display = "none";
      input.value = "";
      this.toast("Login successful.");
    } else {
      this.toast("Invalid researcher PIN.");
      input.select();
    }
  },

  bindTheme() {
    document.getElementById("btnTheme")?.addEventListener("click", () => {
      const enabled = document.body.classList.toggle("dark");
      this.state.settings.theme = enabled ? "dark" : "light";
      this.save();
      this.toast(`${enabled ? "Dark" : "Light"} theme enabled.`);
    });
  },

  applySavedTheme() {
    document.body.classList.toggle("dark", this.state.settings.theme === "dark");
  },

  bindProjectActions() {
    document.getElementById("btnNewProject")?.addEventListener("click", () => {
      this.openProjectForm();
    });

    document.getElementById("projectList")?.addEventListener("click", event => {
      const button = event.target.closest("[data-project-action]");
      if (!button) return;

      const id = button.dataset.projectId;
      const action = button.dataset.projectAction;

      if (action === "open") this.openProject(id);
      if (action === "edit") this.openProjectForm(id);
      if (action === "archive") this.archiveProject(id);
      if (action === "delete") this.deleteProject(id);
    });
  },

  openProjectForm(projectId = null) {
    const existing = projectId
      ? this.state.projects.find(project => project.id === projectId)
      : null;

    const values = {
      name: existing?.name || "",
      studyTitle: existing?.studyTitle || "",
      principalInvestigator: existing?.principalInvestigator || "",
      organization: existing?.organization || "",
      country: existing?.country || "Uganda",
      startDate: existing?.startDate || "",
      endDate: existing?.endDate || "",
      targetRespondents: existing?.targetRespondents || "",
      status: existing?.status || "Draft"
    };

    const overlay = this.makeModal(`
      <div class="v300-modal-header">
        <div>
          <h2>${existing ? "Edit Research Project" : "Create Research Project"}</h2>
          <p>Enter the study's main administrative information.</p>
        </div>
        <button type="button" class="v300-icon-button" data-modal-close>×</button>
      </div>

      <form id="projectForm" class="v300-form">
        <div class="v300-form-grid">
          <label>Project name
            <input name="name" required maxlength="100"
              value="${this.escapeAttribute(values.name)}">
          </label>
          <label>Study title
            <input name="studyTitle" required maxlength="180"
              value="${this.escapeAttribute(values.studyTitle)}">
          </label>
          <label>Principal investigator
            <input name="principalInvestigator" maxlength="120"
              value="${this.escapeAttribute(values.principalInvestigator)}">
          </label>
          <label>Organization
            <input name="organization" maxlength="150"
              value="${this.escapeAttribute(values.organization)}">
          </label>
          <label>Country
            <input name="country" maxlength="80"
              value="${this.escapeAttribute(values.country)}">
          </label>
          <label>Target respondents
            <input name="targetRespondents" type="number" min="0" step="1"
              value="${this.escapeAttribute(values.targetRespondents)}">
          </label>
          <label>Start date
            <input name="startDate" type="date"
              value="${this.escapeAttribute(values.startDate)}">
          </label>
          <label>End date
            <input name="endDate" type="date"
              value="${this.escapeAttribute(values.endDate)}">
          </label>
          <label>Status
            <select name="status">
              ${["Draft", "Published", "Closed", "Archived"].map(status =>
                `<option ${values.status === status ? "selected" : ""}>${status}</option>`
              ).join("")}
            </select>
          </label>
        </div>

        <div class="v300-modal-actions">
          <button type="button" class="v300-secondary-button" data-modal-close>Cancel</button>
          <button type="submit">${existing ? "Save Changes" : "Create Project"}</button>
        </div>
      </form>
    `);

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
        principalInvestigator: String(data.get("principalInvestigator") || "").trim(),
        organization: String(data.get("organization") || "").trim(),
        country: String(data.get("country") || "").trim(),
        targetRespondents: Number(data.get("targetRespondents") || 0),
        startDate,
        endDate,
        status: String(data.get("status") || "Draft")
      };

      if (existing) this.updateProject(existing.id, projectData);
      else this.createProject(projectData);

      overlay.remove();
    });

    form.querySelector('input[name="name"]')?.focus();
  },

  createProject(data) {
    const now = new Date().toISOString();
    const project = {
      id: this.makeId("PRJ"),
      ...data,
      createdAt: now,
      updatedAt: now
    };

    this.state.projects.unshift(project);
    localStorage.setItem("V300_ACTIVE_PROJECT", project.id);
    this.getQuestionnaire(project.id, true);
    this.save();
    this.renderProjects();
    this.renderQuestionnaire();
    this.updateDashboard();
    this.toast("Research project created.");
  },

  updateProject(id, data) {
    const project = this.state.projects.find(item => item.id === id);
    if (!project) return;

    Object.assign(project, data, { updatedAt: new Date().toISOString() });
    this.save();
    this.renderProjects();
    this.renderQuestionnaire();
    this.toast("Project changes saved.");
  },

  openProject(id) {
    const project = this.state.projects.find(item => item.id === id);
    if (!project) return;

    localStorage.setItem("V300_ACTIVE_PROJECT", id);
    this.getQuestionnaire(id, true);
    this.renderProjects();
    this.renderQuestionnaire();
    this.toast(`Active project: ${project.name}`);
  },

  archiveProject(id) {
    const project = this.state.projects.find(item => item.id === id);
    if (!project || !confirm(`Archive "${project.name}"?`)) return;

    project.status = "Archived";
    project.updatedAt = new Date().toISOString();
    this.save();
    this.renderProjects();
    this.toast("Project archived.");
  },

  deleteProject(id) {
    const project = this.state.projects.find(item => item.id === id);
    if (!project || !confirm(`Permanently delete "${project.name}"?`)) return;

    this.state.projects = this.state.projects.filter(item => item.id !== id);
    this.state.questionnaires = this.state.questionnaires.filter(
      item => item.projectId !== id
    );

    if (this.getActiveProjectId() === id) {
      localStorage.removeItem("V300_ACTIVE_PROJECT");
    }

    this.save();
    this.renderProjects();
    this.renderQuestionnaire();
    this.updateDashboard();
    this.toast("Project deleted.");
  },

  renderProjects() {
    const container = document.getElementById("projectList");
    if (!container) return;

    if (!this.state.projects.length) {
      container.innerHTML = `
        <div class="v300-empty-state">
          <h3>No research projects yet</h3>
          <p>Create a project before building the questionnaire.</p>
          <button type="button" id="emptyCreateProject">Create Project</button>
        </div>`;
      container.querySelector("#emptyCreateProject")?.addEventListener(
        "click", () => this.openProjectForm()
      );
      return;
    }

    const activeId = this.getActiveProjectId();
    container.innerHTML = `
      <div class="v300-project-grid">
        ${this.state.projects.map(project => `
          <article class="v300-project-card ${project.id === activeId ? "is-active" : ""}">
            <div class="v300-project-card-top">
              <span class="v300-status ${project.status.toLowerCase()}">
                ${this.escapeHtml(project.status)}
              </span>
              <small>${this.formatDate(project.updatedAt)}</small>
            </div>
            <h3>${this.escapeHtml(project.name)}</h3>
            <p>${this.escapeHtml(project.studyTitle)}</p>
            <dl class="v300-project-details">
              <div><dt>Lead</dt><dd>${this.escapeHtml(project.principalInvestigator || "Not specified")}</dd></div>
              <div><dt>Target</dt><dd>${Number(project.targetRespondents || 0).toLocaleString()}</dd></div>
            </dl>
            <div class="v300-project-actions">
              <button data-project-action="open" data-project-id="${project.id}">
                ${project.id === activeId ? "Active" : "Open"}
              </button>
              <button class="v300-secondary-button" data-project-action="edit" data-project-id="${project.id}">Edit</button>
              <button class="v300-secondary-button" data-project-action="archive" data-project-id="${project.id}">Archive</button>
              <button class="v300-danger-button" data-project-action="delete" data-project-id="${project.id}">Delete</button>
            </div>
          </article>
        `).join("")}
      </div>`;
  },

  /* ===================== PART 3: QUESTIONNAIRE BUILDER ===================== */

  bindQuestionnaireActions() {
    document.getElementById("btnAddQuestion")?.addEventListener("click", () => {
      this.openQuestionForm();
    });

    document.getElementById("btnPublish")?.addEventListener("click", () => {
      this.publishQuestionnaire();
    });

    document.getElementById("questionList")?.addEventListener("click", event => {
      const button = event.target.closest("[data-question-action]");
      if (!button) return;

      const id = button.dataset.questionId;
      const action = button.dataset.questionAction;

      if (action === "edit") this.openQuestionForm(id);
      if (action === "delete") this.deleteQuestion(id);
      if (action === "up") this.moveQuestion(id, -1);
      if (action === "down") this.moveQuestion(id, 1);
      if (action === "record") this.startRecording(id);
      if (action === "stop") this.stopRecording();
      if (action === "remove-audio") this.removeQuestionAudio(id);
    });

    document.getElementById("questionList")?.addEventListener("change", event => {
      const input = event.target.closest("[data-question-audio-upload]");
      if (!input || !input.files?.[0]) return;
      this.attachAudioFile(input.dataset.questionAudioUpload, input.files[0]);
      input.value = "";
    });
  },

  renderQuestionnaire() {
    const container = document.getElementById("questionList");
    const publishButton = document.getElementById("btnPublish");
    if (!container) return;

    const project = this.getActiveProject();

    if (!project) {
      container.innerHTML = `
        <div class="v300-empty-state">
          <h3>Select a research project</h3>
          <p>Open or create a project before adding questions.</p>
        </div>`;
      if (publishButton) publishButton.disabled = true;
      return;
    }

    const questionnaire = this.getQuestionnaire(project.id, true);
    const questions = questionnaire.questions || [];
    if (publishButton) {
      publishButton.disabled = questions.length === 0;
      publishButton.textContent =
        questionnaire.status === "Published" ? "Republish Survey" : "Publish Survey";
    }

    if (!questions.length) {
      container.innerHTML = `
        <div class="v300-questionnaire-header">
          <div>
            <span class="v300-eyebrow">Active project</span>
            <h2>${this.escapeHtml(project.name)}</h2>
            <p>Questionnaire status: <strong>${this.escapeHtml(questionnaire.status)}</strong></p>
          </div>
        </div>
        <div class="v300-empty-state">
          <h3>No questions added</h3>
          <p>Add the first question, then record or upload its audio.</p>
          <button type="button" id="emptyAddQuestion">Add First Question</button>
        </div>`;
      container.querySelector("#emptyAddQuestion")?.addEventListener(
        "click", () => this.openQuestionForm()
      );
      this.updateDashboard();
      return;
    }

    container.innerHTML = `
      <div class="v300-questionnaire-header">
        <div>
          <span class="v300-eyebrow">Active project</span>
          <h2>${this.escapeHtml(project.name)}</h2>
          <p>${questions.length} question${questions.length === 1 ? "" : "s"} ·
             Status: <strong>${this.escapeHtml(questionnaire.status)}</strong> ·
             Version ${questionnaire.version}</p>
        </div>
      </div>

      <div class="v300-question-stack">
        ${questions.map((question, index) =>
          this.questionCard(question, index, questions.length)
        ).join("")}
      </div>`;

    this.updateDashboard();
  },

  questionCard(question, index, total) {
    const isRecording = this.activeRecordingQuestionId === question.id;
    return `
      <article class="v300-question-card">
        <div class="v300-question-number">${index + 1}</div>
        <div class="v300-question-content">
          <div class="v300-question-card-top">
            <div>
              <span class="v300-status ${question.required ? "published" : "draft"}">
                ${question.required ? "Required" : "Optional"}
              </span>
              <span class="v300-type-label">${this.escapeHtml(question.type || "Audio response")}</span>
            </div>
            <small>${this.escapeHtml(question.code || `Q${index + 1}`)}</small>
          </div>

          <h3>${this.escapeHtml(question.text)}</h3>
          ${question.helpText ? `<p>${this.escapeHtml(question.helpText)}</p>` : ""}

          <div class="v300-audio-panel">
            ${question.audioDataUrl ? `
              <audio controls preload="metadata" src="${question.audioDataUrl}"></audio>
              <button class="v300-secondary-button"
                data-question-action="remove-audio"
                data-question-id="${question.id}">Remove Audio</button>
            ` : `
              <span>No question audio attached.</span>
            `}

            <label class="v300-upload-button">
              Upload Audio
              <input type="file" accept="audio/*" hidden
                data-question-audio-upload="${question.id}">
            </label>

            ${isRecording ? `
              <button class="v300-danger-button"
                data-question-action="stop"
                data-question-id="${question.id}">Stop Recording</button>
              <span class="v300-recording-indicator">Recording…</span>
            ` : `
              <button class="v300-secondary-button"
                data-question-action="record"
                data-question-id="${question.id}">Record Question</button>
            `}
          </div>

          <div class="v300-question-actions">
            <button class="v300-secondary-button"
              data-question-action="up"
              data-question-id="${question.id}"
              ${index === 0 ? "disabled" : ""}>Move Up</button>
            <button class="v300-secondary-button"
              data-question-action="down"
              data-question-id="${question.id}"
              ${index === total - 1 ? "disabled" : ""}>Move Down</button>
            <button class="v300-secondary-button"
              data-question-action="edit"
              data-question-id="${question.id}">Edit</button>
            <button class="v300-danger-button"
              data-question-action="delete"
              data-question-id="${question.id}">Delete</button>
          </div>
        </div>
      </article>`;
  },

  openQuestionForm(questionId = null) {
    const project = this.getActiveProject();
    if (!project) {
      this.toast("Create or open a project first.");
      return;
    }

    const questionnaire = this.getQuestionnaire(project.id, true);
    const existing = questionId
      ? questionnaire.questions.find(question => question.id === questionId)
      : null;

    const overlay = this.makeModal(`
      <div class="v300-modal-header">
        <div>
          <h2>${existing ? "Edit Question" : "Add Question"}</h2>
          <p>Question text may be supported by recorded or uploaded audio.</p>
        </div>
        <button type="button" class="v300-icon-button" data-modal-close>×</button>
      </div>

      <form id="questionForm" class="v300-form">
        <div class="v300-form-grid">
          <label>Question code
            <input name="code" maxlength="20"
              value="${this.escapeAttribute(existing?.code || `Q${questionnaire.questions.length + 1}`)}">
          </label>
          <label>Response type
            <select name="type">
              ${["Audio response", "Text response", "Number", "Yes/No"].map(type =>
                `<option ${existing?.type === type ? "selected" : ""}>${type}</option>`
              ).join("")}
            </select>
          </label>
        </div>

        <label>Question text
          <textarea name="text" required rows="4" maxlength="600">${this.escapeHtml(existing?.text || "")}</textarea>
        </label>

        <label>Enumerator guidance or help text
          <textarea name="helpText" rows="3" maxlength="500">${this.escapeHtml(existing?.helpText || "")}</textarea>
        </label>

        <label class="v300-checkbox-label">
          <input name="required" type="checkbox" ${existing?.required !== false ? "checked" : ""}>
          This question is required
        </label>

        <div class="v300-modal-actions">
          <button type="button" class="v300-secondary-button" data-modal-close>Cancel</button>
          <button type="submit">${existing ? "Save Question" : "Add Question"}</button>
        </div>
      </form>
    `);

    const form = overlay.querySelector("#questionForm");
    form.addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(form);

      const values = {
        code: String(data.get("code") || "").trim(),
        type: String(data.get("type") || "Audio response"),
        text: String(data.get("text") || "").trim(),
        helpText: String(data.get("helpText") || "").trim(),
        required: data.get("required") === "on"
      };

      if (!values.text) {
        this.toast("Enter the question text.");
        return;
      }

      if (existing) {
        Object.assign(existing, values, { updatedAt: new Date().toISOString() });
        this.toast("Question updated.");
      } else {
        questionnaire.questions.push({
          id: this.makeId("QUE"),
          ...values,
          audioDataUrl: "",
          audioName: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        this.toast("Question added.");
      }

      questionnaire.status = "Draft";
      questionnaire.updatedAt = new Date().toISOString();
      this.save();
      overlay.remove();
      this.renderQuestionnaire();
    });

    form.querySelector('textarea[name="text"]')?.focus();
  },

  deleteQuestion(questionId) {
    const project = this.getActiveProject();
    const questionnaire = project ? this.getQuestionnaire(project.id, false) : null;
    if (!questionnaire) return;

    const question = questionnaire.questions.find(item => item.id === questionId);
    if (!question || !confirm(`Delete "${question.text}"?`)) return;

    questionnaire.questions = questionnaire.questions.filter(item => item.id !== questionId);
    questionnaire.status = "Draft";
    questionnaire.updatedAt = new Date().toISOString();
    this.save();
    this.renderQuestionnaire();
    this.toast("Question deleted.");
  },

  moveQuestion(questionId, direction) {
    const project = this.getActiveProject();
    const questionnaire = project ? this.getQuestionnaire(project.id, false) : null;
    if (!questionnaire) return;

    const index = questionnaire.questions.findIndex(item => item.id === questionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= questionnaire.questions.length) return;

    [questionnaire.questions[index], questionnaire.questions[target]] =
      [questionnaire.questions[target], questionnaire.questions[index]];

    questionnaire.status = "Draft";
    questionnaire.updatedAt = new Date().toISOString();
    this.save();
    this.renderQuestionnaire();
  },

  attachAudioFile(questionId, file) {
    const allowedTypes = ["audio/webm", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/x-m4a"];
    if (file.type && !allowedTypes.includes(file.type)) {
      this.toast("Choose a valid audio file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      this.toast("Audio must be smaller than 8 MB for browser storage.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.saveQuestionAudio(questionId, String(reader.result), file.name);
    };
    reader.onerror = () => this.toast("The audio file could not be read.");
    reader.readAsDataURL(file);
  },

  saveQuestionAudio(questionId, dataUrl, name) {
    const project = this.getActiveProject();
    const questionnaire = project ? this.getQuestionnaire(project.id, false) : null;
    const question = questionnaire?.questions.find(item => item.id === questionId);
    if (!question) return;

    question.audioDataUrl = dataUrl;
    question.audioName = name;
    question.updatedAt = new Date().toISOString();
    questionnaire.status = "Draft";
    questionnaire.updatedAt = new Date().toISOString();
    this.save();
    this.renderQuestionnaire();
    this.toast("Question audio saved.");
  },

  removeQuestionAudio(questionId) {
    const project = this.getActiveProject();
    const questionnaire = project ? this.getQuestionnaire(project.id, false) : null;
    const question = questionnaire?.questions.find(item => item.id === questionId);
    if (!question || !confirm("Remove the attached question audio?")) return;

    question.audioDataUrl = "";
    question.audioName = "";
    question.updatedAt = new Date().toISOString();
    questionnaire.status = "Draft";
    this.save();
    this.renderQuestionnaire();
    this.toast("Question audio removed.");
  },

  async startRecording(questionId) {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      this.toast("Audio recording is not supported by this browser.");
      return;
    }

    if (this.mediaRecorder?.state === "recording") {
      this.toast("Another recording is already in progress.");
      return;
    }

    try {
      this.recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recordingChunks = [];
      this.activeRecordingQuestionId = questionId;

      const preferredType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4"
      ].find(type => MediaRecorder.isTypeSupported(type));

      this.mediaRecorder = preferredType
        ? new MediaRecorder(this.recordingStream, { mimeType: preferredType })
        : new MediaRecorder(this.recordingStream);

      this.mediaRecorder.addEventListener("dataavailable", event => {
        if (event.data.size > 0) this.recordingChunks.push(event.data);
      });

      this.mediaRecorder.addEventListener("stop", () => {
        const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
        const blob = new Blob(this.recordingChunks, { type: mimeType });

        if (blob.size > 8 * 1024 * 1024) {
          this.toast("Recording is too large. Record a shorter question.");
          this.cleanupRecording();
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const extension = mimeType.includes("mp4") ? "m4a" : "webm";
          this.saveQuestionAudio(
            this.activeRecordingQuestionId,
            String(reader.result),
            `question-${Date.now()}.${extension}`
          );
          this.cleanupRecording();
        };
        reader.readAsDataURL(blob);
      });

      this.mediaRecorder.start();
      this.renderQuestionnaire();
      this.toast("Recording started.");
    } catch (error) {
      console.error(error);
      this.cleanupRecording();
      this.toast("Microphone permission was not granted.");
    }
  },

  stopRecording() {
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
      this.toast("Recording stopped.");
    }
  },

  cleanupRecording() {
    this.recordingStream?.getTracks().forEach(track => track.stop());
    this.recordingStream = null;
    this.mediaRecorder = null;
    this.recordingChunks = [];
    this.activeRecordingQuestionId = null;
    this.renderQuestionnaire();
  },

  publishQuestionnaire() {
    const project = this.getActiveProject();
    const questionnaire = project ? this.getQuestionnaire(project.id, false) : null;

    if (!questionnaire || !questionnaire.questions.length) {
      this.toast("Add at least one question before publishing.");
      return;
    }

    const missingText = questionnaire.questions.some(question => !question.text.trim());
    if (missingText) {
      this.toast("Every question must contain text.");
      return;
    }

    const audioQuestionsWithoutAudio = questionnaire.questions.filter(
      question => question.type === "Audio response" && !question.audioDataUrl
    );

    if (audioQuestionsWithoutAudio.length) {
      const proceed = confirm(
        `${audioQuestionsWithoutAudio.length} audio-response question(s) have no question recording. Publish anyway?`
      );
      if (!proceed) return;
    }

    questionnaire.status = "Published";
    questionnaire.version = Number(questionnaire.version || 0) + 1;
    questionnaire.publishedAt = new Date().toISOString();
    questionnaire.updatedAt = questionnaire.publishedAt;

    project.status = "Published";
    project.updatedAt = questionnaire.publishedAt;

    this.save();
    this.renderQuestionnaire();
    this.renderProjects();
    this.updateDashboard();
    this.toast(`Questionnaire version ${questionnaire.version} published.`);
  },

  updateDashboard() {
    const set = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    set("totalProjects", this.state.projects.length);
    set("totalQuestionnaires",
      this.state.questionnaires.filter(item => (item.questions || []).length > 0).length
    );
    set("totalRespondents", this.state.respondents.length);
    set("totalResponses", this.state.responses.length);
  },

  makeModal(content) {
    const overlay = document.createElement("div");
    overlay.className = "v300-modal-overlay";
    overlay.innerHTML = `<div class="v300-modal" role="dialog" aria-modal="true">${content}</div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll("[data-modal-close]").forEach(button => {
      button.addEventListener("click", () => overlay.remove());
    });

    overlay.addEventListener("click", event => {
      if (event.target === overlay) overlay.remove();
    });

    return overlay;
  },

  makeId(prefix = "ID") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  },

  formatDate(value) {
    if (!value) return "Not updated";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not updated";
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
  },

  injectComponentStyles() {
    if (document.getElementById("v300-component-styles")) return;

    const style = document.createElement("style");
    style.id = "v300-component-styles";
    style.textContent = `
      .v300-modal-overlay{position:fixed;inset:0;background:rgba(14,28,47,.65);
        display:flex;align-items:center;justify-content:center;padding:20px;z-index:2000}
      .v300-modal{width:min(820px,100%);max-height:92vh;overflow:auto;background:#fff;
        border-radius:16px;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.28)}
      .v300-modal-header,.v300-questionnaire-header,.v300-question-card-top,
      .v300-project-card-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
      .v300-modal-header p,.v300-questionnaire-header p{color:#6b7c93;margin-top:5px}
      .v300-icon-button{font-size:25px;padding:3px 12px;background:#eef3f8;color:#243447}
      .v300-form{display:grid;gap:18px;margin-top:22px}
      .v300-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
      .v300-form label{display:grid;gap:7px;font-weight:600;font-size:14px}
      .v300-form input,.v300-form select,.v300-form textarea{width:100%;padding:11px;
        border:1px solid #dce3ec;border-radius:9px;font:inherit;background:#fff;color:#243447}
      .v300-checkbox-label{display:flex!important;grid-template-columns:auto 1fr!important;
        align-items:center!important}.v300-checkbox-label input{width:auto}
      .v300-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:5px}
      .v300-secondary-button{background:#e8eef5;color:#243447}
      .v300-secondary-button:hover{background:#d9e3ee}
      .v300-danger-button{background:#d64541}.v300-danger-button:hover{background:#b93430}
      .v300-empty-state{text-align:center;padding:48px 18px;color:#6b7c93}
      .v300-empty-state h3{color:#243447;margin-bottom:8px}
      .v300-empty-state button{margin-top:18px}
      .v300-project-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
      .v300-project-card{background:#fff;border:1px solid #dce3ec;border-radius:14px;padding:20px}
      .v300-project-card.is-active{outline:3px solid rgba(11,92,173,.18);border-color:#0b5cad}
      .v300-project-card h3{margin:16px 0 7px}.v300-project-card p{color:#6b7c93}
      .v300-project-details{display:grid;gap:8px;margin:18px 0}
      .v300-project-details div{display:flex;justify-content:space-between;gap:15px}
      .v300-project-details dt{color:#6b7c93}.v300-project-details dd{text-align:right;font-weight:600}
      .v300-project-actions,.v300-question-actions,.v300-audio-panel{display:flex;flex-wrap:wrap;gap:9px;align-items:center}
      .v300-status{display:inline-block;padding:5px 9px;border-radius:999px;background:#eef3f8;
        font-size:12px;font-weight:700}.v300-status.published{background:#dff5ed;color:#087454}
      .v300-status.closed,.v300-status.archived{background:#f1e8e8;color:#8b3434}
      .v300-eyebrow{display:block;text-transform:uppercase;letter-spacing:.08em;
        color:#0b5cad;font-size:12px;font-weight:700;margin-bottom:5px}
      .v300-questionnaire-header{padding-bottom:20px;border-bottom:1px solid #dce3ec;margin-bottom:18px}
      .v300-question-stack{display:grid;gap:15px}
      .v300-question-card{display:grid;grid-template-columns:46px 1fr;gap:16px;background:#fff;
        border:1px solid #dce3ec;border-radius:14px;padding:18px}
      .v300-question-number{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;
        background:#0b5cad;color:#fff;font-weight:800}
      .v300-question-content h3{margin:14px 0 7px}.v300-question-content>p{color:#6b7c93}
      .v300-type-label{font-size:12px;color:#6b7c93;margin-left:7px}
      .v300-audio-panel{background:#f6f8fb;border-radius:10px;padding:12px;margin:15px 0}
      .v300-audio-panel audio{max-width:320px;width:100%}
      .v300-upload-button{background:#e8eef5;color:#243447;padding:11px 16px;border-radius:10px;
        cursor:pointer;font-weight:600;font-size:14px}
      .v300-recording-indicator{color:#d64541;font-weight:700;animation:v300pulse 1s infinite}
      @keyframes v300pulse{50%{opacity:.4}}
      button:disabled{opacity:.45;cursor:not-allowed}
      body.dark{background:#17202b;color:#e8eef5}
      body.dark header,body.dark .card,body.dark #projectList,body.dark #questionList,
      body.dark #respondentList,body.dark #reportArea,body.dark table,
      body.dark .v300-project-card,body.dark .v300-question-card,body.dark .v300-modal{
        background:#222f3e;color:#e8eef5;border-color:#405267}
      body.dark .v300-form input,body.dark .v300-form select,body.dark .v300-form textarea{
        background:#17202b;color:#fff;border-color:#405267}
      body.dark .v300-empty-state h3{color:#fff}
      body.dark .v300-audio-panel{background:#17202b}
      @media(max-width:700px){
        .v300-form-grid{grid-template-columns:1fr}
        .v300-question-card{grid-template-columns:1fr}
        .v300-question-number{width:34px;height:34px}
      }`;
    document.head.appendChild(style);
  }
};

window.addEventListener("DOMContentLoaded", () => V300.init());
