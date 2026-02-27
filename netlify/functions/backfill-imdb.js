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
    const omdbKey = process.env.OMDB_API_KEY;
    if (!omdbKey) {
      throw new Error('Missing OMDB_API_KEY environment variable');
    }

    console.log('Starting IMDb backfill via OMDb...');

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
        const params = new URLSearchParams({
          apikey: omdbKey,
          t: film.title,
          type: 'movie'
        });
        if (film.year) params.set('y', film.year);

        const response = await fetch(`https://www.omdbapi.com/?${params}`);

        if (!response.ok) {
          throw new Error(`OMDb API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.Response === 'True' && data.imdbID) {
          await updateFilm(film.id, {
            imdb_id: data.imdbID,
            external_url: `https://www.imdb.com/title/${data.imdbID}`
          });
          log.updated++;
          console.log(`+ ${film.title} (${film.year}) -> ${data.imdbID}`);
        } else {
          log.noImdb++;
          console.log(`- ${film.title} (${film.year}) -> not found in OMDb`);
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
