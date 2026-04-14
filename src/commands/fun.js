// commands/fun.js — Fun commands: meme, joke, quote, lyrics, ytsearch

import axios from 'axios';
import ytSearch from 'yt-search';
import { formatDuration } from '../helpers.js';
import { config } from '../config.js';

/**
 * .joke — Random programming / general joke
 */
export async function jokeCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    const res  = await axios.get('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist', { timeout: 8000 });
    const joke = res.data;
    const text = joke.type === 'twopart'
      ? `😂 *Joke*\n\n${joke.setup}\n\n_${joke.delivery}_`
      : `😂 *Joke*\n\n${joke.joke}`;
    await sock.sendMessage(jid, { text });
  } catch {
    await sock.sendMessage(jid, { text: '😅 Failed to fetch joke. Try again!' });
  }
}

/**
 * .quote — Random inspirational quote
 */
export async function quoteCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  try {
    const res   = await axios.get('https://zenquotes.io/api/random', { timeout: 8000 });
    const quote = res.data[0];
    await sock.sendMessage(jid, {
      text: `💬 *Quote of the moment*\n\n_"${quote.q}"_\n\n— *${quote.a}*`,
    });
  } catch {
    await sock.sendMessage(jid, { text: '❌ Failed to fetch quote.' });
  }
}

/**
 * .meme — Random meme from Reddit
 */
export async function memeCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  await sock.sendMessage(jid, { text: '😂 *Fetching meme…*' });
  try {
    const subs = ['memes', 'dankmemes', 'me_irl', 'ProgrammerHumor'];
    const sub  = subs[Math.floor(Math.random() * subs.length)];
    const res  = await axios.get(`https://www.reddit.com/r/${sub}/random.json?limit=1`, {
      headers: { 'User-Agent': 'MRPBot/2.0' },
      timeout: 10000,
    });

    const post = res.data[0]?.data?.children[0]?.data;
    if (!post || !post.url) throw new Error('No meme found');

    const imageUrl = post.url;
    if (!imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) throw new Error('Not an image');

    await sock.sendMessage(jid, {
      image:   { url: imageUrl },
      caption: `😂 *${post.title}*\n👍 ${post.ups.toLocaleString()} upvotes | r/${sub}`,
    });
  } catch {
    await sock.sendMessage(jid, { text: '❌ Failed to fetch meme.' });
  }
}

/**
 * .lyrics <song name> — Get song lyrics
 */
export async function lyricsCommand(sock, msg, args) {
  const jid   = msg.key.remoteJid;
  const query = args.join(' ').trim();

  if (!query) {
    return sock.sendMessage(jid, { text: `❌ *Usage:* ${config.prefix}lyrics <song name>` });
  }

  await sock.sendMessage(jid, { text: `🎵 *Searching lyrics for:* ${query}` });

  try {
    const res  = await axios.get(`https://lyrist.vercel.app/api/${encodeURIComponent(query)}`, { timeout: 10000 });
    const data = res.data;

    if (!data.lyrics) throw new Error('Lyrics not found');

    // Truncate if too long (WhatsApp limit: ~65,000 chars)
    let lyrics = data.lyrics;
    if (lyrics.length > 4000) {
      lyrics = lyrics.slice(0, 4000) + '\n\n_...lyrics truncated_';
    }

    await sock.sendMessage(jid, {
      text: `🎵 *${data.title || query}*\n🎤 *${data.artist || 'Unknown'}*\n\n${lyrics}`,
    });
  } catch {
    await sock.sendMessage(jid, { text: `❌ Lyrics not found for "_${query}_"` });
  }
}

/**
 * .ytsearch <query> — Search YouTube without downloading
 */
export async function ytSearchCommand(sock, msg, args) {
  const jid   = msg.key.remoteJid;
  const query = args.join(' ').trim();

  if (!query) {
    return sock.sendMessage(jid, { text: `❌ *Usage:* ${config.prefix}ytsearch <query>` });
  }

  await sock.sendMessage(jid, { text: `🔍 *Searching YouTube for:* ${query}` });

  try {
    const results = await ytSearch(query);
    const videos  = results.videos.slice(0, 5);

    if (!videos.length) throw new Error('No results');

    const lines = videos.map((v, i) =>
      `*${i + 1}.* ${v.title}\n   ⏱ ${v.duration.timestamp} | 👁 ${v.views?.toLocaleString() || '?'} views\n   🔗 ${v.url}`
    );

    await sock.sendMessage(jid, {
      text: `🎬 *YouTube Search: "${query}"*\n\n${lines.join('\n\n')}\n\n_Use ${config.prefix}ytvideo <URL> to download_`,
    });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Search failed.\n_${err.message}_` });
  }
}
