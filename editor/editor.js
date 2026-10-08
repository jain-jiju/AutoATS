// editor.js — reads the last pipeline result from storage and renders
// the dual-pane workspace: ATS sidebar + editable resume canvas.

const RESULT_KEY = "autoats_last_result";
const RING_CIRCUMFERENCE = 327; // 2 * pi * 52, matches editor.css

let state = { template: "modern", data: null };

function renderSidebar(data) {
  const { analysis, job } = data;

  document.getElementById("jobMeta").textContent =
    `${job.title || "Untitled role"}${job.company ? " · " + job.company : ""}`;

  const pct = Math.max(0, Math.min(100, analysis.ats_score || 0));
  document.getElementById("scoreNumber").textContent = `${pct}%`;
  const offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * pct) / 100;
  document.getElementById("ringFill").style.strokeDashoffset = offset;

  const matchedEl = document.getElementById("matchedChips");
  const missingEl = document.getElementById("missingChips");
  matchedEl.innerHTML = "";
  missingEl.innerHTML = "";

  (analysis.matched_keywords || []).forEach((kw) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = kw;
    matchedEl.appendChild(chip);
  });

  (analysis.missing_keywords || []).forEach((kw) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = kw;
    missingEl.appendChild(chip);
  });
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderResume(data, template) {
  const { profile, analysis } = data;
  const resumeEl = document.getElementById("resume");
  resumeEl.className = `resume ${template}`;

  const experienceHtml = (analysis.rewritten_bullets || [])
    .map((entry) => `
      <div class="entry">
        <div class="entry-title">${escapeHtml(entry.role || "")}</div>
        <div class="entry-sub">${escapeHtml([entry.company, entry.dates].filter(Boolean).join(" — "))}</div>
        <ul>${(entry.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
      </div>
    `)
    .join("");

  const projectsHtml = (analysis.top_projects || [])
    .map((p) => `
      <div class="entry">
        <div class="entry-title">${escapeHtml(p.name || "")}</div>
        <ul><li>${escapeHtml(p.blurb || "")}</li></ul>
      </div>
    `)
    .join("");

  resumeEl.innerHTML = `
    <h1>${escapeHtml(profile.fullName || "")}</h1>
    <p class="headline">${escapeHtml(analysis.summary_headline || "")}</p>
    <p class="contact">${escapeHtml([profile.email, profile.phone, profile.location].filter(Boolean).join(" · "))}</p>

    <h2>Experience</h2>
    ${experienceHtml || "<p>No experience entries were generated.</p>"}

    <h2>Projects</h2>
    ${projectsHtml || "<p>No projects were selected.</p>"}

    <h2>Education</h2>
    <p>${escapeHtml(profile.education || "")}</p>

    <h2>Skills</h2>
    <p>${escapeHtml(profile.skills || "")}</p>
  `;
}

document.querySelectorAll(".tmpl-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tmpl-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
    state.template = btn.dataset.template;
    if (state.data) renderResume(state.data, state.template);
  });
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const statusEl = document.getElementById("exportStatus");
  if (typeof html2pdf === "undefined") {
    statusEl.textContent = "PDF engine not loaded — see lib/html2pdf.bundle.js.";
    return;
  }
  statusEl.textContent = "Exporting…";
  const resumeEl = document.getElementById("resume");
  const canvasWrap = document.querySelector(".canvas-wrap");
  const fileName = `${(state.data?.profile?.fullName || "resume").replace(/\s+/g, "_")}_Resume.pdf`;

  // The resume sits inside a scrollable panel (.canvas-wrap), not the page
  // itself — if that panel had been scrolled, html2canvas would capture
  // from the wrong offset and could run out of vertical room before the
  // end of the resume. Reset it here and put it back afterward.
  const previousScrollTop = canvasWrap.scrollTop;
  canvasWrap.scrollTop = 0;

  html2pdf()
    .set({
      margin: [24, 0, 24, 0],
      filename: fileName,
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: "pt", format: "letter" },
      pagebreak: { mode: ["css", "avoid-all"] } // respect page-break CSS instead of slicing mid-line
    })
    .from(resumeEl)
    .save()
    .then(() => { statusEl.textContent = "Exported."; })
    .catch((err) => { statusEl.textContent = `Export failed: ${err.message}`; })
    .finally(() => { canvasWrap.scrollTop = previousScrollTop; });
});

(async function init() {
  const stored = await chrome.storage.local.get(RESULT_KEY);
  const data = stored[RESULT_KEY];
  if (!data) {
    document.getElementById("jobMeta").textContent =
      "No resume generated yet — run \"Tailor resume for this job\" from the popup.";
    return;
  }
  state.data = data;
  renderSidebar(data);
  renderResume(data, state.template);
})();
