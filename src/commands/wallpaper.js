// commands/wallpaper.js — 4K/8K Wallpaper Downloader
// Uses Wallhaven.cc API (free tier available, no key for SFW)

import axios from 'axios';
import fs from 'fs-extra';
import { getTempPath, cleanupFile, formatBytes } from '../helpers.js';
import { config } from '../config.js';

const WALLHAVEN_API = 'https://wallhaven.cc/api/v1';

// Resolution presets
const RESOLUTIONS = {
  'hd':  '1920x1080',
  'fhd': '1920x1080',
  '2k':  '2560x1440',
  '4k':  '3840x2160',
  '8k':  '7680x4320',
  // Mobile presets
  'mobile':  '1080x1920',
  'mobile4k': '1440x2560',
};

const CATEGORY_MAP = {
  nature:    '100',
  anime:     '010',
  general:   '100',
  dark:      '100',
  minimal:   '100',
  car:       '100',
  city:      '100',
  space:     '100',
  abstract:  '100',
};

/**
 * .wall <query> [4k|8k|mobile|2k]
 * .wallmobile <query>
 * .wallpc <query> [4k|8k]
 */
export async function wallpaperCommand(sock, msg, args, type = 'pc') {
  const jid = msg.key.remoteJid;

  // Parse quality from last arg
  let resolution = type === 'mobile' ? '1080x1920' : '1920x1080';
  const lastArg  = args[args.length - 1]?.toLowerCase();
  if (RESOLUTIONS[lastArg]) {
    resolution = RESOLUTIONS[lastArg];
    args.pop();
  } else if (type === 'mobile') {
    resolution = '1080x1920';
  } else if (type === 'pc4k') {
    resolution = '3840x2160';
  }

  const query = args.join(' ').trim() || 'nature';

  if (!query && args.length === 0) {
    return sock.sendMessage(jid, {
      text: `❌ *Usage:* ${config.prefix}wall <theme> [quality]\n\n*Examples:*\n${config.prefix}wall nature 4k\n${config.prefix}wall anime mobile\n${config.prefix}wall dark city 8k\n${config.prefix}wallmobile space\n${config.prefix}wallpc minimal 4k\n\n*Qualities:* hd, 2k, 4k, 8k, mobile`,
    });
  }

  const ratioParam = type === 'mobile' ? 'portrait' : 'landscape';
  const isMobile   = type === 'mobile';

  await sock.sendMessage(jid, {
    text: `🖼️ *Searching ${isMobile ? '📱 Mobile' : '🖥️ PC'} wallpapers…*\nQuery: _${query}_\nResolution: _${resolution}_`,
  });

  try {
    // Build Wallhaven search URL
    const params = new URLSearchParams({
      q:          query,
      categories: '100',        // general, anime, people flags
      purity:     '100',        // sfw only
      sorting:    'relevance',
      order:      'desc',
      resolutions: resolution,
    });

    if (config.wallhaven.apiKey) params.set('apikey', config.wallhaven.apiKey);

    const res = await axios.get(`${WALLHAVEN_API}/search?${params}`, { timeout: 10000 });
    const wallpapers = res.data?.data;

    if (!wallpapers || wallpapers.length === 0) {
      // Fallback: search without resolution filter
      params.delete('resolutions');
      const fallbackRes = await axios.get(`${WALLHAVEN_API}/search?${params}`, { timeout: 10000 });
      const fallback = fallbackRes.data?.data;

      if (!fallback || fallback.length === 0) {
        throw new Error(`No wallpapers found for "${query}"`);
      }
      wallpapers.push(...fallback);
    }

    // Pick a random wallpaper from top 10 results
    const pick = wallpapers[Math.floor(Math.random() * Math.min(wallpapers.length, 10))];
    const imgUrl = pick.path;

    await sock.sendMessage(jid, { text: `⬇️ *Downloading wallpaper…*\n📐 ${pick.resolution}` });

    // Download image
    const tempPath = await getTempPath(`wall_${Date.now()}.jpg`);
    const imgRes   = await axios.get(imgUrl, { responseType: 'stream', timeout: 60000 });
    const ws = fs.createWriteStream(tempPath);

    await new Promise((resolve, reject) => {
      imgRes.data.pipe(ws);
      ws.on('finish', resolve);
      ws.on('error', reject);
    });

    const stat = await fs.stat(tempPath);

    await sock.sendMessage(jid, {
      image:   { url: tempPath },
      mimetype: 'image/jpeg',
      caption:  `🖼️ *${query.charAt(0).toUpperCase() + query.slice(1)} Wallpaper*\n${isMobile ? '📱 Mobile' : '🖥️ PC'} | 📐 ${pick.resolution}\n💾 ${formatBytes(stat.size)}\n🔗 ${pick.url}`,
    });

    await cleanupFile(tempPath);

  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Wallpaper fetch failed.\n_${err.message}_`,
    });
  }
}

// Separate mobile wallpaper shortcut
export async function wallMobileCommand(sock, msg, args) {
  return wallpaperCommand(sock, msg, args, 'mobile');
}

// PC 4K shortcut
export async function wallPCCommand(sock, msg, args) {
  return wallpaperCommand(sock, msg, args, 'pc4k');
}
