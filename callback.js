(() => {
"use strict";
const API="https://vikzpaetwkkztehumuqe.supabase.co/functions/v1/callback-contact";
const app=document.getElementById("app");
const slug=new URLSearchParams(location.search).get("slug")||"";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const tel=s=>String(s||"").replace(/[^+0-9]/g,"");
async function load(){
 try{
  const r=await fetch(API+"?slug="+encodeURIComponent(slug),{cache:"no-store"});
  const d=await r.json();
  if(!r.ok)throw new Error("Not found");
  const buttons=[];
  if(d.emergency_phone)buttons.push('<a class="action emergency" href="tel:'+esc(tel(d.emergency_phone))+'">Emergency contact</a>');
  if(d.landline)buttons.push('<a class="action" href="tel:'+esc(tel(d.landline))+'">Call us</a>');
  if(d.whatsapp)buttons.push('<a class="action" href="https://wa.me/'+esc(tel(d.whatsapp).replace(/^\+/,""))+'">WhatsApp us</a>');
  if(d.email)buttons.push('<a class="action secondary" href="mailto:'+esc(d.email)+'">Email us</a>');
  if(d.website)buttons.push('<a class="action secondary" href="'+esc(d.website)+'">Visit website</a>');
  app.innerHTML='<h1>'+esc(d.business_name)+'</h1><p class="lead">Tap. Contact. Sorted.</p><div class="actions">'+buttons.join("")+'</div>';
 }catch{
  app.innerHTML='<p class="error"><strong>This contact link is unavailable.</strong></p>';
 }
}
load();
})();