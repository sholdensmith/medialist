import { getFilmsMissingImdb, updateFilm } from './lib/supabase-client.js';

const BATCH_SIZE = 50;

export const handler = async (event, context) => {
  const startTime = Date.now();
  const log = {
    timestamp: new Date().toISOString(),
    toProcess: 0,
    updated: 0,
    noImdb: 0,
    errors: []
  };

  try {
    const watchmodeKey = process.env.WATCHMODE_API_KEY;
    if (!watchmodeKey) {
      throw new Error('Missing WATCHMODE_API_KEY environment variable');
    }

    console.log('Starting IMDb backfill...');

    const films = await getFilmsMissingImdb(BATCH_SIZE);
    log.toProcess = films.length;
    console.log(`Found ${films.length} films missing IMDb ID`);

    if (films.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'All films have IMDb IDs', ...log, duration: Date.now() - startTime })
      };
    }

    for (const film of films) {
      try {
        const response = await fetch(
          `https://api.watchmode.com/v1/title/${film.external_id}/?apiKey=${watchmodeKey}`
        );

        if (!response.ok) {
          if (response.status === 429) {
            console.warn('Rate limited by Watchmode API, stopping batch');
            log.errors.push({ film: film.title, error: 'Rate limited' });
            break;
          }
          throw new Error(`Watchmode API error: ${response.status}`);
        }

        const details = await response.json();

        if (details.imdb_id) {
          await updateFilm(film.id, {
            imdb_id: details.imdb_id,
            external_url: `https://www.imdb.com/title/${details.imdb_id}`
          });
          log.updated++;
          console.log(`+ ${film.title} (${film.year}) -> ${details.imdb_id}`);
        } else {
          log.noImdb++;
          console.log(`- ${film.title} (${film.year}) -> no IMDb ID in Watchmode`);
        }

      } catch (err) {
        log.errors.push({ film: film.title, error: err.message });
        console.error(`Error for ${film.title}:`, err.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log('IMDb backfill completed:', { ...log, duration: `${duration}ms` });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, ...log, duration })
    };

  } catch (error) {
    console.error('IMDb backfill failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message, log })
    };
  }
};
