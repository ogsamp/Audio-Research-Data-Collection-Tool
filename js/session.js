/*
V300 Enterprise
Section 4.1B - Session Manager
*/

const SessionManager={
 storageKey:"V300_ACTIVE_SESSION",
 counterKey:"V300_RESPONDENT_COUNTER",
 session:null,

 init(){
   document.addEventListener("V300_START_INTERVIEW",()=>this.startInterview());
   this.checkResume();
 },

 nextRespondentId(){
   let n=parseInt(localStorage.getItem(this.counterKey)||"0",10)+1;
   localStorage.setItem(this.counterKey,String(n));
   return "R"+String(n).padStart(6,"0");
 },

 startInterview(){
   const survey=(window.RespondentUI&&RespondentUI.survey)||{
      project:"Unknown",
      version:"1.0",
      title:"Survey"
   };

   this.session={
      sessionId:"SES-"+Date.now(),
      respondentId:this.nextRespondentId(),
      project:survey.project,
      surveyTitle:survey.title,
      questionnaireVersion:survey.version,
      status:"IN_PROGRESS",
      startedAt:new Date().toISOString(),
      completedAt:null,
      uploadPending:true,
      gpsPending:true
   };

   this.save();

   alert(
      "Interview Started\n\n"+
      "Respondent: "+this.session.respondentId+
      "\nProject: "+this.session.project
   );

   console.log("Session",this.session);
 },

 save(){
   localStorage.setItem(this.storageKey,JSON.stringify(this.session));
 },

 load(){
   const s=localStorage.getItem(this.storageKey);
   if(!s)return null;
   try{
      this.session=JSON.parse(s);
      return this.session;
   }catch(e){
      return null;
   }
 },

 clear(){
   localStorage.removeItem(this.storageKey);
   this.session=null;
 },

 checkResume(){
   const s=this.load();
   if(!s)return;

   setTimeout(()=>{
      if(confirm(
         "An unfinished interview was found.\n\n"+
         "Respondent: "+s.respondentId+
         "\n\nResume?"
      )){
         console.log("Resumed",s);
      }else{
         this.clear();
      }
   },500);
 }
};

window.addEventListener("DOMContentLoaded",()=>SessionManager.init());
