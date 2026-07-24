/*!
 * V301 Enterprise Research Platform
 * Version: 301.0.2B
 * File: js/store.js
 */

(function(window){
"use strict";

const DB_KEY="v301.enterprise.db";

const defaultDB=()=>({
  version:"301.0.2B",
  created:new Date().toISOString(),
  updated:new Date().toISOString(),
  projects:[],
  questionnaires:[],
  respondents:[],
  responses:[],
  settings:{
    theme:"light",
    language:"en",
    autosave:true
  },
  syncQueue:[]
});

const Store={
  db:null,

  init(){
    this.db=this.load();
    return this.db;
  },

  load(){
    try{
      const raw=localStorage.getItem(DB_KEY);
      if(!raw){
        const db=defaultDB();
        this.save(db);
        return db;
      }
      return JSON.parse(raw);
    }catch(e){
      console.error(e);
      const db=defaultDB();
      this.save(db);
      return db;
    }
  },

  save(db=this.db){
    db.updated=new Date().toISOString();
    localStorage.setItem(DB_KEY,JSON.stringify(db));
  },

  reset(){
    this.db=defaultDB();
    this.save();
  },

  exportJSON(){
    return JSON.stringify(this.db,null,2);
  },

  importJSON(json){
    this.db=JSON.parse(json);
    this.save();
  },

  collection(name){
    if(!this.db[name]) throw Error("Unknown collection "+name);
    return this.db[name];
  },

  list(name){
    return [...this.collection(name)];
  },

  get(name,id){
    return this.collection(name).find(r=>r.id===id)||null;
  },

  add(name,record){
    record.id=record.id||crypto.randomUUID();
    record.createdAt=new Date().toISOString();
    record.updatedAt=record.createdAt;
    this.collection(name).push(record);
    this.save();
    return record;
  },

  update(name,id,changes){
    const rec=this.get(name,id);
    if(!rec) return null;
    Object.assign(rec,changes);
    rec.updatedAt=new Date().toISOString();
    this.save();
    return rec;
  },

  remove(name,id){
    const c=this.collection(name);
    const i=c.findIndex(r=>r.id===id);
    if(i>-1){
      c.splice(i,1);
      this.save();
      return true;
    }
    return false;
  },

  queueSync(item){
    item.id=item.id||crypto.randomUUID();
    item.queuedAt=new Date().toISOString();
    this.db.syncQueue.push(item);
    this.save();
  },

  clearQueue(){
    this.db.syncQueue=[];
    this.save();
  },

  stats(){
    return {
      projects:this.db.projects.length,
      questionnaires:this.db.questionnaires.length,
      respondents:this.db.respondents.length,
      responses:this.db.responses.length,
      pendingSync:this.db.syncQueue.length
    };
  }
};

window.V301Store=Store;
document.addEventListener("DOMContentLoaded",()=>Store.init());

})(window);
