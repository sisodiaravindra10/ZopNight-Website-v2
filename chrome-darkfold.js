/* ============================================================================
   chrome-darkfold.js
   ----------------------------------------------------------------------------
   Marks subpage hero headers as dark-themed by setting the
   `data-theme="dark"` attribute. Triggers the scoped CSS dark tokens
   defined in homepage-chrome.css so the descendant elements pick up dark
   `--paper`, `--ink`, `--g-*`, `--line` automatically via the cascade.

   Targets:
   - `.page-head`        · standard subpage hero (about, careers, contact, etc.)
   - `.pi-head`          · playground-ideas test bench page-head
   - `.fp-head`          · features.html page-head
   - `.ds-pagehead`      · design-system.html page-head

   Explicitly NOT touched:
   - The homepage `.hero` (paper-tuned for the globe canvas backdrop)
   - Anything inside the brand-kit tool (its own dark UI)

   Skips when the user has `prefers-reduced-motion: reduce` set? · No,
   that's a motion preference, not a contrast preference. Dark-fold is
   purely visual, not motion.
   ============================================================================ */
(function(){
  /* Skip when the document is in light mode — otherwise the subpage hero
     renders as a "black box" on cream paper. In dark mode the page is
     already dark, so the attr is mainly a scoped-token contract for any
     descendant rule that resolves --paper/--ink against the header. */
  function applyFold(){
    var docTheme = document.documentElement.getAttribute('data-theme');
    var sel = '.page-head, .pi-head, .fp-head, .ds-pagehead';
    document.querySelectorAll(sel).forEach(function(el){
      if(docTheme === 'light'){
        if(el.getAttribute('data-theme') === 'dark') el.removeAttribute('data-theme');
        return;
      }
      if(el.hasAttribute('data-theme')) return;
      el.setAttribute('data-theme', 'dark');
    });
  }
  applyFold();
  /* Re-apply on theme toggle so the hero follows the document. */
  new MutationObserver(applyFold).observe(document.documentElement,
    { attributes:true, attributeFilter:['data-theme'] });
})();
