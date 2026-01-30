/**
 * Normalize title for matching (mirrors app.js pattern)
 * - Remove leading articles (The, A, An)
 * - Lowercase
 * - Remove all non-alphanumeric characters
 */
function normalizeTitle(title) {
  if (!title) return '';

  return title
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '') // Strip leading articles
    .replace(/[^a-z0-9]/g, '');     // Only alphanumeric
}

/**
 * Match Criterion films with Supabase films
 * Primary: title + year match
 * Fallback: title-only match (if years missing)
 */
export function matchFilms(criterionFilms, supabaseFilms) {
  const matches = [];
  const unmatched = [];

  for (const criterion of criterionFilms) {
    const normalizedCriterion = normalizeTitle(criterion.title);

    // Try exact year match first
    let match = supabaseFilms.find(film =>
      normalizeTitle(film.title) === normalizedCriterion &&
      film.year === criterion.year
    );

    // Fallback: title-only if no year available
    if (!match && !criterion.year) {
      const titleMatches = supabaseFilms.filter(film =>
        normalizeTitle(film.title) === normalizedCriterion
      );

      // Only match if exactly one result (avoid ambiguity)
      if (titleMatches.length === 1) {
        match = titleMatches[0];
      }
    }

    if (match) {
      matches.push({
        criterionFilm: criterion,
        supabaseFilm: match
      });
    } else {
      unmatched.push(criterion);
    }
  }

  return { matches, unmatched };
}
