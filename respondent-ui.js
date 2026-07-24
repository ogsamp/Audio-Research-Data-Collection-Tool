/* V300 Enterprise Respondent UI Module v4.1A */
const RespondentUI={
 survey:null,
 init(){this.createContainer();this.showWelcome();},
 createContainer(){
  let p=document.getElementById('respondentPage');
  if(!p){p=document.createElement('div');p.id='respondentPage';p.className='page hidden';document.body.appendChild(p);}
 },
 loadSurvey(s){this.survey=s;this.showWelcome();},
 showWelcome(){
  const p=document.getElementById('respondentPage'); if(!p)return;
  const s=this.survey||{title:'No Published Survey',organisation:'',project:'-',version:'-',questions:[]};
  p.innerHTML=`<div class="respondent-shell"><div class="survey-card">
  <h1>${s.title}</h1><p>${s.organisation}</p>
  <table class="survey-information">
  <tr><td>Project</td><td>${s.project}</td></tr>
  <tr><td>Version</td><td>${s.version}</td></tr>
  <tr><td>Questions</td><td>${s.questions.length}</td></tr>
  </table>
  <label><input id="consentBox" type="checkbox"> I voluntarily agree to participate.</label>
  <br><button id="btnStartInterview" disabled>Start Interview</button>
  </div></div>`;
  const c=document.getElementById('consentBox');
  const b=document.getElementById('btnStartInterview');
  c.onchange=()=>b.disabled=!c.checked;
  b.onclick=()=>document.dispatchEvent(new CustomEvent('V300_START_INTERVIEW'));
 }
};
window.addEventListener('DOMContentLoaded',()=>RespondentUI.init());
