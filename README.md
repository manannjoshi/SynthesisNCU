# SynthesisNCU — Waste to Worth

**Give useful things a second life.** SynthesisNCU is a campus reuse marketplace that helps students find, repair, donate, exchange, and reuse items instead of throwing them away.

## The idea

Across a college campus, good items are often discarded because one part is missing, someone no longer needs them, or the next person who could use them cannot find them. A spare charger, a mixer jar, a drawing kit, or a warm jacket can still have value.

SynthesisNCU makes those connections easier. Students can browse campus finds, upload an item photo for AI-assisted guidance, and bring accepted items to **Cafe 10**, the campus handoff point.

## The AI Combo Maker

The central feature is the **AI Combo Maker**. After a student uploads a photo, Google Gemini analyzes the item and considers the available marketplace listings. It can reason about a useful combination and recommend up to **two additional items**, creating a combo of up to **three items total**.

Instead of treating every listing as an isolated object, the AI looks for practical ways items can work together. A laptop charger might pair with an extension board; a scarf can complement a jacket; a drawing kit can go with a bundle of sheets. Gemini can also suggest its own sensible combinations based on the uploaded item and current listings. It can return no match when nothing fits, rather than forcing a recommendation.

Students can add a suggested combo to a bundle, review the selected items, take a screenshot, and upload that screenshot through the existing Google Form flow. The goal is simple: make reusing the right thing together feel easy and useful.

## How it supports “Waste to Worth”

The project is built around the idea that waste can become a resource when people can find another use for it.

- **Reuse:** connect useful items with people who need them.
- **Repair:** surface items that may be repairable and encourage inspection before reuse.
- **Donate and exchange:** give unwanted items a path to a new owner.
- **Reduce campus waste:** keep reusable household, stationery, clothing, furniture, and electronics items in circulation.
- **Make segregation and recycling easier to build on:** the marketplace focuses on reuse first, and can grow to include clearer recycling and waste-separation guidance for items that cannot be reused.

## Website features

- **AI Marketplace:** browse sample campus listings and filter by category.
- **Item details:** view condition, notes, availability at Cafe 10, and electrical inspection reminders.
- **Photo analysis:** upload an item image for Gemini to identify visible details, describe condition, flag damage, and recommend a retake when the photo is unclear.
- **AI-generated combos:** get a reasoned suggestion of up to three items total, based on the uploaded item and available listings.
- **Ready-made combo ideas:** explore curated examples such as laptop charger + extension board, scarf + jacket, and drawing kit + sheets bundle.
- **Bundle builder:** add or remove marketplace items, review the bundle, and prepare a screenshot for the Google Form.
- **Cafe 10 handoff:** accepted uploaded items display a reminder to bring them to Cafe 10.
- **Dark mode:** switch the site’s appearance for comfortable browsing.

## Try it locally

### Requirements

- Node.js 18 or newer
- A Google Gemini API key for live photo analysis

### Setup

```bash
git clone <your-repository-url>
cd <repository-folder>
npm run dev
```

Open `http://localhost:3000`. To enable live Gemini analysis, create a `.env` file from `.env.example` and add your key:

```env
GEMINI_API_KEY=your_key_here
```

The API key is read by the server and is not included in browser code. You can optionally set `GEMINI_MODEL`; the default is `gemini-3.5-flash-lite`.

## Deploy

The site is designed for Vercel and has no build step. Import the repository into Vercel, add `GEMINI_API_KEY` under the project’s environment variables, and deploy.

## How the AI works

The serverless endpoint in [`api/analyze.js`](api/analyze.js) sends the uploaded image and a list of current marketplace listings to Gemini. Gemini returns structured information about the item and its combo recommendation. The analysis prompt is in [`prompts/condition-check.md`](prompts/condition-check.md).

The server limits recommendations to valid marketplace listing IDs and no more than two additional items. The AI is a guide: it cannot confirm an item is working, safe, or compatible. Electrical items need in-person inspection, and users should check condition and fit before reuse.

## Project structure

```text
.
├── api/analyze.js              # Gemini photo analysis and combo recommendations
├── data/listings.js            # Sample AI Marketplace listings
├── images/                     # Local listing images and site assets
├── prompts/condition-check.md  # Gemini item-analysis instructions
├── app.js                      # Marketplace, upload, results, and bundle interactions
├── index.html                  # Website structure
├── match.js                    # Deterministic fallback matching helpers
└── styles.css                  # Responsive styling and dark mode
```

## Data, images, and privacy

- Sample listings are stored in `data/listings.js`.
- Accepted items and their uploaded image are saved in the current browser’s local storage. They are not synced to a server or shared with other users.
- Uploaded images are sent to Gemini for analysis. This app does not save them to its own server database.
- The Google Form step is user-driven: the app prepares the selected bundle, and the user uploads its screenshot through the form.
- Listing images are local files under `images/`. The scarf and drawing sheets bundle use `images/scarf.jpg` and `images/bundle.jpg`. Add those files to show their photos; missing images display as empty placeholders.
- The “items available” number reflects the current visible listings. It is not a measured waste reduction or impact total.

## What comes next

Possible extensions include a shared listing database, direct handoff coordination at Cafe 10, repair and waste-segregation guidance, and verified campus impact reporting. These are future ideas, not current website features.
