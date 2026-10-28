(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const SAVED_KEY = 'synthesisncu-gemini-listings';
  const savedListings = (() => { try { const x = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); return Array.isArray(x) ? x : []; } catch (_) { return []; } })();
  const LIST = [...(Array.isArray(window.SAMPLE_LISTINGS) ? window.SAMPLE_LISTINGS : []), ...savedListings];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SAMPLE_IMG = 'images/sample-item.jpg';
  // Clearly labelled demo data. Never shown as a live Gemini result.
  const SAMPLE = {
    itemName: 'Mixer grinder base unit', category: 'Kitchen', partType: 'base', brand: 'Prestige', model: 'Iris',
    visibleDamage: ['Scuffed top cover', 'Jar missing'], condition: 'Fair', isElectrical: true, needsInspection: true,
    retakePhoto: false, retakeReason: '', confidence: 'medium',
    explanation: 'Sample data: a motor base with no jar. Brand and model are marked on the label in this sample.'
  };

  function view(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
    window.scrollTo(0, 0);
  }
  const img = (src, alt) => '<div class="ph">' + (src ? '<img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" onerror="this.remove()">' : '') + '</div>';

  /* Browse */
  const uniq = k => Array.from(new Set(LIST.map(l => l[k]))).sort();
  function fill(sel, vals) { vals.forEach(v => { const o = document.createElement('option'); o.value = o.textContent = v; sel.appendChild(o); }); }
  function cardHTML(l) {
    return '<button class="card" type="button" data-item="' + esc(l.id) + '" aria-label="View ' + esc(l.title) + '">' + img(l.image, l.title) + '<span class="cb"><strong>' + esc(l.title) + '</strong><span class="meta">' + esc(l.mode) + ' · ' + esc(l.hostel) + '</span><span class="meta">' + esc(l.condition) + '</span>' +
      (l.electrical ? '<span class="warn">Inspect before use</span>' : '') + '<span class="card-hint">View item →</span></span></button>';
  }
  function renderBrowse() {
    const c = $('#fCat').value, h = $('#fHostel').value;
    const shown = LIST.filter(l => (!c || l.category === c) && (!h || l.hostel === h));
    $('#grid').innerHTML = shown.map(cardHTML).join('');
    $('#empty').hidden = shown.length > 0; $('#kept').textContent = shown.length;
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
      brand: a.brand || '', model: a.model || '', hostel: 'Campus pickup', mode: 'Community find', condition: a.condition || 'Unclear',
      electrical: !!a.isElectrical, note: a.visibleDamage && a.visibleDamage.length ? 'Visible damage: ' + a.visibleDamage.join(', ') : 'Added after accepted Gemini photo analysis.', image: photo
    };
    savedListings.push(item);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(savedListings)); } catch (_) { /* keep it in this session */ }
    renderBrowse(); return true;
  }
  function showListing(id) {
    const l = LIST.find(x => String(x.id) === String(id)); if (!l) return;
    $('#resultBody').innerHTML = '<p class="src">Campus find</p><div class="panel listing-detail">' + img(l.image, l.title) + '<h3>' + esc(l.title) + '</h3><p class="meta">' + esc(l.category) + ' · ' + esc(l.mode) + ' · ' + esc(l.hostel) + '</p><dl><dt>Condition</dt><dd>' + esc(l.condition) + '</dd>' + (l.brand ? '<dt>Brand</dt><dd>' + esc(l.brand) + '</dd>' : '') + '<dt>Details</dt><dd>' + esc(l.note || 'Ask about this campus find.') + '</dd></dl>' + (l.electrical ? '<p class="note">Inspect before use.</p>' : '') + '</div><div class="res-actions"><button class="pill primary" type="button" id="listingRequest">Place request</button></div>';
    $('#listingRequest').addEventListener('click', showToast); view('result');
  }

  /* Result */
  function resultHTML(a, source, photo, note) {
    const rejected = a.retakePhoto || a.condition === 'Poor';
    const m = rejected ? { kind: 'none' } : Match.findMatch(a, LIST);
    const label = source === 'gemini' ? 'Live Gemini analysis' : 'Sample analysis (demo data, not a live Gemini result)';
    let h = '<p class="src">' + esc(label) + '</p><span class="verdict ' + (rejected ? 'no' : 'ok') + '">' + (rejected ? 'Rejected' : 'Accepted') + '</span>' +
      '<div class="score">' + (m.kind === 'none' ? '-' : m.score + '<span>%</span>') + '</div><p class="cap">Match score</p>';
    if (rejected) h += '<p class="note">' + (a.retakePhoto ? 'Please retake the photo' + (a.retakeReason ? ': ' + esc(a.retakeReason) : '.') + ' Use good light and show the whole item.' : 'Condition looks too poor to list for reuse. Consider repair or recycling.') + '</p>';
    h += '<div class="panel">' + (photo ? img(photo, 'Your item') : '') + '<h3>' + esc(a.itemName) + '</h3><dl><dt>Category</dt><dd>' + esc(a.category) + '</dd>' +
      (a.partType ? '<dt>Part</dt><dd>' + esc(a.partType) + '</dd>' : '') + (a.brand ? '<dt>Brand</dt><dd>' + esc(a.brand) + '</dd>' : '') + (a.model ? '<dt>Model</dt><dd>' + esc(a.model) + '</dd>' : '') +
      '<dt>Damage</dt><dd>' + (a.visibleDamage.length ? esc(a.visibleDamage.join(', ')) : 'None visible') + '</dd><dt>Condition</dt><dd>' + esc(a.condition) + '</dd><dt>Confidence</dt><dd>' + esc(a.confidence) + '</dd></dl>' +
      '<p class="small">' + esc(a.explanation) + '</p>' + (a.isElectrical ? '<p class="note">Inspect before use.</p>' : a.needsInspection ? '<p class="note">Needs in-person inspection.</p>' : '') + '</div>';
    if (m.kind !== 'none') {
      const l = m.listing;
      h += '<div class="panel"><p class="meta">' + (m.kind === 'part' ? 'Possible complementary part' : 'No part match. Reuse idea') + '</p>' + img(l.image, l.title) + '<h3>' + esc(l.title) + '</h3><p class="meta">' + esc(l.mode) + ' · ' + esc(l.hostel) + '</p>' +
        '<p class="small">' + esc(m.why.join(' ') || 'Closest listing by category.') + ' Rule-based score, capped at 95%. Verify fit in person.</p></div>' +
        '<div class="res-actions"><button class="pill primary" type="button" id="pickupBtn">Request pickup</button></div>';
      setTimeout(() => $('#pickupBtn').addEventListener('click', showToast), 0);
    }
    return h;
  }
  const body = html => { $('#resultBody').innerHTML = html; view('result'); };
  function runSample() { body(resultHTML(SAMPLE, 'sample', SAMPLE_IMG)); }
  function downscale(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const k = Math.min(1, 1024 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); URL.revokeObjectURL(url); };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file could not be read as an image.')); };
      im.src = url;
    });
  }
  async function runUpload(file) {
    body('<p class="sub" role="status">Analyzing your photo...</p>');
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 14000);
    try {
      const image = await downscale(file);
      const r = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }), signal: ctrl.signal });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.analysis) throw new Error(d.error || 'Analysis failed.');
      body(resultHTML(d.analysis, 'gemini', image));
      const added = addVerifiedListing(d.analysis, image);
      if (added) showToastText('Verified item added to Campus finds!');
    } catch (e) {
      body('<p class="note">Live analysis is unavailable: ' + esc(e.name === 'AbortError' ? 'the analysis timed out.' : e.message) + ' Your photo was not analyzed.</p><div class="res-actions"><button class="pill primary" type="button" id="fb">Try a sample</button></div>');
      $('#fb').addEventListener('click', runSample);
    } finally { clearTimeout(t); $('#photo').value = ''; }
  }

  /* Init */
  fill($('#fCat'), uniq('category')); fill($('#fHostel'), uniq('hostel')); renderBrowse();
  $('#fCat').addEventListener('change', renderBrowse); $('#fHostel').addEventListener('change', renderBrowse);
  $('#grid').addEventListener('click', e => { const card = e.target.closest('[data-item]'); if (card) showListing(card.dataset.item); });
  $('#sampleBtn').addEventListener('click', runSample);
  $('#browseBtn').addEventListener('click', () => view('browse'));
  $('#checkBtn').addEventListener('click', () => { const u = $('#uploadBtn'); u.hidden = !u.hidden; $('#checkBtn').setAttribute('aria-expanded', String(!u.hidden)); if (!u.hidden) u.focus(); });
  $('#uploadBtn').addEventListener('click', () => $('#photo').click());
  $('#photo').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) runUpload(f); });
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => view('home')));
})();
