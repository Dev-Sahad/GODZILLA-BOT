// commands/spotify.js — Spotify Track Downloader (.spotify)
// Strategy: Gets track metadata from Spotify, then searches & downloads from YouTube
import ytdl from 'ytdl-core';
import ytSearch from 'yt-search';
import fs from 'fs-extra';
import axios from 'axios';
import { getTempPath, cleanupFile, formatBytes } from '../helpers.js';
import { config } from '../config.js';

// ── Spotify token cache ───────────────────────────────────────────────────────
let spotifyToken = null;
let tokenExpiry  = 0;

async function getSpotifyToken() {
  if (spotifyToken && Date.now() < tokenExpiry) return spotifyToken;
  const { clientId, clientSecret } = config.spotify;
  if (!clientId || !clientSecret) return null;

  const res = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  spotifyToken = res.data.access_token;
  tokenExpiry  = Date.now() + (res.data.expires_in - 60) * 1000;
  return spotifyToken;
}

async function getSpotifyTrackInfo(url) {
  const token   = await getSpotifyToken();
  if (!token) return null;

  // Extract track ID from URL
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  if (!match) return null;

  const res = await axios.get(`https://api.spotify.com/v1/tracks/${match[1]}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const track = res.data;
  return {
    name:    track.name,
    artist:  track.artists.map(a => a.name).join(', '),
    album:   track.album.name,
    duration: Math.round(track.duration_ms / 1000),
    image:   track.album.images[0]?.url,
  };
}

/**
 * .spotify <Spotify track URL or search query>
 */
export async function spotifyCommand(sock, msg, args) {
  const jid   = msg.key.remoteJid;
  const input = args.join(' ').trim();

  if (!input) {
    return sock.sendMessage(jid, {
      text: `❌ *Usage:* ${config.prefix}spotify <Spotify URL or song name>\n\nExamples:\n${config.prefix}spotify https://open.spotify.com/track/...\n${config.prefix}spotify Blinding Lights`,
    });
  }

  await sock.sendMessage(jid, { text: '🎧 *Processing Spotify request…*' });

  try {
    let searchQuery = input;
    let trackMeta   = null;

    // If it's a Spotify URL, extract metadata
    if (input.includes('spotify.com/track/')) {
      trackMeta = await getSpotifyTrackInfo(input);
      if (trackMeta) {
        searchQuery = `${trackMeta.name} ${trackMeta.artist}`;
        await sock.sendMessage(jid, {
          text: `🎵 *Found on Spotify:*\n🎤 ${trackMeta.name}\n👤 ${trackMeta.artist}\n💿 ${trackMeta.album}`,
        });
      }
    }

    // Search YouTube for the track
    await sock.sendMessage(jid, { text: `🔍 *Searching YouTube for:* ${searchQuery}` });
    const results = await ytSearch(searchQuery + ' audio');
    const video   = results.videos[0];
    if (!video) throw new Error('Could not find audio source');

    const videoInfo = await ytdl.getInfo(video.url);
    const format    = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' });

    await sock.sendMessage(jid, {
      text: `⬇️ *Downloading audio…*\n📌 Source: ${video.title}`,
    });

    const tempPath = await getTempPath(`spotify_${Date.now()}.mp4`);
    const stream   = ytdl(video.url, { format });

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(tempPath);
      stream.pipe(ws);
      ws.on('finish', resolve);
      ws.on('error', reject);
      stream.on('error', reject);
    });

    const stat = await fs.stat(tempPath);

    const caption = trackMeta
      ? `🎵 *${trackMeta.name}*\n🎤 ${trackMeta.artist}\n💿 ${trackMeta.album}\n💾 ${formatBytes(stat.size)}`
      : `🎵 *${video.title}*\n💾 ${formatBytes(stat.size)}`;

    await sock.sendMessage(jid, {
      audio:    { url: tempPath },
      mimetype: 'audio/mp4',
      fileName: `${trackMeta?.name || video.title}.mp4`,
      ptt:      false,
    });

    await sock.sendMessage(jid, { text: caption });
    await cleanupFile(tempPath);

  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Spotify download failed.\n_${err.message}_`,
    });
  }
}
