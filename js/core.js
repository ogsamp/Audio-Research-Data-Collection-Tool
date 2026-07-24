
/*!
 * V301 Enterprise Research Platform
 * Version: 301.0.2A
 * File: js/core.js
 */

(function (window, document) {
"use strict";

const Core = {
    version: "301.0.2A",
    state: {
        currentModule: "dashboard",
        theme: localStorage.getItem("v301.theme") || "light",
        initialized: false
    },

    init() {
        this.cache();
        this.bind();
        this.applyTheme(this.state.theme);
        this.hideLoader();
        this.state.initialized = true;
        console.info("V301 Core initialized");
    },

    cache() {
        this.ui = {
            sidebar: document.getElementById("sideBar"),
            menuButton: document.getElementById("menuButton"),
            navItems: document.querySelectorAll(".navItem"),
            moduleTitle: document.getElementById("moduleTitle"),
            moduleDescription: document.getElementById("moduleDescription"),
            workspace: document.getElementById("workspaceContent"),
            loading: document.getElementById("loadingScreen"),
            themeButton: document.getElementById("themeButton")
        };
    },

    bind() {
        if (this.ui.menuButton) {
            this.ui.menuButton.addEventListener("click", () => {
                document.body.classList.toggle("sidebar-open");
            });
        }

        this.ui.navItems.forEach(btn => {
            btn.addEventListener("click", () => {
                this.loadModule(btn.dataset.module || "dashboard");
            });
        });

        if (this.ui.themeButton) {
            this.ui.themeButton.addEventListener("click", () => {
                this.toggleTheme();
            });
        }

        window.addEventListener("hashchange", () => {
            const hash = location.hash.replace("#","") || "dashboard";
            this.loadModule(hash,false);
        });
    },

    loadModule(name, updateHash=true) {
        this.state.currentModule = name;

        this.ui.navItems.forEach(n => n.classList.remove("active"));
        const active = [...this.ui.navItems].find(n => n.dataset.module===name);
        if(active) active.classList.add("active");

        if(updateHash) location.hash = name;

        if(this.ui.moduleTitle)
            this.ui.moduleTitle.textContent =
                name.replace(/-/g," ").replace(/\b\w/g,m=>m.toUpperCase());

        if(this.ui.moduleDescription)
            this.ui.moduleDescription.textContent =
                "Enterprise module: " + name;

        if(this.ui.workspace){
            this.ui.workspace.innerHTML = `
                <div class="placeholderCard">
                    <h3>${this.ui.moduleTitle.textContent}</h3>
                    <p>This module will be implemented in the next build.</p>
                </div>`;
        }

        this.toast(`${this.ui.moduleTitle.textContent} loaded`,"info");
    },

    applyTheme(theme){
        document.body.classList.toggle("dark",theme==="dark");
        this.state.theme = theme;
        localStorage.setItem("v301.theme",theme);
    },

    toggleTheme(){
        this.applyTheme(this.state.theme==="dark"?"light":"dark");
    },

    hideLoader(){
        if(!this.ui.loading) return;
        setTimeout(()=>{
            this.ui.loading.style.display="none";
        },600);
    },

    toast(message,type="info"){
        const container=document.getElementById("toastContainer");
        if(!container) return;

        const t=document.createElement("div");
        t.className=`toast toast-${type}`;
        t.textContent=message;
        container.appendChild(t);

        setTimeout(()=>{
            t.remove();
        },3000);
    }
};

window.V301Core = Core;

document.addEventListener("DOMContentLoaded",()=>{
    Core.init();
    const initial = location.hash.replace("#","") || "dashboard";
    Core.loadModule(initial,false);
});

})(window,document);
