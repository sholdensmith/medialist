// Netlify function to get Spotify access token
// This keeps the client secret secure on the server side

exports.handler = async (event, context) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Spotify credentials not configured' })
    };
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Spotify auth failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=3000' // Cache for ~50 minutes
      },
      body: JSON.stringify({
        access_token: data.access_token,
        expires_in: data.expires_in
      })
    };

  } catch (error) {
    console.error('Spotify token error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get Spotify token' })
    };
  }
};
