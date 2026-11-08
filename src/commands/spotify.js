// commands/spotify.js — 100% Free & Open-Source Spotify Downloader (.spotify)
// Zero API keys required • Uses Spotify public oEmbed + YouTube Audio Engine

import ytSearch from 'yt-search';
import fs from 'fs-extra';
import axios from 'axios';
import ytdl from '../ytdl.js';
import { getTempPath, cleanupFile, formatBytes } from '../helpers.js';
import { config } from '../config.js';

/**
 * Open-source Spotify track metadata resolver (Zero API keys required)
 * Uses Spotify public oEmbed & open graph tags
 */
async function getOpenSpotifyTrackInfo(url) {
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await axios.get(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 8000,
    });

    const data = res.data;
    let title = data.title || '';
    let artist = '';
    let image = data.thumbnail_url;

    // Fetch page Open Graph tags for artist details
    try {
      const pageRes = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 6000,
      });
      const html = pageRes.data;
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      if (descMatch) {
        const parts = descMatch[1].split('·').map(s => s.trim());
        if (parts[0]) artist = parts[0];
      }
      const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (ogImage && !image) image = ogImage[1];
    } catch {}

    return {
      title,
      artist: artist || 'Unknown Artist',
      image,
      searchQuery: artist ? `${title} ${artist}` : title,
    };
  } catch {
    return null;
  }
}

/**
 * .spotify <Spotify track URL or song title>
 */
export async function spotifyCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const input = args.join(' ').trim();

  if (!input) {
    return sock.sendMessage(jid, {
      text: `🎧 *Usage:* ${config.prefix}spotify <Spotify track URL or song name>\n\n*Examples:*\n${config.prefix}spotify https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT\n${config.prefix}spotify Starboy The Weeknd`,
    });
  }

  await sock.sendMessage(jid, { text: '🎧 *Processing Spotify request…*' });

  try {
    let searchQuery = input;
    let trackMeta = null;

    // Check if input is a Spotify link
    if (input.includes('spotify.com/track/')) {
      await sock.sendMessage(jid, { text: '🔍 *Resolving track metadata…*' });
      trackMeta = await getOpenSpotifyTrackInfo(input);

      if (trackMeta && trackMeta.title) {
        searchQuery = `${trackMeta.title} ${trackMeta.artist}`.trim();
        await sock.sendMessage(jid, {
          text: `🎵 *Found on Spotify:*\n📌 *Title:* ${trackMeta.title}\n🎤 *Artist:* ${trackMeta.artist}`,
        });
      }
    }

    // Search audio source
    await sock.sendMessage(jid, { text: `🔍 *Matching audio for:* _${searchQuery}_…` });
    const results = await ytSearch(`${searchQuery} audio`);
    const video = results.videos[0];

    if (!video) throw new Error('Could not find matching audio source');

    const videoInfo = await ytdl.getInfo(video.url);
    const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' });

    await sock.sendMessage(jid, {
      text: `⬇️ *Downloading audio…*\n📌 Track: ${trackMeta?.title || video.title}`,
    });

    const tempPath = await getTempPath(`spotify_${Date.now()}.mp4`);
    const stream = ytdl(video.url, { format });

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(tempPath);
      stream.pipe(ws);
      ws.on('finish', resolve);
      ws.on('error', reject);
      stream.on('error', reject);
    });

    const stat = await fs.stat(tempPath);

    const caption = trackMeta
      ? `🎧 *${trackMeta.title}*\n🎤 ${trackMeta.artist}\n💾 ${formatBytes(stat.size)}\n⚡ Powered by *${config.botName}*`
      : `🎧 *${video.title}*\n💾 ${formatBytes(stat.size)}`;

    await sock.sendMessage(jid, {
      audio: { url: tempPath },
      mimetype: 'audio/mp4',
      fileName: `${trackMeta?.title || video.title}.mp4`,
      ptt: false,
    });

    await sock.sendMessage(jid, { text: caption });
    await cleanupFile(tempPath);

  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Spotify download failed.\n_${err.message}_`,
    });
  }
}
