# MediaList

A unified media tracking app for albums, films, and books.

## Features

- **Music**: Search Spotify, track albums by release year
- **Films**: Search Watchmode, track streaming availability, mark as "In Library"
- **Books**: Search Open Library + Google Books, track reading status, add tags/notes

## Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL from `SETUP.md` to create the database table
3. Deploy to Netlify
4. Add environment variables in Netlify:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
5. Enter your API keys in the app setup screen

See `SETUP.md` for detailed instructions.

## API Keys Required

- **Supabase**: URL + anon key (free tier works)
- **Spotify**: Client ID + Secret from [developer.spotify.com](https://developer.spotify.com)
- **Watchmode**: API key from [watchmode.com](https://api.watchmode.com) (free tier: 1000 requests/month)
- **OMDb** (optional): API key from [omdbapi.com](https://www.omdbapi.com)

## Migration

If you have existing data from book-readlist or film-lookup:

1. Export data from the old app (Settings > Export)
2. Import into MediaList (Settings > Import Data)

Or use the migration script:
```bash
SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=xxx node migrate.js
```

## Local Development

Just open `index.html` in a browser. No build step required.

For Spotify to work locally, you'll need to either:
- Use `netlify dev` to run the Netlify function locally
- Enter your Spotify client secret directly (less secure)

## License

MIT
