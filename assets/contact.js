/* Moved out of contact.html (2026-11-03) so the CSP can refuse inline script. */
  // The contact form posts to the Butlr portal (/api/leads/contact), which saves
  // the message in God view and e-mails it to the team. Messages are set in
  // English; in Arabic mode assets/i18n.js swaps each one for its line in
  // assets/i18n-ar.js as it appears (keep the two in step with the portal's
  // wording in src/app/api/leads/contact/contactLead.ts and route.ts).
  (function(){
    var API = window.BUTLR_API || "https://portal.onebutlr.com";
    var ENDPOINT = API + "/api/leads/contact";
    var f = document.getElementById("contactForm");
    if (!f) return;
    var status = f.querySelector(".cstatus"), btn = f.querySelector(".cbtn");
    var fName = document.getElementById("cf-name"), fEmail = document.getElementById("cf-email");
    var fSubject = document.getElementById("cf-subject"), fMessage = document.getElementById("cf-message");
    var hp = document.getElementById("hp-c");
    var SEND = "Send message", SENDING = "Sending…";
    var GENERIC = "Something went wrong. Please email info@onebutlr.com.";
    var arabic = function(){ return !!(window.ButlrI18n && ButlrI18n.lang === "ar"); };

    function show(kind, msg){
      // In Arabic, a server sentence the dictionary does not know is shown as the general Arabic one.
      if (kind === "err" && arabic() && window.ButlrI18n.t(msg) == null) msg = GENERIC;
      status.className = "cstatus" + (kind ? " " + kind : "");
      status.textContent = msg || "";
    }
    function invalid(el, msg){
      el.setAttribute("aria-invalid", "true");
      show("err", msg);
      try { el.focus(); } catch(e){}
      return false;
    }
    [fName, fEmail, fMessage].forEach(function(el){
      el.addEventListener("input", function(){ el.removeAttribute("aria-invalid"); });
    });
    function valid(){
      [fName, fEmail, fMessage].forEach(function(el){ el.removeAttribute("aria-invalid"); });
      if (!fName.value.trim()) return invalid(fName, "Please enter your name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fEmail.value.trim())) return invalid(fEmail, "Please enter a valid email address.");
      if (!fMessage.value.trim()) return invalid(fMessage, "Please write your message.");
      return true;
    }

    // Cloudflare Turnstile. The portal returns its public site key when the
    // owner has switched the check on; the route then refuses a message
    // without a token, so the widget is drawn above the button and its token
    // sent as turnstileToken (action "contact", the one the route expects).
    var tsKey = null, tsWidget = null, tsToken = "";
    function withTurnstile(cb){
      if (window.turnstile) return cb();
      var s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true; s.onload = cb;
      document.head.appendChild(s);
    }
    function showTurnstile(){
      if (!tsKey) return;
      var box = document.getElementById("ts-box"); box.hidden = false;
      withTurnstile(function(){
        if (tsWidget !== null){ try { window.turnstile.reset(tsWidget); } catch(e){} tsToken = ""; return; }
        tsWidget = window.turnstile.render(box, {
          sitekey: tsKey, action: "contact",
          size: box.offsetWidth && box.offsetWidth < 300 ? "compact" : "normal",
          callback: function(t){ tsToken = t; },
          "expired-callback": function(){ tsToken = ""; },
          "error-callback": function(){ tsToken = ""; }
        });
      });
    }
    function loadKey(){
      return fetch(ENDPOINT, { method: "GET" })
        .then(function(r){ return r.ok ? r.json() : {}; })
        .then(function(j){
          tsKey = (j && typeof j.turnstileSiteKey === "string" && j.turnstileSiteKey) ? j.turnstileSiteKey : null;
          showTurnstile();
        })
        .catch(function(){ /* no key: the message still goes, the portal decides */ });
    }
    loadKey();

    var sending = false;
    f.addEventListener("submit", function(e){
      e.preventDefault();
      if (sending) return;
      if (!valid()) return;
      if (tsKey && !tsToken) { show("err", "Please complete the security check above, then send your message."); return; }
      sending = true;
      btn.disabled = true; btn.textContent = SENDING; show("", "");
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fName.value.trim(),
          email: fEmail.value.trim(),
          subject: fSubject.value,
          message: fMessage.value,
          lang: arabic() ? "ar" : "en",
          website: hp ? hp.value : "",
          turnstileToken: tsToken || undefined
        })
      }).then(function(r){
        return r.json().catch(function(){ return {}; }).then(function(j){ return { ok: r.ok, status: r.status, j: j || {} }; });
      }).then(function(res){
        if (res.ok && res.j.ok && res.j.id){
          show("ok", "Thank you. Your message has been sent, we will be in touch shortly.");
          f.reset();
          return;
        }
        if (res.ok && res.j.ok){
          // "ok" with no id means nothing was saved (an autofilled hidden field): never shown as sent.
          show("err", "Your message could not be sent. Please refresh the page and try again.");
          return;
        }
        if (res.j.code === "turnstile" && !tsKey) loadKey();
        show("err", (typeof res.j.error === "string" && res.j.error) ? res.j.error : GENERIC);
      }).catch(function(){
        show("err", "Could not send. Please email info@onebutlr.com.");
      }).then(function(){
        sending = false;
        btn.disabled = false; btn.textContent = SEND;
        // A Turnstile token is good for one request: draw a fresh check for the next one.
        if (tsKey && tsWidget !== null && window.turnstile){ try { window.turnstile.reset(tsWidget); } catch(e){} tsToken = ""; }
      });
    });
  })();
  var nav=document.getElementById('nav');addEventListener('scroll',function(){if(nav)nav.classList.add('solid');});
  (function(){var els=document.querySelectorAll('.reveal:not(.in)');if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in');});return;}var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});},{threshold:.12});els.forEach(function(e){io.observe(e);});})();
