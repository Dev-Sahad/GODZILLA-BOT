// commands/wallpaper.js — 100% Free & Open-Source Wallpaper Downloader
// Searches high-res 4K/8K and Mobile wallpapers without any API keys

import axios from 'axios';
import fs from 'fs-extra';
import { getTempPath, cleanupFile, formatBytes } from '../helpers.js';
import { config } from '../config.js';

const RESOLUTIONS = {
  'hd':  '1920x1080',
  'fhd': '1920x1080',
  '2k':  '2560x1440',
  '4k':  '3840x2160',
  '8k':  '7680x4320',
  'mobile':  '1080x1920',
  'mobile4k': '1440x2560',
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchFromRedditWallpapers(query, isMobile) {
  try {
    const sub = isMobile ? 'iWallpaper' : 'wallpaper';
    const res = await axios.get(
      `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=top&limit=25`,
      { headers: { 'User-Agent': 'GodzillaBot/2.0' }, timeout: 8000 }
    );
    const posts = res.data?.data?.children || [];
    const valid = posts
      .map(p => p.data)
      .filter(p => p && p.url && p.url.match(/\.(jpg|jpeg|png)$/i));

    if (valid.length > 0) {
      const pick = valid[Math.floor(Math.random() * valid.length)];
      return {
        url: pick.url,
        resolution: isMobile ? '1080x1920 (Mobile)' : '4K Ultra HD',
        source: `r/${sub}`,
      };
    }
  } catch {}
  return null;
}

export async function wallpaperCommand(sock, msg, args, type = 'pc') {
  const jid = msg.key.remoteJid;

  let resolution = type === 'mobile' ? '1080x1920' : '1920x1080';
  const lastArg = args[args.length - 1]?.toLowerCase();
  if (RESOLUTIONS[lastArg]) {
    resolution = RESOLUTIONS[lastArg];
    args.pop();
  } else if (type === 'mobile') {
    resolution = '1080x1920';
  } else if (type === 'pc4k') {
    resolution = '3840x2160';
  }

  const query = args.join(' ').trim() || 'nature';
  const isMobile = type === 'mobile';

  await sock.sendMessage(jid, {
    text: `🖼️ *Searching ${isMobile ? '📱 Mobile' : '🖥️ PC'} wallpapers…*\nQuery: _${query}_\nResolution: _${resolution}_`,
  });

  try {
    let imgUrl = null;
    let resLabel = resolution;
    let sourceLink = '';

    // 1. Try public Wallhaven search (zero API key needed for SFW)
    try {
      const params = new URLSearchParams({
        q: query,
        categories: '111',
        purity: '100',
        sorting: 'relevance',
        order: 'desc',
        resolutions: resolution,
      });

      const res = await axios.get(`https://wallhaven.cc/api/v1/search?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 10000,
      });

      let list = res.data?.data || [];
      if (list.length === 0) {
        params.delete('resolutions');
        const fallback = await axios.get(`https://wallhaven.cc/api/v1/search?${params}`, {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 8000,
        });
        list = fallback.data?.data || [];
      }

      if (list.length > 0) {
        const pick = list[Math.floor(Math.random() * Math.min(list.length, 10))];
        imgUrl = pick.path;
        resLabel = pick.resolution;
        sourceLink = pick.url;
      }
    } catch {}

    // 2. Open-source fallback: Reddit HD Wallpapers
    if (!imgUrl) {
      const redditPick = await fetchFromRedditWallpapers(query, isMobile);
      if (redditPick) {
        imgUrl = redditPick.url;
        resLabel = redditPick.resolution;
        sourceLink = `Reddit ${redditPick.source}`;
      }
    }

    if (!imgUrl) {
      throw new Error(`No wallpapers found for "${query}". Try another keyword.`);
    }

    await sock.sendMessage(jid, { text: `⬇️ *Downloading wallpaper…*\n📐 Resolution: ${resLabel}` });

    const tempPath = await getTempPath(`wall_${Date.now()}.jpg`);
    const imgRes = await axios.get(imgUrl, { responseType: 'stream', timeout: 45000 });
    const ws = fs.createWriteStream(tempPath);

    await new Promise((resolve, reject) => {
      imgRes.data.pipe(ws);
      ws.on('finish', resolve);
      ws.on('error', reject);
    });

    const stat = await fs.stat(tempPath);

    await sock.sendMessage(jid, {
      image: { url: tempPath },
      mimetype: 'image/jpeg',
      caption: `🖼️ *${query.toUpperCase()} WALLPAPER*\n\n📐 Resolution: *${resLabel}*\n📱 Format: *${isMobile ? 'Mobile Portrait' : 'Desktop 4K'}*\n💾 Size: *${formatBytes(stat.size)}*\n${sourceLink ? `🔗 ${sourceLink}` : ''}`,
    });

    await cleanupFile(tempPath);

  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Wallpaper fetch failed.\n_${err.message}_`,
    });
  }
}

export async function wallMobileCommand(sock, msg, args) {
  return wallpaperCommand(sock, msg, args, 'mobile');
}

export async function wallPCCommand(sock, msg, args) {
  return wallpaperCommand(sock, msg, args, 'pc4k');
}
