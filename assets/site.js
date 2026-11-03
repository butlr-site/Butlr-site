/* onebutlr.com, shared page behaviour (2026-11-03).
 *
 * Every page loads this file at the end of <body>. It replaces the small
 * inline scripts and the burger's inline onclick, so the Content-Security-Policy
 * in vercel.json can refuse inline script (script-src without 'unsafe-inline').
 * A page that needs its own script loads it as a file too (assets/contact.js,
 * assets/hotels.js, assets/hotel.js); never add an inline <script> or an on*=
 * attribute, the browser blocks it.
 */
(function () {
  var pn = document.getElementById('pn');

  // Menu (phone and iPad portrait): the burger opens and closes it; a link closes it.
  if (pn) {
    var burger = pn.querySelector('.burger');
    var setOpen = function (open) {
      pn.classList.toggle('open', open);
      if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    if (burger) burger.addEventListener('click', function () { setOpen(!pn.classList.contains('open')); });
    pn.querySelectorAll('#pn-links a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pn.classList.contains('open')) { setOpen(false); if (burger) burger.focus(); }
    });
  }

  // Home: the hero film plays muted (some browsers wait for a first touch),
  // and the bar stays dark while it is over the film.
  var v = document.getElementById('heroVid');
  if (v) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    v.muted = true;
    var play = function () { if (reduce) return; var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    if (reduce) { v.removeAttribute('autoplay'); try { v.pause(); } catch (e) {} }
    play();
    ['touchstart', 'click', 'scroll', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, play, { once: true, passive: true });
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) play(); });
    if (pn) {
      var dark = function () { pn.classList.toggle('dark', window.scrollY < window.innerHeight - 80); };
      dark();
      window.addEventListener('scroll', dark, { passive: true });
    }
  }

  // Legal pages: pressing the contact address also copies it, so it always
  // does something on a device with no mail app (the mailto: still opens).
  if (document.querySelector('.legal')) {
    var toast = function (msg) {
      var t = document.createElement('div');
      t.setAttribute('role', 'status');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:rgba(11,19,32,.96);color:#fff;padding:11px 18px;border-radius:10px;font:14px/1.2 -apple-system,system-ui,sans-serif;z-index:9999;opacity:0;transition:opacity .2s;box-shadow:0 8px 28px rgba(0,0,0,.35);';
      document.body.appendChild(t);
      requestAnimationFrame(function () { t.style.opacity = '1'; });
      setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 250); }, 1700);
    };
    document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
      a.addEventListener('click', function () {
        var email = (a.getAttribute('href') || '').replace(/^mailto:/, '').split('?')[0];
        if (email && navigator.clipboard && navigator.clipboard.writeText) {
          // English here; assets/i18n.js translates the toast on an Arabic page.
          navigator.clipboard.writeText(email).then(function () { toast('Email copied: ' + email); }).catch(function () {});
        }
      });
    });
  }
})();
