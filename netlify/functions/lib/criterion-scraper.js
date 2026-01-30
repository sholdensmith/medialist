// Convert Python scraper to JavaScript
export async function scrapeCriterionFilms(apiKey) {
  if (!apiKey) {
    throw new Error('Missing FIRECRAWL_API_KEY');
  }

  // Use Firecrawl API to scrape Criterion Channel
  const url = 'https://films.criterionchannel.com/';

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: false,
      timeout: 120000
    })
  });

  if (!response.ok) {
    throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const markdown = result.data?.markdown || result.markdown || '';

  if (!markdown.trim()) {
    throw new Error('No markdown content returned from Firecrawl');
  }

  // Parse markdown table (same regex as Python version)
  // | ![](img) | [Title](link) | Director | Country | Year |
  const rowRegex = /^\|\s*!?\[.*?\]\(.*?\)\s*\|\s*\[(.*?)\]\(.*?\)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/;

  const films = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;

    const match = rowRegex.exec(trimmed);
    if (!match) continue;

    const title = match[1].trim();
    const director = match[2].trim();
    const yearRaw = match[4].trim();

    // Parse year (remove non-digits)
    let year = null;
    if (yearRaw) {
      const yearNum = parseInt(yearRaw.replace(/\D/g, ''), 10);
      if (yearNum && yearNum > 0) {
        year = yearNum;
      }
    }

    // Extract director last name (mirrors Python logic)
    let directorLastName = '';
    if (director) {
      // Handle "and" separators - take first director
      const firstDirector = director.split(/\s+and\s+|,\s+and\s+/i)[0].trim();

      // Handle "Last, First" format
      if (firstDirector.includes(',')) {
        directorLastName = firstDirector.split(',')[0].trim();
      } else {
        // Take last token
        const tokens = firstDirector.split(/\s+/);
        directorLastName = tokens[tokens.length - 1] || '';
      }
    }

    films.push({
      title,
      year,
      directorLastName: directorLastName.replace(/[.\s]+$/, '') // Remove trailing periods/spaces
    });
  }

  return films;
}
