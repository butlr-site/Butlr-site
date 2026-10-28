/* Butlr site: English / Arabic.
 *
 * Loaded in <head> on every page. English is the page as written. Arabic is
 * chosen by ?lang=ar (shareable), then the visitor's saved choice, then a
 * browser set to Arabic. In Arabic the page turns right-to-left and every
 * text block whose English matches a line in assets/i18n-ar.js is replaced;
 * anything not in the dictionary stays as written (brand names, emails).
 * Pages that fill text in later (the booking pages) are translated as the
 * text arrives. The switch (English / العربية) is added to the menu.
 */
(function () {
  var KEY = 'butlr.lang';
  // 2026-10-28 (owner): Arabic is hidden for now. No switch in the menu, no
  // automatic Arabic for Arabic browsers, no remembered choice; ?lang=ar
  // still opens it, for review. Set to true to launch it.
  var SHOW_SWITCH = false;
  var doc = document.documentElement;
  var lang = 'en';
  try {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'ar' || q === 'en') { lang = q; if (SHOW_SWITCH) localStorage.setItem(KEY, q); }
    else if (SHOW_SWITCH) {
      var saved = localStorage.getItem(KEY);
      if (saved === 'ar' || saved === 'en') lang = saved;
      else if (/^ar\b/i.test(navigator.language || '')) lang = 'ar';
    }
  } catch (e) { /* storage blocked: English unless ?lang=ar */
    if (/[?&]lang=ar\b/.test(location.search)) lang = 'ar';
  }

  var INLINE = { A: 1, EM: 1, STRONG: 1, B: 1, I: 1, SPAN: 1, BR: 1, SMALL: 1, SUP: 1, SUB: 1, U: 1, ABBR: 1, TIME: 1, CODE: 1 };
  var SKIP = { SCRIPT: 1, STYLE: 1, SVG: 1, NOSCRIPT: 1, TEMPLATE: 1, svg: 1, VIDEO: 1, CANVAS: 1 };
  var ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
  var norm = function (s) { return String(s).replace(/\s+/g, ' ').trim(); };
  var hasWords = function (s) { return /[A-Za-z]/.test(s); };

  function leafish(el) {
    for (var i = 0; i < el.children.length; i++) {
      var c = el.children[i];
      if (!INLINE[c.tagName] || !leafish(c)) return false;
    }
    return true;
  }
  function directText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && /\S/.test(n.nodeValue)) return true;
    return false;
  }
  /** The text blocks of a subtree, in order: an element whose children are
   *  all inline and that holds text of its own. */
  function units(root, out) {
    out = out || [];
    if (root.nodeType !== 1 || SKIP[root.tagName] || root.hasAttribute('data-no-i18n')) return out;
    if (leafish(root) && directText(root)) { out.push(root); return out; }
    // text sitting beside blocks: each piece on its own
    for (var n = root.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) { if (/[A-Za-z]/.test(n.nodeValue)) out.push(n); }
      else if (n.nodeType === 1) units(n, out);
    }
    return out;
  }

  var AR = null;        // { key: arabic html }
  var PAT = [];         // [[RegExp, arabic with $1..]]
  function lookup(en) {
    var k = norm(en);
    if (!k || !hasWords(k)) return null;
    if (Object.prototype.hasOwnProperty.call(AR, k)) return AR[k];
    for (var i = 0; i < PAT.length; i++) if (PAT[i][0].test(k)) return k.replace(PAT[i][0], PAT[i][1]);
    return null;
  }
  function tr(el) {
    if (el.nodeType === 3) {
      if (el.__arDone === el.nodeValue) return;
      var t = lookup(el.nodeValue);
      if (t != null) {
        var lead = /^\s/.test(el.nodeValue) ? ' ' : '', trail = /\s$/.test(el.nodeValue) ? ' ' : '';
        el.nodeValue = lead + t.replace(/<[^>]+>/g, '') + trail; el.__arDone = el.nodeValue;
      }
      return;
    }
    if (el.__arDone && el.innerHTML === el.__arDone) return;
    var ar = lookup(el.innerHTML);
    if (ar != null) { el.innerHTML = ar; el.__arDone = el.innerHTML; }
  }
  function trAttrs(root) {
    var list = root.querySelectorAll ? root.querySelectorAll('[placeholder],[aria-label],[alt],[title]') : [];
    var all = [root].concat(Array.prototype.slice.call(list));
    all.forEach(function (el) {
      if (!el.getAttribute) return;
      ATTRS.forEach(function (a) {
        var v = el.getAttribute(a); if (!v) return;
        var ar = lookup(v); if (ar != null) el.setAttribute(a, ar.replace(/<[^>]+>/g, ''));
      });
    });
  }
  function apply(root) {
    units(root).forEach(tr);
    trAttrs(root);
  }

  // Arabic letters need Arabic fonts: each font stack in the page's CSS gets
  // an Arabic face right after its first family, serif or sans to match, so
  // Latin text (Butlr, emails) keeps the site's own fonts.
  function arabicFonts() {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Noto+Naskh+Arabic:wght@400;500;600&display=swap';
    document.head.appendChild(l);
    var SERIF = /bodoni|dm serif|vogue|didot|georgia|serif\s*$/i;
    var fix = function (ff) {
      if (!ff || /Plex Sans Arabic|Naskh/.test(ff)) return ff;
      var parts = ff.split(',');
      var face = SERIF.test(ff) && !/sans-serif\s*$/i.test(ff) ? "'Noto Naskh Arabic'" : "'IBM Plex Sans Arabic'";
      parts.splice(1, 0, face);
      return parts.join(',');
    };
    for (var i = 0; i < document.styleSheets.length; i++) {
      var rules; try { rules = document.styleSheets[i].cssRules; } catch (e) { continue; }
      if (!rules) continue;
      (function walk(rs) {
        for (var j = 0; j < rs.length; j++) {
          var r = rs[j];
          if (r.cssRules && !r.style) { walk(r.cssRules); continue; }
          if (r.cssRules) walk(r.cssRules);
          if (r.style && r.style.fontFamily) r.style.fontFamily = fix(r.style.fontFamily);
        }
      })(rules);
    }
    document.querySelectorAll('[style*="font"]').forEach(function (el) {
      if (el.closest('svg')) return;
      if (el.style.fontFamily) el.style.fontFamily = fix(el.style.fontFamily);
    });
  }

  function switcher() {
    if (!SHOW_SWITCH) return;
    var other = lang === 'ar' ? 'en' : 'ar';
    var href = function () {
      var u = new URL(location.href); u.searchParams.set('lang', other); return u.pathname + u.search + u.hash;
    };
    var label = other === 'ar' ? 'العربية' : 'English';
    var mk = function (cls) {
      var a = document.createElement('a');
      a.className = cls; a.href = href(); a.textContent = label;
      a.setAttribute('lang', other); a.setAttribute('hreflang', other); a.setAttribute('data-no-i18n', '');
      a.addEventListener('click', function () { try { localStorage.setItem(KEY, other); } catch (e) {} });
      return a;
    };
    var links = document.querySelector('#nav .nav-links');
    if (links) {
      var cta = links.querySelector('.nav-cta');
      links.insertBefore(mk('hide-sm lang-switch'), cta || null);
    }
    var fb = document.querySelector('footer .fbottom');
    if (fb) { var d = document.createElement('div'); d.appendChild(mk('lang-switch-foot')); fb.appendChild(d); }
    var card = document.querySelector('[data-lang-slot]');
    if (card) card.appendChild(mk('lang-switch-card'));
  }

  // Styles for Arabic (and the switch, in both languages).
  var css = document.createElement('style');
  css.textContent =
    '.lang-switch{font-family:"IBM Plex Sans Arabic",system-ui,sans-serif!important;}' +
    'html[lang=ar] .lang-switch{font-family:"Hanken Grotesk","Inter",system-ui,sans-serif!important;}' +
    '.lang-switch-foot{color:inherit;}' +
    'html.i18n-pending body{visibility:hidden;}' +
    /* Arabic letters join: spacing between letters breaks them apart. */
    'html[lang=ar] body *{letter-spacing:normal!important;text-transform:none!important;}' +
    'html[lang=ar] svg{direction:ltr;}' +
    'html[lang=ar] body{line-height:1.85;}' +
    'html[lang=ar] h1,html[lang=ar] h2,html[lang=ar] h3{line-height:1.45;}' +
    'html[lang=ar] [dir=ltr],html[lang=ar] .ltr{direction:ltr;unicode-bidi:isolate;}' +
    /* lists and arrows drawn on the left in English sit on the right */
    'html[lang=ar] .checks li{padding-left:0;padding-right:30px;}html[lang=ar] .checks li::before{left:auto;right:0;}' +
    'html[lang=ar] .lifelist li{padding-left:0;padding-right:20px;}html[lang=ar] .lifelist li::before{left:auto;right:2px;}' +
    'html[lang=ar] .lifelist .all{padding-right:0;}' +
    '@media (min-width:761px){html[lang=ar] .flow .step:not(:last-child)::after{content:"\\2190";right:auto;left:-7px;}}' +
    'html[lang=ar] input[type=email],html[lang=ar] input[type=tel]{direction:ltr;text-align:right;}';
  document.head.appendChild(css);

  window.ButlrI18n = { lang: lang, units: units, norm: norm };

  if (lang !== 'ar') {
    document.addEventListener('DOMContentLoaded', switcher);
    return;
  }

  doc.lang = 'ar'; doc.dir = 'rtl';
  doc.classList.add('i18n-pending');
  var reveal = function () { doc.classList.remove('i18n-pending'); };
  var safety = setTimeout(reveal, 2500);

  var ready = 0;
  var go = function () {
    if (++ready < 2) return;
    try {
      // Legal pages: the heading in Arabic, the text itself in English (the
      // binding version), shown left to right with a note saying so.
      var legal = document.querySelector('.legal');
      if (legal) {
        [legal, document.querySelector('.legal-hero .lede'), document.querySelector('.legal-end')].forEach(function (el) {
          if (el) { el.setAttribute('dir', 'ltr'); el.setAttribute('lang', 'en'); el.setAttribute('data-no-i18n', ''); el.style.textAlign = 'left'; }
        });
        var lede = document.querySelector('.legal-hero .lede');
        if (lede && window.__butlrLegalNote) {
          var n = document.createElement('p'); n.className = 'lede legal-note'; n.setAttribute('data-no-i18n', '');
          n.textContent = window.__butlrLegalNote; lede.parentNode.insertBefore(n, lede);
        }
      }
      apply(document.body);
      var t = lookup(document.title); if (t) document.title = t.replace(/<[^>]+>/g, '');
      var md = document.querySelector('meta[name=description]');
      if (md) { var d = lookup(md.content); if (d) md.content = d; }
      arabicFonts();
      switcher();
      new MutationObserver(function (ms) {
        ms.forEach(function (m) {
          if (m.type === 'attributes') { trAttrs(m.target); return; }
          var t = m.target.nodeType === 3 ? m.target.parentNode : m.target;
          if (!t || t.nodeType !== 1) return;
          if (t.closest && t.closest('[data-no-i18n]')) return;
          // the changed block itself, or what was added inside it
          if (leafish(t) && directText(t)) tr(t);
          else {
            if (m.type === 'characterData' && m.target.nodeType === 3) tr(m.target);
            m.addedNodes && Array.prototype.forEach.call(m.addedNodes, function (n) {
              if (n.nodeType === 1) apply(n); else if (n.nodeType === 3 && /[A-Za-z]/.test(n.nodeValue)) tr(n);
            });
          }
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    } finally { clearTimeout(safety); reveal(); }
  };
  window.__butlrArabic = function (dict, patterns) {
    AR = {};
    Object.keys(dict).forEach(function (k) { AR[norm(k)] = dict[k]; });
    PAT = (patterns || []).map(function (p) { return [p[0], p[1]]; });
    go();
  };
  var s = document.createElement('script');
  s.src = '/assets/i18n-ar.js?v=2';
  s.onerror = function () { clearTimeout(safety); reveal(); };
  document.head.appendChild(s);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
