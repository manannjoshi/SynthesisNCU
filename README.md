# SynthesisNCU

**Waste to Worth for campus.** Students find a second life for unused or broken hostel items through reuse, donation, exchange and repair.

Live demo: `https://YOUR-PROJECT.vercel.app` (placeholder, not deployed yet)

## Problem and users
Hostel rooms fill up with items that are still useful: a mixer base without its jar, a charger nobody needs, a spare chair. They get binned because nobody knows who needs them. SynthesisNCU is for first-year to final-year students living in campus hostels.

## How it supports Waste to Worth
It connects a spare or broken item with a complementary part or a person who can reuse it, so fewer working items become waste. The "items kept in use" counter is a **demo estimate** based on the sample listings shown, not real impact data.

## Demo flow (about 30 seconds)
1. **Browse** sample listings, filter by category and hostel.
2. **Check item**: press **Try sample item** (no upload, no key needed) or upload a photo.
3. **Match**: see a suggested listing, a match percentage with reasons, and press **Request pickup** for an on-screen confirmation (nobody is contacted).

Sample input: the built-in "mixer grinder base, jar missing".
Sample output: Kitchen, part type base, Prestige Iris (label visible), condition Fair, needs inspection, matched to "Mixer grinder jar, 1.5 L" at 95% (category + complementary part + brand + model, capped at 95%).

## How Gemini is used
`api/analyze.js` sends the uploaded photo to the Gemini API and requests structured JSON: item name, category, part type, brand/model only if visible, visible damage, condition, retake flag, in-person inspection flag, short explanation and confidence. The prompt and response shape are in [`prompts/condition-check.md`](prompts/condition-check.md).

**What it does not establish:** safety, working order, or compatibility. Electrical items always show "Inspect before use". Low confidence forces a "retake photo" message instead of a guess.

**Fallback:** if `GEMINI_API_KEY` is missing, the call times out (10 s) or Gemini errors, an uploaded photo gets a clear error and no result. The **sample item** always shows a result labeled "Sample analysis (demo data, not a live Gemini result)". Fallback output is never presented as live.

## Matching (no AI)
Rules live in [`match.js`](match.js). A small `COMPLEMENTS` table maps parts (mixer base needs jar or lid, laptop needs charger, and so on). Score: complementary part 40, same category 25, brand 20, model 15, capped at 95. With no part match, the app suggests a reuse, donation or exchange listing in the same category. Users must verify fit in person.

## Tech stack
Plain HTML, CSS and JavaScript. One Vercel serverless function (Node). No build step, no dependencies, no database, no accounts.

## Local setup
```bash
cp .env.example .env      # then put your key in .env
node dev-server.js        # http://localhost:3000
node test.js              # matching tests
```
Without a key the site still works: use the sample item.

## Configure GEMINI_API_KEY
Get a key from Google AI Studio. Locally: put it in `.env` (git-ignored). On Vercel: Project Settings > Environment Variables > add `GEMINI_API_KEY`, then redeploy. The key is read only on the server and is never in browser code. Optional: `GEMINI_MODEL` (default `gemini-3.5-flash-lite`).

## Deploy to Vercel
Import the GitHub repo in Vercel (framework preset "Other", no build command), add `GEMINI_API_KEY`, deploy.

- Initial sample listings are static demo data in `data/listings.js`. Verified items accepted after Gemini photo analysis are saved locally in the browser's `localStorage` and are not shared across devices or synced to a database.
- Pickup requests are on-screen only (no backend notification).
- AI output is a visual hint. Verify fit, condition and electrical safety in person.
- Uploaded photos are sent to Gemini for analysis and are not stored by this app.

## Future work
Add-your-own listings (localStorage first), shared listings with a backend, hostel-level pickup scheduling, repair-café events, and a real impact tracker.

## Images
Listing photos are local files in `images/` (no emojis, no remote images). Missing files are skipped and a neutral gray box is shown. See `data/listings.js` for the `image` path of each listing; `images/sample-item.jpg` is shown for the sample item.
