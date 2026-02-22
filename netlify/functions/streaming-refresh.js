import { getFilmsForSourceRefresh, updateFilm } from './lib/supabase-client.js';

const BATCH_SIZE = 20;

export const handler = async (event, context) => {
  const startTime = Date.now();
  const log = {
    timestamp: new Date().toISOString(),
    filmsToRefresh: 0,
    refreshed: 0,
    unchanged: 0,
    errors: []
  };

  try {
    const watchmodeKey = process.env.WATCHMODE_API_KEY;
    if (!watchmodeKey) {
      throw new Error('Missing WATCHMODE_API_KEY environment variable');
    }

    console.log('Starting streaming source refresh...');

    // 1. Get the oldest-synced films
    const films = await getFilmsForSourceRefresh(BATCH_SIZE);
    log.filmsToRefresh = films.length;
    console.log(`Found ${films.length} films to refresh`);

    if (films.length === 0) {
      console.log('No films need refreshing');
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, ...log, duration: Date.now() - startTime })
      };
    }

    // 2. Refresh each film's streaming sources
    for (const film of films) {
      try {
        const response = await fetch(
          `https://api.watchmode.com/v1/title/${film.external_id}/sources/?apiKey=${watchmodeKey}&regions=US`
        );

        if (!response.ok) {
          if (response.status === 429) {
            console.warn('Rate limited by Watchmode API, stopping batch');
            log.errors.push({ film: film.title, error: 'Rate limited' });
            break;
          }
          throw new Error(`Watchmode API error: ${response.status}`);
        }

        const sources = await response.json();
        const filteredSources = Array.isArray(sources)
          ? sources.filter(s => s.type === 'sub' || s.type === 'free')
          : [];

        const oldSources = film.streaming_sources || [];
        const changed =
          filteredSources.length !== oldSources.length ||
          JSON.stringify(filteredSources.map(s => s.source_id).sort()) !==
          JSON.stringify(oldSources.map(s => s.source_id).sort());

        await updateFilm(film.id, {
          streaming_sources: filteredSources,
          sources_last_synced: new Date().toISOString()
        });

        if (changed) {
          log.refreshed++;
          console.log(`~ Updated sources for: ${film.title} (${film.year})`);
        } else {
          log.unchanged++;
        }

      } catch (err) {
        log.errors.push({ film: film.title, error: err.message });
        console.error(`✗ Error refreshing ${film.title}:`, err.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log('Streaming refresh completed:', { ...log, duration: `${duration}ms` });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, ...log, duration })
    };

  } catch (error) {
    console.error('Streaming refresh failed:', error);
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
