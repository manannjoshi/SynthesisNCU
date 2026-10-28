(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const SAVED_KEY = 'synthesisncu-gemini-listings';
  const savedListings = (() => { try { const x = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); return Array.isArray(x) ? x : []; } catch (_) { return []; } })();
  const LIST = [...(Array.isArray(window.SAMPLE_LISTINGS) ? window.SAMPLE_LISTINGS : []), ...savedListings];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SAMPLE_IMG = 'images/sample-item.jpg';
  const bundle = new Set();
  let resultBackTarget = 'home';
  // Clearly labelled demo data. Never shown as a live Gemini result.
  const SAMPLE = {
    itemName: 'Desk lamp (flexible neck)', category: 'Electronics', partType: 'lamp', brand: 'Wipro', model: '',
    visibleDamage: ['Minor base scratches'], condition: 'Good', isElectrical: true, needsInspection: true,
    retakePhoto: false, retakeReason: '', confidence: 'high',
    explanation: 'A clean desk study lamp with adjustable neck. Ideal for focused room lighting.',
    recommendedListingId: 10,
    bundleListingIds: [10, 5],
    bundleTitle: 'Late-Night Study Nook Combo',
    bundleReason: 'Pairing a focused desk lamp with a compact study table creates a useful study corner.'
  };

  function view(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
    window.scrollTo(0, 0);
  }
  const img = (src, alt) => '<div class="ph">' + (src ? '<img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" onerror="this.onerror=null;this.style.opacity=\'0\';">' : '') + '</div>';

  /* Browse */
  const uniq = k => Array.from(new Set(LIST.map(l => l[k]))).sort();
  function fill(sel, vals) { vals.forEach(v => { const o = document.createElement('option'); o.value = o.textContent = v; sel.appendChild(o); }); }
  function cardHTML(l) {
    const id = String(l.id), added = bundle.has(id);
    return '<article class="card"><button class="card-open" type="button" data-item="' + esc(id) + '" aria-label="View ' + esc(l.title) + '">' + img(l.image, l.title) + '<span class="cb"><strong>' + esc(l.title) + '</strong><span class="meta">' + esc(l.mode) + ' · ' + esc(l.location || 'Cafe 10') + '</span><span class="meta">' + esc(l.condition) + '</span>' +
      (l.electrical ? '<span class="warn">Inspect before use</span>' : '') + '<span class="card-hint">View item →</span></span></button><button class="add-item' + (added ? ' selected' : '') + '" type="button" data-add="' + esc(id) + '" aria-label="' + (added ? 'Remove ' : 'Add ') + esc(l.title) + (added ? ' from' : ' to') + ' bundle">' + (added ? '✓' : '+') + '</button></article>';
  }
  function renderBrowse() {
    const c = $('#fCat').value;
    const shown = LIST.filter(l => !c || l.category === c);
    $('#grid').innerHTML = shown.map(cardHTML).join('');
    $('#empty').hidden = shown.length > 0; $('#kept').textContent = shown.length;
    renderRecommendedCombos();
    updateBundleBar();
  }
  const RECOMMENDED_COMBOS = [
    { title: 'Campus Tech Setup', ids: [9, 3], reason: 'Pair a laptop charger with an extension board for a useful desk setup. Inspect electrical items before use.' },
    { title: 'Winter Campus Pair', ids: [11, 8], reason: 'A warm scarf and jacket make a practical pair for chilly campus days.' },
    { title: 'Drawing Essentials', ids: [6, 12], reason: 'Pair a drawing kit with a bundle of sheets for coursework and studio projects.' }
  ];
  function renderRecommendedCombos() {
    const root = $('#comboGrid');
    if (!root) return;
    root.innerHTML = RECOMMENDED_COMBOS.map(combo => {
      const items = combo.ids.map(id => LIST.find(l => Number(l.id) === id)).filter(Boolean);
      if (items.length < 2) return '';
      return '<article class="combo-card"><h3>' + esc(combo.title) + '</h3><div class="combo-items">' + items.map((item, i) => (i ? '<span class="combo-plus">＋</span>' : '') + '<div class="combo-item">' + img(item.image, item.title) + '<span>' + esc(item.title) + '</span></div>').join('') + '</div><p>' + esc(combo.reason) + '</p><button class="pill outline combo-add" type="button" data-combo="' + esc(combo.ids.join(',')) + '">Add combo to bundle</button></article>';
    }).join('');
  }
  function updateBundleBar() {
    const bar = $('#bundleBar'); if (!bar) return;
    bar.hidden = bundle.size === 0;
    $('#bundleCount').textContent = bundle.size + (bundle.size === 1 ? ' item selected' : ' items selected');
    $('#expandBundle').textContent = ($('#expandBundle').getAttribute('aria-expanded') === 'true' ? 'Hide' : 'Show') + ' selected items';
    $('#bundlePreview').innerHTML = bundleGroupsHTML(true);
  }
  function toggleBundle(id) {
    if (bundle.has(id)) bundle.delete(id); else bundle.add(id);
    const button = document.querySelector('[data-add="' + CSS.escape(id) + '"]');
    if (button) {
      const added = bundle.has(id);
      const l = LIST.find(x => String(x.id) === id);
      const title = l ? l.title : 'item';
      button.classList.toggle('selected', added); button.textContent = added ? '✓' : '+';
      button.setAttribute('aria-label', (added ? 'Remove ' : 'Add ') + title + (added ? ' from' : ' to') + ' bundle');
    }
    updateBundleBar();
  }
  function bundleGroupsHTML(removable) {
    const selected = Array.from(bundle).map(id => LIST.find(l => String(l.id) === id)).filter(Boolean);
    const categories = Array.from(new Set(selected.map(l => l.category || 'Other'))).sort();
    return categories.map(category => '<section class="bundle-group"><h3>' + esc(category) + '</h3><ul>' + selected.filter(l => (l.category || 'Other') === category).map(l => '<li><span>' + esc(l.title) + '<small>' + esc(l.mode) + ' · ' + esc(l.location || 'Cafe 10') + '</small></span>' + (removable ? '<button class="remove-item" type="button" data-remove="' + esc(l.id) + '" aria-label="Remove ' + esc(l.title) + '">Remove</button>' : '') + '</li>').join('') + '</ul></section>').join('');
  }
  function renderBundlePage() {
    $('#bundleList').innerHTML = bundleGroupsHTML(false);
    view('bundle');
  }
  function showToast() {
    showToastText('Request placed!');
  }
  function showToastText(message) {
    const toast = $('#toast'); toast.textContent = message;
    toast.classList.add('show'); clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function addVerifiedListing(a, photo) {
    if (a.retakePhoto || a.condition === 'Poor') return false;
    const item = {
      id: 'gemini-' + Date.now(), title: a.itemName, category: a.category || 'Other', product: '', partType: a.partType || '',
      brand: a.brand || '', model: a.model || '', location: 'Cafe 10', mode: 'Community find', condition: a.condition || 'Unclear',
      electrical: !!a.isElectrical, note: a.visibleDamage && a.visibleDamage.length ? 'Visible damage: ' + a.visibleDamage.join(', ') : 'Added after accepted Gemini photo analysis.', image: photo
    };
    savedListings.push(item);
    LIST.push(item);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(savedListings)); } catch (_) { /* keep it in this session */ }
    renderBrowse(); return true;
  }
  function showListing(id) {
    const l = LIST.find(x => String(x.id) === String(id)); if (!l) return;
    const inBundle = bundle.has(String(id));
    $('#resultBody').innerHTML = '<p class="src">Marketplace listing</p><div class="panel listing-detail">' + img(l.image, l.title) + '<h3>' + esc(l.title) + '</h3><p class="meta">' + esc(l.category) + ' · ' + esc(l.mode) + ' · Available at ' + esc(l.location || 'Cafe 10') + '</p><dl><dt>Condition</dt><dd>' + esc(l.condition) + '</dd>' + (l.brand ? '<dt>Brand</dt><dd>' + esc(l.brand) + '</dd>' : '') + '<dt>Details</dt><dd>' + esc(l.note || 'Ask about this campus find.') + '</dd></dl>' + (l.electrical ? '<p class="note">Inspect before use.</p>' : '') + '</div><div class="res-actions"><button class="pill primary" type="button" id="listingRequest">' + (inBundle ? 'Remove from bundle' : '＋ Add to bundle') + '</button></div>';
    $('#listingRequest').addEventListener('click', () => {
      toggleBundle(String(id));
      const nowIn = bundle.has(String(id));
      $('#listingRequest').textContent = nowIn ? 'Remove from bundle' : '＋ Add to bundle';
      showToastText(nowIn ? 'Added to bundle!' : 'Removed from bundle');
    });
    resultBackTarget = 'browse';
    view('result');
  }

  /* Result */
  function resultHTML(a, source, photo, note) {
    const rejected = a.retakePhoto || a.condition === 'Poor';
    const bundleRecommendation = rejected ? null : (Match.findBundle ? Match.findBundle(a, LIST) : null);
    const comboIds = Array.isArray(a.bundleListingIds) ? a.bundleListingIds : (a.recommendedListingId ? [a.recommendedListingId] : []);
    const comboListings = Array.from(new Set(comboIds.map(Number))).slice(0, 2).map(id => LIST.find(l => Number(l.id) === id)).filter(Boolean);
    const label = source === 'gemini'
      ? 'Live Gemini AI'
      : (source === 'fallback'
          ? 'Demo fallback (Gemini unavailable — sample data shown)'
          : 'Sample match analysis');

    let h = '<p class="src">' + esc(label) + '</p><span class="verdict ' + (rejected ? 'no' : 'ok') + '">' + (rejected ? 'Rejected' : 'Accepted for reuse') + '</span>';
    if (!rejected && source === 'gemini') h += '<p class="ok-msg">Bring your accepted item to Cafe 10.</p>';

    if (rejected) {
      h += '<p class="note">' + (a.retakePhoto ? 'Please retake the photo' + (a.retakeReason ? ': ' + esc(a.retakeReason) : '.') + ' Use good light and show the whole item.' : 'Condition looks too poor to list for reuse. Consider repair or recycling.') + '</p>';
    }

    // Your Item details
    h += '<div class="panel">' + (photo ? img(photo, 'Your item') : '') + '<h3>' + esc(a.itemName) + '</h3><dl><dt>Category</dt><dd>' + esc(a.category) + '</dd>' +
      (a.partType ? '<dt>Part</dt><dd>' + esc(a.partType) + '</dd>' : '') + (a.brand ? '<dt>Brand</dt><dd>' + esc(a.brand) + '</dd>' : '') + (a.model ? '<dt>Model</dt><dd>' + esc(a.model) + '</dd>' : '') +
      '<dt>Damage</dt><dd>' + (a.visibleDamage && a.visibleDamage.length ? esc(a.visibleDamage.join(', ')) : 'None visible') + '</dd><dt>Condition</dt><dd>' + esc(a.condition) + '</dd><dt>Confidence</dt><dd>' + esc(a.confidence) + '</dd></dl>' +
      '<p class="small">' + esc(a.explanation) + '</p>' + (a.isElectrical ? '<p class="note">Inspect before use.</p>' : a.needsInspection ? '<p class="note">Needs in-person inspection.</p>' : '') + '</div>';

    // Amazon-Style Recommended Campus Combo
    if (comboListings.length || (bundleRecommendation && bundleRecommendation.listing)) {
      const recs = comboListings.length ? comboListings : [bundleRecommendation.listing];
      const comboTitle = a.bundleTitle || (bundleRecommendation && bundleRecommendation.title) || 'Recommended Campus Combo';
      const comboReason = a.bundleReason || (bundleRecommendation && bundleRecommendation.reason) || 'These items make a useful campus pairing.';
      const recIds = recs.map(rec => String(rec.id));
      const isAlreadyInBundle = recIds.every(id => bundle.has(id));
      h += '<div class="panel amazon-bundle">' +
        '<div class="bundle-badge">📦 Frequently Paired Campus Combo</div>' +
        '<h3 class="bundle-name">' + esc(comboTitle) + '</h3>' +
        '<div class="combo-visual">' +
          '<div class="combo-item">' + (photo ? img(photo, a.itemName) : '<div class="ph"></div>') + '<span>' + esc(a.itemName) + '</span></div>' +
          recs.map(rec => '<div class="combo-plus">＋</div><div class="combo-item">' + img(rec.image, rec.title) + '<span>' + esc(rec.title) + '</span></div>').join('') +
        '</div>' +
        '<p class="bundle-reason"><strong>Why this combo?</strong> ' + esc(comboReason) + '</p>' +
        recs.map(rec => '<p class="meta">' + esc(rec.title) + ': ' + esc(rec.mode) + ' · ' + esc(rec.location || 'Cafe 10') + ' · ' + esc(rec.condition) + '</p>').join('') +
        '</div>' +
        '<div class="res-actions">' +
          '<button class="pill primary" type="button" id="addComboBtn">' + (isAlreadyInBundle ? '✓ Combo added to bundle' : '＋ Add this combo to bundle') + '</button>' +
          '<button class="pill outline" type="button" id="pickupBtn">Bring it to Cafe 10</button>' +
        '</div>';

      setTimeout(() => {
        const addBtn = $('#addComboBtn');
        if (addBtn) {
          addBtn.addEventListener('click', () => {
            recIds.forEach(id => { if (bundle.has(id)) bundle.delete(id); else bundle.add(id); });
            renderBrowse();
            const nowIn = recIds.every(id => bundle.has(id));
            addBtn.textContent = nowIn ? '✓ Combo added to bundle' : '＋ Add this combo to bundle';
            showToastText(nowIn ? 'Added combo to your bundle!' : 'Removed from bundle');
          });
        }
        const pickBtn = $('#pickupBtn');
        if (pickBtn) pickBtn.addEventListener('click', () => showToastText('Please bring it to Cafe 10.'));
      }, 0);
    }
    return h;
  }

  const body = html => { $('#resultBody').innerHTML = html; view('result'); };
  async function runSample() {
    resultBackTarget = 'home';
    body('<p class="sub" role="status">Analyzing sample item with Gemini AI...</p>');
    try {
      const resp = await fetch(SAMPLE_IMG);
      if (!resp.ok) throw new Error('Could not load sample image');
      const blob = await resp.blob();
      const image = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });
      const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 12000);
      try {
        const r = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image,
            listings: LIST.map(l => ({ id: l.id, title: l.title, category: l.category, location: l.location, product: l.product, partType: l.partType, note: l.note }))
          }),
          signal: ctrl.signal
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.analysis) throw new Error(d.error || 'Live sample analysis failed.');
        body(resultHTML(d.analysis, 'gemini', SAMPLE_IMG));
        const added = addVerifiedListing(d.analysis, SAMPLE_IMG);
        if (added) showToastText('Verified sample item added. Bring it to Cafe 10.');
      } finally {
        clearTimeout(t);
      }
    } catch (e) {
      console.warn('Live Gemini sample check unavailable, showing sample fallback data:', e);
      body(resultHTML(SAMPLE, 'sample', SAMPLE_IMG));
    }
  }
  function downscale(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const k = Math.min(1, 1024 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); URL.revokeObjectURL(url); };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file could not be read as an image.')); };
      im.src = url;
    });
  }
  async function runUpload(file) {
    resultBackTarget = 'home';
    body('<p class="sub" role="status">Analyzing your photo with Gemini AI...</p>');
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 14000);
    try {
      const image = await downscale(file);
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          listings: LIST.map(l => ({ id: l.id, title: l.title, category: l.category, location: l.location, product: l.product, partType: l.partType, note: l.note }))
        }),
        signal: ctrl.signal
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.analysis) throw new Error(d.error || 'Analysis failed.');
      body(resultHTML(d.analysis, 'gemini', image));
      const added = addVerifiedListing(d.analysis, image);
      if (added) showToastText('Accepted for reuse. Bring it to Cafe 10.');
    } catch (e) {
      const reason = e.name === 'AbortError' ? 'The analysis timed out.' : (e.message || 'Server error.');
      const errBanner = '<div class="panel" style="border-left: 4px solid var(--warn); margin-bottom: 16px;"><p class="warn" style="margin: 0 0 6px;"><strong>Live Gemini analysis is unavailable:</strong> ' + esc(reason) + '</p><p class="small" style="margin: 0;">Showing sample demo analysis below so you can test the rest of the flow. (Fallback data is never presented as a live result).</p></div>';
      body(errBanner + resultHTML(SAMPLE, 'fallback', SAMPLE_IMG));
    } finally { clearTimeout(t); $('#photo').value = ''; }
  }

  /* Theme toggle */
  (function initTheme() {
    const btn = $('#themeToggle');
    const sun = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    const moon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    const saved = localStorage.getItem('theme');
    const dark = saved === 'dark';
    document.body.classList.toggle('theme-dark', dark);
    btn.innerHTML = dark ? sun : moon;
    btn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('theme-dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      btn.innerHTML = isDark ? sun : moon;
    });
  })();

  /* Init */
  fill($('#fCat'), uniq('category')); renderBrowse();
  $('#fCat').addEventListener('change', renderBrowse);
  $('#grid').addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { e.stopPropagation(); toggleBundle(add.dataset.add); return; }
    const card = e.target.closest('[data-item]'); if (card) showListing(card.dataset.item);
  });
  $('#comboGrid').addEventListener('click', e => {
    const button = e.target.closest('[data-combo]');
    if (!button) return;
    button.dataset.combo.split(',').forEach(id => bundle.add(String(id)));
    renderBrowse();
    showToastText('Combo added to your bundle!');
  });
  $('#bundlePreview').addEventListener('click', e => {
    const remove = e.target.closest('[data-remove]'); if (remove) toggleBundle(String(remove.dataset.remove));
  });
  $('#expandBundle').addEventListener('click', () => {
    const expanded = $('#expandBundle').getAttribute('aria-expanded') !== 'true';
    $('#expandBundle').setAttribute('aria-expanded', String(expanded)); $('#bundlePreview').hidden = !expanded;
    $('#expandBundle').textContent = expanded ? 'Hide selected items' : 'Show selected items';
  });
  $('#buildBundle').addEventListener('click', renderBundlePage);
  $('#browseBtn').addEventListener('click', () => view('browse'));
  if ($('#checkBtn')) $('#checkBtn').addEventListener('click', () => $('#photo').click());
  if ($('#uploadBtn')) $('#uploadBtn').addEventListener('click', () => $('#photo').click());
  $('#photo').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) runUpload(f); });
  document.querySelectorAll('[data-back="home"]').forEach(b => b.addEventListener('click', () => view('home')));
  document.querySelectorAll('[data-back="browse"]').forEach(b => b.addEventListener('click', () => view('browse')));
  document.querySelectorAll('[data-back="previous"]').forEach(b => b.addEventListener('click', () => view(resultBackTarget)));
  document.querySelectorAll('[data-back]:not([data-back="home"]):not([data-back="browse"]):not([data-back="previous"])').forEach(b => b.addEventListener('click', () => view('home')));
})();
