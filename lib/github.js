// lib/github.js — pulls live repo data to enrich the candidate context.

/**
 * Fetch a user's public repos, sorted by stars, trimmed to the fields
 * the Gemini prompt actually needs.
 * @param {string} username
 * @returns {Promise<Array<{name:string, description:string, language:string, stars:number, topics:string[], url:string}>>}
 */
export async function fetchGithubProjects(username) {
  if (!username) return [];

  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
    { headers: { Accept: "application/vnd.github+json" } }
  );

  if (!res.ok) {
    throw new Error(`GitHub API error (${res.status}): could not fetch repos for "${username}".`);
  }

  const repos = await res.json();

  return repos
    .filter((repo) => !repo.fork && !repo.private)
    .map((repo) => ({
      name: repo.name,
      description: repo.description || "",
      language: repo.language || "",
      stars: repo.stargazers_count || 0,
      topics: repo.topics || [],
      url: repo.html_url
    }))
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 20); // cap payload size sent to Gemini
}
