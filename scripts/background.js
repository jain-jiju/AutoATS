// scripts/background.js — MV3 service worker (type: module).
// Wires together the content script, GitHub, and Gemini calls, then
// hands the structured result to the editor tab.

import { fetchGithubProjects } from "../lib/github.js";
import { generateTailoredResume } from "../lib/gemini.js";

const RESULT_KEY = "autoats_last_result";

function notifyPopup(message) {
  chrome.runtime.sendMessage({ type: "TAILOR_PROGRESS", message }).catch(() => {
    // Popup may already be closed — that's fine, it's a best-effort UX ping.
  });
}

async function scrapeActiveTab(tabId) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    files: ["scripts/content.js"]
  });
  const job = injection?.result;
  if (!job || (!job.title && !job.description)) {
    throw new Error("Couldn't find a job description on this page.");
  }
  return job;
}

async function runPipeline(tabId) {
  const { autoats_profile: profile } = await chrome.storage.local.get("autoats_profile");
  if (!profile?.apiKey || !profile?.githubUser) {
    throw new Error("Set up your profile first (API key + GitHub handle).");
  }

  notifyPopup("Scraping the job posting…");
  const job = await scrapeActiveTab(tabId);

  notifyPopup("Pulling your GitHub projects…");
  const githubProjects = await fetchGithubProjects(profile.githubUser);

  notifyPopup("Asking Gemini to tailor your resume…");
  const analysis = await generateTailoredResume({
    apiKey: profile.apiKey,
    job,
    profile,
    githubProjects
  });

  const result = { job, profile, githubProjects, analysis, generatedAt: Date.now() };
  await chrome.storage.local.set({ [RESULT_KEY]: result });

  await chrome.tabs.create({ url: chrome.runtime.getURL("editor/editor.html") });
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "TAILOR_RESUME") {
    runPipeline(message.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // keep the message channel open for the async response
  }
});
