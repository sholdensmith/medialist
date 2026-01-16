# Repository Guidelines

## Project Structure & Module Organization
- `index.html` contains the single-page UI markup and modals.
- `app.js` holds all client-side logic (state, API calls, rendering).
- `styles.css` provides global styling and component classes.
- `netlify/functions/spotify-token.js` is the serverless function for Spotify auth.
- `migrate.js` is an optional Node script to import legacy data.
- `README.md` and `SETUP.md` document setup, schema, and deployment.

## Build, Test, and Development Commands
- `open index.html` (or open in your browser) runs the app locally; there is no build step.
- `netlify dev` runs the app with the Spotify Netlify function locally (requires Netlify CLI).
- `SUPABASE_URL=... SUPABASE_KEY=... node migrate.js` imports legacy data into the `medialist` table.

## Coding Style & Naming Conventions
- Indentation: 2 spaces in HTML, CSS, and JS.
- JavaScript: use `camelCase` for functions/variables, `UPPER_SNAKE_CASE` for constants.
- CSS: use kebab-case class names; keep reusable values in `:root` CSS variables.
- Keep app logic centralized in `app.js` unless adding a clearly separated module.

## Testing Guidelines
- No automated test framework is configured.
- Validate changes manually in the browser: search, add/remove items, settings, and modals.
- For Spotify-related changes, verify via `netlify dev` so the token function is exercised.

## Commit & Pull Request Guidelines
- Commit messages in history are short, imperative, and descriptive (e.g., "Show film runtime on cards").
- Keep commits focused; use `Revert ...` when backing out a change.
- PRs should include a concise description, steps to validate, and screenshots for UI changes.

## Security & Configuration Tips
- Do not commit API keys; store them in Netlify env vars or enter them via the setup screen.
- `SPOTIFY_CLIENT_SECRET` should only be used by the Netlify function, not client-side.
- Supabase keys in localStorage are required for the app to load; avoid hardcoding in source.
