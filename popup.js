// popup.js — settings persistence + kicking off the tailoring pipeline

const FIELD_IDS = [
  "apiKey", "githubUser", "fullName", "email",
  "phone", "location", "education", "experience", "skills"
];

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

function showTab(name) {
  tabButtons.forEach(b => b.classList.toggle("is-active", b.dataset.tab === name));
  tabPanels.forEach(p => p.classList.toggle("is-active", p.id === `tab-${name}`));
}

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => showTab(btn.dataset.tab));
});

document.querySelectorAll("[data-goto]").forEach(btn => {
  btn.addEventListener("click", () => showTab(btn.dataset.goto));
});

async function loadProfile() {
  const stored = await chrome.storage.local.get("autoats_profile");
  const profile = stored.autoats_profile || {};
  FIELD_IDS.forEach(id => {
    if (profile[id] !== undefined) {
      document.getElementById(id).value = profile[id];
    }
  });
  return profile;
}

function hasCompleteProfile(profile) {
  return Boolean(profile.apiKey && profile.githubUser && profile.fullName);
}

document.getElementById("setupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const profile = {};
  FIELD_IDS.forEach(id => {
    profile[id] = document.getElementById(id).value.trim();
  });
  await chrome.storage.local.set({ autoats_profile: profile });
  const saveStatus = document.getElementById("saveStatus");
  saveStatus.textContent = "Profile saved.";
  saveStatus.className = "status ok";
  refreshWarning(profile);
  setTimeout(() => { saveStatus.textContent = ""; }, 2500);
});

function refreshWarning(profile) {
  const warn = document.getElementById("noProfileWarning");
  const btn = document.getElementById("tailorBtn");
  const complete = hasCompleteProfile(profile);
  warn.classList.toggle("hidden", complete);
  btn.disabled = !complete;
}

function setStatus(message, kind) {
  const el = document.getElementById("status");
  el.textContent = message;
  el.className = `status ${kind || ""}`.trim();
}

document.getElementById("tailorBtn").addEventListener("click", async () => {
  const btn = document.getElementById("tailorBtn");
  btn.disabled = true;
  setStatus("Reading the job posting…");

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) throw new Error("No active tab found.");

    const response = await chrome.runtime.sendMessage({
      type: "TAILOR_RESUME",
      tabId: activeTab.id
    });

    if (response?.ok) {
      setStatus("Resume ready — opening editor…", "ok");
      window.close();
    } else {
      throw new Error(response?.error || "Something went wrong.");
    }
  } catch (err) {
    setStatus(err.message, "err");
  } finally {
    btn.disabled = false;
  }
});

// Background sends progress updates while the pipeline runs
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "TAILOR_PROGRESS") {
    setStatus(msg.message);
  }
});

(async function init() {
  const profile = await loadProfile();
  refreshWarning(profile);
})();
