/* ============================================================================
   chrome-mobilenav.js
   ----------------------------------------------------------------------------
   Builds and wires the mobile menu at runtime so we don't have to patch the
   <nav> markup in every subpage. Idempotent — safe to load on pages that
   already have the toggle.

   Behavior:
     · Hamburger button injected into .nav-inner (after .nav-cta)
     · Drawer slides in from right with the full link list + primary CTA
     · ESC closes; click on scrim closes; close button closes
     · Body scroll locked while open
     · First link gets focus on open; focus returns to toggle on close
     · prefers-reduced-motion: drawer transition collapses to 1ms

   Style: see homepage-chrome.css (.mob-nav-* classes).
   ============================================================================ */
(function(){
  /* If markup is already injected (e.g. SSR'd in some future world), bail */
  if(document.querySelector('.mob-nav-toggle')) return;

  var navInner = document.querySelector('.nav .nav-inner');
  if(!navInner) return; // page without the shared nav (templates, emails, etc.)

  /* ------------------------------------------------------------------------
     Self-contained CSS: inject styles inline so the script works on any
     page that loads it, regardless of whether homepage-chrome.css is
     also loaded. Idempotent — only inject once per document. The selector
     guard (`#zd-mobnav-css`) keeps duplicate loads from re-injecting.
     ------------------------------------------------------------------------ */
  if(!document.getElementById('zd-mobnav-css')){
    var css = document.createElement('style');
    css.id = 'zd-mobnav-css';
    css.textContent =
    '.mob-nav-toggle{display:none;align-items:center;justify-content:center;width:40px;height:40px;padding:0;background:transparent;border:1px solid var(--line,#D9D3BF);color:var(--ink,#0A0A0A);cursor:pointer;transition:background .16s,border-color .16s}'+
    '.mob-nav-toggle:hover{background:var(--g-100,#ECE7D7);border-color:var(--ink,#0A0A0A)}'+
    '.mob-nav-toggle:focus-visible{outline:2px solid var(--zop-orange,#F58549);outline-offset:2px}'+
    '.mob-nav-toggle .bars{display:flex;flex-direction:column;gap:5px}'+
    '.mob-nav-toggle .bars span{display:block;width:18px;height:2px;background:currentColor;transition:transform .25s cubic-bezier(.22,1,.36,1),opacity .16s}'+
    '.mob-nav-toggle[aria-expanded="true"] .bars span:nth-child(1){transform:translateY(7px) rotate(45deg)}'+
    '.mob-nav-toggle[aria-expanded="true"] .bars span:nth-child(2){opacity:0}'+
    '.mob-nav-toggle[aria-expanded="true"] .bars span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}'+
    '.mob-nav-scrim{position:fixed;inset:0;z-index:60;background:rgba(10,10,10,0.36);opacity:0;pointer-events:none;transition:opacity .25s cubic-bezier(.22,1,.36,1)}'+
    '.mob-nav-scrim.open{opacity:1;pointer-events:auto}'+
    '.mob-nav{position:fixed;top:0;right:0;bottom:0;z-index:61;width:88vw;max-width:380px;background:var(--paper,#FAF7EC);color:var(--ink,#0A0A0A);border-left:1px solid var(--line,#D9D3BF);transform:translateX(100%);transition:transform .4s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;overflow:hidden;visibility:hidden}'+
    '.mob-nav.open{transform:translateX(0);visibility:visible}'+
    '.mob-nav-head{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid var(--line,#D9D3BF);flex-shrink:0}'+
    '.mob-nav-head .mob-wm{font-family:var(--font,"Space Grotesk",sans-serif);font-weight:700;font-size:18px;letter-spacing:-0.025em;color:var(--ink,#0A0A0A)}'+
    '.mob-nav-head .mob-wm em{font-style:normal;color:var(--zop-orange,#F58549)}'+
    '.mob-nav-head-actions{display:flex;align-items:center;gap:8px}'+
    '.mob-nav-theme{width:36px;height:36px;padding:0;background:transparent;border:1px solid var(--line,#D9D3BF);color:var(--ink,#0A0A0A);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .16s,border-color .16s,color .16s}'+
    '.mob-nav-theme:hover{background:var(--g-100,#ECE7D7);border-color:var(--ink,#0A0A0A)}'+
    '.mob-nav-theme:focus-visible{outline:2px solid var(--zop-orange,#F58549);outline-offset:2px}'+
    '.mob-nav-theme svg{width:14px;height:14px}'+
    '.mob-nav-theme .mt-sun{display:none}'+
    '.mob-nav-theme .mt-moon{display:block}'+
    'html[data-theme="light"] .mob-nav-theme .mt-sun{display:block}'+
    'html[data-theme="light"] .mob-nav-theme .mt-moon{display:none}'+
    '.mob-nav-close{width:36px;height:36px;padding:0;background:transparent;border:1px solid var(--line,#D9D3BF);color:var(--ink,#0A0A0A);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .16s,border-color .16s}'+
    '.mob-nav-close:hover{background:var(--g-100,#ECE7D7);border-color:var(--ink,#0A0A0A)}'+
    '.mob-nav-close:focus-visible{outline:2px solid var(--zop-orange,#F58549);outline-offset:2px}'+
    '.mob-nav-close svg{width:14px;height:14px}'+
    '.mob-nav-body{flex:1;overflow-y:auto;overscroll-behavior:contain}'+
    '.mob-nav-section{border-bottom:1px solid var(--line,#D9D3BF);padding:8px 0}'+
    '.mob-nav-section:last-of-type{border-bottom:0}'+
    '.mob-nav-section-label{font-family:var(--mono,"JetBrains Mono",monospace);font-size:10px;color:var(--g-500,#707070);letter-spacing:.14em;text-transform:uppercase;padding:14px 24px 8px;display:flex;align-items:center;gap:10px}'+
    '.mob-nav-section-label::before{content:"";display:inline-block;width:8px;height:8px;background:var(--zop-orange,#F58549);flex-shrink:0}'+
    '.mob-nav-link{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;font-size:16px;font-weight:500;color:var(--ink,#0A0A0A);border-left:3px solid transparent;transition:background .16s,border-color .16s,color .16s;min-height:44px;box-sizing:border-box;text-decoration:none}'+
    '.mob-nav-link:hover{background:var(--g-100,#ECE7D7);border-left-color:var(--zop-orange,#F58549)}'+
    '.mob-nav-link:focus-visible{outline:none;background:var(--g-100,#ECE7D7);border-left-color:var(--zop-orange,#F58549)}'+
    '.mob-nav-link[aria-current="page"]{color:var(--zop-orange,#F58549);border-left-color:var(--zop-orange,#F58549)}'+
    '.mob-nav-link.is-sub{padding-left:44px;font-size:14px;font-weight:400;color:var(--ink-3,#707070);min-height:38px}'+
    '.mob-nav-link.is-sub:hover{color:var(--ink,#0A0A0A)}'+
    '.mob-nav-link .arrow{font-family:var(--mono,"JetBrains Mono",monospace);color:var(--g-500,#707070);font-size:14px;transition:transform .16s,color .16s}'+
    '.mob-nav-link:hover .arrow{color:var(--zop-orange,#F58549);transform:translateX(3px)}'+
    '.mob-nav-foot{padding:20px 24px;border-top:1px solid var(--line,#D9D3BF);display:flex;flex-direction:column;gap:12px;background:var(--g-50,#F0EBDB);flex-shrink:0}'+
    '.mob-nav-foot .btn-primary{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--ink,#0A0A0A);color:var(--paper,#FAF7EC);font-weight:600;font-size:14px;letter-spacing:.04em;text-transform:uppercase;border:1px solid var(--ink,#0A0A0A);transition:transform .16s,box-shadow .16s;text-decoration:none}'+
    '.mob-nav-foot .btn-primary:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 0 var(--zop-orange,#F58549)}'+
    '.mob-nav-foot .meta{font-family:var(--mono,"JetBrains Mono",monospace);font-size:11px;color:var(--g-500,#707070);letter-spacing:.06em}'+
    '@media (max-width:960px){.mob-nav-toggle{display:inline-flex}body.mob-nav-open{overflow:hidden}}'+
    '@media (prefers-reduced-motion:reduce){.mob-nav,.mob-nav-scrim{transition-duration:.01ms}}';
    document.head.appendChild(css);
  }

  /* -------------------------------------------------------------------------
     Build the link set: mirror the desktop nav-links + nav-cta, but adapt
     for the drawer format. Each section has a label and a list of links.
     ------------------------------------------------------------------------- */
  /* primary · matches the desktop nav-links order:
     Product · Resources · Pricing · Company · Community.
     Mobile drawer is flat (no dropdown panes), so each top-level
     entry plus its key sub-pages get their own row. */
  /* Drawer is grouped into labelled sections that mirror the desktop
     megamenu panes (Product · Resources · Company) and a flat tail
     for top-level links + utilities. */
  var sections = [
    { label: 'product', items: [
      { href: 'zopnight.html', label: 'ZopNight' },
      { href: 'zopday.html',   label: 'ZopDay' },
      { href: 'zopcloud.html', label: 'ZopCloud' }
    ]},
    { label: 'resources', items: [
      { href: 'blog.html',                  label: 'Blog' },
      { href: 'free-ebooks.html',           label: 'Ebooks' },
      { href: 'customers.html',             label: 'Case studies' },
      { href: 'solutions.html',             label: 'Use cases by industry' },
      { href: 'product-documentation.html',           label: 'Product documentation' },
      { href: 'kubernetes-guide.html',      label: 'Kubernetes guide' },
      { href: 'changelog.html',             label: 'Changelog' }
    ]},
    { label: 'company', items: [
      { href: 'about.html',     label: 'About' },
      { href: 'careers.html',   label: 'Careers' }
    ]},
    { label: 'menu', items: [
      { href: 'pricing.html',   label: 'Pricing' },
      { href: 'community.html', label: 'Community' }
    ]},
    { label: 'more', items: [
      { href: 'status.html',      label: 'Status' },
      { href: 'playground.html',  label: 'Playground' },
      { href: 'trust.html',       label: 'Trust Center' },
      { href: 'signin.html',      label: 'Sign in' }
    ]}
  ];

  /* -------------------------------------------------------------------------
     1 · Hamburger button
     ------------------------------------------------------------------------- */
  var btn = document.createElement('button');
  btn.className = 'mob-nav-toggle';
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', 'Open menu');
  btn.setAttribute('aria-controls', 'mob-nav');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="bars"><span></span><span></span><span></span></span>';
  navInner.appendChild(btn);

  /* -------------------------------------------------------------------------
     2 · Scrim (full-viewport backdrop)
     ------------------------------------------------------------------------- */
  var scrim = document.createElement('div');
  scrim.className = 'mob-nav-scrim';
  scrim.setAttribute('aria-hidden', 'true');
  document.body.appendChild(scrim);

  /* -------------------------------------------------------------------------
     3 · Drawer markup
     ------------------------------------------------------------------------- */
  var drawer = document.createElement('aside');
  drawer.className = 'mob-nav';
  drawer.id = 'mob-nav';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'Site menu');
  drawer.setAttribute('aria-hidden', 'true');

  function linkRow(href, label, isCurrent){
    return ''
      + '<a class="mob-nav-link" href="' + href + '"'
      + (isCurrent ? ' aria-current="page"' : '') + '>'
      +   '<span>' + label + '</span>'
      +   '<span class="arrow" aria-hidden="true">→</span>'
      + '</a>';
  }

  function isCurrent(href){
    try{
      var path = window.location.pathname.replace(/\/index\.html$/, '/');
      var clean = href.replace(/\/index\.html$/, '/');
      return path === clean || path === clean.replace(/^\//, '/');
    }catch(_){ return false; }
  }

  var sectionsHTML = sections.map(function(s){
    var rows = s.items.map(function(l){ return linkRow(l.href, l.label, isCurrent(l.href)); }).join('');
    return '<div class="mob-nav-section">'
      + '<div class="mob-nav-section-label">// ' + s.label + '</div>'
      + rows
      + '</div>';
  }).join('');

  drawer.innerHTML = ''
    + '<div class="mob-nav-head">'
    +   '<span class="mob-wm">Zop<em>Dev</em></span>'
    +   '<div class="mob-nav-head-actions">'
    +     '<button class="mob-nav-theme" type="button" aria-label="Toggle theme">'
    +       '<svg class="mt-sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">'
    +         '<circle cx="8" cy="8" r="3" fill="currentColor" stroke="none"/>'
    +         '<path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9"/>'
    +       '</svg>'
    +       '<svg class="mt-moon" viewBox="0 0 16 16" fill="currentColor">'
    +         '<path d="M12.8 10.1a5.5 5.5 0 0 1-7-7 .5.5 0 0 0-.7-.6A6.5 6.5 0 1 0 13.4 10.8a.5.5 0 0 0-.6-.7z"/>'
    +       '</svg>'
    +     '</button>'
    +     '<button class="mob-nav-close" type="button" aria-label="Close menu">'
    +       '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">'
    +         '<path d="M2 2 L12 12 M12 2 L2 12"/>'
    +       '</svg>'
    +     '</button>'
    +   '</div>'
    + '</div>'
    + '<nav class="mob-nav-body" aria-label="Mobile">'
    +   sectionsHTML
    + '</nav>'
    + '<div class="mob-nav-foot">'
    +   '<a class="btn-primary" href="/demo.html">'
    +     '<span>Book a demo</span>'
    +     '<span class="arrow" aria-hidden="true">→</span>'
    +   '</a>'
    +   '<div class="meta">// the platform engineering layer</div>'
    + '</div>';

  document.body.appendChild(drawer);

  /* -------------------------------------------------------------------------
     4 · Open / close behavior
     ------------------------------------------------------------------------- */
  var lastFocused = null;

  function open(){
    lastFocused = document.activeElement;
    drawer.classList.add('open');
    scrim.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('mob-nav-open');
    /* Focus the first link for keyboard users */
    var firstLink = drawer.querySelector('.mob-nav-link');
    if(firstLink) setTimeout(function(){ firstLink.focus(); }, 60);
  }

  function close(){
    drawer.classList.remove('open');
    scrim.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('mob-nav-open');
    if(lastFocused && typeof lastFocused.focus === 'function'){
      lastFocused.focus();
    }
  }

  function toggle(){
    if(drawer.classList.contains('open')) close();
    else open();
  }

  btn.addEventListener('click', toggle);
  scrim.addEventListener('click', close);
  drawer.querySelector('.mob-nav-close').addEventListener('click', close);

  /* In-drawer theme toggle · same behavior as the desktop sun/moon button.
     Keep `lastFocused` semantics intact: clicking this won't close the drawer. */
  var mobTheme = drawer.querySelector('.mob-nav-theme');
  if(mobTheme){
    mobTheme.addEventListener('click', function(){
      var html = document.documentElement;
      var cur = html.getAttribute('data-theme');
      html.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
    });
  }

  /* ESC closes when drawer is open */
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && drawer.classList.contains('open')){
      close();
    }
  });

  /* Close on link click (so navigation feels normal) */
  drawer.querySelectorAll('.mob-nav-link, .btn-primary').forEach(function(a){
    a.addEventListener('click', function(){
      /* Brief delay so the click registers before drawer slides away */
      setTimeout(close, 40);
    });
  });

  /* Resize handler — if user grows window past 960px while drawer is
     open, close it (the desktop nav takes over) */
  var matcher = window.matchMedia('(max-width:960px)');
  function onMediaChange(){
    if(!matcher.matches && drawer.classList.contains('open')) close();
  }
  if(matcher.addEventListener){ matcher.addEventListener('change', onMediaChange); }
  else if(matcher.addListener){ matcher.addListener(onMediaChange); }
})();


/* ============================================================================
   chrome-nav-scroll · auto-hide the sticky nav on scroll-down, restore on
   scroll-up. Same behavior the homepage has — ported into the shared file
   so every subpage gets it for free. Idempotent: bail if no .nav exists.
   ============================================================================ */
(function(){
  var nav = document.querySelector('.nav');
  if(!nav) return;
  if(nav.dataset.scrollHideWired === '1') return;   /* idempotency guard */
  nav.dataset.scrollHideWired = '1';

  /* Inject the supporting CSS once — keeps the nav-scroll behavior
     working even if a page omits homepage-chrome.css. */
  if(!document.getElementById('zd-navscroll-css')){
    var s = document.createElement('style');
    s.id = 'zd-navscroll-css';
    s.textContent =
      '.nav{transition:transform .24s cubic-bezier(.65,0,.35,1),' +
        ' background-color var(--dur-md,.4s) var(--ease-in-out,cubic-bezier(.65,0,.35,1)),' +
        ' border-color var(--dur-md,.4s) var(--ease-in-out,cubic-bezier(.65,0,.35,1))}' +
      '.nav.nav--hidden{transform:translateY(-110%)}';
    document.head.appendChild(s);
  }

  var lastY   = 0;
  var delta   = 0;          /* accumulated distance in current direction */
  var HIDE_AT = 72;         /* px of downward scroll before hiding */
  var SHOW_AT = 10;         /* px of upward scroll before showing */
  var hidden  = false;
  var ticking = false;

  function update(){
    ticking = false;
    var y = window.pageYOffset;
    var diff = y - lastY;
    lastY = y;

    /* Always show at the very top */
    if(y <= 0){
      if(hidden){ nav.classList.remove('nav--hidden'); hidden = false; }
      delta = 0;
      return;
    }

    if(diff > 0){
      delta = (delta > 0 ? delta : 0) + diff;
      if(!hidden && delta > HIDE_AT){
        /* Close any open dropdown first so it doesn't tear off-screen */
        var ov = document.getElementById('nav-overlay');
        if(ov) ov.classList.remove('open');
        nav.classList.add('nav--hidden');
        hidden = true;
        delta = 0;
      }
    } else {
      delta = (delta < 0 ? delta : 0) + diff;
      if(hidden && Math.abs(delta) > SHOW_AT){
        nav.classList.remove('nav--hidden');
        hidden = false;
        delta = 0;
      }
    }
  }

  window.addEventListener('scroll', function(){
    if(!ticking){ requestAnimationFrame(update); ticking = true; }
  }, {passive:true});
})();


/* ============================================================================
   chrome-nav-dropdown · global hover/focus dropdown wiring for the new
   nav megamenu. Runs alongside any inline dropdown JS each page may have;
   if a binding is already present, this just adds a second (idempotent)
   handler that triggers the same showMenu / hideMenu logic. The flag on
   #nav-overlay (data-dropdown-wired) prevents this IIFE from double-binding
   if loaded twice (e.g. cached in a SPA reload).
   ============================================================================ */
(function(){
  var overlay = document.getElementById('nav-overlay');
  var navLinks = document.getElementById('nav-links');
  if(!overlay || !navLinks) return;
  if(overlay.dataset.dropdownWired === '1') return;
  overlay.dataset.dropdownWired = '1';

  var panes = {};
  overlay.querySelectorAll('.nav-pane').forEach(function(p){ panes[p.dataset.pane] = p; });
  var activeMenu = null;
  var closeTimer = null;

  function getLeft(navItem){
    var navInner = navItem.closest('.nav-inner');
    if(!navInner) return 0;
    var niRect = navItem.getBoundingClientRect();
    var innerRect = navInner.getBoundingClientRect();
    var left = niRect.left - innerRect.left;
    var overlayW = overlay.offsetWidth || 720;
    var maxLeft = innerRect.width - overlayW - 16;
    return Math.max(0, Math.min(left, maxLeft));
  }
  function showMenu(menuName, navItem){
    clearTimeout(closeTimer);
    overlay.style.left = getLeft(navItem) + 'px';
    if(activeMenu !== menuName){
      Object.keys(panes).forEach(function(k){ panes[k].classList.remove('active'); });
      var incoming = panes[menuName];
      if(incoming){
        incoming.classList.add('active');
        var panesEl = overlay.querySelector('.nav-panes');
        if(panesEl) panesEl.style.height = incoming.offsetHeight + 'px';
      }
      activeMenu = menuName;
    }
    navLinks.querySelectorAll('.nav-item').forEach(function(ni){
      ni.classList.toggle('open', ni.dataset.menu === menuName);
    });
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
  }
  function hideMenu(){
    closeTimer = setTimeout(function(){
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden','true');
      navLinks.querySelectorAll('.nav-item').forEach(function(ni){ ni.classList.remove('open'); });
      activeMenu = null;
    }, 140);
  }

  navLinks.querySelectorAll('.nav-item[data-menu]').forEach(function(item){
    item.addEventListener('mouseenter', function(){ showMenu(item.dataset.menu, item); });
    item.addEventListener('mouseleave', hideMenu);
    item.addEventListener('click', function(e){
      // prevent navigation on click — these are non-href triggers
      if(e.target.closest('a') && !e.target.closest('a').getAttribute('href')){
        e.preventDefault();
      }
      showMenu(item.dataset.menu, item);
    });
    var a = item.querySelector('a');
    if(a){
      a.addEventListener('focus', function(){ showMenu(item.dataset.menu, item); });
      a.addEventListener('blur', hideMenu);
    }
  });
  overlay.addEventListener('mouseenter', function(){ clearTimeout(closeTimer); });
  overlay.addEventListener('mouseleave', hideMenu);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ clearTimeout(closeTimer); hideMenu(); }
  });
})();


/* ============================================================================
   chrome-theme-toggle · global click handler for the sun/moon button
   in .nav-cta. Runs on every page that loads this script. Idempotent —
   the button itself carries a data flag so repeat loads don't double-bind.
   ============================================================================ */
(function(){
  var btn = document.getElementById('theme-toggle');
  if(!btn) return;
  if(btn.dataset.themeWired === '1') return;
  btn.dataset.themeWired = '1';

  var html = document.documentElement;
  /* If a page forgot to declare a theme, default to dark so the design
     reads correctly on first paint. Every subpage already gets dark
     default via <html data-theme="dark"> from the earlier sweep, but
     this is a safety net. */
  if(!html.getAttribute('data-theme')) html.setAttribute('data-theme', 'dark');

  btn.addEventListener('click', function(){
    var cur = html.getAttribute('data-theme');
    html.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
  });
})();
