// commands/weather.js — Weather info via Open-Meteo (free, no key needed)
// Geocoding via nominatim.openstreetmap.org

import axios from 'axios';
import { config } from '../config.js';

const WMO_CODES = {
  0: '☀️ Clear sky', 1: '🌤️ Mainly clear', 2: '⛅ Partly cloudy', 3: '☁️ Overcast',
  45: '🌫️ Foggy', 48: '🌫️ Icy fog',
  51: '🌦️ Light drizzle', 53: '🌦️ Moderate drizzle', 55: '🌧️ Dense drizzle',
  61: '🌧️ Slight rain', 63: '🌧️ Moderate rain', 65: '🌧️ Heavy rain',
  71: '❄️ Slight snow', 73: '❄️ Moderate snow', 75: '❄️ Heavy snow',
  80: '🌦️ Rain showers', 81: '🌧️ Moderate showers', 82: '⛈️ Violent showers',
  95: '⛈️ Thunderstorm', 96: '⛈️ Thunderstorm w/ hail', 99: '⛈️ Heavy thunderstorm',
};

/**
 * .weather <city name>
 */
export async function weatherCommand(sock, msg, args) {
  const jid  = msg.key.remoteJid;
  const city = args.join(' ').trim();

  if (!city) {
    return sock.sendMessage(jid, {
      text: `❌ *Usage:* ${config.prefix}weather <city>\n\nExample: ${config.prefix}weather Mumbai`,
    });
  }

  await sock.sendMessage(jid, { text: `🌍 *Fetching weather for ${city}…*` });

  try {
    // Geocode city name
    const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: city, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'GodzillaBot/2.0' },
      timeout: 8000,
    });

    if (!geoRes.data.length) throw new Error(`City "${city}" not found`);

    const { lat, lon, display_name } = geoRes.data[0];

    // Fetch weather
    const weatherRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat, longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation',
        daily: 'temperature_2m_max,temperature_2m_min,weather_code',
        timezone: 'auto',
        forecast_days: 4,
      },
      timeout: 8000,
    });

    const c = weatherRes.data.current;
    const d = weatherRes.data.daily;
    const condition = WMO_CODES[c.weather_code] || '🌡️ Unknown';

    // Build 3-day forecast
    const forecast = d.time.slice(1, 4).map((date, i) => {
      const day = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      const cond = (WMO_CODES[d.weather_code[i + 1]] || '').split(' ').slice(0, 2).join(' ');
      return `  ${day}: ${cond} ${d.temperature_2m_max[i + 1]}°/${d.temperature_2m_min[i + 1]}°C`;
    }).join('\n');

    await sock.sendMessage(jid, {
      text: `🌤️ *Weather — ${display_name.split(',').slice(0, 2).join(',')}*\n\n` +
        `${condition}\n` +
        `🌡️ Temp: *${c.temperature_2m}°C* (feels ${c.apparent_temperature}°C)\n` +
        `💧 Humidity: *${c.relative_humidity_2m}%*\n` +
        `🌧️ Precipitation: *${c.precipitation} mm*\n` +
        `💨 Wind: *${c.wind_speed_10m} km/h*\n\n` +
        `📅 *3-Day Forecast:*\n${forecast}`,
    });

  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Weather fetch failed.\n_${err.message}_` });
  }
}
