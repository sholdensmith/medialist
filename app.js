// MediaList - Unified Media Tracking App
// Combines album, film, and book tracking in one app

// ============================================================================
// State & Configuration
// ============================================================================

let supabaseClient = null;
let mediaList = [];
let allTags = [];
let availableServices = [];
let selectedServices = [];
let spotifyToken = null;
let spotifyTokenExpiry = 0;

const CONFIG_KEYS = [
  'supabase_url',
  'supabase_key',
  'spotify_client_id',
  'spotify_client_secret',
  'watchmode_key',
  'omdb_key',
  'selected_country',
  'selected_services'
];

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
  setupScreen: document.getElementById('setup-screen'),
  mainApp: document.getElementById('main-app'),
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Music
  musicSearch: document.getElementById('music-search'),
  musicSearchBtn: document.getElementById('music-search-btn'),
  musicSearchClear: document.getElementById('music-search-clear'),
  musicSearchResults: document.getElementById('music-search-results'),
  musicList: document.getElementById('music-list'),
  musicEmpty: document.getElementById('music-empty'),

  // Films
  filmsSearch: document.getElementById('films-search'),
  filmsSearchBtn: document.getElementById('films-search-btn'),
  filmsSearchClear: document.getElementById('films-search-clear'),
  filmsSearchResults: document.getElementById('films-search-results'),
  filmsList: document.getElementById('films-list'),
  filmsEmpty: document.getElementById('films-empty'),
  filmsServiceFilter: document.getElementById('films-service-filter'),
  filmsStreamableFilter: document.getElementById('films-streamable-filter'),
  filmsLibraryFilter: document.getElementById('films-library-filter'),

  // Books
  booksSearch: document.getElementById('books-search'),
  booksSearchBtn: document.getElementById('books-search-btn'),
  booksSearchClear: document.getElementById('books-search-clear'),
  booksSearchResults: document.getElementById('books-search-results'),
  booksList: document.getElementById('books-list'),
  booksEmpty: document.getElementById('books-empty'),
  booksStatusFilter: document.getElementById('books-status-filter'),
  booksTypeFilter: document.getElementById('books-type-filter'),
  booksTagFilter: document.getElementById('books-tag-filter'),
  booksCurrentlyReading: document.getElementById('books-currently-reading'),
};

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Check if setup is needed
  const supabaseUrl = localStorage.getItem('supabase_url');
  const supabaseKey = localStorage.getItem('supabase_key');

  if (!supabaseUrl || !supabaseKey) {
    showSetupScreen();
    return;
  }

  // Validate URL format before trying to connect
  try {
    new URL(supabaseUrl);
  } catch {
    console.error('Invalid Supabase URL, clearing and showing setup');
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
    showSetupScreen();
    return;
  }

  // Initialize Supabase
  try {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    await loadAllData();
    showMainApp();
  } catch (error) {
    console.error('Failed to initialize:', error);
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
    showSetupScreen();
  }
}

function showSetupScreen() {
  elements.setupScreen.classList.remove('hidden');
  elements.mainApp.classList.add('hidden');

  // Pre-fill with existing values
  CONFIG_KEYS.forEach(key => {
    const input = document.getElementById(`setup-${key.replace(/_/g, '-')}`);
    if (input) {
      input.value = localStorage.getItem(key) || '';
    }
  });

  document.getElementById('setup-save-btn').addEventListener('click', saveSetup);
}

function saveSetup() {
  const url = document.getElementById('setup-supabase-url').value.trim();
  const key = document.getElementById('setup-supabase-key').value.trim();

  if (!url || !key) {
    alert('Supabase URL and Key are required');
    return;
  }

  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);
  localStorage.setItem('spotify_client_id', document.getElementById('setup-spotify-client-id').value.trim());
  localStorage.setItem('spotify_client_secret', document.getElementById('setup-spotify-client-secret').value.trim());
  localStorage.setItem('watchmode_key', document.getElementById('setup-watchmode-key').value.trim());
  localStorage.setItem('omdb_key', document.getElementById('setup-omdb-key').value.trim());

  location.reload();
}

function showMainApp() {
  elements.setupScreen.classList.add('hidden');
  elements.mainApp.classList.remove('hidden');

  setupEventListeners();
  renderAll();
}

function setupEventListeners() {
  // Tab switching
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Settings
  elements.settingsBtn.addEventListener('click', openSettings);
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).classList.add('hidden');
    });
  });

  // Music
  elements.musicSearchBtn.addEventListener('click', searchMusic);
  elements.musicSearch.addEventListener('keypress', e => {
    if (e.key === 'Enter') searchMusic();
  });
  elements.musicSearch.addEventListener('input', e => {
    elements.musicSearchClear.classList.toggle('hidden', !e.target.value);
  });
  elements.musicSearchClear.addEventListener('click', () => {
    elements.musicSearch.value = '';
    elements.musicSearchClear.classList.add('hidden');
    elements.musicSearchResults.classList.add('hidden');
    elements.musicSearch.focus();
  });

  // Films
  elements.filmsSearchBtn.addEventListener('click', searchFilms);
  elements.filmsSearch.addEventListener('keypress', e => {
    if (e.key === 'Enter') searchFilms();
  });
  elements.filmsSearch.addEventListener('input', e => {
    elements.filmsSearchClear.classList.toggle('hidden', !e.target.value);
  });
  elements.filmsSearchClear.addEventListener('click', () => {
    elements.filmsSearch.value = '';
    elements.filmsSearchClear.classList.add('hidden');
    elements.filmsSearchResults.classList.add('hidden');
    elements.filmsSearch.focus();
  });
  elements.filmsServiceFilter.addEventListener('change', renderFilms);
  elements.filmsStreamableFilter.addEventListener('change', renderFilms);
  elements.filmsLibraryFilter.addEventListener('change', renderFilms);

  // Books
  elements.booksSearchBtn.addEventListener('click', searchBooks);
  elements.booksSearch.addEventListener('keypress', e => {
    if (e.key === 'Enter') searchBooks();
  });
  elements.booksSearch.addEventListener('input', e => {
    elements.booksSearchClear.classList.toggle('hidden', !e.target.value);
  });
  elements.booksSearchClear.addEventListener('click', () => {
    elements.booksSearch.value = '';
    elements.booksSearchClear.classList.add('hidden');
    elements.booksSearchResults.classList.add('hidden');
    elements.booksSearch.focus();
  });
  elements.booksStatusFilter.addEventListener('change', renderBooks);
  elements.booksTypeFilter.addEventListener('change', renderBooks);
  elements.booksTagFilter.addEventListener('change', renderBooks);

  // Modal close on backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  // Escape key closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }
  });

  // Settings modal buttons
  document.getElementById('settings-save-keys').addEventListener('click', saveSettings);
  document.getElementById('export-data-btn').addEventListener('click', exportData);
  document.getElementById('import-data-input').addEventListener('change', importData);

  // Back to top button
  const backToTopBtn = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.remove('hidden');
    } else {
      backToTopBtn.classList.add('hidden');
    }
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function switchTab(tabName) {
  elements.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
    content.classList.toggle('hidden', content.id !== `${tabName}-tab`);
  });
}

// ============================================================================
// Data Storage (Supabase)
// ============================================================================

async function loadAllData() {
  try {
    const { data, error } = await supabaseClient
      .from('medialist')
      .select('*')
      .order('year', { ascending: false, nullsFirst: true });

    if (error) throw error;

    mediaList = data || [];

    // Extract all unique tags from books
    const tagSet = new Set();
    mediaList.filter(m => m.type === 'book').forEach(book => {
      (book.tags || []).forEach(tag => tagSet.add(tag));
    });
    allTags = Array.from(tagSet).sort();

    // Load selected services
    selectedServices = JSON.parse(localStorage.getItem('selected_services') || '[]');

  } catch (error) {
    console.error('Error loading data:', error);
    mediaList = [];
  }
}

async function saveItem(item) {
  try {
    const { error } = await supabaseClient
      .from('medialist')
      .upsert(item);

    if (error) throw error;

    // Update local state
    const index = mediaList.findIndex(m => m.id === item.id);
    if (index >= 0) {
      mediaList[index] = item;
    } else {
      mediaList.push(item);
      // Re-sort by year (newest first)
      mediaList.sort((a, b) => {
        if (a.year === null && b.year === null) return 0;
        if (a.year === null) return 1;
        if (b.year === null) return -1;
        return b.year - a.year;
      });
    }

  } catch (error) {
    console.error('Error saving item:', error);
    throw error;
  }
}

async function deleteItem(id) {
  try {
    const { error } = await supabaseClient
      .from('medialist')
      .delete()
      .eq('id', id);

    if (error) throw error;

    mediaList = mediaList.filter(m => m.id !== id);

  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
}

// ============================================================================
// Rendering
// ============================================================================

function renderAll() {
  renderMusic();
  renderFilms();
  renderBooks();
  populateFilters();
}

function populateFilters() {
  // Populate book tag filter
  const tagFilter = elements.booksTagFilter;
  tagFilter.innerHTML = '<option value="">All Tags</option>';
  allTags.forEach(tag => {
    tagFilter.innerHTML += `<option value="${tag}">${tag}</option>`;
  });

  // Populate film service filter
  loadStreamingServices();
}

// ============================================================================
// Music Module
// ============================================================================

async function getSpotifyToken() {
  // Check if using Netlify function (production) or direct auth (dev with local proxy)
  const clientId = localStorage.getItem('spotify_client_id');
  const clientSecret = localStorage.getItem('spotify_client_secret');

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  if (spotifyToken && Date.now() < spotifyTokenExpiry) {
    return spotifyToken;
  }

  // Try Netlify function first
  try {
    const response = await fetch('/.netlify/functions/spotify-token');
    if (response.ok) {
      const data = await response.json();
      spotifyToken = data.access_token;
      spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
      return spotifyToken;
    }
  } catch (e) {
    // Netlify function not available, fall back to direct auth
  }

  // Direct auth (works in dev or if client secret is provided)
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify token');
  }

  const data = await response.json();
  spotifyToken = data.access_token;
  spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyToken;
}

async function searchMusic() {
  const query = elements.musicSearch.value.trim();
  if (!query) return;

  elements.musicSearchResults.innerHTML = '<div class="loading">Searching</div>';
  elements.musicSearchResults.classList.remove('hidden');

  try {
    const token = await getSpotifyToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=12`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error('Search failed');

    const data = await response.json();
    displayMusicSearchResults(data.albums.items);

  } catch (error) {
    console.error('Music search error:', error);
    elements.musicSearchResults.innerHTML = `<p style="color: var(--accent);">Search failed: ${error.message}</p>`;
  }
}

function displayMusicSearchResults(albums) {
  if (albums.length === 0) {
    elements.musicSearchResults.innerHTML = '<p>No albums found</p>';
    return;
  }

  const existingIds = new Set(mediaList.filter(m => m.type === 'album').map(m => m.spotify_id));

  elements.musicSearchResults.innerHTML = `
    <h3>Search Results <button class="close-btn" onclick="this.closest('.search-results').classList.add('hidden')">&times;</button></h3>
    ${albums.map(album => {
      const year = album.release_date ? parseInt(album.release_date.substring(0, 4)) : null;
      const isAdded = existingIds.has(album.id);
      const coverUrl = album.images[0]?.url || '';
      const spotifyAppUrl = buildSpotifyAppUrl(album.id, album.external_urls.spotify);
      const spotifyWebUrl = buildSpotifyWebUrl(album.id, album.external_urls.spotify);

      return `
        <div class="search-result-item">
          <img src="${coverUrl}" alt="${album.name}" onerror="this.style.display='none'">
          <div class="info">
            <div class="title">${album.name}</div>
            <div class="meta">${album.artists[0]?.name || 'Unknown'} ${year ? `(${year})` : ''}</div>
          </div>
          <div class="actions">
            ${isAdded
              ? `<span class="added-indicator" onclick="scrollToItem('spotify:album:${album.id}')" title="Jump to item">Added</span>`
              : `<button class="btn btn-small btn-success" onclick="addAlbum('${album.id}', '${escapeHtml(album.name)}', '${escapeHtml(album.artists[0]?.name || 'Unknown')}', ${year}, '${coverUrl}', '${album.external_urls.spotify}')">Add</button>`
            }
            <a href="${escapeHtml(spotifyAppUrl)}" target="_blank" class="btn btn-small btn-secondary" onclick="return openSpotifyLink('${album.id}', '${escapeHtml(spotifyWebUrl)}')">Spotify</a>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

async function addAlbum(spotifyId, title, artist, year, coverUrl, spotifyUrl) {
  const album = {
    id: `spotify:album:${spotifyId}`,
    type: 'album',
    title,
    creator: artist,
    year,
    image_url: coverUrl,
    external_url: spotifyUrl,
    external_id: spotifyId,
    spotify_id: spotifyId,
    spotify_url: spotifyUrl,
    date_added: new Date().toISOString()
  };

  try {
    await saveItem(album);
    renderMusic();
    // Update search results to show "Added"
    searchMusic();
  } catch (error) {
    alert('Failed to add album: ' + error.message);
  }
}

function renderMusic() {
  const albums = mediaList.filter(m => m.type === 'album');

  if (albums.length === 0) {
    elements.musicList.innerHTML = '';
    elements.musicEmpty.classList.remove('hidden');
    return;
  }

  elements.musicEmpty.classList.add('hidden');

  // Group by year
  const grouped = groupByYear(albums, compareByCreator);

  elements.musicList.innerHTML = grouped.map(({ year, items }) => `
    <div class="year-header">${year || 'Unknown Year'}</div>
    ${items.map(album => {
      const spotifyWebUrl = buildSpotifyWebUrl(album.spotify_id, album.spotify_url || album.external_url);
      const spotifyAppUrl = buildSpotifyAppUrl(album.spotify_id, spotifyWebUrl);
      return `
      <div class="media-card" data-item-id="${album.id}">
        ${album.image_url
          ? `<img class="poster" src="${album.image_url}" alt="${album.title}">`
          : '<div class="poster-placeholder">🎵</div>'
        }
        <div class="card-body">
          <div class="card-title" title="${album.title}">${album.title}</div>
          <div class="card-meta">
            <span>${album.creator}</span>
            ${album.year ? `<span>${album.year}</span>` : ''}
          </div>
          <div class="card-actions">
            <a href="${escapeHtml(spotifyAppUrl)}" target="_blank" class="btn btn-secondary" onclick="return openSpotifyLink('${escapeHtml(album.spotify_id || '')}', '${escapeHtml(spotifyWebUrl)}')">Spotify</a>
            <button class="btn-remove" onclick="removeMedia('${album.id}', 'music')" title="Remove">&times;</button>
          </div>
        </div>
      </div>
    `;
    }).join('')}
  `).join('');
}

// ============================================================================
// Films Module
// ============================================================================

async function loadStreamingServices() {
  const watchmodeKey = localStorage.getItem('watchmode_key');
  if (!watchmodeKey || availableServices.length > 0) return;

  try {
    const response = await fetch(`https://api.watchmode.com/v1/sources/?apiKey=${watchmodeKey}`);
    if (response.ok) {
      availableServices = await response.json();
      populateServiceFilter();
    }
  } catch (error) {
    console.error('Failed to load streaming services:', error);
  }
}

function populateServiceFilter() {
  const filter = elements.filmsServiceFilter;

  filter.innerHTML = '<option value="">All Services</option>';

  // Only show user's selected services in filter
  if (selectedServices.length > 0) {
    selectedServices.forEach(serviceId => {
      const service = availableServices.find(s => s.id === serviceId);
      if (service) {
        filter.innerHTML += `<option value="${service.id}">${formatServiceName(service.name)}</option>`;
      }
    });
  } else {
    // Fallback to popular services if none selected
    const popular = ['Netflix', 'Amazon Prime Video', 'Hulu', 'Disney+', 'Max', 'Apple TV+', 'Peacock', 'Paramount+', 'Criterion Channel', 'Kanopy'];
    popular.forEach(name => {
      const service = availableServices.find(s => s.name === name);
      if (service) {
        filter.innerHTML += `<option value="${service.id}">${formatServiceName(service.name)}</option>`;
      }
    });
  }
}

function populateServicesSettings() {
  const container = document.getElementById('streaming-services-list');
  if (!container) return;

  if (availableServices.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary)">Loading services... (requires Watchmode API key)</p>';
    return;
  }

  // Prioritize common subscription services, then show all others
  const priorityNames = [
    'Netflix', 'Amazon Prime Video', 'Hulu', 'Disney+', 'Max', 'Apple TV+',
    'Peacock', 'Paramount+', 'Criterion Channel', 'Kanopy', 'Hoopla',
    'Tubi', 'Pluto TV', 'Mubi', 'Shudder', 'AMC+', 'Starz', 'Showtime',
    'BritBox', 'Acorn TV', 'MGM+', 'Cinemax', 'Fandor', 'Cohen Media',
    'Kino Now', 'OVID', 'Flix Premiere', 'Dekkoo', 'Arrow', 'Sundance Now'
  ];

  // Get priority services first
  const priorityServices = priorityNames
    .map(name => availableServices.find(s => s.name === name))
    .filter(Boolean);

  // Get remaining subscription/free services not in priority list
  const otherServices = availableServices
    .filter(s => !priorityNames.includes(s.name) && (s.type === 'sub' || s.type === 'free'))
    .sort((a, b) => a.name.localeCompare(b.name));

  const allServices = [...priorityServices, ...otherServices];

  container.innerHTML = allServices.map(service => {
    const checked = selectedServices.includes(service.id) ? 'checked' : '';
    return `
      <label class="service-checkbox">
        <input type="checkbox" value="${service.id}" ${checked} onchange="toggleService(${service.id})">
        ${formatServiceName(service.name)}
      </label>
    `;
  }).join('');
}

function toggleService(serviceId) {
  if (selectedServices.includes(serviceId)) {
    selectedServices = selectedServices.filter(id => id !== serviceId);
  } else {
    selectedServices.push(serviceId);
  }
  localStorage.setItem('selected_services', JSON.stringify(selectedServices));
  populateServiceFilter();
}

async function searchFilms() {
  const query = elements.filmsSearch.value.trim();
  if (!query) return;

  const watchmodeKey = localStorage.getItem('watchmode_key');
  if (!watchmodeKey) {
    alert('Watchmode API key not configured');
    return;
  }

  elements.filmsSearchResults.innerHTML = '<div class="loading">Searching</div>';
  elements.filmsSearchResults.classList.remove('hidden');

  try {
    const response = await fetch(
      `https://api.watchmode.com/v1/autocomplete-search/?apiKey=${watchmodeKey}&search_value=${encodeURIComponent(query)}&search_type=2`
    );

    if (!response.ok) throw new Error('Search failed');

    const data = await response.json();
    displayFilmSearchResults(data.results || []);

  } catch (error) {
    console.error('Film search error:', error);
    elements.filmsSearchResults.innerHTML = `<p style="color: var(--accent);">Search failed: ${error.message}</p>`;
  }
}

function displayFilmSearchResults(films) {
  if (films.length === 0) {
    elements.filmsSearchResults.innerHTML = '<p>No films found</p>';
    return;
  }

  const existingIds = new Set(mediaList.filter(m => m.type === 'film').map(m => m.external_id?.toString()));

  elements.filmsSearchResults.innerHTML = `
    <h3>Search Results <button class="close-btn" onclick="this.closest('.search-results').classList.add('hidden')">&times;</button></h3>
    ${films.slice(0, 12).map(film => {
      const isAdded = existingIds.has(film.id?.toString());

      return `
        <div class="search-result-item">
          <img src="${film.image_url || ''}" alt="${film.name}" onerror="this.style.display='none'">
          <div class="info">
            <div class="title">${film.name}</div>
            <div class="meta">${film.year || ''}</div>
          </div>
          <div class="actions">
            ${isAdded
              ? `<span class="added-indicator" onclick="scrollToItem('watchmode:film:${film.id}')" title="Jump to item">Added</span>`
              : `<button class="btn btn-small btn-success" onclick='addFilm(${film.id}, ${JSON.stringify(film.name || '')}, ${JSON.stringify(film.year || null)}, ${JSON.stringify(film.image_url || '')})'>Add</button>`
            }
          </div>
        </div>
      `;
    }).join('')}
  `;
}

async function addFilm(watchmodeId, fallbackTitle = '', fallbackYear = null, fallbackImageUrl = '') {
  const watchmodeKey = localStorage.getItem('watchmode_key');
  const country = 'US'; // Default to US region

  try {
    // Fetch film details and streaming sources in parallel
    const [detailsRes, sourcesRes] = await Promise.all([
      fetch(`https://api.watchmode.com/v1/title/${watchmodeId}/?apiKey=${watchmodeKey}`),
      fetch(`https://api.watchmode.com/v1/title/${watchmodeId}/sources/?apiKey=${watchmodeKey}&regions=${country}`)
    ]);

    let details = {};
    let detailsErrorMessage = '';
    if (detailsRes.ok) {
      try {
        details = await detailsRes.json();
      } catch (error) {
        throw new Error('Failed to parse film details');
      }
    } else {
      try {
        details = await detailsRes.json();
      } catch (error) {
        details = {};
      }
      detailsErrorMessage = details?.message || 'Failed to load film details';
      console.warn('Watchmode details unavailable, using fallback data.', detailsErrorMessage);
    }

    let sources = [];
    if (sourcesRes.ok) {
      try {
        sources = await sourcesRes.json();
      } catch (error) {
        sources = [];
      }
    }

    // Try to get additional info from OMDb
    let omdbData = {};
    const omdbKey = localStorage.getItem('omdb_key');
    if (omdbKey && details.imdb_id) {
      try {
        const omdbRes = await fetch(`https://www.omdbapi.com/?apikey=${omdbKey}&i=${details.imdb_id}`);
        omdbData = await omdbRes.json();
      } catch (e) { /* ignore */ }
    }

    const title = details.title || details.name || fallbackTitle || null;
    if (!title) {
      throw new Error(detailsErrorMessage || 'Film title is missing from Watchmode');
    }

    const year = details.year || fallbackYear || null;
    const imageUrl = details.poster || fallbackImageUrl || null;
    const streamingSources = Array.isArray(sources)
      ? sources.filter(s => s.type === 'sub' || s.type === 'free')
      : [];

    const film = {
      id: `watchmode:film:${watchmodeId}`,
      type: 'film',
      title,
      creator: omdbData.Director || details.director || '',
      year,
      image_url: imageUrl,
      external_url: details.imdb_id ? `https://www.imdb.com/title/${details.imdb_id}` : null,
      external_id: watchmodeId.toString(),
      imdb_id: details.imdb_id,
      runtime: details.runtime_minutes || parseInt(omdbData.Runtime) || null,
      director: omdbData.Director || '',
      awards: omdbData.Awards || '',
      metascore: omdbData.Metascore ? parseInt(omdbData.Metascore) : null,
      streaming_sources: streamingSources,
      in_library: false,
      date_added: new Date().toISOString()
    };

    await saveItem(film);
    renderFilms();
    searchFilms(); // Refresh to show "Added"

  } catch (error) {
    console.error('Failed to add film:', error);
    alert('Failed to add film: ' + error.message);
  }
}

function renderFilms() {
  let films = mediaList.filter(m => m.type === 'film');

  // Apply filters
  const serviceFilter = elements.filmsServiceFilter.value;
  const streamableFilter = elements.filmsStreamableFilter.checked;
  const libraryFilter = elements.filmsLibraryFilter.checked;

  if (streamableFilter) {
    films = films.filter(f => {
      const sources = [...(f.streaming_sources || []), ...(f.manual_streaming_sources || [])];
      // Only consider sources from user's selected services
      if (selectedServices.length > 0) {
        return sources.some(s => selectedServices.includes(s.source_id) || selectedServices.includes(s.sourceId));
      }
      return sources.length > 0;
    });
  }

  if (libraryFilter) {
    films = films.filter(f => f.in_library);
  }

  if (serviceFilter) {
    films = films.filter(f => {
      const sources = [...(f.streaming_sources || []), ...(f.manual_streaming_sources || [])];
      return sources.some(s => s.source_id?.toString() === serviceFilter || s.sourceId?.toString() === serviceFilter);
    });
  }

  if (films.length === 0) {
    elements.filmsList.innerHTML = '';
    elements.filmsEmpty.classList.remove('hidden');
    return;
  }

  elements.filmsEmpty.classList.add('hidden');

  // Group by year
  const grouped = groupByYear(films);

  elements.filmsList.innerHTML = grouped.map(({ year, items }) => `
    <div class="year-header">${year || 'Unknown Year'}</div>
    ${items.map(film => {
      const allSources = [...(film.streaming_sources || []), ...(film.manual_streaming_sources || [])];
      // Only show services the user has selected
      const sources = selectedServices.length > 0
        ? allSources.filter(s => selectedServices.includes(s.source_id) || selectedServices.includes(s.sourceId))
        : allSources;
      const streamingBadges = sources.slice(0, 3).map(s => {
        const url = buildStreamingUrl(film, s);
        if (url) {
          return `<a href="${escapeHtml(url)}" target="_blank" class="streaming-badge streaming-link">${formatServiceName(s.name)}</a>`;
        }
        return `<span class="streaming-badge">${formatServiceName(s.name)}</span>`;
      }).join('');

      return `
        <div class="media-card" data-item-id="${film.id}">
          ${film.image_url
            ? `<img class="poster" src="${film.image_url}" alt="${film.title}">`
            : '<div class="poster-placeholder">🎬</div>'
          }
          <div class="card-body">
            <div class="card-title" title="${film.title}">${film.title}</div>
            <div class="card-meta">
              <span>${film.creator || film.director || ''}</span>
              ${film.year ? `<span>${film.year}</span>` : ''}
              ${film.runtime ? `<span>${formatRuntime(film.runtime)}</span>` : ''}
            </div>
            ${streamingBadges ? `<div class="streaming-badges">${streamingBadges}</div>` : ''}
            <div class="card-actions">
              <button class="btn btn-small ${film.in_library ? 'btn-success' : 'btn-secondary'}" onclick="toggleFilmLibrary('${film.id}')">${film.in_library ? 'In Library' : 'Add to Library'}</button>
              <button class="btn-remove" onclick="removeMedia('${film.id}', 'films')" title="Remove">&times;</button>
            </div>
          </div>
        </div>
      `;
    }).join('')}
  `).join('');
}

async function toggleFilmLibrary(id) {
  const film = mediaList.find(m => m.id === id);
  if (!film) return;

  film.in_library = !film.in_library;
  await saveItem(film);
  renderFilms();
}

// ============================================================================
// Books Module
// ============================================================================

async function searchBooks() {
  const query = elements.booksSearch.value.trim();
  if (!query) return;

  elements.booksSearchResults.innerHTML = '<div class="loading">Searching</div>';
  elements.booksSearchResults.classList.remove('hidden');

  try {
    // Search both Open Library and Google Books in parallel
    const [olResults, gbResults] = await Promise.allSettled([
      searchOpenLibrary(query),
      searchGoogleBooks(query)
    ]);

    let books = [];
    if (olResults.status === 'fulfilled') books.push(...olResults.value);
    if (gbResults.status === 'fulfilled') books.push(...gbResults.value);

    // Deduplicate by title+author
    books = deduplicateBooks(books);

    displayBookSearchResults(books);

  } catch (error) {
    console.error('Book search error:', error);
    elements.booksSearchResults.innerHTML = `<p style="color: var(--accent);">Search failed: ${error.message}</p>`;
  }
}

async function searchOpenLibrary(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    return (data.docs || []).map(book => ({
      id: book.key,
      title: book.title,
      author: book.author_name?.[0] || 'Unknown',
      year: book.first_publish_year,
      cover: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null,
      pages: book.number_of_pages_median,
      source: 'openlibrary'
    }));
  } catch (e) {
    return [];
  }
}

async function searchGoogleBooks(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    return (data.items || []).map(book => ({
      id: book.id,
      title: book.volumeInfo.title,
      author: book.volumeInfo.authors?.[0] || 'Unknown',
      year: book.volumeInfo.publishedDate ? parseInt(book.volumeInfo.publishedDate.substring(0, 4)) : null,
      cover: book.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
      pages: book.volumeInfo.pageCount,
      source: 'googlebooks'
    }));
  } catch (e) {
    return [];
  }
}

function deduplicateBooks(books) {
  const seen = new Map();
  return books.filter(book => {
    const key = normalizeTitle(book.title) + '|' + normalizeTitle(book.author);
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
}

function normalizeTitle(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function displayBookSearchResults(books) {
  if (books.length === 0) {
    elements.booksSearchResults.innerHTML = '<p>No books found</p>';
    return;
  }

  const existingIds = new Set(mediaList.filter(m => m.type === 'book').map(m => m.external_id));

  elements.booksSearchResults.innerHTML = `
    <h3>Search Results <button class="close-btn" onclick="this.closest('.search-results').classList.add('hidden')">&times;</button></h3>
    ${books.map(book => {
      const isAdded = existingIds.has(book.id);

      return `
        <div class="search-result-item">
          <img src="${book.cover || ''}" alt="${book.title}" onerror="this.style.display='none'">
          <div class="info">
            <div class="title">${book.title}</div>
            <div class="meta">${book.author} ${book.year ? `(${book.year})` : ''}</div>
          </div>
          <div class="actions">
            ${isAdded
              ? `<span class="added-indicator" onclick="scrollToItem('book:${book.source}:${escapeHtml(book.id)}')" title="Jump to item">Added</span>`
              : `<button class="btn btn-small btn-success" onclick="addBook('${escapeHtml(book.id)}', '${escapeHtml(book.title)}', '${escapeHtml(book.author)}', ${book.year || 'null'}, '${book.cover || ''}', ${book.pages || 'null'}, '${book.source}')">Add</button>`
            }
          </div>
        </div>
      `;
    }).join('')}
  `;
}

async function addBook(externalId, title, author, year, cover, pages, source) {
  const book = {
    id: `book:${source}:${externalId}`,
    type: 'book',
    title,
    creator: author,
    year,
    image_url: cover || null,
    external_id: externalId,
    pages,
    status: 'want',
    is_fiction: null,
    tags: [],
    notes: '',
    recommended_by: '',
    has_audiobook: false,
    has_paperbook: false,
    has_ebook: false,
    date_added: new Date().toISOString()
  };

  try {
    await saveItem(book);
    renderBooks();
    searchBooks(); // Refresh to show "Added"
  } catch (error) {
    alert('Failed to add book: ' + error.message);
  }
}

function renderBooks() {
  let books = mediaList.filter(m => m.type === 'book');

  // Apply filters
  const statusFilter = elements.booksStatusFilter.value;
  const typeFilter = elements.booksTypeFilter.value;
  const tagFilter = elements.booksTagFilter.value;

  if (statusFilter) {
    books = books.filter(b => b.status === statusFilter);
  }
  if (typeFilter) {
    books = books.filter(b =>
      typeFilter === 'fiction' ? b.is_fiction === true : b.is_fiction === false
    );
  }
  if (tagFilter) {
    books = books.filter(b => (b.tags || []).includes(tagFilter));
  }

  // Hide read books if setting is enabled
  const hideReadBooks = localStorage.getItem('hide_read_books') === 'true';
  if (hideReadBooks && !statusFilter) {
    books = books.filter(b => b.status !== 'read');
  }

  // Currently reading section
  const currentlyReading = mediaList.filter(m => m.type === 'book' && m.status === 'reading');
  if (currentlyReading.length > 0 && !statusFilter) {
    elements.booksCurrentlyReading.classList.remove('hidden');
    elements.booksCurrentlyReading.innerHTML = `
      <h3>Currently Reading</h3>
      <div class="media-grid">
        ${currentlyReading.map(book => renderBookCard(book)).join('')}
      </div>
    `;
  } else {
    elements.booksCurrentlyReading.classList.add('hidden');
  }

  // Filter out currently reading from main list if showing all
  if (!statusFilter) {
    books = books.filter(b => b.status !== 'reading');
  }

  if (books.length === 0 && currentlyReading.length === 0) {
    elements.booksList.innerHTML = '';
    elements.booksEmpty.classList.remove('hidden');
    return;
  }

  elements.booksEmpty.classList.add('hidden');

  // Group by year
  const grouped = groupByYear(books);

  elements.booksList.innerHTML = grouped.map(({ year, items }) => `
    <div class="year-header">${year || 'Unknown Year'}</div>
    ${items.map(book => renderBookCard(book)).join('')}
  `).join('');
}

function renderBookCard(book) {
  const statusClass = book.status || 'want';
  const statusLabel = { want: 'Want to Read', reading: 'Reading', read: 'Read' }[statusClass] || '';
  const typeLabel = book.is_fiction === true ? 'Fiction' : book.is_fiction === false ? 'Nonfiction' : '';
  const titleText = escapeHtml(book.title);
  const creatorText = escapeHtml(book.creator);
  const amazonUrl = escapeHtml(buildAmazonBookUrl(book.title, book.creator));

  return `
    <div class="media-card book-card" data-item-id="${book.id}">
      <button class="poster-button" onclick="openBookModal('${book.id}')" title="View details">
        ${book.image_url
          ? `<img class="poster" src="${book.image_url}" alt="${book.title}">`
          : '<div class="poster-placeholder">📚</div>'
        }
      </button>
      <div class="card-body">
        <div class="card-title">
          <a class="book-title-link" href="${amazonUrl}" target="_blank" rel="noopener noreferrer" title="${titleText}">${titleText}</a>
        </div>
        <div class="card-meta">
          <span>${creatorText}</span>
          ${book.year ? `<span>${book.year}</span>` : ''}
        </div>
        <div class="card-badges">
          <span class="status-badge ${statusClass}">${statusLabel}</span>
          ${typeLabel ? `<span class="status-badge type-${book.is_fiction ? 'fiction' : 'nonfiction'}">${typeLabel}</span>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-remove" onclick="removeMedia('${book.id}', 'books')" title="Remove">&times;</button>
        </div>
      </div>
    </div>
  `;
}

function openBookModal(id) {
  const book = mediaList.find(m => m.id === id);
  if (!book) return;

  document.getElementById('book-modal-title').textContent = book.title;
  document.getElementById('book-modal-body').innerHTML = `
    <div class="book-detail-grid">
      <div class="book-detail-row">
        <label>Status</label>
        <select id="book-status" onchange="updateBookField('${id}', 'status', this.value)">
          <option value="want" ${book.status === 'want' ? 'selected' : ''}>Want to Read</option>
          <option value="reading" ${book.status === 'reading' ? 'selected' : ''}>Currently Reading</option>
          <option value="read" ${book.status === 'read' ? 'selected' : ''}>Read</option>
        </select>
      </div>
      <div class="book-detail-row">
        <label>Type</label>
        <select id="book-type" onchange="updateBookField('${id}', 'is_fiction', this.value === 'true' ? true : this.value === 'false' ? false : null)">
          <option value="" ${book.is_fiction === null ? 'selected' : ''}>Not Set</option>
          <option value="true" ${book.is_fiction === true ? 'selected' : ''}>Fiction</option>
          <option value="false" ${book.is_fiction === false ? 'selected' : ''}>Nonfiction</option>
        </select>
      </div>
      <div class="book-detail-row">
        <label>Recommended By</label>
        <input type="text" value="${book.recommended_by || ''}" onchange="updateBookField('${id}', 'recommended_by', this.value)">
      </div>
      <div class="book-detail-row">
        <label>Formats Owned</label>
        <div>
          <label class="checkbox-label" style="display: inline-flex; margin-right: 1rem;">
            <input type="checkbox" ${book.has_audiobook ? 'checked' : ''} onchange="updateBookField('${id}', 'has_audiobook', this.checked)"> Audiobook
          </label>
          <label class="checkbox-label" style="display: inline-flex; margin-right: 1rem;">
            <input type="checkbox" ${book.has_paperbook ? 'checked' : ''} onchange="updateBookField('${id}', 'has_paperbook', this.checked)"> Paperback
          </label>
          <label class="checkbox-label" style="display: inline-flex;">
            <input type="checkbox" ${book.has_ebook ? 'checked' : ''} onchange="updateBookField('${id}', 'has_ebook', this.checked)"> Ebook
          </label>
        </div>
      </div>
      <div class="book-detail-row">
        <label>Tags</label>
        <div>
          <div class="book-tags-container" id="book-tags-${id}">
            ${(book.tags || []).map(tag => `
              <span class="book-tag">${tag} <button onclick="removeBookTag('${id}', '${tag}')">&times;</button></span>
            `).join('')}
          </div>
          <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
            <input type="text" id="new-tag-${id}" placeholder="Add tag..." style="flex: 1;">
            <button class="btn btn-small" onclick="addBookTag('${id}')">Add</button>
          </div>
        </div>
      </div>
      <div class="book-detail-row" style="align-items: flex-start;">
        <label>Notes</label>
        <textarea id="book-notes-${id}" onchange="updateBookField('${id}', 'notes', this.value)">${book.notes || ''}</textarea>
      </div>
    </div>
  `;

  document.getElementById('book-modal').classList.remove('hidden');
}

async function updateBookField(id, field, value) {
  const book = mediaList.find(m => m.id === id);
  if (!book) return;

  book[field] = value;

  // Update dates based on status
  if (field === 'status') {
    if (value === 'reading' && !book.date_started) {
      book.date_started = new Date().toISOString();
    } else if (value === 'read' && !book.date_finished) {
      book.date_finished = new Date().toISOString();
    }
  }

  await saveItem(book);
  renderBooks();
}

async function addBookTag(id) {
  const input = document.getElementById(`new-tag-${id}`);
  const tag = input.value.trim();
  if (!tag) return;

  const book = mediaList.find(m => m.id === id);
  if (!book) return;

  if (!book.tags) book.tags = [];
  if (!book.tags.includes(tag)) {
    book.tags.push(tag);

    // Update global tags
    if (!allTags.includes(tag)) {
      allTags.push(tag);
      allTags.sort();
      populateFilters();
    }

    await saveItem(book);
    openBookModal(id); // Refresh modal
    renderBooks();
  }

  input.value = '';
}

async function removeBookTag(id, tag) {
  const book = mediaList.find(m => m.id === id);
  if (!book) return;

  book.tags = (book.tags || []).filter(t => t !== tag);
  await saveItem(book);
  openBookModal(id); // Refresh modal
  renderBooks();
}

// ============================================================================
// Shared Utilities
// ============================================================================

function stripLeadingArticle(title) {
  return (title || '').replace(/^(the|an|a)\s+/i, '').trim();
}

function compareByTitle(a, b) {
  const titleA = stripLeadingArticle(a.title || a.name || '');
  const titleB = stripLeadingArticle(b.title || b.name || '');
  const primary = titleA.localeCompare(titleB, undefined, { sensitivity: 'base' });
  if (primary !== 0) return primary;
  const fullA = (a.title || a.name || '');
  const fullB = (b.title || b.name || '');
  const secondary = fullA.localeCompare(fullB, undefined, { sensitivity: 'base' });
  if (secondary !== 0) return secondary;
  return (a.id || '').toString().localeCompare((b.id || '').toString());
}

function compareByCreator(a, b) {
  const creatorA = stripLeadingArticle(a.creator || a.artist || '');
  const creatorB = stripLeadingArticle(b.creator || b.artist || '');
  const primary = creatorA.localeCompare(creatorB, undefined, { sensitivity: 'base' });
  if (primary !== 0) return primary;
  return compareByTitle(a, b);
}

function formatRuntime(minutes) {
  const total = parseInt(minutes, 10);
  if (!Number.isFinite(total) || total <= 0) return '';
  return `${total} min`;
}

function groupByYear(items, compareFn = compareByTitle) {
  const groups = new Map();

  items.forEach(item => {
    const year = item.year || 'Unknown';
    if (!groups.has(year)) {
      groups.set(year, []);
    }
    groups.get(year).push(item);
  });

  // Sort by year descending (newest first)
  return Array.from(groups.entries())
    .sort((a, b) => {
      if (a[0] === 'Unknown') return 1;
      if (b[0] === 'Unknown') return -1;
      return b[0] - a[0];
    })
    .map(([year, items]) => {
      items.sort(compareFn);
      return { year, items };
    });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function buildAmazonBookUrl(title, author) {
  const query = [title, author].filter(Boolean).join(' ').trim();
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&i=stripbooks`;
}

function getSpotifyAlbumId(spotifyId, spotifyUrl) {
  if (spotifyId) return spotifyId;
  if (!spotifyUrl) return '';
  const match = spotifyUrl.match(/spotify\.com\/album\/([a-zA-Z0-9]+)/);
  return match ? match[1] : '';
}

function buildSpotifyAppUrl(spotifyId, spotifyUrl) {
  const id = getSpotifyAlbumId(spotifyId, spotifyUrl);
  return id ? `spotify:album:${id}` : 'spotify:';
}

function buildSpotifyWebUrl(spotifyId, spotifyUrl) {
  const id = getSpotifyAlbumId(spotifyId, spotifyUrl);
  if (spotifyUrl) return spotifyUrl;
  return id ? `https://open.spotify.com/album/${id}` : 'https://open.spotify.com/';
}

function openSpotifyLink(spotifyId, spotifyUrl) {
  const appUrl = buildSpotifyAppUrl(spotifyId, spotifyUrl);
  const webUrl = buildSpotifyWebUrl(spotifyId, spotifyUrl);
  const start = Date.now();

  window.location = appUrl;

  setTimeout(() => {
    if (document.visibilityState === 'visible' && Date.now() - start < 1500) {
      window.open(webUrl, '_blank');
    }
  }, 900);

  return false;
}

function scrollToItem(itemId) {
  const card = document.querySelector(`.media-card[data-item-id="${CSS.escape(itemId)}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('highlight');
    setTimeout(() => card.classList.remove('highlight'), 2000);
  }
}

function formatServiceName(name) {
  const renames = {
    'Max': 'HBO Max',
    'MAX': 'HBO Max',
    'Max Amazon Channel': 'HBO Max',
    'HBO': 'HBO Max',
  };
  return renames[name] || name;
}

function buildStreamingUrl(film, source) {
  const serviceName = (source?.name || source?.source_name || '').toLowerCase();
  if (serviceName.includes('kanopy')) {
    const baseUrl = 'https://www.kanopy.com/en/multcolib/video/';
    const candidates = [source?.web_url, source?.link, source?.url].filter(Boolean);
    let videoId = source?.video_id || source?.videoId || '';

    if (!videoId) {
      for (const candidate of candidates) {
        const match = candidate.match(/\/video\/(\d+)/) || candidate.match(/movie-(\d+)/);
        if (match) {
          videoId = match[1];
          break;
        }
      }
    }

    if (videoId) {
      return `${baseUrl}${videoId}`;
    }

    const title = (film && film.title) ? film.title : '';
    if (title) {
      return `https://www.kanopy.com/en/search?query=${encodeURIComponent(title)}`;
    }
    return 'https://www.kanopy.com/en/';
  }
  return source?.web_url || source?.link || '';
}

async function removeMedia(id, tab) {
  if (!confirm('Remove this item from your list?')) return;

  try {
    await deleteItem(id);
    if (tab === 'music') renderMusic();
    else if (tab === 'films') renderFilms();
    else if (tab === 'books') renderBooks();
  } catch (error) {
    alert('Failed to remove: ' + error.message);
  }
}

// ============================================================================
// Settings
// ============================================================================

function openSettings() {
  // Populate current values
  document.getElementById('settings-supabase-url').value = localStorage.getItem('supabase_url') || '';
  document.getElementById('settings-supabase-key').value = localStorage.getItem('supabase_key') || '';
  document.getElementById('settings-spotify-client-id').value = localStorage.getItem('spotify_client_id') || '';
  document.getElementById('settings-spotify-client-secret').value = localStorage.getItem('spotify_client_secret') || '';
  document.getElementById('settings-watchmode-key').value = localStorage.getItem('watchmode_key') || '';
  document.getElementById('settings-omdb-key').value = localStorage.getItem('omdb_key') || '';

  // Populate tags
  const tagsList = document.getElementById('book-tags-list');
  tagsList.innerHTML = allTags.map(tag => `
    <span class="tag-item">${tag} <button onclick="deleteGlobalTag('${tag}')">&times;</button></span>
  `).join('') || '<p style="color: var(--text-secondary)">No tags yet</p>';

  // Populate display options
  const hideReadCheckbox = document.getElementById('settings-hide-read-books');
  hideReadCheckbox.checked = localStorage.getItem('hide_read_books') === 'true';
  hideReadCheckbox.onchange = () => {
    localStorage.setItem('hide_read_books', hideReadCheckbox.checked);
    renderBooks();
  };

  // Populate streaming services
  populateServicesSettings();

  elements.settingsModal.classList.remove('hidden');
}

function saveSettings() {
  localStorage.setItem('supabase_url', document.getElementById('settings-supabase-url').value.trim());
  localStorage.setItem('supabase_key', document.getElementById('settings-supabase-key').value.trim());
  localStorage.setItem('spotify_client_id', document.getElementById('settings-spotify-client-id').value.trim());
  localStorage.setItem('spotify_client_secret', document.getElementById('settings-spotify-client-secret').value.trim());
  localStorage.setItem('watchmode_key', document.getElementById('settings-watchmode-key').value.trim());
  localStorage.setItem('omdb_key', document.getElementById('settings-omdb-key').value.trim());

  alert('Settings saved! Reload to apply changes.');
}

async function deleteGlobalTag(tag) {
  if (!confirm(`Delete tag "${tag}" from all books?`)) return;

  // Remove from all books
  const booksWithTag = mediaList.filter(m => m.type === 'book' && (m.tags || []).includes(tag));
  for (const book of booksWithTag) {
    book.tags = book.tags.filter(t => t !== tag);
    await saveItem(book);
  }

  allTags = allTags.filter(t => t !== tag);
  populateFilters();
  openSettings(); // Refresh
  renderBooks();
}

function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    mediaList,
    allTags
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `medialist-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.mediaList && !data.readlist && !data.watchlist) {
      throw new Error('Invalid data format');
    }

    const replace = confirm('Replace existing data? Click Cancel to merge instead.');

    if (data.mediaList) {
      // Native MediaList format
      if (replace) {
        mediaList = data.mediaList;
      } else {
        const existingIds = new Set(mediaList.map(m => m.id));
        data.mediaList.forEach(item => {
          if (!existingIds.has(item.id)) {
            mediaList.push(item);
          }
        });
      }
    } else if (data.readlist) {
      // Book ReadList format
      const books = convertBookReadlistFormat(data.readlist);
      if (replace) {
        mediaList = mediaList.filter(m => m.type !== 'book').concat(books);
      } else {
        const existingIds = new Set(mediaList.map(m => m.id));
        books.forEach(book => {
          if (!existingIds.has(book.id)) {
            mediaList.push(book);
          }
        });
      }
    } else if (data.watchlist) {
      // Film Watchlist format
      const films = convertFilmWatchlistFormat(data.watchlist);
      if (replace) {
        mediaList = mediaList.filter(m => m.type !== 'film').concat(films);
      } else {
        const existingIds = new Set(mediaList.map(m => m.id));
        films.forEach(film => {
          if (!existingIds.has(film.id)) {
            mediaList.push(film);
          }
        });
      }
    }

    // Update tags
    if (data.allTags || data.all_tags) {
      const newTags = data.allTags || data.all_tags || [];
      allTags = [...new Set([...allTags, ...newTags])].sort();
    }

    // Save to Supabase
    for (const item of mediaList) {
      await saveItem(item);
    }

    alert('Import complete!');
    renderAll();

  } catch (error) {
    console.error('Import error:', error);
    alert('Import failed: ' + error.message);
  }

  event.target.value = '';
}

function convertBookReadlistFormat(readlist) {
  return readlist.map(book => ({
    id: `book:imported:${book.id}`,
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

function convertFilmWatchlistFormat(watchlist) {
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
    streaming_sources: film.streamingSources || [],
    manual_streaming_sources: film.manualStreamingSources || [],
    in_library: film.inLibrary || false,
    date_added: film.lastUpdated ? new Date(film.lastUpdated).toISOString() : new Date().toISOString()
  }));
}

// Make functions available globally
window.addAlbum = addAlbum;
window.addFilm = addFilm;
window.addBook = addBook;
window.removeMedia = removeMedia;
window.scrollToItem = scrollToItem;
window.toggleFilmLibrary = toggleFilmLibrary;
window.openBookModal = openBookModal;
window.updateBookField = updateBookField;
window.addBookTag = addBookTag;
window.removeBookTag = removeBookTag;
window.deleteGlobalTag = deleteGlobalTag;
window.toggleService = toggleService;
