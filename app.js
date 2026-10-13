(() => {
  "use strict";

  const FALLBACK = "https://demo.lyndcosystems.com";
  const ENDPOINT = "https://vikzpaetwkkztehumuqe.supabase.co/functions/v1/review-redirect";

  const parts = window.location.pathname.split("/").filter(Boolean);
  const tagId = (parts[0] || "").toUpperCase().trim();

  if (!/^[A-Z0-9]{3,12}$/.test(tagId)) {
    window.location.replace(FALLBACK);
    return;
  }

  window.location.replace(`${ENDPOINT}/${encodeURIComponent(tagId)}`);
})();
