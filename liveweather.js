const express = require('express');
const router = express.Router();

// Simple in-memory cache: key -> { data, expiresAt }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map();

function getCacheKey(lat, lng) {
  // Round to 2 decimals (~1.1km precision) so nearby requests share a cache entry
  const roundedLat = Number(lat).toFixed(2);
  const roundedLng = Number(lng).toFixed(2);
  return `${roundedLat},${roundedLng}`;
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// WMO Weather interpretation codes -> readable condition
const WMO_CODE_MAP = {
  0: 'sunny',
  1: 'mostly sunny',
  2: 'partly cloudy',
  3: 'cloudy',
  45: 'foggy',
  48: 'foggy',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'heavy drizzle',
  56: 'light freezing drizzle',
  57: 'freezing drizzle',
  61: 'light rain',
  63: 'rainy',
  65: 'heavy rain',
  66: 'light freezing rain',
  67: 'freezing rain',
  71: 'light snow',
  73: 'snowy',
  75: 'heavy snow',
  77: 'snow grains',
  80: 'light showers',
  81: 'showers',
  82: 'heavy showers',
  85: 'light snow showers',
  86: 'heavy snow showers',
  95: 'thunderstorm',
  96: 'thunderstorm with hail',
  99: 'severe thunderstorm with hail',
};

function mapWeatherCode(code) {
  return WMO_CODE_MAP[code] || 'unknown';
}

router.get('/get-weather', async (req, res) => {
  const { lat, lng } = req.query;

  // Validate inputs
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Both "lat" and "lng" query parameters are required.' });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return res.status(400).json({ error: '"lat" and "lng" must be valid numbers.' });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: '"lat" must be between -90 and 90, "lng" must be between -180 and 180.' });
  }

  const cacheKey = getCacheKey(latitude, longitude);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({ error: `Weather provider returned an error (status ${response.status}).` });
    }

    const data = await response.json();

    if (!data.current || !data.daily) {
      return res.status(502).json({ error: 'Unexpected response format from weather provider.' });
    }

    const result = {
      current: {
        temperature: data.current.temperature_2m,
        condition: mapWeatherCode(data.current.weather_code),
        humidity: data.current.relative_humidity,
        windSpeed: data.current.wind_speed_10m,
      },
      daily: data.daily.time.slice(0, 10).map((date, i) => ({
        date,
        maxTemp: data.daily.temperature_2m_max[i],
        minTemp: data.daily.temperature_2m_min[i],
        condition: mapWeatherCode(data.daily.weather_code[i]),
      })),
    };

    setCache(cacheKey, result);

    return res.json(result);
  } catch (err) {
    console.error('Failed to fetch weather data:', err);
    return res.status(500).json({ error: 'Failed to fetch weather data.' });
  }
});

module.exports = router;