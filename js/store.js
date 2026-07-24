/*!
 * V301 Enterprise Research Platform
 * Version: 301.0.2B-HOTFIX
 * File: js/store.js
 */
(function (window) {
"use strict";

const DB_KEY = "v301.enterprise.db";

function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "v301-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function newDatabase() {
  const now = new Date().toISOString();
  return {
    version: "301.0.2B-HOTFIX",
    created: now,
    updated: now,
    projects: [],
    questionnaires: [],
    respondents: [],
    responses: [],
    settings: { theme: "light", language: "en", autosave: true },
    syncQueue: []
  };
}

const Store = {
  db: null,

  init() {
    this.db = this.load();
    console.info("V301 Store initialized");
    return this.db;
  },

  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) {
        const db = newDatabase();
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        return db;
      }
      const parsed = JSON.parse(raw);
      return Object.assign(newDatabase(), parsed);
    } catch (error) {
      console.error("Store load failed:", error);
      const db = newDatabase();
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      return db;
    }
  },

  save(db = this.db) {
    if (!db) db = newDatabase();
    db.updated = new Date().toISOString();
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    this.db = db;
    return db;
  },

  collection(name) {
    if (!this.db) this.init();
    if (!Array.isArray(this.db[name])) throw new Error(`Unknown collection: ${name}`);
    return this.db[name];
  },

  list(name) {
    return [...this.collection(name)];
  },

  get(name, id) {
    return this.collection(name).find((record) => record.id === id) || null;
  },

  add(name, record = {}) {
    const now = new Date().toISOString();
    const saved = { ...record, id: record.id || uid(), createdAt: now, updatedAt: now };
    this.collection(name).push(saved);
    this.save();
    return saved;
  },

  update(name, id, changes = {}) {
    const record = this.get(name, id);
    if (!record) return null;
    Object.assign(record, changes, { updatedAt: new Date().toISOString() });
    this.save();
    return record;
  },

  remove(name, id) {
    const collection = this.collection(name);
    const index = collection.findIndex((record) => record.id === id);
    if (index < 0) return false;
    collection.splice(index, 1);
    this.save();
    return true;
  },

  queueSync(item = {}) {
    const queued = { ...item, id: item.id || uid(), queuedAt: new Date().toISOString() };
    this.db.syncQueue.push(queued);
    this.save();
    return queued;
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
    return JSON.stringify(this.db || this.init(), null, 2);
  },

  importJSON(json) {
    const parsed = JSON.parse(json);
    this.db = Object.assign(newDatabase(), parsed);
    return this.save();
  },

  reset() {
    this.db = newDatabase();
    return this.save();
  }
};

window.V301Store = Store;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Store.init(), { once: true });
} else {
  Store.init();
}

})(window);
