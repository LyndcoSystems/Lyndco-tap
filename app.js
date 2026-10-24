(() => {
  "use strict";
  const FALLBACK="https://demo.lyndcosystems.com";
  const REVIEW_ENDPOINT="https://vikzpaetwkkztehumuqe.supabase.co/functions/v1/review-redirect";
  const parts=window.location.pathname.split("/").filter(Boolean);

  if ((parts[0]||"").toLowerCase()==="callback") {
    window.location.replace("/callback-order.html");
    return;
  }

  if ((parts[0]||"").toLowerCase()==="c") {
    const slug=(parts[1]||"").toUpperCase().trim();
    if(!/^CB[A-Z0-9]{10}$/.test(slug)){window.location.replace(FALLBACK);return;}
    window.location.replace("/callback.html?slug="+encodeURIComponent(slug));
    return;
  }

  if ((parts[0]||"").toLowerCase()==="time-admin") {
    window.location.replace("/time-admin.html");
    return;
  }

  if ((parts[0]||"").toLowerCase()==="time") {
    const vehicle=(parts[1]||"").toUpperCase().trim();
    const target=vehicle ? "/time.html?vehicle="+encodeURIComponent(vehicle) : "/time.html";
    window.location.replace(target);
    return;
  }

  const tagId=(parts[0]||"").toUpperCase().trim();
  if(!/^[A-Z0-9]{3,12}$/.test(tagId)){window.location.replace(FALLBACK);return;}
  window.location.replace(REVIEW_ENDPOINT+"/"+encodeURIComponent(tagId));
})();