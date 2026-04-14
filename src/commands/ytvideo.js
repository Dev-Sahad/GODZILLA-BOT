// commands/ytvideo.js — YouTube Video Download (.ytvideo / .ytmp4)
import ytdl from 'ytdl-core';
import ytSearch from 'yt-search';
import fs from 'fs-extra';
import { getTempPath, cleanupFile, formatDuration, formatBytes } from '../helpers.js';
import { config } from '../config.js';

/**
 * .ytvideo <query or URL> [quality: 360|480|720|1080]
 * Downloads video from YouTube
 */
export async function ytVideoCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;

  // Parse optional quality flag (last arg if it's a number)
  let quality = '360p';  // safe default for WhatsApp
  const lastArg = args[args.length - 1];
  const qualityMap = { '144': '144p', '360': '360p', '480': '480p', '720': '720p', '1080': '1080p' };
  if (qualityMap[lastArg]) {
    quality = qualityMap[lastArg];
    args.pop();
  }

  const query = args.join(' ').trim();

  if (!query) {
    return sock.sendMessage(jid, {
      text: `❌ *Usage:* ${config.prefix}ytvideo <name or URL> [144|360|480|720|1080]\n\nExample:\n${config.prefix}ytvideo Avengers trailer 720`,
    });
  }

  await sock.sendMessage(jid, { text: '🎬 *Searching YouTube…*' });

  try {
    let videoUrl;

    if (ytdl.validateURL(query)) {
      videoUrl = query;
    } else {
      const results = await ytSearch(query);
      const video   = results.videos[0];
      if (!video) throw new Error('No results found');
      videoUrl = video.url;
    }

    const videoInfo = await ytdl.getInfo(videoUrl);
    const details   = videoInfo.videoDetails;

    // Find format matching desired quality
    const formats = ytdl.filterFormats(videoInfo.formats, 'videoandaudio');
    let format = formats.find(f => f.qualityLabel === quality);
    if (!format) format = formats[0]; // fallback to best available combined

    const sizeMB = parseInt(format?.contentLength || 0) / (1024 * 1024);

    if (sizeMB > config.maxVideoSizeMB) {
      return sock.sendMessage(jid, {
        text: `❌ Video is too large (${sizeMB.toFixed(1)} MB). Limit: ${config.maxVideoSizeMB} MB.\nTry a lower quality: 360 or 480`,
      });
    }

    await sock.sendMessage(jid, {
      text: `⬇️ *Downloading:* ${details.title}\n📺 Quality: ${format.qualityLabel || quality}\n⏱ Duration: ${formatDuration(parseInt(details.lengthSeconds))}`,
    });

    const tempPath = await getTempPath(`ytvideo_${Date.now()}.mp4`);
    const stream   = ytdl(videoUrl, { format });

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(tempPath);
      stream.pipe(ws);
      ws.on('finish', resolve);
      ws.on('error', reject);
      stream.on('error', reject);
    });

    const stat = await fs.stat(tempPath);

    await sock.sendMessage(jid, {
      video:    { url: tempPath },
      mimetype: 'video/mp4',
      caption:  `🎬 *${details.title}*\n📺 ${format.qualityLabel || quality} | ⏱ ${formatDuration(parseInt(details.lengthSeconds))}\n💾 ${formatBytes(stat.size)}`,
    });

    await cleanupFile(tempPath);

  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Failed to download video.\n_${err.message}_`,
    });
  }
}
