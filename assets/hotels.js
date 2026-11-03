/* Moved out of hotels.html (2026-11-03) so the CSP can refuse inline script. */
(function(){
  var API = window.BUTLR_API || "https://portal.onebutlr.com";

  var TYPE_LABELS = {
    hotel:"Hotel", resort:"Resort", boutique:"Boutique Hotel", villa:"Villas",
    apartment:"Apartments", beachClub:"Beach Club", poolClub:"Pool Club",
    countryClub:"Country Club", golfClub:"Golf Club", membersClub:"Members' Club",
    marina:"Marina", skyLodge:"Sky Lodge", daySpa:"Day Spa", raceClub:"Race Club",
    airportLounge:"Airport Lounge", coworking:"Coworking", premiumGym:"Gym"
  };
  var PLURALS = {
    hotel:"Hotels", resort:"Resorts", beachClub:"Beach clubs", boutique:"Boutique hotels",
    villa:"Villas", apartment:"Apartments", poolClub:"Pool clubs", countryClub:"Country clubs",
    golfClub:"Golf clubs", membersClub:"Members' clubs", marina:"Marinas", skyLodge:"Sky lodges",
    daySpa:"Day spas", raceClub:"Race clubs", airportLounge:"Lounges", coworking:"Coworking", premiumGym:"Gyms"
  };

  var venues = [];
  var activeType = new URLSearchParams(location.search).get("type") || "all";

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

  function renderChips(){
    var types = {};
    venues.forEach(function(v){ types[v.venueType||"hotel"]=1; });
    var order = ["hotel","resort","beachClub"].concat(Object.keys(types).filter(function(t){return ["hotel","resort","beachClub"].indexOf(t)===-1;}).sort());
    var present = order.filter(function(t){ return types[t]; });
    // A shared ?type= link for a type no venue has right now shows them all, not "Opening soon".
    if (activeType !== "all" && present.indexOf(activeType) === -1) activeType = "all";
    if (present.length < 2) { $("chips").hidden = true; return; }
    var html = '<button type="button" class="chip'+(activeType==="all"?" on":"")+'" aria-pressed="'+(activeType==="all")+'" data-t="all">All</button>';
    present.forEach(function(t){
      html += '<button type="button" class="chip'+(activeType===t?" on":"")+'" aria-pressed="'+(activeType===t)+'" data-t="'+esc(t)+'">'+esc(PLURALS[t]||TYPE_LABELS[t]||t)+'</button>';
    });
    var el = $("chips");
    el.innerHTML = html; el.hidden = false;
    el.querySelectorAll(".chip").forEach(function(b){
      b.addEventListener("click", function(){
        activeType = b.getAttribute("data-t");
        var u = new URL(location.href);
        if (activeType==="all") u.searchParams.delete("type"); else u.searchParams.set("type", activeType);
        history.replaceState(null,"",u);
        renderChips(); renderGrid();
      });
    });
  }

  function renderGrid(){
    var list = activeType==="all" ? venues : venues.filter(function(v){ return (v.venueType||"hotel")===activeType; });
    var grid = $("grid");
    if (!list.length){
      grid.hidden = true; $("empty").hidden = false;
      return;
    }
    $("empty").hidden = true;
    grid.innerHTML = list.map(function(v){
      var loc = [v.city, v.country].filter(Boolean).join(", ");
      var img = safeImg(v.imageURL);
      return '<a class="vcard reveal in" href="/hotels/'+encodeURIComponent(v.slug)+'">'
        + '<div class="img">'+(img?'<img src="'+esc(img)+'" alt="'+esc(v.name)+'" loading="lazy">':"")+'</div>'
        + '<div class="loc"><bdi>'+esc(loc)+'</bdi></div>'
        + '<h3><bdi>'+esc(v.name)+'</bdi></h3>'
        + '<div class="meta"><span>'+esc(TYPE_LABELS[v.venueType]||"Hotel")+'</span>'
        + (v.starRating?'<span class="stars">'+stars(v.starRating)+'</span>':"")+'</div>'
        + '<span class="book">Book a stay →</span>'
        + '</a>';
    }).join("");
    grid.hidden = false;
  }

  fetch(API + "/api/web-booking/venues")
    .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
    .then(function(j){
      venues = (j && j.venues) || [];
      $("loading").hidden = true;
      renderChips();
      renderGrid();
    })
    .catch(function(e){
      console.error(e);
      $("loading").hidden = true;
      $("error").hidden = false;
    });

  document.querySelectorAll('#nav .nav-links a').forEach(function(a){a.addEventListener('click',function(){var n=document.getElementById('nav');n.classList.remove('open');var b=n.querySelector('.nav-burger');if(b)b.setAttribute('aria-expanded','false');});});
})();
