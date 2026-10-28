// Vercel serverless function. The key is read from GEMINI_API_KEY and never sent to the browser.
const fs = require('fs');
const path = require('path');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const TIMEOUT_MS = 10000;
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
  retakeReason: S('STRING'), explanation: S('STRING'), confidence: S('STRING', { enum: ['low', 'medium', 'high'] })
}, required: ['itemName', 'category', 'visibleDamage', 'condition', 'isElectrical', 'needsInspection', 'retakePhoto', 'explanation', 'confidence'] });

function clean(a) {
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const out = {
    itemName: str(a.itemName, 80) || 'Unknown item', category: str(a.category, 30) || 'Other',
    partType: str(a.partType, 30), brand: str(a.brand, 40), model: str(a.model, 40),
    visibleDamage: Array.isArray(a.visibleDamage) ? a.visibleDamage.slice(0, 6).map(d => str(d, 80)) : [],
    condition: str(a.condition, 20) || 'Unclear', isElectrical: !!a.isElectrical, needsInspection: !!a.needsInspection,
    retakePhoto: !!a.retakePhoto, retakeReason: str(a.retakeReason, 160), explanation: str(a.explanation, 300),
    confidence: ['low', 'medium', 'high'].includes(a.confidence) ? a.confidence : 'low'
  };
  if (out.isElectrical) out.needsInspection = true;
  if (out.confidence === 'low') out.retakePhoto = true;
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.', code: 'method' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'Gemini is not configured on this server.', code: 'not_configured' });
  const image = req.body && req.body.image;
  const m = typeof image === 'string' && image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > MAX_B64) return res.status(400).json({ error: 'Send one JPEG, PNG or WebP photo under 3 MB.', code: 'bad_image' });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        contents: [{ role: 'user', parts: [{ inline_data: { mime_type: m[1], data: m[2] } }, { text: 'Analyze this item photo.' }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 }
      })
    });
    if (!r.ok) return res.status(502).json({ error: 'Gemini returned an error (' + r.status + ').', code: 'upstream' });
    const data = await r.json();
    const text = data.candidates && data.candidates[0] && data.candidates[0].content.parts[0].text;
    return res.status(200).json({ source: 'gemini', model: MODEL, analysis: clean(JSON.parse(text)) });
  } catch (e) {
    const timeout = e && e.name === 'AbortError';
    return res.status(timeout ? 504 : 502).json({ error: timeout ? 'Gemini took too long to respond.' : 'Could not read Gemini response.', code: timeout ? 'timeout' : 'upstream' });
  } finally { clearTimeout(timer); }
};
