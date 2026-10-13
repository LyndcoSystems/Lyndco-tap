(() => {
"use strict";
const API="https://vikzpaetwkkztehumuqe.supabase.co/functions/v1/time-admin";
const app=document.getElementById("app");
const badge=document.getElementById("adminBadge");
const tokenKey="lyndco_time_admin_token";
const adminKey="lyndco_time_admin_code";
const token=()=>localStorage.getItem(tokenKey)||"";
const admin=()=>localStorage.getItem(adminKey)||"";
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function showBadge(){if(admin()){badge.textContent=admin();badge.classList.remove("hidden")}else badge.classList.add("hidden")}
async function api(action,opts={}){
 const headers={"Content-Type":"application/json",...(opts.auth===false?{}:{"Authorization":"Bearer "+token()})};
 const res=await fetch(API+"/"+action,{method:opts.method||"GET",headers,body:opts.body?JSON.stringify(opts.body):undefined,cache:"no-store"});
 if(opts.binary){if(!res.ok){let e="Request failed";try{e=(await res.json()).error||e}catch{}throw new Error(e)}return res}
 const data=await res.json().catch(()=>({error:"Invalid response"}));
 if(!res.ok)throw new Error(data.error||"Request failed");
 return data;
}
function pairScreen(msg=""){
 app.innerHTML='<section class="card"><h2>Admin setup</h2><p class="muted">Pair this device once. No emails are sent by this screen.</p>'+
 (msg?'<p class="red">'+esc(msg)+'</p>':'')+
 '<div class="field"><label>Admin</label><select id="who"><option>SL</option><option>JMP</option></select></div>'+
 '<div class="field"><label>6-digit setup code</label><input id="code" inputmode="numeric" maxlength="6"></div>'+
 '<button class="primary" id="pair">Pair device</button></section>';
 document.getElementById("pair").addEventListener("click",async()=>{
  try{
   const d=await api("pair",{method:"POST",auth:false,body:{admin_code:document.getElementById("who").value,code:document.getElementById("code").value.trim()}});
   localStorage.setItem(tokenKey,d.token);localStorage.setItem(adminKey,d.admin.code);showBadge();load();
  }catch(e){pairScreen(e.message)}
 });
}
function fmtNum(n){const x=Number(n??0);return Number.isFinite(x)?x.toFixed(2):"0.00"}
function issueCard(x){
 const status=x.status==="red"?"RED":"AMBER";
 return '<section class="card queueItem '+(x.status==="red"?"redline":"")+'" data-id="'+esc(x.id)+'">'+
 '<div class="sectionTitle"><div><span class="pill">'+status+'</span> <strong>'+esc(x.employee_code)+'</strong> · '+esc(x.work_date)+'</div><div class="small muted">'+esc(x.exception_type||"No explanation yet")+'</div></div>'+
 '<div class="grid"><div class="metric">Start<b>'+esc(x.start_local?String(x.start_local).slice(11,16):"—")+'</b></div><div class="metric">Finish<b>'+esc(x.end_local?String(x.end_local).slice(11,16):"—")+'</b></div></div>'+
 '<p class="small"><strong>Employee note:</strong> '+esc(x.employee_note||"—")+'</p>'+
 '<div class="field"><label>Unpaid adjustment hours (from JW, if any)</label><input class="unpaid" type="number" min="0" step="0.25" value="'+esc(x.unpaid_adjustment_hours??0)+'"></div>'+
 '<div class="field"><label>Bookkeeper note</label><textarea class="review" rows="2">'+esc(x.review_note||"")+'</textarea></div>'+
 '<div class="actions"><button class="primary approve">Approve</button><button class="danger reopen">Keep / mark red</button></div>'+
 '</section>';
}
async function downloadPeriod(start){
 try{
  const res=await api("export?start="+encodeURIComponent(start),{binary:true});
  const blob=await res.blob();const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  const cd=res.headers.get("content-disposition")||"";const m=/filename="([^"]+)"/.exec(cd);a.download=m?m[1]:"Lyndco_Time.xlsx";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 }catch(e){alert(e.message)}
}
function render(state){
 const q=state.queue||[];const red=q.filter(x=>x.status==="red").length;const amber=q.filter(x=>x.status==="amber").length;
 const ps=state.periods||[];const current=state.current_period||{};
 app.innerHTML=
 '<section class="card"><div class="sectionTitle"><div><h2 style="margin:0">Payroll control</h2><p class="muted small" style="margin:.35rem 0 0">4–4–5 cycle · current period '+esc(current.start||"")+' to '+esc(current.end||"")+'</p></div></div>'+
 '<div class="grid"><div class="metric">Amber<b class="amber">'+amber+'</b></div><div class="metric">Red<b class="red">'+red+'</b></div></div></section>'+
 '<section class="card"><div class="sectionTitle"><h3 style="margin:0">Excel export</h3></div><div class="row"><select id="periodSelect" style="flex:1;background:#091b24;color:#fff;border:1px solid #31515f;border-radius:12px;padding:12px">'+
 ps.map(p=>'<option value="'+esc(p.start)+'" '+(p.start===current.start?"selected":"")+'>'+esc(p.start)+' → '+esc(p.end)+' ('+esc(p.weeks)+' weeks)</option>').join("")+
 '</select><button class="secondary" id="download">Download .xlsx</button></div><p class="muted small">Export includes Payroll Summary and Daily Detail tabs. No email is sent.</p></section>'+
 '<section class="card"><div class="sectionTitle"><h3 style="margin:0">Review queue</h3><span class="muted small">'+q.length+' item(s)</span></div>'+
 (q.length?'<p class="muted small">Green machine-recorded days do not appear here.</p>':'<p class="ok">Nothing needs review.</p>')+'</section>'+
 q.map(issueCard).join("");
 document.getElementById("download").addEventListener("click",()=>downloadPeriod(document.getElementById("periodSelect").value));
 document.querySelectorAll(".approve").forEach(btn=>btn.addEventListener("click",async()=>{
  const card=btn.closest(".queueItem");btn.disabled=true;btn.textContent="Saving…";
  try{await api("approve",{method:"POST",body:{shift_id:card.dataset.id,unpaid_adjustment_hours:Number(card.querySelector(".unpaid").value||0),review_note:card.querySelector(".review").value}});load()}
  catch(e){alert(e.message);btn.disabled=false;btn.textContent="Approve"}
 }));
 document.querySelectorAll(".reopen").forEach(btn=>btn.addEventListener("click",async()=>{
  const card=btn.closest(".queueItem");
  try{await api("reopen",{method:"POST",body:{shift_id:card.dataset.id,review_note:card.querySelector(".review").value}});load()}
  catch(e){alert(e.message)}
 }));
}
async function load(){
 showBadge();
 if(!token()){pairScreen();return}
 app.innerHTML='<section class="card"><p class="muted">Loading Lyndco Time…</p></section>';
 try{render(await api("state"))}catch(e){
  if(/paired/i.test(e.message)){localStorage.removeItem(tokenKey);localStorage.removeItem(adminKey);showBadge();pairScreen("Please pair this device.");return}
  app.innerHTML='<section class="card"><p class="red">'+esc(e.message)+'</p><button class="secondary" id="retry">Retry</button></section>';document.getElementById("retry").addEventListener("click",load);
 }
}
load();
})();