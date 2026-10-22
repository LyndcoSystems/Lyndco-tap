(() => {
"use strict";
const API="https://vikzpaetwkkztehumuqe.supabase.co/functions/v1/time-api";
const EMPLOYEES=["PC","AC","BR","JG","JMH","JB","TH"];
const app=document.getElementById("app");
const badge=document.getElementById("employeeBadge");
const params=new URLSearchParams(location.search);
const vehicle=(params.get("vehicle")||"").toUpperCase();
const tokenKey="lyndco_time_device_token";
const employeeKey="lyndco_time_employee";
const token=()=>localStorage.getItem(tokenKey)||"";
const employee=()=>localStorage.getItem(employeeKey)||"";

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function localClock(iso){if(!iso)return"";return new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/London",hour12:false}).format(new Date(iso))}
function showBadge(){if(employee()){badge.textContent=employee();badge.classList.remove("hidden")}else badge.classList.add("hidden")}
async function api(action,opts={}){
 const headers={"Content-Type":"application/json",...(opts.auth===false?{}:{"Authorization":"Bearer "+token()})};
 const res=await fetch(API+"/"+action,{method:opts.method||"GET",headers,body:opts.body?JSON.stringify(opts.body):undefined,cache:"no-store"});
 const data=await res.json().catch(()=>({error:"Invalid response"}));
 if(!res.ok)throw new Error(data.error||"Request failed");
 return data;
}
function pairScreen(msg=""){
 app.innerHTML='<section class="card"><h2>Pair this phone</h2><p class="muted">One-time setup. After this, the phone remembers the employee.</p>'+
 (msg?'<p class="red">'+esc(msg)+'</p>':'')+
 '<div class="field"><label>Employee</label><select id="emp">'+EMPLOYEES.map(x=>'<option>'+x+'</option>').join("")+'</select></div>'+
 '<div class="field"><label>6-digit setup code</label><input id="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div>'+
 '<button class="primary" id="pairBtn">Pair phone</button></section>';
 document.getElementById("pairBtn").addEventListener("click",async()=>{
   const btn=document.getElementById("pairBtn");btn.disabled=true;btn.textContent="Pairing…";
   try{
    const data=await api("pair",{method:"POST",auth:false,body:{employee_code:document.getElementById("emp").value,code:document.getElementById("code").value.trim()}});
    localStorage.setItem(tokenKey,data.token);localStorage.setItem(employeeKey,data.employee_code);showBadge();await route();
   }catch(e){pairScreen(e.message)}
 });
}
function overnightPrompt(shift){
 app.insertAdjacentHTML("beforeend",'<section class="card"><h3>Do you need to claim an overnight stay?</h3><div class="choiceRow"><button class="primary" id="overnightYes">Yes</button><button class="secondary" id="overnightNo">No</button></div></section>');
 for(const [id,val] of [["overnightYes",true],["overnightNo",false]]){
  document.getElementById(id).addEventListener("click",async()=>{
   try{await api("overnight",{method:"POST",body:{shift_id:shift.id,overnight:val}});app.querySelectorAll(".card")[1]?.remove();app.insertAdjacentHTML("beforeend",'<section class="card"><p class="ok"><strong>Saved.</strong> You can close this page.</p></section>')}catch(e){alert(e.message)}
  });
 }
}
function forgottenStart(shift){
 app.insertAdjacentHTML("beforeend",'<section class="card"><button class="secondary" id="forgotStart">I forgot to tap at the start</button></section>');
 document.getElementById("forgotStart").addEventListener("click",()=>exceptionForm({id:shift.id,work_date:shift.work_date,start_at:shift.start_at}, "missed_start"));
}
function eventScreen(data){
 const s=data.shift||{};
 if(data.event==="start"){
  app.innerHTML='<section class="card hero"><div class="pill">GREEN</div><div class="status ok">START RECORDED</div><div class="bigtime">'+esc(localClock(s.start_at))+'</div><div class="vehicle">'+esc(s.start_vehicle||vehicle)+'</div><p class="muted">No further action needed.</p></section>';
  forgottenStart(s); return;
 }
 if(data.event==="duplicate_ignored"){
  app.innerHTML='<section class="card hero"><div class="pill">GREEN</div><div class="status ok">START ALREADY RECORDED</div><div class="bigtime">'+esc(localClock(s.start_at))+'</div><p class="muted">Duplicate tap ignored.</p></section>';return;
 }
 if(data.event==="end"){
  app.innerHTML='<section class="card hero"><div class="pill">GREEN</div><div class="status ok">FINISH RECORDED</div><div class="bigtime">'+esc(localClock(s.end_at))+'</div><div class="vehicle">'+esc(s.end_vehicle||vehicle)+'</div><p class="muted">'+esc(s.actual_hours??"")+' hours recorded.</p></section>';
  overnightPrompt(s); return;
 }
 if(data.event==="already_complete"){
  app.innerHTML='<section class="card hero"><div class="status ok">TODAY IS COMPLETE</div><p class="muted">Start '+esc(localClock(s.start_at))+' · Finish '+esc(localClock(s.end_at))+'</p></section>';return;
 }
}
function exceptionForm(issue,preset=""){
 const date=issue.work_date;
 const type=preset||issue.exception_type||"";
 app.innerHTML='<section class="card"><h2>Fix '+esc(date)+'</h2><p class="muted">Anything entered here is marked AMBER for bookkeeper review.</p>'+
 '<div class="field"><label>What happened?</label><select id="reason">'+
 '<option value="holiday">Holiday</option><option value="sickness">Sickness</option><option value="admin">Admin / WFH</option><option value="forgot_both">Forgot both taps</option><option value="missed_start">Missed start tap</option><option value="missed_end">Missed end tap</option><option value="other">Other</option></select></div>'+
 '<div id="times"></div><div class="field"><label>Note (optional)</label><textarea id="note" rows="2"></textarea></div><button class="primary" id="saveException">Send for review</button><button class="secondary" id="cancelException">Cancel</button></section>';
 const reason=document.getElementById("reason");reason.value=type||"holiday";
 function renderTimes(){
  const r=reason.value;let h="";
  if(r==="forgot_both"||r==="missed_start")h+='<div class="field"><label>Start time</label><input id="startTime" type="time"></div>';
  if(r==="forgot_both"||r==="missed_end")h+='<div class="field"><label>Finish time</label><input id="endTime" type="time"></div>';
  document.getElementById("times").innerHTML=h;
 }
 renderTimes();reason.addEventListener("change",renderTimes);
 document.getElementById("cancelException").addEventListener("click",route);
 document.getElementById("saveException").addEventListener("click",async()=>{
  const r=reason.value;const body={work_date:date,exception_type:r,note:document.getElementById("note").value};
  const st=document.getElementById("startTime")?.value;const et=document.getElementById("endTime")?.value;
  if(st)body.start_at=new Date(date+"T"+st+":00").toISOString();
  if(et)body.end_at=new Date(date+"T"+et+":00").toISOString();
  try{await api("exception",{method:"POST",body});app.innerHTML='<section class="card hero"><div class="status amber">SENT FOR REVIEW</div><p class="muted">Your correction is marked amber for the bookkeeper.</p></section>'}catch(e){alert(e.message)}
 });
}
function issuesScreen(state){
 const unresolved=state.unresolved||[];
 if(!unresolved.length){
  app.innerHTML='<section class="card hero"><div class="status ok">ALL CLEAR</div><p class="muted">No attendance issues need your attention.</p></section>';return;
 }
 app.innerHTML='<section class="card"><h2>Attendance needs checking</h2><p class="muted">Tap an item to explain or correct it.</p></section>'+
 unresolved.map((x,i)=>'<section class="card issue '+(x.status==="red"?"redline":"")+'"><div class="row"><div><strong>'+esc(x.work_date)+'</strong><br><span class="small muted">'+esc(x.exception_type||"No attendance recorded")+'</span></div><button class="secondary fixBtn" data-i="'+i+'" style="width:auto;margin:0">Fix</button></div></section>').join("");
 document.querySelectorAll(".fixBtn").forEach(b=>b.addEventListener("click",()=>exceptionForm(unresolved[Number(b.dataset.i)])));
}
async function route(){
 showBadge();
 if(!token()){pairScreen();return}
 try{
  if(vehicle){
   const nav=performance.getEntriesByType("navigation")[0];
   if(nav&&nav.type==="reload"){
    const state=await api("state");issuesScreen(state);return;
   }
   const data=await api("tap",{method:"POST",body:{vehicle}});
   eventScreen(data);
  }else{
   const state=await api("state");issuesScreen(state);
  }
 }catch(e){
  if(/paired/i.test(e.message)){localStorage.removeItem(tokenKey);localStorage.removeItem(employeeKey);showBadge();pairScreen("Please pair this phone again.");return}
  app.innerHTML='<section class="card"><p class="red"><strong>Error:</strong> '+esc(e.message)+'</p><button class="secondary" id="retry">Try again</button></section>';
  document.getElementById("retry").addEventListener("click",route);
 }
}
route();
})();