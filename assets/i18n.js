/* Butlr site: English / Arabic.
 *
 * Loaded in <head> on every page. English is the page as written. Arabic is
 * chosen by ?lang=ar (shareable link), then the visitor's saved choice, then
 * a browser whose first language is Arabic. The switch (English / العربية)
 * sits in the menu and in the footer of every page and remembers the choice.
 *
 * In Arabic the page turns right to left: <html lang="ar" dir="rtl">, every
 * text block whose English matches a line in assets/i18n-ar.js is replaced
 * (legal pages also load assets/i18n-ar-legal.js, named by data-ar="legal"
 * on this script tag), and the page's left/right CSS is mirrored at run time
 * (margins, paddings, borders, positions, text alignment and transforms), so
 * no page needs a second stylesheet. Text the booking pages add later is
 * translated as it arrives. Arabic type is Amiri (headings) and Markazi Text
 * (body) from Google Fonts, scaled up to sit level with the Latin faces, with
 * an Arabic-only unicode range so Latin words keep the site's own fonts.
 */
(function () {
  var KEY = 'butlr.lang';
  var DICT_V = '6';
  var doc = document.documentElement;
  var me = document.currentScript;
  var withLegal = !!(me && me.getAttribute('data-ar') === 'legal');

  var canStore = true;
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) { canStore = false; } }
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { canStore = false; return null; } }

  var lang = 'en';
  var q = null;
  try { q = new URLSearchParams(location.search).get('lang'); }
  catch (e) { var mq = /[?&]lang=(ar|en)\b/.exec(location.search); q = mq && mq[1]; }
  if (q === 'ar' || q === 'en') { lang = q; save(q); }
  else {
    var s = saved();
    if (s === 'ar' || s === 'en') lang = s;
    else {
      var first = (navigator.languages && navigator.languages[0]) || navigator.language || '';
      if (/^ar\b/i.test(first)) lang = 'ar';
    }
  }

  var INLINE = { A: 1, EM: 1, STRONG: 1, B: 1, I: 1, SPAN: 1, BR: 1, SMALL: 1, SUP: 1, SUB: 1, U: 1, ABBR: 1, TIME: 1, CODE: 1, BDI: 1 };
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

  var AR = {};          // { key: arabic html }
  var PAT = [];         // [[RegExp, arabic with $1.. or a function]]
  function lookup(en) {
    var k = norm(en);
    if (!k || !hasWords(k)) return null;
    if (Object.prototype.hasOwnProperty.call(AR, k)) return AR[k];
    for (var i = 0; i < PAT.length; i++) if (PAT[i][0].test(k)) return k.replace(PAT[i][0], PAT[i][1]);
    return null;
  }
  var strip = function (h) { return String(h).replace(/<[^>]+>/g, ''); };
  function tr(el) {
    if (el.nodeType === 3) {
      if (el.__arDone === el.nodeValue) return;
      var t = lookup(el.nodeValue);
      if (t != null) {
        var lead = /^\s/.test(el.nodeValue) ? ' ' : '', trail = /\s$/.test(el.nodeValue) ? ' ' : '';
        el.nodeValue = lead + strip(t) + trail; el.__arDone = el.nodeValue;
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
      if (!el.getAttribute || (el.closest && el.closest('[data-no-i18n]'))) return;
      ATTRS.forEach(function (a) {
        var v = el.getAttribute(a); if (!v) return;
        var ar = lookup(v); if (ar != null) el.setAttribute(a, strip(ar));
      });
    });
  }
  /** Phone numbers, emails and web addresses read left to right inside
   *  Arabic sentences, each in its own isolated run. */
  function isolate(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll('a[href^="mailto:"],a[href^="tel:"],a[href*="wa.me/"]').forEach(function (a) {
      if (!a.hasAttribute('dir') && !/[؀-ۿ]/.test(a.textContent)) a.setAttribute('dir', 'ltr');
    });
  }
  function apply(root) {
    units(root).forEach(tr);
    trAttrs(root);
    isolate(root);
  }

  /* ---------- Mirroring: the page's own CSS, flipped left for right ---------- */
  var PAIRS = [
    ['margin-left', 'margin-right'], ['padding-left', 'padding-right'], ['left', 'right'],
    ['border-left-width', 'border-right-width'], ['border-left-style', 'border-right-style'], ['border-left-color', 'border-right-color'],
    ['border-top-left-radius', 'border-top-right-radius'], ['border-bottom-left-radius', 'border-bottom-right-radius']
  ];
  var neg = function (v) { v = v.trim(); return /^-/.test(v) ? v.slice(1) : (/^0[a-z%]*$/.test(v) ? v : '-' + v); };
  /** A transform seen in a mirror: rotations and horizontal moves change sign. */
  function mirrorTransform(t) {
    return t
      .replace(/rotate(Z?)\(([^)]+)\)/g, function (m, z, a) { return 'rotate' + z + '(' + neg(a) + ')'; })
      .replace(/translateX\(([^)]+)\)/g, function (m, x) { return 'translateX(' + neg(x) + ')'; })
      .replace(/translate\(([^,)]+)(,[^)]+)?\)/g, function (m, x, y) { return 'translate(' + neg(x) + (y || '') + ')'; })
      .replace(/translate3d\(([^,)]+),/g, function (m, x) { return 'translate3d(' + neg(x) + ','; })
      .replace(/skewX\(([^)]+)\)/g, function (m, a) { return 'skewX(' + neg(a) + ')'; });
  }
  /** Values split at the top level (a var() or calc() stays whole). */
  function splitTop(v) {
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < v.length; i++) {
      var c = v[i];
      if (c === '(') depth++; else if (c === ')') depth--;
      if (/\s/.test(c) && !depth) { if (cur) out.push(cur); cur = ''; } else cur += c;
    }
    if (cur) out.push(cur);
    return out;
  }
  /** A shorthand written with var() has no longhands to read: its four
   *  values are mirrored as written (right and left change places). */
  var BOX = ['margin', 'padding', 'border-width', 'border-style', 'border-color', 'inset'];
  function flipVarShorthands(st, done) {
    var bl = st.getPropertyValue('border-left'), br = st.getPropertyValue('border-right');
    if (/var\(/.test(bl + br)) {
      var pl = st.getPropertyPriority('border-left'), pr = st.getPropertyPriority('border-right');
      st.removeProperty('border-left'); st.removeProperty('border-right');
      if (br) st.setProperty('border-left', br, pr);
      if (bl) st.setProperty('border-right', bl, pl);
      done.border = 1;
    }
    BOX.forEach(function (p) {
      var v = st.getPropertyValue(p);
      if (!v || !/var\(/.test(v)) return;
      var parts = splitTop(v);
      if (parts.length === 4) { var t = parts[1]; parts[1] = parts[3]; parts[3] = t; st.setProperty(p, parts.join(' '), st.getPropertyPriority(p)); }
      done[p] = 1;
    });
  }
  function flipStyle(st) {
    if (!st || !st.length) return;
    var done = {};
    flipVarShorthands(st, done);
    PAIRS.forEach(function (p) {
      var side = p[0].replace(/-left|-top-left|-bottom-left/, '').replace(/^(left)$/, 'inset');
      if (done[side] || (done.border && /^border-left-/.test(p[0])) || (done['border-' + p[0].split('-').pop()] && /^border-left-/.test(p[0]))) return;
      var a = p[0], b = p[1];
      var va = st.getPropertyValue(a), vb = st.getPropertyValue(b);
      if (!va && !vb) return;
      if (va === vb && st.getPropertyPriority(a) === st.getPropertyPriority(b)) return;
      var pa = st.getPropertyPriority(a), pb = st.getPropertyPriority(b);
      st.removeProperty(a); st.removeProperty(b);
      if (vb) st.setProperty(a, vb, pb);
      if (va) st.setProperty(b, va, pa);
    });
    ['text-align', 'float', 'clear'].forEach(function (p) {
      var v = st.getPropertyValue(p);
      if (v === 'left' || v === 'right') st.setProperty(p, v === 'left' ? 'right' : 'left', st.getPropertyPriority(p));
    });
    var t = st.getPropertyValue('transform');
    if (t && t !== 'none') { var mt = mirrorTransform(t); if (mt !== t) st.setProperty('transform', mt, st.getPropertyPriority('transform')); }
  }
  var flippedSheets = [];
  var flippedEls = typeof WeakSet === 'function' ? new WeakSet() : null;
  function flipRules(rules) {
    for (var j = 0; j < rules.length; j++) {
      var r = rules[j];
      if (r.type === 7) continue;                      // @keyframes: motion stays as drawn
      if (r.cssRules) flipRules(r.cssRules);           // @media, @supports
      if (r.style && r.selectorText && !/\[(lang|dir)=/.test(r.selectorText)) flipStyle(r.style);
    }
  }
  function flipSheet(sh) {
    if (!sh || flippedSheets.indexOf(sh) !== -1) return;
    var owner = sh.ownerNode;
    if (owner && (owner.id === 'butlr-i18n-css' || owner.id === 'butlr-ar-faces')) return;
    var rules; try { rules = sh.cssRules; } catch (e) { return; } // other origins (Google Fonts)
    if (!rules) return;
    flippedSheets.push(sh);
    flipRules(rules);
  }
  function flipInline(root) {
    if (!root || root.nodeType !== 1) return;
    var els = [root].concat(Array.prototype.slice.call(root.querySelectorAll('[style]')));
    els.forEach(function (el) {
      if (!el.getAttribute('style') || (el.closest && el.closest('svg'))) return;
      if (flippedEls) { if (flippedEls.has(el)) return; flippedEls.add(el); }
      else { if (el.__arFlip) return; el.__arFlip = 1; }
      flipStyle(el.style);
    });
  }
  function mirror() {
    for (var i = 0; i < document.styleSheets.length; i++) flipSheet(document.styleSheets[i]);
    // A stylesheet still on its way is mirrored when it lands.
    document.querySelectorAll('link[rel=stylesheet]').forEach(function (l) {
      if (!l.sheet) l.addEventListener('load', function () { flipSheet(l.sheet); arabicStacks(l.sheet); });
    });
    flipInline(document.body);
  }

  /* ---------- Arabic type ---------- */
  var DISPLAY = "'Butlr Arabic Display','Amiri'", TEXT = "'Butlr Arabic Text','Markazi Text'";
  /** Headings take Amiri, everything else Markazi Text. A rule counts as a
   *  heading rule when every selector in it ends on a heading. */
  var HEAD = /^h[1-4](?![\w-])|\.(d[123]|hh|big|mark|price|vogue)(?![\w-])/i;
  function headingRule(sel) {
    return !!sel && sel.split(',').every(function (part) {
      var last = part.trim().split(/[\s>+~]+/).pop();
      return HEAD.test(last);
    });
  }
  function stackFor(ff, selector) {
    if (!ff || /Butlr Arabic/.test(ff)) return ff;
    var parts = ff.split(',');
    parts.splice(1, 0, headingRule(selector) ? DISPLAY : TEXT);
    return parts.join(',');
  }
  /** Small capitals labels (11px, spaced out) read as tiny Arabic once the
   *  capitals and the spacing are gone: in Arabic they are set a size up.
   *  Measured with the Arabic overrides off for a moment. */
  function labelSizes(root) {
    if (!root || root.nodeType !== 1) return;
    doc.classList.add('i18n-measure');
    var hits = [];
    [root].concat(Array.prototype.slice.call(root.querySelectorAll('*'))).forEach(function (el) {
      if (SKIP[el.tagName] || el.__arLabel || !directText(el) || (el.closest && el.closest('svg'))) return;
      var cs = getComputedStyle(el);
      if (cs.textTransform !== 'uppercase') return;
      var px = parseFloat(cs.fontSize);
      if (px && px < 14) hits.push([el, px]);
    });
    doc.classList.remove('i18n-measure');
    hits.forEach(function (h) { h[0].__arLabel = 1; h[0].style.setProperty('font-size', Math.round(h[1] * 1.3 * 2) / 2 + 'px', 'important'); });
  }
  function arabicStacks(sheet) {
    var rules; try { rules = sheet.cssRules; } catch (e) { return; }
    if (!rules || sheet.__arStacks) return;
    sheet.__arStacks = 1;
    (function walk(rs) {
      for (var j = 0; j < rs.length; j++) {
        var r = rs[j];
        if (r.cssRules) walk(r.cssRules);
        if (!r.style || !r.selectorText || /\[(lang|dir)=/.test(r.selectorText)) continue;
        if (r.style.fontFamily) r.style.setProperty('font-family', stackFor(r.style.fontFamily, r.selectorText), r.style.getPropertyPriority('font-family'));
      }
    })(rules);
  }
  function arabicType() {
    for (var i = 0; i < document.styleSheets.length; i++) {
      var o = document.styleSheets[i].ownerNode;
      if (o && (o.id === 'butlr-i18n-css' || o.id === 'butlr-ar-faces')) continue;
      arabicStacks(document.styleSheets[i]);
    }
    document.querySelectorAll('[style*="font"]').forEach(function (el) {
      if (el.closest('svg')) return;
      if (el.style.fontFamily) el.style.fontFamily = stackFor(el.style.fontFamily, '');
    });
  }
  /** Amiri and Markazi Text sit lower than the Latin faces at the same size.
   *  Their Arabic faces are declared again under Butlr names with size-adjust
   *  (the portal's values), so Arabic reads level with Latin without touching
   *  the Latin words. Medium is Markazi's working weight: Arabic never reads thin. */
  var FONTS = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Markazi+Text:wght@500;600;700&display=swap';
  function loadArabicFonts() {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = FONTS; l.crossOrigin = 'anonymous';
    l.onload = function () {
      var rules; try { rules = l.sheet.cssRules; } catch (e) { return; }
      var css = '';
      for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        if (r.type !== 5) continue;                    // @font-face
        var st = r.style, fam = (st.getPropertyValue('font-family') || '').replace(/["']/g, '');
        var range = st.getPropertyValue('unicode-range') || '';
        if (!/U\+0?600/i.test(range)) continue;        // Arabic subset only
        var amiri = /amiri/i.test(fam);
        css += '@font-face{font-family:"' + (amiri ? 'Butlr Arabic Display' : 'Butlr Arabic Text') + '";' +
          'src:' + st.getPropertyValue('src') + ';font-weight:' + (st.getPropertyValue('font-weight') || '400') + ';' +
          'font-style:normal;font-display:swap;unicode-range:' + range + ';size-adjust:' + (amiri ? '128%' : '122%') + ';}';
      }
      if (!css) return;
      var f = document.createElement('style'); f.id = 'butlr-ar-faces'; f.textContent = css;
      document.head.appendChild(f);
    };
    l.onerror = function () {                           // no CORS: the plain faces still load
      var p = document.createElement('link'); p.rel = 'stylesheet'; p.href = FONTS; document.head.appendChild(p);
    };
    document.head.appendChild(l);
  }

  /* ---------- The switch ---------- */
  function switcher() {
    var other = lang === 'ar' ? 'en' : 'ar';
    var href = function () {
      var u = new URL(location.href); u.searchParams.set('lang', other); return u.pathname + u.search + u.hash;
    };
    var label = other === 'ar' ? 'العربية' : 'English';
    var mk = function (cls) {
      var a = document.createElement('a');
      a.className = cls; a.href = href(); a.textContent = label;
      a.setAttribute('lang', other); a.setAttribute('hreflang', other); a.setAttribute('dir', other === 'ar' ? 'rtl' : 'ltr');
      a.setAttribute('data-no-i18n', '');
      a.addEventListener('click', function () { save(other); });
      return a;
    };
    var links = document.querySelector('#pn .links') || document.querySelector('#nav .nav-links');
    if (links && !links.querySelector('.lang-switch')) {
      var cta = links.querySelector('.cta, .nav-cta');
      links.insertBefore(mk('lang-switch'), cta || null);
    }
    var fb = document.querySelector('.pf .bottom') || document.querySelector('footer .fbottom');
    // In the footer it joins the contact line (email, WhatsApp), so the row keeps its two sides.
    if (fb && !fb.querySelector('.lang-switch-foot')) {
      var host = fb.lastElementChild && fb.children.length > 1 ? fb.lastElementChild : fb.appendChild(document.createElement('div'));
      if (host.childNodes.length) host.appendChild(document.createTextNode('\u2003\u2002'));
      host.appendChild(mk('lang-switch-foot'));
    }
  }

  // Styles for Arabic (and for the switch, in both languages). Rules scoped
  // to [lang=ar] are written for right to left already and are not mirrored.
  var css = document.createElement('style');
  css.id = 'butlr-i18n-css';
  css.textContent =
    '.lang-switch,.lang-switch-foot{font-family:"Butlr Arabic Text","Markazi Text","Geeza Pro","Segoe UI",system-ui,sans-serif!important;}' +
    '.lang-switch,.lang-switch-foot{text-align:match-parent;}' +
    'html:not([lang=ar]) .pn .links a.lang-switch{font-size:13.5px!important;letter-spacing:0!important;}' +
    'html[lang=ar] .lang-switch,html[lang=ar] .lang-switch-foot{font-family:"Hanken Grotesk",-apple-system,system-ui,sans-serif!important;}' +
    'html.i18n-pending body{visibility:hidden;}' +
    /* Arabic letters join: spacing between letters breaks them apart, and Arabic has no capitals. */
    'html[lang=ar]:not(.i18n-measure) body *{letter-spacing:normal!important;text-transform:none!important;}' +
    'html[lang=ar] svg{direction:ltr;}' +
    'html[lang=ar] body{line-height:1.8;}' +
    'html[lang=ar] :is(h1,h2,h3,h4,.d1,.d2,.d3,.hh,.big){line-height:1.38!important;}' +
    'html[lang=ar] :is(.lead,.lede){line-height:1.65;}' +
    'html[lang=ar] [dir=ltr]{unicode-bidi:isolate;}' +
    'html[lang=ar] input[type=email],html[lang=ar] input[type=tel],html[lang=ar] input[type=date]{direction:ltr;text-align:right;}' +
    'html[lang=ar] .legal-note{margin-top:18px;padding:12px 16px;border:1px solid var(--line,rgba(0,0,0,.14));border-radius:10px;font-size:14.5px;line-height:1.7;color:var(--sub,#696C76);max-width:62ch;}' +
    'html[lang=ar] .legal-note a{color:var(--gold-ink,#876620);border-bottom:1px solid currentColor;margin-inline-start:6px;white-space:nowrap;}';
  document.head.appendChild(css);

  window.ButlrI18n = {
    lang: lang, units: units, norm: norm,
    /** The Arabic for an English line, or null (always null in English). */
    t: function (en) { if (lang !== 'ar') return null; var r = lookup(en); return r == null ? null : strip(r); }
  };

  if (lang !== 'ar') {
    // A small cut of Markazi Text, only the letters of "العربية", for the switch.
    var lf = document.createElement('link');
    lf.rel = 'stylesheet';
    lf.href = 'https://fonts.googleapis.com/css2?family=Markazi+Text:wght@600&display=swap&text=' + encodeURIComponent('العربية');
    document.head.appendChild(lf);
    document.addEventListener('DOMContentLoaded', switcher);
    return;
  }

  doc.lang = 'ar'; doc.dir = 'rtl';
  doc.classList.add('i18n-pending');
  loadArabicFonts();
  var reveal = function () { doc.classList.remove('i18n-pending'); };
  var safety = setTimeout(reveal, 3000);

  var parts = withLegal ? 2 : 1;          // dictionaries still to arrive
  var ready = 0;
  var go = function () {
    if (++ready < parts + 1) return;      // + DOMContentLoaded
    try {
      // Legal pages: translated in full, with a note that the English governs.
      var lede = document.querySelector('.legal-hero .lede');
      if (lede && window.__butlrLegalNote && !document.querySelector('.legal-note')) {
        var n = document.createElement('p'); n.className = 'legal-note'; n.setAttribute('data-no-i18n', '');
        n.textContent = window.__butlrLegalNote + ' ';
        var en = document.createElement('a');
        var u = new URL(location.href); u.searchParams.set('lang', 'en');
        en.href = u.pathname + u.search; en.textContent = 'اقرأ النص الإنجليزي';
        en.addEventListener('click', function () { save('en'); });
        n.appendChild(en);
        lede.parentNode.insertBefore(n, lede.nextSibling);
      }
      apply(document.body);
      var t = lookup(document.title); if (t) document.title = strip(t);
      var md = document.querySelector('meta[name=description]');
      if (md) { var d = lookup(md.content); if (d) md.content = strip(d); }
      mirror();
      arabicType();
      switcher();
      labelSizes(document.body);
      // Without storage the choice cannot be remembered: carry it in the links.
      if (!canStore) document.querySelectorAll('a[href]').forEach(function (a) {
        var h = a.getAttribute('href');
        if (!h || /^(mailto:|tel:|#|javascript:)/i.test(h) || a.classList.contains('lang-switch') || a.classList.contains('lang-switch-foot')) return;
        try { var x = new URL(h, location.href); if (x.origin !== location.origin || x.searchParams.has('lang')) return; x.searchParams.set('lang', 'ar'); a.setAttribute('href', x.pathname + x.search + x.hash); } catch (e) {}
      });
      new MutationObserver(function (ms) {
        ms.forEach(function (m) {
          if (m.type === 'attributes') { trAttrs(m.target); return; }
          var t = m.target.nodeType === 3 ? m.target.parentNode : m.target;
          if (!t || t.nodeType !== 1) return;
          if (t.closest && t.closest('[data-no-i18n]')) return;
          // the changed block itself, or what was added inside it
          if (leafish(t) && directText(t)) tr(t);
          else if (m.type === 'characterData' && m.target.nodeType === 3) tr(m.target);
          m.addedNodes && Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType === 1) { apply(n); flipInline(n); labelSizes(n); }
            else if (n.nodeType === 3 && /[A-Za-z]/.test(n.nodeValue) && !(leafish(t) && directText(t))) tr(n);
          });
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    } finally { clearTimeout(safety); reveal(); }
  };
  window.__butlrArabic = function (dict, patterns) {
    Object.keys(dict).forEach(function (k) { AR[norm(k)] = dict[k]; });
    (patterns || []).forEach(function (p) { PAT.push([p[0], p[1]]); });
    go();
  };
  var load = function (src) {
    var s = document.createElement('script');
    s.src = src;
    s.onerror = function () { clearTimeout(safety); reveal(); };
    document.head.appendChild(s);
  };
  load('/assets/i18n-ar.js?v=' + DICT_V);
  if (withLegal) load('/assets/i18n-ar-legal.js?v=' + DICT_V);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
