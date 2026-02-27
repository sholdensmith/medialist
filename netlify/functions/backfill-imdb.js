import { getFilmsMissingImdb, updateFilm } from './lib/supabase-client.js';

const BATCH_SIZE = 50;

async function lookupOmdb(title, year, omdbKey) {
  const params = new URLSearchParams({
    apikey: omdbKey,
    t: title,
    type: 'movie'
  });
  if (year) params.set('y', year);

  const response = await fetch(`https://www.omdbapi.com/?${params}`);
  if (!response.ok) return null;

  const data = await response.json();
  return (data.Response === 'True' && data.imdbID) ? data.imdbID : null;
}

async function lookupTmdb(title, year, tmdbToken) {
  const params = new URLSearchParams({
    query: title,
    language: 'en-US',
    page: '1'
  });
  if (year) params.set('primary_release_year', year);

  const searchRes = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
    headers: { Authorization: `Bearer ${tmdbToken}` }
  });
  if (!searchRes.ok) return null;

  const searchData = await searchRes.json();
  const match = searchData.results?.[0];
  if (!match) return null;

  // Get external IDs for the matched movie
  const extRes = await fetch(`https://api.themoviedb.org/3/movie/${match.id}/external_ids`, {
    headers: { Authorization: `Bearer ${tmdbToken}` }
  });
  if (!extRes.ok) return null;

  const extData = await extRes.json();
  return extData.imdb_id || null;
}

export const handler = async (event, context) => {
  const startTime = Date.now();
  const log = {
    timestamp: new Date().toISOString(),
    toProcess: 0,
    updatedOmdb: 0,
    updatedTmdb: 0,
    noImdb: 0,
    errors: []
  };

  try {
    const omdbKey = process.env.OMDB_API_KEY;
    const tmdbToken = process.env.TMDB_ACCESS_TOKEN;
    if (!omdbKey && !tmdbToken) {
      throw new Error('Missing both OMDB_API_KEY and TMDB_ACCESS_TOKEN environment variables');
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
        let imdbId = null;
        let source = null;

        // Try OMDb first
        if (omdbKey) {
          imdbId = await lookupOmdb(film.title, film.year, omdbKey);
          if (imdbId) source = 'omdb';
        }

        // Fall back to TMDB
        if (!imdbId && tmdbToken) {
          imdbId = await lookupTmdb(film.title, film.year, tmdbToken);
          if (imdbId) source = 'tmdb';
        }

        if (imdbId) {
          await updateFilm(film.id, {
            imdb_id: imdbId,
            external_url: `https://www.imdb.com/title/${imdbId}`
          });
          if (source === 'omdb') log.updatedOmdb++;
          else log.updatedTmdb++;
          console.log(`+ ${film.title} (${film.year}) -> ${imdbId} [${source}]`);
        } else {
          log.noImdb++;
          console.log(`- ${film.title} (${film.year}) -> not found`);
        }

      } catch (err) {
        log.errors.push({ film: film.title, error: err.message });
        console.error(`Error for ${film.title}:`, err.message);
      }
    }

    const duration = Date.now() - startTime;
    const totalUpdated = log.updatedOmdb + log.updatedTmdb;
    console.log('IMDb backfill completed:', { ...log, totalUpdated, duration: `${duration}ms` });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, ...log, totalUpdated, duration })
    };

  } catch (error) {
    console.error('IMDb backfill failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message, log })
    };
  }
};
