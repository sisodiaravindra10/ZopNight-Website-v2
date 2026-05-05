/* =============================================================================
   product-3d.js
   -----------------------------------------------------------------------------
   Shared canvas scaffold for the per-product 3D dotted objects in each
   product page hero. Render pipeline mirrors the homepage globe
   (#globe-canvas) so all four shapes share the same visual grammar:

     · cream dots (rgba 240,235,219,...) on a transparent canvas
     · alpha + radius driven by point depth (front bright/big, back dim/small)
     · z-sorted painter's algorithm
     · slow Y-axis auto-rotation, can be temporarily paused while dragging

   Two new affordances on top of the globe baseline:

     · OPTIONAL morph between two point sets (`pointsB`) — a smooth
       lerp driven by `performance.now()`. Used by ZopNight to morph
       its lock into a piracy eye and back.
     · OPTIONAL `onActivate(controller, e)` callback fired on click/tap.
       The controller exposes `pulse(x, y)` (concentric ring),
       `flashMorph(0..1, ms)` (force the morph progress for a moment), and
       `addParticle({x,y,z,vx,vy,vz,life,accent})` (transient 3D particles
       drawn on top of the static dots).

   Usage (inline in a product page):

     ZopProduct3D(canvas, genLockPoints, {
       pointsB:     genEyePoints,
       morphPeriod: 9000,
       accent:      '#4A66D4',
       radiusFactor:0.46,
       onActivate:  function(c, e){ c.pulse(e.x, e.y); c.flashMorph(1, 1400); }
     });
   ========================================================================= */
(function(){
  function hexToRGB(hex){
    var h = hex.replace('#','');
    return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
  }
  function rgba(c, a){ return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  /* Globe ink color · cream tinted to match the homepage globe exactly. */
  var INK = [240, 235, 219];

  window.ZopProduct3D = function(canvas, genPointsA, options){
    if(!canvas) return null;
    options = options || {};
    var accent = hexToRGB(options.accent || '#F58549');
    var speed = options.speed != null ? options.speed : 0.0028;
    var radiusFactor = options.radiusFactor || 0.42;
    var rotXInit = options.rotX != null ? options.rotX : -0.18;
    var rotYInit = options.rotY != null ? options.rotY : 0.5;
    var morphPeriod = options.morphPeriod || 9000;
    var onActivate = options.onActivate;

    var dpr = window.devicePixelRatio || 1;
    var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ctx, W, H, R, cx, cy;
    var rotY = rotYInit, rotX = rotXInit;
    var velY = reduceMotion ? 0 : speed;
    var ptsA = (typeof genPointsA === 'function') ? genPointsA() : (genPointsA || []);
    var ptsB = options.pointsB ? (typeof options.pointsB === 'function' ? options.pointsB() : options.pointsB) : null;

    /* If both shape sets exist but their lengths differ, trim to the shorter
       so morph indexes stay in bounds. Pair-by-index — both generators use
       the same Fibonacci-style ordering so the morph reads as smooth flow. */
    if(ptsB && ptsA.length !== ptsB.length){
      var L = Math.min(ptsA.length, ptsB.length);
      if(ptsA.length > L) ptsA = ptsA.slice(0, L);
      if(ptsB.length > L) ptsB = ptsB.slice(0, L);
    }

    /* Transient effects layered on top of the static dot mesh */
    var pulses = [];     /* {x, y, t, accent}, screen-space rings expanding outward */
    var particles = [];  /* {x, y, z, vx, vy, vz, life, max, accent}, 3D particles */

    /* Forced morph override · when set, draw uses this t instead of the auto cycle.
       Reverts to auto after ttl ms. */
    var forcedMorph = null;

    var dragging = false, lastX = 0, lastY = 0, dragMoved = false;

    function resize(){
      W = canvas.clientWidth || 360;
      H = canvas.clientHeight || 360;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W/2; cy = H/2;
      R = Math.min(W, H) * radiusFactor;
    }

    function project(x, y, z, cY, sY, cX, sX){
      var x1 = x*cY + z*sY;
      var z1 = -x*sY + z*cY;
      var y2 = y*cX - z1*sX;
      var z2 = y*sX + z1*cX;
      return { sx: cx + x1*R, sy: cy - y2*R, z: z2 };
    }

    /* Ease for the morph cycle · sin-based so the shape lingers at each end */
    function easeMorph(u){ return (1 - Math.cos(u * Math.PI * 2)) * 0.5; }

    function draw(){
      if(!ctx) return;
      ctx.clearRect(0, 0, W, H);

      var cY = Math.cos(rotY), sY = Math.sin(rotY);
      var cX = Math.cos(rotX), sX = Math.sin(rotX);

      /* Resolve the active morph factor */
      var morph = 0;
      var now = performance.now();
      if(forcedMorph){
        if(now > forcedMorph.until){
          forcedMorph = null;
        } else {
          morph = forcedMorph.value;
        }
      }
      if(!forcedMorph && ptsB){
        morph = easeMorph((now % morphPeriod) / morphPeriod);
      }

      /* Project all points (with optional morph) */
      var n = ptsA.length;
      var pr = new Array(n);
      for(var i = 0; i < n; i++){
        var pa = ptsA[i];
        var x, y, z, hi;
        if(ptsB){
          var pb = ptsB[i];
          x = pa.x + (pb.x - pa.x) * morph;
          y = pa.y + (pb.y - pa.y) * morph;
          z = pa.z + (pb.z - pa.z) * morph;
          hi = pa.hi || pb.hi;
        } else {
          x = pa.x; y = pa.y; z = pa.z; hi = pa.hi;
        }
        var pp = project(x, y, z, cY, sY, cX, sX);
        pp.hi = hi;
        pr[i] = pp;
      }
      pr.sort(function(a, b){ return a.z - b.z; });

      /* Render with the same alpha/radius shaping as the homepage globe */
      for(var j = 0; j < n; j++){
        var pp2 = pr[j];
        var front = pp2.z > -0.05;
        var alpha, r;
        if(front){
          alpha = Math.max(0.45, 0.72 + pp2.z * 0.28);
          r = 0.9 + pp2.z * 0.25;
        } else {
          alpha = 0.12;
          r = 0.5;
        }
        ctx.beginPath();
        ctx.arc(pp2.sx, pp2.sy, Math.max(0.35, r), 0, Math.PI * 2);
        ctx.fillStyle = pp2.hi ? rgba(accent, alpha) : rgba(INK, alpha);
        ctx.fill();
      }

      /* 3D transient particles · projected each frame */
      if(particles.length){
        for(var pi = 0; pi < particles.length; pi++){
          var p = particles[pi];
          p.life -= 1;
          p.x += (p.vx || 0); p.y += (p.vy || 0); p.z += (p.vz || 0);
          var lp = project(p.x, p.y, p.z, cY, sY, cX, sX);
          var t = Math.max(0, p.life / p.max);
          var a = t * 0.95;
          var rr = 1.4 + (1 - t) * 1.2;
          ctx.beginPath();
          ctx.arc(lp.sx, lp.sy, rr, 0, Math.PI * 2);
          ctx.fillStyle = rgba(p.accent || accent, a);
          ctx.fill();
        }
        particles = particles.filter(function(p){ return p.life > 0; });
      }

      /* Screen-space click pulses · concentric rings expanding outward */
      if(pulses.length){
        for(var ki = 0; ki < pulses.length; ki++){
          var pu = pulses[ki];
          pu.t += 0.018;
          var ring = pu.t * Math.min(W, H) * 0.55;
          var rA = (1 - pu.t) * 0.7;
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, ring, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(pu.accent || accent, rA);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        pulses = pulses.filter(function(p){ return p.t <= 1; });
      }

      if(!dragging) rotY += velY;
      requestAnimationFrame(draw);
    }

    /* ---- Pointer / drag interaction ---- */
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';
    function clientToCanvas(e){
      var rect = canvas.getBoundingClientRect();
      var cx2 = (e.clientX != null ? e.clientX : (e.touches && e.touches[0].clientX));
      var cy2 = (e.clientY != null ? e.clientY : (e.touches && e.touches[0].clientY));
      return { x: cx2 - rect.left, y: cy2 - rect.top };
    }
    function onDown(e){
      dragging = true; dragMoved = false;
      canvas.style.cursor = 'grabbing';
      var p = clientToCanvas(e);
      lastX = p.x; lastY = p.y;
      if(e.pointerId != null && canvas.setPointerCapture){
        try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
      }
      e.preventDefault && e.preventDefault();
    }
    function onMove(e){
      if(!dragging) return;
      var p = clientToCanvas(e);
      var dx = p.x - lastX, dy = p.y - lastY;
      if(Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
      rotY += dx * 0.006;
      rotX += dy * 0.004;
      rotX = Math.max(-Math.PI*0.42, Math.min(Math.PI*0.42, rotX));
      lastX = p.x; lastY = p.y;
    }
    function onUp(e){
      if(!dragging) return;
      var wasDrag = dragMoved;
      dragging = false; dragMoved = false;
      canvas.style.cursor = 'grab';
      if(e && e.pointerId != null && canvas.releasePointerCapture){
        try{ canvas.releasePointerCapture(e.pointerId); }catch(_){}
      }
      if(!wasDrag && onActivate){
        var p = clientToCanvas(e);
        try{ onActivate(controller, p); }catch(_){}
      }
    }
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('touchstart', onDown, {passive:false});
    window.addEventListener('touchmove', onMove, {passive:false});
    window.addEventListener('touchend', onUp);

    var resizeRAF;
    window.addEventListener('resize', function(){
      cancelAnimationFrame(resizeRAF);
      resizeRAF = requestAnimationFrame(resize);
    });

    /* ---- Public controller exposed to the consumer's onActivate handler ---- */
    var controller = {
      pulse: function(x, y, color){
        pulses.push({ x: x, y: y, t: 0, accent: color ? hexToRGB(color) : accent });
      },
      flashMorph: function(value, ttlMs){
        forcedMorph = { value: value, until: performance.now() + (ttlMs || 1200) };
      },
      addParticle: function(p){
        if(!p.max) p.max = p.life || 90;
        if(!p.life) p.life = p.max;
        if(p.accent && typeof p.accent === 'string') p.accent = hexToRGB(p.accent);
        particles.push(p);
      },
      project: function(x, y, z){
        var cY = Math.cos(rotY), sY = Math.sin(rotY);
        var cX = Math.cos(rotX), sX = Math.sin(rotX);
        return project(x, y, z, cY, sY, cX, sX);
      },
      get rotY(){ return rotY; },
      get rotX(){ return rotX; },
      get accent(){ return accent; }
    };

    resize();
    requestAnimationFrame(draw);
    return controller;
  };
})();
