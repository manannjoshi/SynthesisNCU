// Deterministic matching rules. No AI is involved in scoring.
(function (root) {
  // product -> part the user has -> parts that complement it
  const COMPLEMENTS = {
    mixer:  { base: ['jar', 'lid'], jar: ['base'], lid: ['base'] },
    kettle: { base: ['jug'], jug: ['base'] },
    laptop: { laptop: ['charger'], charger: ['laptop'] },
    lamp:   { lamp: ['bulb', 'shade'], bulb: ['lamp'], shade: ['lamp'] }
  };
  const PRODUCT_WORDS = { mixer: ['mixer', 'grinder', 'blender'], kettle: ['kettle'], laptop: ['laptop'], lamp: ['lamp'] };
  const norm = s => (s == null ? '' : String(s)).trim().toLowerCase();
  function productOf(text) {
    const t = norm(text);
    return Object.keys(PRODUCT_WORDS).find(p => PRODUCT_WORDS[p].some(w => t.includes(w))) || null;
  }
  function partOf(product, text) {
    const t = norm(text);
    return Object.keys(COMPLEMENTS[product] || {}).find(k => t.includes(k)) || null;
  }
  function scoreMatch(item, l) {
    let s = 0; const why = [];
    const text = norm(item.itemName) + ' ' + norm(item.partType);
    const p = productOf(text);
    const ip = p && partOf(p, norm(item.partType) || text);
    const comp = !!(p && p === l.product && ip && (COMPLEMENTS[p][ip] || []).includes(l.partType));
    if (comp) { s += 40; why.push('A ' + l.partType + ' is a complementary part for the ' + ip + ' you checked.'); }
    if (norm(item.category) === norm(l.category)) { s += 25; why.push('Same category (' + l.category + ').'); }
    if (item.brand && norm(item.brand) === norm(l.brand)) { s += 20; why.push('Brand matches (' + l.brand + ').'); }
    if (item.model && l.model && norm(item.model) === norm(l.model)) { s += 15; why.push('Model matches (' + l.model + ').'); }
    return { listing: l, score: Math.min(s, 95), complementary: comp, why: why };
  }
  const COMBO_MAP = {
    lamp: { targets: ['table', 'chair', 'board'], title: 'Late-Night Study Nook', reason: 'Students frequently pair a focused desk lamp with a study table or chair for quiet late-night study sessions.' },
    chair: { targets: ['table', 'lamp', 'board'], title: 'Ergonomic Desk Setup', reason: 'An adjustable study chair paired with a compact desk or lamp sets up a useful study corner.' },
    table: { targets: ['chair', 'lamp', 'kit'], title: 'Complete Room Workstation', reason: 'A compact study table paired with an adjustable chair creates a dedicated study station without taking up floor space.' },
    mixer: { targets: ['jar', 'base'], title: 'Kitchen Prep Duo', reason: 'Pairing this unit with complementary mixer jars completes your kitchen setup for quick shakes and meal prep.' },
    laptop: { targets: ['board', 'charger'], title: 'Campus Tech Power Station', reason: 'Students often bundle laptop accessories with an extension board to power multiple devices at a study space.' },
    kettle: { targets: ['base', 'board'], title: 'Quick Tea & Coffee Bar', reason: 'A kettle paired with an extension board sets up an instant hot water and coffee station.' },
    kit: { targets: ['table', 'chair'], title: 'Engineering Drafting Corner', reason: 'Drawing kits and engineering books pair naturally with a flat study table for project submissions and coursework.' },
    jacket: { targets: ['jacket', 'board'], title: 'Campus Comfort Bundle', reason: 'Useful campus essentials that students often claim together.' }
  };

  function findBundle(item, listings) {
    if (!listings || !listings.length) return null;
    if (item && item.recommendedListingId) {
      const match = listings.find(l => Number(l.id) === Number(item.recommendedListingId));
      if (match) {
        return {
          listing: match,
          title: item.bundleTitle || 'Recommended Campus Combo',
          reason: item.bundleReason || 'AI recommended complementary campus find.'
        };
      }
    }
    const text = norm((item && item.itemName) || '') + ' ' + norm((item && item.partType) || '') + ' ' + norm((item && item.category) || '');
    const p = productOf(text);
    if (p && COMBO_MAP[p]) {
      const combo = COMBO_MAP[p];
      const match = listings.find(l => combo.targets.some(t => norm(l.product) === t || norm(l.partType) === t || norm(l.title).includes(t)));
      if (match) return { listing: match, title: combo.title, reason: combo.reason };
    }
    const sameCat = listings.find(l => norm(l.category) === norm(item.category));
    if (sameCat) {
      return {
        listing: sameCat,
        title: 'Frequently Paired Campus Duo',
        reason: 'Students browsing for ' + (item.category || 'campus finds') + ' frequently bundle this with ' + sameCat.title + '.'
      };
    }
    return {
      listing: listings[0],
      title: 'Popular Campus Bundle',
      reason: 'A popular campus find frequently bundled by students.'
    };
  }

  function findMatch(item, listings) {
    const all = listings.map(l => scoreMatch(item, l)).sort((a, b) => b.score - a.score);
    const part = all.find(m => m.complementary);
    if (part) return Object.assign({ kind: 'part' }, part);
    const alt = all.find(m => norm(m.listing.category) === norm(item.category) && ['Donate', 'Exchange', 'Reuse'].includes(m.listing.mode));
    if (alt) return Object.assign({ kind: 'alt' }, alt);
    return { kind: 'none', score: 0, why: [] };
  }
  const api = { COMPLEMENTS, findMatch, scoreMatch, productOf, findBundle, COMBO_MAP };
  if (typeof module !== 'undefined') module.exports = api; else root.Match = api;
})(typeof window !== 'undefined' ? window : globalThis);
