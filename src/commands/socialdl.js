// commands/socialdl.js — Social Media Video Downloader
// Supports: Instagram, TikTok, Facebook, Twitter/X, Pinterest
// Uses: cobalt.tools API (free, no key needed)

import axios from 'axios';
import fs from 'fs-extra';
import { getTempPath, cleanupFile, formatBytes } from '../helpers.js';
import { config } from '../config.js';

const COBALT_API = 'https://api.cobalt.tools/api/json';

const SUPPORTED_PLATFORMS = {
  instagram: ['instagram.com'],
  tiktok:    ['tiktok.com', 'vm.tiktok.com'],
  facebook:  ['facebook.com', 'fb.watch', 'fb.com'],
  twitter:   ['twitter.com', 'x.com', 't.co'],
  pinterest: ['pinterest.com', 'pin.it'],
  reddit:    ['reddit.com', 'redd.it'],
  youtube:   ['youtube.com', 'youtu.be'],
};

function detectPlatform(url) {
  for (const [platform, domains] of Object.entries(SUPPORTED_PLATFORMS)) {
    if (domains.some(d => url.includes(d))) return platform;
  }
  return 'unknown';
}

function getPlatformEmoji(platform) {
  const emojis = {
    instagram: '📸', tiktok: '🎵', facebook: '👤',
    twitter: '🐦', pinterest: '📌', reddit: '🤖', youtube: '▶️',
  };
  return emojis[platform] || '🌐';
}

/**
 * .sdl <URL>  — Social media video/reel/short downloader
 */
export async function socialDlCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const url = args[0]?.trim();

  if (!url || !url.startsWith('http')) {
    return sock.sendMessage(jid, {
      text: `❌ *Usage:* ${config.prefix}sdl <URL>\n\n*Supported:*\n📸 Instagram Reels/Posts\n🎵 TikTok Videos\n👤 Facebook Videos\n🐦 Twitter/X Videos\n📌 Pinterest Videos\n🤖 Reddit Videos\n▶️ YouTube (short clips)`,
    });
  }

  const platform = detectPlatform(url);
  const emoji    = getPlatformEmoji(platform);

  await sock.sendMessage(jid, {
    text: `${emoji} *Fetching ${platform.charAt(0).toUpperCase() + platform.slice(1)} video…*`,
  });

  try {
    // Use cobalt.tools — free, open-source media downloader API
    const response = await axios.post(
      COBALT_API,
      { url, vCodec: 'h264', vQuality: '720', aFormat: 'mp3', isAudioOnly: false },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept:         'application/json',
        },
        timeout: 30000,
      }
    );

    const data = response.data;

    if (data.status === 'error') {
      throw new Error(data.text || 'Download failed');
    }

    if (data.status === 'stream' || data.status === 'redirect') {
      const videoUrl  = data.url;
      const tempPath  = await getTempPath(`social_${Date.now()}.mp4`);

      // Download the file
      const videoRes = await axios.get(videoUrl, { responseType: 'stream', timeout: 60000 });
      const ws = fs.createWriteStream(tempPath);

      await new Promise((resolve, reject) => {
        videoRes.data.pipe(ws);
        ws.on('finish', resolve);
        ws.on('error', reject);
      });

      const stat = await fs.stat(tempPath);

      if (stat.size > config.maxVideoSizeMB * 1024 * 1024) {
        await cleanupFile(tempPath);
        throw new Error(`File too large (${formatBytes(stat.size)}). Max: ${config.maxVideoSizeMB} MB`);
      }

      await sock.sendMessage(jid, {
        video:   { url: tempPath },
        mimetype: 'video/mp4',
        caption: `${emoji} Downloaded via GODZILLA by Sxhd\n🔗 ${url}\n💾 ${formatBytes(stat.size)}`,
      });

      await cleanupFile(tempPath);

    } else if (data.status === 'picker') {
      // Multiple media items (e.g. Instagram carousel)
      const items = data.picker.slice(0, 4); // Max 4
      await sock.sendMessage(jid, {
        text: `📦 *Found ${data.picker.length} media items.* Sending first ${items.length}…`,
      });

      for (const item of items) {
        const tempPath = await getTempPath(`social_item_${Date.now()}.mp4`);
        const res = await axios.get(item.url, { responseType: 'stream', timeout: 30000 });
        const ws  = fs.createWriteStream(tempPath);

        await new Promise((resolve, reject) => {
          res.data.pipe(ws);
          ws.on('finish', resolve);
          ws.on('error', reject);
        });

        const isVideo = item.type === 'video';
        if (isVideo) {
          await sock.sendMessage(jid, { video: { url: tempPath }, mimetype: 'video/mp4' });
        } else {
          await sock.sendMessage(jid, { image: { url: tempPath }, mimetype: 'image/jpeg' });
        }
        await cleanupFile(tempPath);
      }
    }

  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Download failed.\n_${err.message}_\n\n_Tip: Make sure the link is public and accessible._`,
    });
  }
}
