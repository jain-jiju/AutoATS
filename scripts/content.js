// content.js — injected on demand into the active tab.
// Its final expression's value becomes the result chrome.scripting.executeScript
// returns to background.js, so this file scrapes and then returns the payload.

(function scrapeJobPosting() {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");

  // Per-platform selectors, tried in order. Each site's DOM changes over time,
  // so these fall back to a generic heuristic if nothing matches.
  const SITE_SELECTORS = {
    "linkedin.com": {
      title: ".job-details-jobs-unified-top-card__job-title, .top-card-layout__title",
      company: ".job-details-jobs-unified-top-card__company-name, .top-card-layout__second-subtitle",
      description: ".jobs-description__content, .description__text"
    },
    "greenhouse.io": {
      title: "#header .app-title, h1.app-title",
      company: "#header .company-name",
      description: "#content, .job__description"
    },
    "lever.co": {
      title: ".posting-headline h2",
      company: ".main-header-logo img[alt], .posting-categories .location",
      description: ".posting-content .section-wrapper, .content"
    },
    "indeed.com": {
      title: "h1.jobsearch-JobInfoHeader-title",
      company: '[data-testid="inlineHeader-companyName"]',
      description: "#jobDescriptionText"
    }
  };

  function selectorsForHost(hostname) {
    const match = Object.keys(SITE_SELECTORS).find((domain) => hostname.includes(domain));
    return match ? SITE_SELECTORS[match] : null;
  }

  function genericFallback() {
    // Heuristic: the largest text block on the page is usually the job description.
    const candidates = Array.from(document.querySelectorAll("article, main, section, div"))
      .filter((el) => el.textContent && el.textContent.trim().length > 200)
      .sort((a, b) => b.textContent.length - a.textContent.length);

    return {
      title: text(document.querySelector("h1")),
      company: "",
      description: text(candidates[0])
    };
  }

  const selectors = selectorsForHost(location.hostname);
  let result;

  if (selectors) {
    result = {
      title: text(document.querySelector(selectors.title)),
      company: text(document.querySelector(selectors.company)),
      description: text(document.querySelector(selectors.description))
    };
    if (!result.description) result = genericFallback();
  } else {
    result = genericFallback();
  }

  return {
    ...result,
    sourceUrl: location.href,
    scrapedAt: new Date().toISOString()
  };
})();
