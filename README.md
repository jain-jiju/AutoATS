# AutoATS Resume Tailor

A Manifest V3 Chrome extension that scrapes the job posting on your active
tab and generates an ATS-optimized resume using Gemini + your GitHub repos.

## 1. Finish one dependency (required)

`lib/html2pdf.bundle.js` in this project is currently a **placeholder** —
this build environment had no internet access to fetch the real file.
Before the "Export PDF" button will work:

1. Download the bundle from the official repo
   (https://github.com/eKoopmans/html2pdf.js, in `/dist`) or via
   `npm install html2pdf.js` and copy
   `node_modules/html2pdf.js/dist/html2pdf.bundle.js`.
2. Overwrite `lib/html2pdf.bundle.js` with it (keep the same file name).

Everything else in the extension works without this step — you just won't
be able to export a PDF until it's in place.

## 2. Load the extension

1. Unzip this project if you haven't already.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `AutoATS-Extension` folder.

## 3. Set up your profile

1. Click the extension icon in the toolbar.
2. Go to the **Profile setup** tab.
3. Fill in your Gemini API key, GitHub username, and base resume details
   (name, education, experience, skills).
4. Click **Save profile**.

Get a Gemini API key at https://aistudio.google.com/apikey — it's free to
create, though usage is billed per Google's API pricing.

## 4. Use it

1. Open a job posting on LinkedIn, Greenhouse, Lever, or Indeed.
2. Click the extension icon → **Run** tab → **Tailor resume for this job**.
3. A new tab opens with your ATS score, matched/missing keywords, and an
   editable resume. Switch between Modern/Classic templates, edit inline,
   and export to PDF once `html2pdf.bundle.js` is in place.

## Notes on scope

- Job scraping selectors are tuned for LinkedIn, Greenhouse, Lever, and
  Indeed, with a generic fallback (largest text block heuristic) for other
  sites. Selectors on these sites do change over time — if scraping stops
  working, inspect the page and update `scripts/content.js`.
- The Gemini prompt explicitly instructs the model not to fabricate
  employers or achievements — it rephrases and reprioritizes your real
  experience rather than inventing new claims.
- API key and profile data are stored only in `chrome.storage.local` on
  your machine — nothing is sent anywhere except GitHub's public API and
  Google's Gemini API for the calls described above.
