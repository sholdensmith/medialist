# MediaList Setup Guide

## 1. Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Name it "medialist" (or whatever you prefer)
4. Set a database password (save this somewhere)
5. Choose a region close to you
6. Click "Create new project" and wait for it to provision

## 2. Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy and paste this entire SQL block:

```sql
-- Create the unified medialist table
CREATE TABLE medialist (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('album', 'film', 'book')),
  title TEXT NOT NULL,
  creator TEXT NOT NULL,  -- artist/director/author
  year INTEGER,
  image_url TEXT,
  external_url TEXT,
  external_id TEXT,

  -- Common fields
  date_added TIMESTAMPTZ DEFAULT NOW(),

  -- Book-specific fields
  status TEXT CHECK (status IN ('want', 'reading', 'read')),
  is_fiction BOOLEAN,
  pages INTEGER,
  recommended_by TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  date_started TIMESTAMPTZ,
  date_finished TIMESTAMPTZ,
  has_audiobook BOOLEAN DEFAULT FALSE,
  has_paperbook BOOLEAN DEFAULT FALSE,
  has_ebook BOOLEAN DEFAULT FALSE,

  -- Film-specific fields
  in_library BOOLEAN DEFAULT FALSE,
  streaming_sources JSONB DEFAULT '[]',
  manual_streaming_sources JSONB DEFAULT '[]',
  runtime INTEGER,
  director TEXT,
  awards TEXT,
  metascore INTEGER,
  imdb_id TEXT,

  -- Album-specific fields
  spotify_id TEXT,
  spotify_url TEXT
);

-- Create indexes for efficient queries
CREATE INDEX idx_medialist_type ON medialist(type);
CREATE INDEX idx_medialist_year ON medialist(year);
CREATE INDEX idx_medialist_status ON medialist(status) WHERE type = 'book';
CREATE INDEX idx_medialist_date_added ON medialist(date_added);

-- Allow public access (single-user mode, no auth)
ALTER TABLE medialist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON medialist
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

4. Click **Run** (or press Cmd+Enter)
5. You should see "Success. No rows returned" - this is correct!

## 3. Get Your Credentials

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## 4. Get Your API Keys

### Spotify (for Music)
1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create an app (or use existing)
3. Copy the **Client ID** and **Client Secret**

### Watchmode (for Films)
1. Go to [watchmode.com](https://api.watchmode.com/)
2. Sign up for free tier
3. Copy your **API Key**

### OMDb (Optional, for Films)
1. Go to [omdbapi.com](https://www.omdbapi.com/apikey.aspx)
2. Get a free API key
3. Copy the key from the email they send

## 5. Enter Credentials in MediaList

1. Open MediaList in your browser
2. You'll see the setup screen
3. Enter all your credentials
4. Click "Save & Continue"

## 6. Migrate Your Existing Data

If you have existing data in book-readlist or film-lookup:

1. Go to Settings in MediaList
2. Click "Import Data"
3. Select your exported JSON file from the old app

Or run the migration script:
```bash
node migrate.js
```

---

## Troubleshooting

**"Missing Supabase environment variables"**
- Make sure you entered both the URL and anon key
- Check there are no extra spaces

**Spotify search not working**
- Verify your Client ID and Secret are correct
- Make sure you've set up the Netlify function (see below)

**Films not showing streaming info**
- Verify your Watchmode API key is correct
- Check you haven't exceeded the free tier limits

## Netlify Deployment

1. Push to GitHub
2. Connect repo to Netlify
3. Set environment variables in Netlify dashboard:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
4. Deploy!

The Spotify credentials need to be server-side (via Netlify Functions) because Spotify requires the client secret which shouldn't be exposed to browsers.
