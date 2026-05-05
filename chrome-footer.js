/* ============================================================================
   chrome-footer.js
   ----------------------------------------------------------------------------
   Footer interactive globe · sparse dots + cursor + drop-a-pin + arc-fan.
   Pairs with chrome-footer.css. Self-initializing IIFE — early-returns when
   the canvas/container don't exist, so it's safe to ship to every page.
   Targets: <canvas id="foot-regions-map"> inside <div id="foot-regions-v2">.
   ============================================================================ */
(function(){
  var canvas = document.getElementById('foot-regions-map');
  var container = document.getElementById('foot-regions-v2');
  if(!canvas || !container) return;
  var ctx = canvas.getContext('2d');
  var W, H, dpr = Math.min(2, window.devicePixelRatio||1);

  var lands = [
    [60,71,-168,-141],[54,60,-165,-150],[56,61,-156,-140],
    [60,72,-141,-95],[60,74,-95,-62],[50,70,-130,-62],[68,82,-110,-62],[72,80,-90,-75],
    [40,60,-128,-95],[32,49,-124,-95],[32,49,-95,-75],
    [30,45,-85,-68],[25,31,-85,-80],[25,30,-82,-80],
    [23,32,-117,-97],[17,24,-107,-87],[14,19,-92,-83],[8,15,-87,-77],[7,12,-84,-77],
    [17,23,-85,-74],[17,20,-77,-66],[17,19,-72,-68],
    [60,83,-55,-18],[72,83,-45,-20],
    [8,12,-77,-60],[0,8,-80,-50],[-10,0,-80,-35],[-20,-10,-74,-35],
    [-30,-20,-72,-40],[-40,-30,-73,-53],[-45,-40,-74,-64],[-55,-45,-75,-65],
    [-12,-2,-48,-35],[-20,-12,-50,-37],
    [36,44,-10,3],[42,51,-5,8],[50,55,-5,10],[50,55,-10,-5],[51,58,-7,2],[54,59,-8,-2],[43,51,-2,8],
    [55,71,4,31],[60,71,15,32],[54,61,8,30],
    [45,60,10,40],[48,56,30,50],[55,67,30,60],
    [40,47,7,18],[37,41,12,18],[38,46,13,29],[35,40,20,28],
    [50,72,40,95],[55,72,60,120],[55,72,95,140],[60,72,120,170],
    [36,42,26,45],[30,40,34,50],[25,37,35,48],[25,33,42,55],[12,26,34,55],[13,30,42,60],
    [30,40,45,63],[36,45,50,75],[40,50,46,80],
    [8,35,68,90],[20,35,70,88],[8,22,74,82],[22,30,88,93],
    [10,28,92,108],[5,22,95,110],[8,22,100,110],
    [22,45,85,122],[30,50,85,125],[42,54,88,127],[35,54,100,135],[33,43,124,131],
    [31,36,129,136],[34,42,135,142],[41,46,139,146],[33,35,132,134],
    [-8,6,95,106],[-8,2,100,119],[-5,7,105,127],[-10,0,113,141],[-10,-2,118,141],
    [5,19,118,127],[8,19,120,126],
    [20,37,-17,12],[20,35,12,36],[15,32,-17,35],[5,18,-17,15],[4,12,-10,12],
    [-6,8,10,32],[-6,5,10,42],[-12,5,28,52],[3,13,40,52],
    [-35,-15,12,35],[-35,-20,15,32],[-30,-22,15,32],[-26,-12,43,50],
    [-39,-10,113,154],[-38,-28,115,154],[-28,-10,120,145],[-20,-10,130,145],
    [-44,-39,144,149],[-47,-34,166,179],[-41,-34,172,179],[-47,-41,165,176],
    [-10,-1,130,151],[63,67,-24,-13],[50,59,-6,2],[6,10,79,82],[19,23,-85,-74]
  ];
  function isLand(lat, lon){
    for(var i=0;i<lands.length;i++){
      var l=lands[i];
      if(lat>=l[0]&&lat<=l[1]&&lon>=l[2]&&lon<=l[3]) return true;
    }
    return false;
  }

  /* Internal region list · used as arc targets when ghost is locked.
     NOT rendered as pins · only the dots and the click-arc are visible. */
  var regions = [
    {lat:38.9,  lon:-77.0},
    {lat:45.5,  lon:-122.7},
    {lat:-23.5, lon:-46.6},
    {lat:51.5,  lon:-0.12},
    {lat:50.1,  lon:11.5},
    {lat:26.0,  lon:50.5},
    {lat:19.1,  lon:75},
    {lat:1.35,  lon:103.8},
    {lat:35.7,  lon:139.7},
    {lat:-33.9, lon:151.2}
  ];

  function project(lat, lon){
    return { x: (lon + 180) / 360 * W, y: (78 - lat) / 150 * H };
  }
  function dotColor(alpha){ return 'rgba(240,235,219,'+alpha+')'; }

  function resize(){
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    buildLandDots();
  }

  var DOT_STEP = 2.2, DOT_R = 1.0, DOT_A = 0.30;
  var SPOT_R = 95, SPOT_R2 = SPOT_R * SPOT_R;
  var MAX_PUSH = 9, LERP = 0.14;
  var dotCount = 0;
  var baseX, baseY, curX, curY;

  function buildLandDots(){
    var arr = [];
    for(var lat=78; lat>-75; lat-=DOT_STEP){
      for(var lon=-180; lon<=180; lon+=DOT_STEP){
        if(!isLand(lat, lon)) continue;
        var p = project(lat, lon);
        arr.push(p.x, p.y);
      }
    }
    dotCount = arr.length / 2;
    baseX = new Float32Array(dotCount); baseY = new Float32Array(dotCount);
    curX  = new Float32Array(dotCount); curY  = new Float32Array(dotCount);
    for(var i=0;i<dotCount;i++){
      baseX[i] = arr[i*2]; baseY[i] = arr[i*2+1];
      curX[i]  = baseX[i]; curY[i]  = baseY[i];
    }
  }

  var mx = -9999, my = -9999;

  function renderDots(){
    var hasCursor = mx > -1000;
    ctx.beginPath();
    for(var i=0;i<dotCount;i++){
      var bx = baseX[i], by = baseY[i];
      var tx = bx, ty = by;
      if(hasCursor){
        var dx = bx - mx, dy = by - my;
        var dist2 = dx*dx + dy*dy;
        if(dist2 < SPOT_R2){
          var dist = Math.sqrt(dist2) || 0.0001;
          var t = 1 - dist / SPOT_R;
          var s = t * t * (3 - 2 * t);
          var push = s * MAX_PUSH;
          tx = bx + (dx / dist) * push;
          ty = by + (dy / dist) * push;
        }
      }
      curX[i] += (tx - curX[i]) * LERP;
      curY[i] += (ty - curY[i]) * LERP;
      ctx.moveTo(curX[i] + DOT_R, curY[i]);
      ctx.arc(curX[i], curY[i], DOT_R, 0, Math.PI*2);
    }
    ctx.fillStyle = dotColor(DOT_A);
    ctx.fill();
  }

  /* Quadratic-bezier helper for arcs */
  function qBezier(pa, ctrl, pb, t){
    var it = 1 - t;
    return {
      x: it*it*pa.x + 2*it*t*ctrl.x + t*t*pb.x,
      y: it*it*pa.y + 2*it*t*ctrl.y + t*t*pb.y
    };
  }

  /* Transient arcs · fired when ghost is locked, fade out over 1.6s */
  var transientArcs = [];

  function drawTransientArcs(tNow){
    if(!transientArcs.length) return;
    for(var i=transientArcs.length - 1; i>=0; i--){
      var a = transientArcs[i];
      var u = (tNow - a.start) / a.life;
      if(u < 0) continue;
      if(u >= 1){ transientArcs.splice(i, 1); continue; }
      var grow = u < 0.4 ? (u / 0.4) : 1;
      var fade = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
      ctx.strokeStyle = a.color; ctx.globalAlpha = 0.7 * fade;
      ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -tNow * 30;
      ctx.beginPath(); ctx.moveTo(a.pa.x, a.pa.y);
      var STEPS = 24;
      for(var s=1; s<=STEPS * grow; s++){
        var t = s / STEPS;
        var p = qBezier(a.pa, a.ctrl, a.pb, t);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      var headT = Math.min(1, u * 1.6);
      var head = qBezier(a.pa, a.ctrl, a.pb, headT);
      ctx.fillStyle = a.color; ctx.globalAlpha = fade * 0.95;
      ctx.beginPath(); ctx.arc(head.x, head.y, 3.2, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(){
    var tNow = performance.now() * 0.001;
    ctx.clearRect(0, 0, W, H);
    renderDots();
    drawTransientArcs(tNow);
    requestAnimationFrame(frame);
  }

  /* ─── Drop-a-pin · "+ deploy here" follows the cursor anywhere on land
     and is clickable any number of times. No dwell delay, no lock-out. ─── */
  var ghostEl = null;
  var ghostX = 0, ghostY = 0;

  function ensureGhost(){
    if(ghostEl) return ghostEl;
    ghostEl = document.createElement('div');
    ghostEl.className = 'region-ghost';
    ghostEl.innerHTML = '<span class="region-ghost-dot"></span><span class="region-ghost-label">+ deploy here</span>';
    ghostEl.style.cursor = 'pointer';
    ghostEl.style.pointerEvents = 'auto';
    ghostEl.addEventListener('click', fireArcs);
    container.appendChild(ghostEl);
    return ghostEl;
  }
  function showGhost(x, y){
    var g = ensureGhost();
    g.style.left = x + 'px'; g.style.top = y + 'px';
    g.classList.add('show');
    ghostX = x; ghostY = y;
  }
  function hideGhost(){
    if(ghostEl) ghostEl.classList.remove('show');
  }
  function onCursorMove(){
    var lon = mx / W * 360 - 180;
    var lat = 78 - my / H * 150;
    if(!isLand(lat, lon)){
      hideGhost();
      return;
    }
    showGhost(mx, my);
  }
  function fireArcs(e){
    if(e){ e.stopPropagation(); }
    if(!ghostEl) return;
    ghostEl.classList.add('flash');
    setTimeout(function(){
      if(ghostEl) ghostEl.classList.remove('flash');
    }, 360);
    var picks = [];
    for(var i = 0; i < regions.length; i++){
      var p = project(regions[i].lat, regions[i].lon);
      var dx = p.x - ghostX, dy = p.y - ghostY;
      picks.push({ p: p, d2: dx*dx + dy*dy });
    }
    picks.sort(function(a, b){ return a.d2 - b.d2; });
    var palette = ['#F58549', '#2A4494', '#7FB236'];
    var now = performance.now() * 0.001;
    for(var k = 0; k < Math.min(3, picks.length); k++){
      var pa = { x: ghostX, y: ghostY };
      var pb = picks[k].p;
      var midX = (pa.x + pb.x) / 2;
      var midY = (pa.y + pb.y) / 2 - Math.abs(pb.x - pa.x) * 0.18;
      transientArcs.push({
        pa: pa, pb: pb, ctrl: { x: midX, y: midY },
        start: now + k * 0.12, life: 1.6,
        color: palette[k % palette.length]
      });
    }
  }

  container.addEventListener('mousemove', function(e){
    var r = canvas.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    onCursorMove();
  });
  container.addEventListener('mouseleave', function(){
    mx = -9999; my = -9999;
    hideGhost();
  });
  container.addEventListener('touchmove', function(e){
    if(!e.touches.length) return;
    var r = canvas.getBoundingClientRect();
    mx = e.touches[0].clientX - r.left;
    my = e.touches[0].clientY - r.top;
  }, {passive:true});

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
})();

/* ============================================================================
   Graduation band · "Pick where you are" — three product cards above the
   globe footer. Reads <body data-product> to highlight the active product
   ("you're here"). Self-initializing IIFE; safe on every page. Renders into
   the .foot-globe block so the band sits visually above the world map.
   ============================================================================ */
(function(){
  var globe = document.querySelector('.foot-globe');
  if(!globe || document.querySelector('.foot-grad')) return;

  var here = (document.body.getAttribute('data-product') || '').toLowerCase();
  var hereKey = here === 'zopcloud' ? 'cloud'
              : here === 'zopday'   ? 'day'
              : here === 'zopnight' ? 'night'
              : '';

  var products = [
    { key:'cloud', href:'zopcloud.html', name:'ZopCloud',
      eyebrow:'Indie devs · MVP teams',
      tag:'We host. You push.' },
    { key:'day',   href:'zopday.html',   name:'ZopDay',
      eyebrow:'Platform engineers · scale-ups',
      tag:'Your cloud. Our orchestration.' },
    { key:'night', href:'zopnight.html', name:'ZopNight',
      eyebrow:'FinOps leads · CFOs · enterprises',
      tag:'Continuous governance + cost optimization.' }
  ];

  var section = document.createElement('section');
  section.className = 'foot-grad';
  section.setAttribute('aria-label', 'Pick where you are');

  var head = document.createElement('div');
  head.className = 'foot-grad-head';
  head.innerHTML =
    '<div class="foot-grad-eyebrow">pick where you are</div>' +
    '<h3 class="foot-grad-title">Three products. One platform.</h3>';
  section.appendChild(head);

  var row = document.createElement('div');
  row.className = 'foot-grad-row';
  for(var i=0; i<products.length; i++){
    var p = products[i];
    var card = document.createElement('a');
    card.className = 'foot-grad-card foot-grad-' + p.key + (p.key === hereKey ? ' is-here' : '');
    card.href = p.href;
    card.setAttribute('data-product', p.key);
    card.innerHTML =
      '<div class="grad-eyebrow">' +
        (p.key === hereKey ? '<span class="grad-here-dot" aria-hidden="true"></span>you are here · ' : '') +
        p.eyebrow +
      '</div>' +
      '<div class="grad-title">' + p.name + '</div>' +
      '<div class="grad-tag">' + p.tag + '</div>' +
      '<span class="grad-arrow" aria-hidden="true">&rarr;</span>';
    row.appendChild(card);
  }
  section.appendChild(row);

  var sub = document.createElement('p');
  sub.className = 'foot-grad-sub';
  sub.innerHTML = 'No re-platform when you grow. No surprise bill when you scale. No drift when it’s running.';
  section.appendChild(sub);

  var meta = document.createElement('p');
  meta.className = 'foot-grad-meta';
  meta.innerHTML = 'Looking at the platform? &rarr; <a href="index.html">zop.dev</a>';
  section.appendChild(meta);

  globe.parentNode.insertBefore(section, globe);
})();
