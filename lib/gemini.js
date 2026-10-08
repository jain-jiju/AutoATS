// lib/gemini.js — sends job + candidate context to Gemini and returns
// a structured ATS analysis + rewritten resume content.

const MODEL = "gemini-3-flash-preview";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    ats_score: { type: "integer" },
    matched_keywords: { type: "array", items: { type: "string" } },
    missing_keywords: { type: "array", items: { type: "string" } },
    rewritten_bullets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          company: { type: "string" },
          dates: { type: "string" },
          bullets: { type: "array", items: { type: "string" } }
        },
        required: ["role", "bullets"]
      }
    },
    top_projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          blurb: { type: "string" },
          url: { type: "string" }
        },
        required: ["name", "blurb"]
      }
    },
    summary_headline: { type: "string" }
  },
  required: [
    "ats_score", "matched_keywords", "missing_keywords",
    "rewritten_bullets", "top_projects", "summary_headline"
  ]
};

function buildPrompt({ job, profile, githubProjects }) {
  return `You are an ATS (Applicant Tracking System) optimization engine.

JOB POSTING
Title: ${job.title}
Company: ${job.company}
Description:
${job.description}

CANDIDATE BASE PROFILE
Name: ${profile.fullName}
Education: ${profile.education}
Experience (raw, unedited):
${profile.experience}
Core skills: ${profile.skills}

CANDIDATE GITHUB PROJECTS (JSON)
${JSON.stringify(githubProjects, null, 2)}

TASK
1. Score how well the candidate's raw experience + skills match this job's
   requirements, 0-100 (ats_score).
2. List keywords from the job description that ARE reflected in the
   candidate's background (matched_keywords) and ones that are notably
   ABSENT (missing_keywords).
3. Rewrite the candidate's experience into concise, action-verb-led bullet
   points that emphasize what this specific job asks for. Do not invent
   employers, titles, or achievements that aren't grounded in the raw
   experience provided — rephrase and re-prioritize, don't fabricate.
4. From the GitHub projects, select the 3 most relevant to this job and
   write a one-line blurb for each explaining why it's relevant.
5. Write a one-line professional summary headline for the top of the resume.

Respond with JSON only, matching the provided schema.`;
}

/**
 * @param {{apiKey:string, job:{title:string,company:string,description:string},
 *          profile:object, githubProjects:Array}} args
 */
export async function generateTailoredResume({ apiKey, job, profile, githubProjects }) {
  if (!apiKey) throw new Error("Missing Gemini API key. Add it in Profile setup.");

  const body = {
    contents: [{ role: "user", parts: [{ text: buildPrompt({ job, profile, githubProjects }) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA
    }
  };

  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  const textPart = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textPart) throw new Error("Gemini returned an empty response.");

  try {
    return JSON.parse(textPart);
  } catch {
    throw new Error("Gemini response wasn't valid JSON — try again.");
  }
}
