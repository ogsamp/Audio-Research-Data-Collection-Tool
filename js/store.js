(function (window) {
  "use strict";

  const DB_KEY = "v301.enterprise.db";

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "v301-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function blankDatabase() {
    const now = new Date().toISOString();
    return {
      version: "301.0.0",
      createdAt: now,
      updatedAt: now,
      projects: [],
      questionnaires: [],
      respondents: [],
      responses: [],
      syncQueue: [],
      settings: {
        theme: "light",
        language: "en"
      }
    };
  }

  const Store = {
    db: null,

    init() {
      this.db = this.load();
      return this.db;
    },

    load() {
      try {
        const raw = localStorage.getItem(DB_KEY);
        if (!raw) {
          const db = blankDatabase();
          localStorage.setItem(DB_KEY, JSON.stringify(db));
          return db;
        }
        return Object.assign(blankDatabase(), JSON.parse(raw));
      } catch (error) {
        console.error("V301 Store load error:", error);
        const db = blankDatabase();
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        return db;
      }
    },

    save() {
      if (!this.db) this.init();
      this.db.updatedAt = new Date().toISOString();
      localStorage.setItem(DB_KEY, JSON.stringify(this.db));
    },

    list(collection) {
      if (!this.db) this.init();
      return Array.isArray(this.db[collection]) ? [...this.db[collection]] : [];
    },

    add(collection, record) {
      if (!this.db) this.init();
      if (!Array.isArray(this.db[collection])) throw new Error("Unknown collection: " + collection);
      const now = new Date().toISOString();
      const saved = Object.assign({}, record, {
        id: record.id || createId(),
        createdAt: now,
        updatedAt: now
      });
      this.db[collection].push(saved);
      this.save();
      return saved;
    },

    update(collection, id, changes) {
      const item = this.list(collection).find(row => row.id === id);
      if (!item) return null;
      Object.assign(item, changes, { updatedAt: new Date().toISOString() });
      this.save();
      return item;
    },

    remove(collection, id) {
      if (!this.db) this.init();
      const list = this.db[collection];
      if (!Array.isArray(list)) return false;
      const index = list.findIndex(row => row.id === id);
      if (index < 0) return false;
      list.splice(index, 1);
      this.save();
      return true;
    },

    stats() {
      if (!this.db) this.init();
      return {
        projects: this.db.projects.length,
        questionnaires: this.db.questionnaires.length,
        respondents: this.db.respondents.length,
        responses: this.db.responses.length,
        pendingSync: this.db.syncQueue.length
      };
    },

    exportJSON() {
      if (!this.db) this.init();
      return JSON.stringify(this.db, null, 2);
    },

    reset() {
      this.db = blankDatabase();
      this.save();
    }
  };

  window.V301Store = Store;
})(window);
