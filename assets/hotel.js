/* Moved out of hotel.html (2026-11-03) so the CSP can refuse inline script. */
(function(){
  var API = window.BUTLR_API || "https://portal.onebutlr.com";

  var TYPE_LABELS = {
    hotel:"Hotel", resort:"Resort", boutique:"Boutique Hotel", villa:"Villas",
    apartment:"Apartments", beachClub:"Beach Club", poolClub:"Pool Club",
    countryClub:"Country Club", golfClub:"Golf Club", membersClub:"Members' Club",
    marina:"Marina", skyLodge:"Sky Lodge", daySpa:"Day Spa", raceClub:"Race Club",
    airportLounge:"Airport Lounge", coworking:"Coworking", premiumGym:"Gym"
  };

  // slug from /hotels/{slug} (rewritten to this file) or ?slug= fallback
  var parts = location.pathname.split("/").filter(Boolean);
  var slug = (parts[0]==="hotels" && parts[1]) ? decodeURIComponent(parts[1])
    : (new URLSearchParams(location.search).get("slug") || "");

  var $ = function(id){ return document.getElementById(id); };
  // Attribute-safe escaper — quotes INCLUDED. Venue-controlled strings are
  // interpolated into double-quoted attributes, so `"` must be escaped or a
  // crafted room/venue field breaks out of the attribute (stored XSS).
  function esc(s){
    return String(s==null?"":s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  // Only http(s) URLs may reach an src attribute — anything else is dropped.
  function safeImg(u){ u=String(u==null?"":u).trim(); return /^https?:\/\//i.test(u) ? u : ""; }
  function stars(n){ n=Math.max(0,Math.min(5,Math.round(n||0))); return n? "★★★★★".slice(0,n) : ""; }
  // Prices at the venue's own precision (KWD, BHD and OMR have 3 decimals:
  // the portal sends currencyDecimals). Whole amounts print without decimals.
  function money(n, cur){
    var v = Number(n||0);
    var d = venue && isFinite(+venue.currencyDecimals) ? Math.max(0, Math.min(3, Math.round(+venue.currencyDecimals))) : 2;
    var f = Math.round(v) === v ? 0 : d;
    var t = v.toLocaleString("en-US", { minimumFractionDigits: f, maximumFractionDigits: f });
    return cur ? cur + " " + t : t;
  }

  var venue = null, rooms = [], nights = null, sel = null;
  var checkInMs = null, checkOutMs = null;

  // date helpers — check-in 15:00, check-out 12:00 in the VENUE's timezone
  // (falling back to the visitor's). Computing both bookers' epochs on the
  // same clock is what makes a same-day turnover (one guest out at noon,
  // the next in at 3pm) never read as an overlap in the shared ledger.
  function tzEpoch(dateStr, hour, tz){
    var p = dateStr.split("-").map(Number);
    if (!tz) return new Date(p[0], p[1]-1, p[2], hour, 0, 0, 0).getTime();
    try {
      var want = Date.UTC(p[0], p[1]-1, p[2], hour, 0, 0);
      var guess = want;
      var f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false });
      for (var i=0;i<2;i++){
        var g = {};
        f.formatToParts(new Date(guess)).forEach(function(x){ g[x.type]=x.value; });
        var shown = Date.UTC(+g.year, +g.month-1, +g.day, (+g.hour)%24, +g.minute, +g.second);
        guess += (want - shown);
      }
      return guess;
    } catch(e){
      return new Date(p[0], p[1]-1, p[2], hour, 0, 0, 0).getTime();
    }
  }
  function dIn(v){ return tzEpoch(v, 15, venue && venue.timezone); }
  function dOut(v){ return tzEpoch(v, 12, venue && venue.timezone); }
  function isoPlus(days){ var d=new Date(Date.now()+days*86400000); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

  function renderVenue(){
    document.title = venue.name + " | Butlr";
    // One address per venue for search engines: the venue's public link.
    var canon = document.querySelector('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement("link"), { rel: "canonical" }));
    canon.href = "https://onebutlr.com/hotels/" + encodeURIComponent(venue.slug || slug);
    $("h-loc").textContent = [venue.city, venue.country].filter(Boolean).join(", ");
    $("h-name").textContent = venue.name;
    $("h-type").textContent = TYPE_LABELS[venue.venueType] || "Hotel";
    $("h-stars").textContent = stars(venue.starRating);
    var heroImg = safeImg(venue.imageURL);
    if (heroImg) {
      var img = document.createElement("img");
      img.className = "bg"; img.src = heroImg; img.alt = venue.name;
      $("hero").prepend(img);
    }
    var gallery = (venue.galleryURLs||[]).map(safeImg).filter(Boolean);
    if (gallery.length){
      $("gal").innerHTML = gallery.map(function(u){ return '<img src="'+esc(u)+'" alt="" loading="lazy">'; }).join("");
      $("galSec").hidden = false;
    }
    var fac = (venue.facilities||[]).filter(Boolean);
    if (fac.length){
      $("fac").innerHTML = fac.map(function(f){ return "<span>"+esc(f)+"</span>"; }).join("");
      $("facSec").hidden = false;
    }
  }

  function renderRooms(){
    if (!rooms.length){ $("rooms").innerHTML=""; $("noRooms").hidden = false; return; }
    $("noRooms").hidden = true;
    var cur = venue.currency;
    $("rooms").innerHTML = rooms.map(function(rt, i){
      var specs = [];
      if (rt.bedType) specs.push(rt.bedType);
      if (rt.sizeSqm) specs.push(rt.sizeSqm + " m²");
      specs.push("Up to " + rt.capacity + " guest" + (rt.capacity>1?"s":""));
      var amenAll = (rt.amenities||[]).filter(Boolean);
      var amen = amenAll.slice(0,4).map(function(a){ return "<span>"+esc(a)+"</span>"; }).join("")
        + amenAll.slice(4).map(function(a){ return '<span class="amen-x" hidden>'+esc(a)+"</span>"; }).join("")
        + (amenAll.length>4 ? '<button type="button" class="amen-more" data-n="'+(amenAll.length-4)+'">+'+(amenAll.length-4)+" more</button>" : "");
      var photo = safeImg(rt.imageURL) || safeImg(rt.photos&&rt.photos[0]) || "";
      var haveDates = nights != null;
      var soldOut = haveDates && rt.roomsLeft === 0;
      var side = '<div class="price">'+money(rt.nightlyRate, cur)+'</div><div class="per">per night</div>';
      if (haveDates && !soldOut){
        side += '<div class="total">'+nights+' night'+(nights>1?"s":"")+', <b style="color:var(--ink)">'+money(rt.nightlyRate*nights, cur)+'</b></div>';
        if (rt.roomsLeft != null && rt.roomsLeft <= 3) side += '<div class="left">Only '+rt.roomsLeft+' left</div>';
      }
      if (soldOut){
        side += '<div class="soldout">Sold out for these dates</div>';
      } else {
        side += '<button class="btn btn-gold" data-i="'+i+'" '+(haveDates?"":"data-needdates=1")+'>'+(haveDates?"Book this room":"Select dates")+'</button>';
      }
      return '<article class="room">'
        + '<div class="img">'+(photo?'<img src="'+esc(photo)+'" alt="'+esc(rt.name)+'" loading="lazy">':"")+'</div>'
        + '<div class="body"><h3><bdi>'+esc(rt.name)+'</bdi></h3>'
        + '<div class="specs">'+specs.map(esc).join(", ")+'</div>'
        + (rt.description?'<p class="desc"><bdi>'+esc(rt.description)+'</bdi></p>':"")
        + (amen?'<div class="amen">'+amen+'</div>':"")
        + '</div>'
        + '<div class="side">'+side+'</div>'
        + '</article>';
    }).join("");
    $("rooms").querySelectorAll("button[data-i]").forEach(function(b){
      b.addEventListener("click", function(){
        if (b.getAttribute("data-needdates")){
          $("d-in").focus();
          $("barNote").textContent = "Pick your dates first, then choose a room.";
          window.scrollTo({top: $("datesForm").offsetTop - 90, behavior:"smooth"});
          return;
        }
        openModal(rooms[+b.getAttribute("data-i")]);
      });
    });
    // "+N more" expands the full amenity list in place; tap again to fold.
    $("rooms").querySelectorAll("button.amen-more").forEach(function(b){
      b.addEventListener("click", function(){
        var open = b.getAttribute("data-open") === "1";
        b.closest(".amen").querySelectorAll(".amen-x").forEach(function(s){ s.hidden = open; });
        b.setAttribute("data-open", open ? "0" : "1");
        b.textContent = open ? "+" + b.getAttribute("data-n") + " more" : "Show less";
      });
    });
  }

  function loadVenue(withDates){
    var q = "slug=" + encodeURIComponent(slug);
    if (withDates) q += "&checkIn=" + checkInMs + "&checkOut=" + checkOutMs;
    return fetch(API + "/api/web-booking/venue?" + q)
      .then(function(r){ if (r.status===404) throw new Error("notfound"); if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
      .then(function(j){
        venue = j.venue; rooms = j.roomTypes || []; nights = j.nights;
        tsKey = (typeof j.turnstileSiteKey === "string" && j.turnstileSiteKey) ? j.turnstileSiteKey : null;
      });
  }

  // dates form
  $("d-in").value = isoPlus(1); $("d-out").value = isoPlus(2);
  $("d-in").min = isoPlus(0);  $("d-out").min = isoPlus(1);
  $("d-in").addEventListener("change", function(){
    var next = new Date(dIn($("d-in").value) + 86400000);
    var min = next.getFullYear()+"-"+String(next.getMonth()+1).padStart(2,"0")+"-"+String(next.getDate()).padStart(2,"0");
    $("d-out").min = min;
    if ($("d-out").value <= $("d-in").value) $("d-out").value = min;
  });
  $("datesForm").addEventListener("submit", function(e){
    e.preventDefault();
    var vi = $("d-in").value, vo = $("d-out").value;
    if (!vi || !vo) return;
    checkInMs = dIn(vi); checkOutMs = dOut(vo);
    if (checkOutMs <= checkInMs){ $("barNote").textContent = "Check-out must be after check-in."; return; }
    var btn = $("checkBtn"); btn.disabled = true; btn.textContent = "Checking…";
    loadVenue(true).then(function(){
      renderRooms();
      $("barNote").textContent = "Live availability for " + nights + " night" + (nights>1?"s":"") + ". Prices are set by the venue.";
    }).catch(function(){ $("barNote").textContent = "Couldn’t check availability, try again."; })
      .finally(function(){ btn.disabled = false; btn.textContent = "Check availability"; });
  });

  // Cloudflare Turnstile. The portal returns its public site key when the
  // owner has switched the check on; the booking route then refuses a request
  // without a token, so the widget is drawn in the form and its token sent as
  // turnstileToken (action "book", the one the route expects).
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
    var box = $("ts-box"); box.hidden = false;
    withTurnstile(function(){
      if (tsWidget !== null){ try { window.turnstile.reset(tsWidget); } catch(e){} tsToken = ""; return; }
      tsWidget = window.turnstile.render(box, {
        sitekey: tsKey, action: "book",
        size: box.offsetWidth && box.offsetWidth < 300 ? "compact" : "normal",
        callback: function(t){ tsToken = t; },
        "expired-callback": function(){ tsToken = ""; },
        "error-callback": function(){ tsToken = ""; }
      });
    });
  }

  // modal
  var opener = null;
  function openModal(rt){
    sel = rt;
    $("m-room").textContent = rt.name;
    var guests = +$("d-guests").value || 2;
    if (guests > rt.capacity) guests = rt.capacity;
    var cur = venue.currency;
    $("m-sum").innerHTML =
      '<div class="row"><span>'+esc(venue.name)+'</span><b>'+esc([venue.city,venue.country].filter(Boolean).join(", "))+'</b></div>'
      + '<div class="row"><span>Dates</span><b>'+datesText()+'</b></div>'
      + '<div class="row"><span>Guests</span><b>'+guests+'</b></div>'
      + '<div class="row"><span>'+nights+' night'+(nights>1?"s":"")+' × '+money(sel.nightlyRate,cur)+'</span><b>'+money(sel.nightlyRate*nights,cur)+'</b></div>';
    $("m-err").style.display = "none";
    $("modalForm").hidden = false; $("modalDone").hidden = true;
    $("overlay").classList.add("open");
    opener = document.activeElement;
    showTurnstile();
    setTimeout(function(){ try { $("g-name").focus(); } catch(e){} }, 30);
  }
  // The stay's dates as the summary shows them: as typed in English; in
  // Arabic, written out (31 أكتوبر 2026) with the arrow pointing the Arabic way.
  function datesText(){
    var vi = $("d-in").value, vo = $("d-out").value;
    var ar = window.ButlrI18n && ButlrI18n.lang === "ar";
    if (!ar) return esc(vi)+' → '+esc(vo);
    var f = function(v){
      try { var p = v.split("-").map(Number); return new Date(p[0], p[1]-1, p[2], 12).toLocaleDateString("ar-u-nu-latn", { day:"numeric", month:"long", year:"numeric" }).replace(/[\u200e\u200f\u061c]/g, ""); }
      catch(e){ return v; }
    };
    return '<bdi>'+esc(f(vi))+'</bdi> ← <bdi>'+esc(f(vo))+'</bdi>';
  }
  function closeModal(){
    $("overlay").classList.remove("open");
    if (opener && opener.focus) { try { opener.focus(); } catch(e){} }
  }
  document.addEventListener("keydown", function(e){ if (e.key === "Escape" && $("overlay").classList.contains("open")) closeModal(); });
  $("m-cancel").addEventListener("click", closeModal);
  $("s-close").addEventListener("click", closeModal);
  $("overlay").addEventListener("click", function(e){ if (e.target === $("overlay")) closeModal(); });

  $("bookForm").addEventListener("submit", function(e){
    e.preventDefault();
    if (!sel) return;
    if (tsKey && !tsToken){
      var te = $("m-err"); te.textContent = "Please complete the security check above, then send your request."; te.style.display = "block";
      return;
    }
    var btn = $("m-submit"); btn.disabled = true; btn.textContent = "Sending…";
    $("m-err").style.display = "none";
    var guests = Math.min(+$("d-guests").value || 2, sel.capacity);
    fetch(API + "/api/web-booking/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: slug,
        roomTypeId: sel.id,
        checkIn: checkInMs,
        checkOut: checkOutMs,
        guests: guests,
        guestName: $("g-name").value.trim(),
        guestEmail: $("g-email").value.trim(),
        guestPhone: $("g-phone").value.trim(),
        website: $("hp-x").value,
        turnstileToken: tsToken || undefined
      })
    }).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { ok: r.ok, j: j || {} }; }); })
      .then(function(res){
        if (!res.ok || !res.j.ok) throw new Error(res.j && res.j.error || "Couldn’t send your request. Try again.");
        // A "success" with no confirmation code means no booking was
        // actually written (e.g. an autofilled honeypot tripped the
        // server's silent swallow) — NEVER show that as a real booking.
        if (!res.j.confirmationCode) throw new Error("Couldn’t send your request. Please refresh the page and try again.");
        $("s-code").textContent = res.j.confirmationCode;
        // The portal says whether the guest's copy went out (guestEmailSent,
        // added in round 10); an older portal build does not, and then the
        // copy is assumed sent as before. Never promise an e-mail that failed.
        // S30 review: a resent identical request answers duplicate:true with
        // the first booking's code; say so instead of showing a new booking.
        var doneH = document.querySelector("#modalDone h3");
        if (res.j.duplicate === true) {
          if (doneH) doneH.textContent = "Already received.";
          $("s-copy").textContent = "We already have this request, " + venue.name + " confirms your booking by email. Your code is the same as before.";
        } else {
          if (doneH) doneH.textContent = "Request sent.";
          $("s-copy").textContent = res.j.guestEmailSent === false
            ? "Keep this code, " + venue.name + " confirms your booking by email. We couldn’t e-mail you a copy of the request."
            : "We’ve emailed you a copy, " + venue.name + " confirms your booking by email.";
        }
        $("modalForm").hidden = true; $("modalDone").hidden = false;
      })
      .catch(function(err){
        var msg = err.message || String(err);
        // In Arabic, a server message the dictionary does not know is shown as the general Arabic one.
        if (window.ButlrI18n && ButlrI18n.lang === "ar" && ButlrI18n.t(msg) == null) msg = "Couldn’t send your request. Try again.";
        var el = $("m-err"); el.textContent = msg; el.style.display = "block";
      })
      .finally(function(){
        btn.disabled = false; btn.textContent = "Request booking";
        // A Turnstile token is good for one request: draw a fresh check for the next one.
        if (tsKey && tsWidget !== null && window.turnstile){ try { window.turnstile.reset(tsWidget); } catch(e){} tsToken = ""; }
      });
  });

  // boot
  function boot(){
    $("failed").hidden = true; $("notfound").hidden = true; $("loading").hidden = false;
    loadVenue(false).then(function(){
      renderVenue(); renderRooms();
      $("loading").hidden = true; $("page").hidden = false;
    }).catch(function(e){
      $("loading").hidden = true;
      // 404 is "no such venue" (or not taking web bookings); anything else
      // (the portal down, no network) is a failure to load, with a retry.
      if (String(e.message)==="notfound") { $("notfound").hidden = false; noindex(); return; }
      console.error(e);
      $("failed").hidden = false;
    });
  }
  $("retry").addEventListener("click", function(e){ e.preventDefault(); boot(); });
  // An address with no venue behind it is not a page for search engines.
  function noindex(){ var m = document.createElement("meta"); m.name = "robots"; m.content = "noindex"; document.head.appendChild(m); }
  if (!slug){
    $("loading").hidden = true; $("notfound").hidden = false; noindex();
  } else {
    boot();
  }

  document.querySelectorAll('#nav .nav-links a').forEach(function(a){a.addEventListener('click',function(){var n=document.getElementById('nav');n.classList.remove('open');var b=n.querySelector('.nav-burger');if(b)b.setAttribute('aria-expanded','false');});});
})();
