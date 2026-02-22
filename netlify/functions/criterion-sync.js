import { scrapeCriterionFilms } from './lib/criterion-scraper.js';
import { matchFilms } from './lib/film-matcher.js';
import { getFilms, updateFilm } from './lib/supabase-client.js';

export const handler = async (event, context) => {
  const startTime = Date.now();
  const log = {
    timestamp: new Date().toISOString(),
    scraped: 0,
    matched: 0,
    updated: 0,
    skipped: 0,
    removed: 0,
    errors: []
  };

  try {
    console.log('Starting Criterion Channel sync...');

    // 1. Scrape Criterion Channel
    const criterionFilms = await scrapeCriterionFilms(
      process.env.FIRECRAWL_API_KEY
    );
    log.scraped = criterionFilms.length;
    console.log(`Scraped ${criterionFilms.length} films from Criterion Channel`);

    // 2. Fetch existing films from Supabase
    const supabaseFilms = await getFilms();
    console.log(`Found ${supabaseFilms.length} films in database`);

    // 3. Match Criterion films with Supabase films
    const { matches, unmatched } = matchFilms(criterionFilms, supabaseFilms);
    log.matched = matches.length;
    console.log(`Matched ${matches.length} films`);

    // 4. Update matched films with Criterion Channel source
    const criterionSource = {
      source_id: 203,
      sourceId: 203,
      name: 'Criterion Channel',
      type: 'sub'
    };

    for (const { supabaseFilm, criterionFilm } of matches) {
      try {
        const manualSources = supabaseFilm.manual_streaming_sources || [];

        // Check if Criterion already exists
        const hasCriterion = manualSources.some(s =>
          s.source_id === 203 ||
          s.sourceId === 203 ||
          (s.name && s.name.toLowerCase().includes('criterion'))
        );

        if (hasCriterion) {
          log.skipped++;
          continue;
        }

        // Add Criterion to manual sources
        const updatedSources = [...manualSources, criterionSource];

        await updateFilm(supabaseFilm.id, {
          manual_streaming_sources: updatedSources
        });

        log.updated++;
        console.log(`✓ Added Criterion to: ${supabaseFilm.title} (${supabaseFilm.year})`);

      } catch (err) {
        log.errors.push({
          film: supabaseFilm.title,
          error: err.message
        });
        console.error(`✗ Error updating ${supabaseFilm.title}:`, err.message);
      }
    }

    // 5. Remove Criterion from films no longer on Criterion Channel
    if (criterionFilms.length >= 100) {
      const matchedIds = new Set(matches.map(m => m.supabaseFilm.id));

      for (const film of supabaseFilms) {
        try {
          const manualSources = film.manual_streaming_sources || [];
          const hasCriterion = manualSources.some(s =>
            s.source_id === 203 ||
            s.sourceId === 203 ||
            (s.name && s.name.toLowerCase().includes('criterion'))
          );

          if (!hasCriterion) continue;
          if (matchedIds.has(film.id)) continue;

          const updatedSources = manualSources.filter(s =>
            s.source_id !== 203 &&
            s.sourceId !== 203 &&
            !(s.name && s.name.toLowerCase().includes('criterion'))
          );

          await updateFilm(film.id, {
            manual_streaming_sources: updatedSources
          });

          log.removed++;
          console.log(`- Removed Criterion from: ${film.title} (${film.year})`);

        } catch (err) {
          log.errors.push({
            film: film.title,
            error: `removal: ${err.message}`
          });
          console.error(`✗ Error removing Criterion from ${film.title}:`, err.message);
        }
      }
    } else {
      console.warn(`Skipping removal: only ${criterionFilms.length} films scraped (expected 100+)`);
    }

    const duration = Date.now() - startTime;
    console.log('Criterion sync completed:', { ...log, duration: `${duration}ms` });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...log,
        duration
      })
    };

  } catch (error) {
    console.error('Criterion sync failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        log
      })
    };
  }
};
