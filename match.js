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
  function findMatch(item, listings) {
    const all = listings.map(l => scoreMatch(item, l)).sort((a, b) => b.score - a.score);
    const part = all.find(m => m.complementary);
    if (part) return Object.assign({ kind: 'part' }, part);
    const alt = all.find(m => norm(m.listing.category) === norm(item.category) && ['Donate', 'Exchange', 'Reuse'].includes(m.listing.mode));
    if (alt) return Object.assign({ kind: 'alt' }, alt);
    return { kind: 'none', score: 0, why: [] };
  }
  const api = { COMPLEMENTS, findMatch, scoreMatch, productOf };
  if (typeof module !== 'undefined') module.exports = api; else root.Match = api;
})(typeof window !== 'undefined' ? window : globalThis);
