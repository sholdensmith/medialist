#!/usr/bin/env node

/**
 * Migration Script for MediaList
 *
 * This script imports data from existing book-readlist and film-lookup apps
 * into the unified MediaList Supabase database.
 *
 * Usage:
 *   1. Set environment variables or create .env file:
 *      - SUPABASE_URL
 *      - SUPABASE_KEY
 *      - OLD_SUPABASE_URL (optional, if different from new)
 *      - OLD_SUPABASE_KEY (optional, if different from new)
 *
 *   2. Run: node migrate.js
 */

const https = require('https');
const http = require('http');

// Configuration - set these or use environment variables
const config = {
  // New MediaList Supabase
  newSupabaseUrl: process.env.SUPABASE_URL || '',
  newSupabaseKey: process.env.SUPABASE_KEY || '',

  // Old Supabase (use same as new if not specified)
  oldSupabaseUrl: process.env.OLD_SUPABASE_URL || process.env.SUPABASE_URL || '',
  oldSupabaseKey: process.env.OLD_SUPABASE_KEY || process.env.SUPABASE_KEY || '',
};

// Simple fetch implementation for Node.js
function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.request(parsedUrl, {
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: JSON.parse(data) });
        } catch (e) {
          resolve({ ok: false, data: null });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function fetchFromOldSupabase(table) {
  const url = `${config.oldSupabaseUrl}/rest/v1/${table}?select=*`;
  const result = await fetchJson(url, {
    headers: {
      'apikey': config.oldSupabaseKey,
      'Authorization': `Bearer ${config.oldSupabaseKey}`
    }
  });

  if (!result.ok) {
    console.error(`Failed to fetch from ${table}`);
    return null;
  }

  return result.data;
}

async function insertToNewSupabase(items) {
  const url = `${config.newSupabaseUrl}/rest/v1/medialist`;

  for (const item of items) {
    const result = await fetchJson(url, {
      method: 'POST',
      headers: {
        'apikey': config.newSupabaseKey,
        'Authorization': `Bearer ${config.newSupabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(item)
    });

    if (result.ok) {
      console.log(`  + ${item.title}`);
    } else {
      console.error(`  ! Failed: ${item.title}`);
    }
  }
}

function convertBooks(data) {
  if (!data || !data[0] || !data[0].readlist) {
    console.log('No books to migrate');
    return [];
  }

  const readlist = JSON.parse(data[0].readlist);

  return readlist.map(book => ({
    id: `book:migrated:${book.id}`,
    type: 'book',
    title: book.title,
    creator: book.author,
    year: book.year,
    image_url: book.cover,
    external_id: book.id,
    pages: book.pages,
    status: book.status || 'want',
    is_fiction: book.isFiction,
    tags: book.tags || [],
    notes: book.notes || '',
    recommended_by: book.recommendedBy || '',
    has_audiobook: book.hasAudiobook || false,
    has_paperbook: book.hasPaperbook || false,
    has_ebook: book.hasEbook || false,
    date_added: book.dateAdded ? new Date(book.dateAdded).toISOString() : new Date().toISOString(),
    date_started: book.dateStarted ? new Date(book.dateStarted).toISOString() : null,
    date_finished: book.dateFinished ? new Date(book.dateFinished).toISOString() : null
  }));
}

function convertFilms(data) {
  if (!data || !data[0] || !data[0].watchlist) {
    console.log('No films to migrate');
    return [];
  }

  const watchlist = JSON.parse(data[0].watchlist);

  return watchlist.map(film => ({
    id: `watchmode:film:${film.id}`,
    type: 'film',
    title: film.title,
    creator: film.director || '',
    year: film.year,
    image_url: film.poster,
    external_id: film.id?.toString(),
    imdb_id: film.imdbId,
    runtime: film.runtime,
    director: film.director || '',
    awards: film.awards || '',
    metascore: film.metascore,
    streaming_sources: JSON.stringify(film.streamingSources || []),
    manual_streaming_sources: JSON.stringify(film.manualStreamingSources || []),
    in_library: film.inLibrary || false,
    date_added: film.lastUpdated ? new Date(film.lastUpdated).toISOString() : new Date().toISOString()
  }));
}

async function main() {
  console.log('MediaList Migration Script');
  console.log('==========================\n');

  if (!config.newSupabaseUrl || !config.newSupabaseKey) {
    console.error('Error: Missing Supabase configuration.');
    console.error('Set SUPABASE_URL and SUPABASE_KEY environment variables.');
    process.exit(1);
  }

  // Migrate books
  console.log('Fetching books from book_readlist...');
  const booksData = await fetchFromOldSupabase('book_readlist');
  const books = convertBooks(booksData);
  console.log(`Found ${books.length} books\n`);

  if (books.length > 0) {
    console.log('Migrating books...');
    await insertToNewSupabase(books);
    console.log('Books migration complete!\n');
  }

  // Migrate films
  console.log('Fetching films from film_watchlist...');
  const filmsData = await fetchFromOldSupabase('film_watchlist');
  const films = convertFilms(filmsData);
  console.log(`Found ${films.length} films\n`);

  if (films.length > 0) {
    console.log('Migrating films...');
    await insertToNewSupabase(films);
    console.log('Films migration complete!\n');
  }

  console.log('Migration finished!');
  console.log('You can now use the MediaList app with your existing data.');
}

main().catch(console.error);
