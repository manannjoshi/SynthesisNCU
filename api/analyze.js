// Vercel serverless function. The key is read from GEMINI_API_KEY and never sent to the browser.
const fs = require('fs');
const path = require('path');

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const TIMEOUT_MS = 12000;
const MAX_B64 = 4 * 1024 * 1024;

function systemPrompt() {
  try {
    const md = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'condition-check.md'), 'utf8');
    const m = md.split('## System prompt')[1].split('## Response JSON')[0].trim();
    if (m) return m;
  } catch (e) { /* fall through */ }
  return 'Describe only what is visible in the item photo. Return JSON. Never guarantee safety or compatibility.';
}

const S = (type, extra) => Object.assign({ type }, extra || {});
const SCHEMA = S('OBJECT', { properties: {
  itemName: S('STRING'), category: S('STRING', { enum: ['Kitchen', 'Electronics', 'Furniture', 'Stationery & Books', 'Clothing', 'Other'] }),
  partType: S('STRING'), brand: S('STRING'), model: S('STRING'),
  visibleDamage: S('ARRAY', { items: S('STRING') }),
  condition: S('STRING', { enum: ['Good', 'Fair', 'Poor', 'Unclear'] }),
  isElectrical: S('BOOLEAN'), needsInspection: S('BOOLEAN'), retakePhoto: S('BOOLEAN'),
  retakeReason: S('STRING'), explanation: S('STRING'), confidence: S('STRING', { enum: ['low', 'medium', 'high'] }),
  recommendedListingId: S('INTEGER'), bundleTitle: S('STRING'), bundleReason: S('STRING')
}, required: ['itemName', 'category', 'visibleDamage', 'condition', 'isElectrical', 'needsInspection', 'retakePhoto', 'explanation', 'confidence', 'recommendedListingId', 'bundleTitle', 'bundleReason'] });

function clean(a) {
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const out = {
    itemName: str(a.itemName, 80) || 'Unknown item', category: str(a.category, 30) || 'Other',
    partType: str(a.partType, 30), brand: str(a.brand, 40), model: str(a.model, 40),
    visibleDamage: Array.isArray(a.visibleDamage) ? a.visibleDamage.slice(0, 6).map(d => str(d, 80)) : [],
    condition: str(a.condition, 20) || 'Unclear', isElectrical: !!a.isElectrical, needsInspection: !!a.needsInspection,
    retakePhoto: !!a.retakePhoto, retakeReason: str(a.retakeReason, 160), explanation: str(a.explanation, 300),
    confidence: ['low', 'medium', 'high'].includes(a.confidence) ? a.confidence : 'low',
    recommendedListingId: typeof a.recommendedListingId === 'number' ? a.recommendedListingId : (parseInt(a.recommendedListingId, 10) || 0),
    bundleTitle: str(a.bundleTitle, 120),
    bundleReason: str(a.bundleReason, 350)
  };
  if (out.isElectrical) out.needsInspection = true;
  if (out.confidence === 'low') out.retakePhoto = true;
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.', code: 'method' });
  const rawKey = process.env.GEMINI_API_KEY;
  const key = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!key) return res.status(503).json({ error: 'Gemini is not configured on this server. Please set GEMINI_API_KEY in .env or your deployment environment.', code: 'not_configured' });
  const image = req.body && req.body.image;
  const m = typeof image === 'string' && image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > MAX_B64) return res.status(400).json({ error: 'Send one JPEG, PNG or WebP photo under 3 MB.', code: 'bad_image' });

  const listings = Array.isArray(req.body && req.body.listings) && req.body.listings.length ? req.body.listings : [];
  const listingsList = listings.length
    ? listings.map(l => '#' + l.id + ': ' + l.title + ' (' + (l.category || '') + ')').join('; ')
    : '#1: Mixer grinder jar 1.5L (Kitchen); #2: Mixer jar set (Kitchen); #3: Laptop charger 65W (Electronics); #4: Desk lamp (Electronics); #5: Study chair (Furniture); #7: Electric kettle base (Kitchen); #9: Extension board (Electronics); #10: Compact study table (Furniture)';

  const userPrompt = 'Analyze this item photo. Also look at these available campus listings:\n[' + listingsList + ']\nRecommend 1 complementary item from this list that pairs with this item to create an Amazon-style bundle combo (e.g. desk lamp + study table/chair, mixer jar + base, charger + extension board). Set recommendedListingId to its ID number (or 0 if none), bundleTitle to a catchy combo name (e.g. "Late-Night Study Nook"), and bundleReason to 1-2 sentences explaining why college students frequently pair them together.';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  async function requestModel(model) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';
    return fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: m[1], data: m[2] } },
            { text: userPrompt }
          ]
        }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 }
      })
    });
  }

  try {
    let activeModel = MODEL;
    let r = await requestModel(activeModel);

    // If preferred model returns 404 (e.g. model not available on this tier), try fallback model
    if (r.status === 404 && activeModel !== 'gemini-1.5-flash') {
      activeModel = 'gemini-1.5-flash';
      r = await requestModel(activeModel);
    }

    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      const msg = (errData.error && errData.error.message) || ('Gemini returned an error (' + r.status + ').');
      return res.status(502).json({ error: msg, code: 'upstream', upstreamStatus: r.status });
    }

    const data = await r.json();
    let text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
    text = text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    return res.status(200).json({ source: 'gemini', model: activeModel, analysis: clean(JSON.parse(text)) });
  } catch (e) {
    const timeout = e && e.name === 'AbortError';
    return res.status(timeout ? 504 : 502).json({
      error: timeout ? 'Gemini took too long to respond (timeout after 10s).' : ('Could not process Gemini response: ' + (e && e.message ? e.message : 'Unknown error')),
      code: timeout ? 'timeout' : 'upstream'
    });
  } finally {
    clearTimeout(timer);
  }
};
