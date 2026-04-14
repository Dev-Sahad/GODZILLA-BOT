// commands/ytmusic.js — YouTube Music Download (.ytmusic / .ytmp3)
import ytdl from 'ytdl-core';
import ytSearch from 'yt-search';
import fs from 'fs-extra';
import { getTempPath, cleanupFile, formatDuration, formatBytes } from '../helpers.js';
import { config } from '../config.js';

/**
 * .ytmusic <query or URL>
 * Downloads audio from YouTube as MP3
 */
export async function ytMusicCommand(sock, msg, args) {
  const jid   = msg.key.remoteJid;
  const query = args.join(' ').trim();

  if (!query) {
    return sock.sendMessage(jid, {
      text: `❌ *Usage:* ${config.prefix}ytmusic <song name or YouTube URL>`,
    });
  }

  await sock.sendMessage(jid, { text: '🎵 *Searching YouTube…*' });

  try {
    let videoUrl;
    let videoInfo;

    // Detect if query is already a YouTube URL
    if (ytdl.validateURL(query)) {
      videoUrl = query;
    } else {
      const results = await ytSearch(query);
      const video   = results.videos[0];
      if (!video) throw new Error('No results found');
      videoUrl = video.url;
    }

    videoInfo = await ytdl.getInfo(videoUrl);
    const details = videoInfo.videoDetails;

    // Pick best audio-only format
    const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' });
    const sizeMB  = parseInt(format.contentLength || 0) / (1024 * 1024);

    if (sizeMB > config.maxAudioSizeMB) {
      return sock.sendMessage(jid, {
        text: `❌ File too large (${sizeMB.toFixed(1)} MB). Limit: ${config.maxAudioSizeMB} MB`,
      });
    }

    await sock.sendMessage(jid, {
      text: `⬇️ *Downloading:* ${details.title}\n⏱ Duration: ${formatDuration(parseInt(details.lengthSeconds))}\n👁 Views: ${parseInt(details.viewCount).toLocaleString()}`,
    });

    const tempPath = await getTempPath(`ytmusic_${Date.now()}.mp4`);
    const stream   = ytdl(videoUrl, { format });

    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempPath);
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      stream.on('error', reject);
    });

    const stat = await fs.stat(tempPath);

    await sock.sendMessage(jid, {
      audio:    { url: tempPath },
      mimetype: 'audio/mp4',
      fileName: `${details.title}.mp4`,
      ptt:      false,
    });

    await sock.sendMessage(jid, {
      text: `✅ *${details.title}*\n🎤 ${details.author.name}\n💾 Size: ${formatBytes(stat.size)}`,
    });

    await cleanupFile(tempPath);

  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Failed to download music.\n_${err.message}_`,
    });
  }
}
