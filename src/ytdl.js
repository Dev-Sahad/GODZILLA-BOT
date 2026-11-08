// src/ytdl.js — Unified wrapper for @distube/ytdl-core
import { Ytdl, chooseFormat, parseVideoId } from '@distube/ytdl-core';

export const ytdlInstance = new Ytdl();

export function validateURL(url) {
  try {
    return Boolean(parseVideoId(url));
  } catch {
    return false;
  }
}

export async function getInfo(url) {
  return await ytdlInstance.getInfo(url);
}

export function download(url, options = {}) {
  return ytdlInstance.download(url, options);
}

export function filterFormats(formats, filter) {
  if (typeof filter === 'function') return formats.filter(filter);
  if (filter === 'audioonly') return formats.filter(f => !f.hasVideo && f.hasAudio);
  if (filter === 'videoonly') return formats.filter(f => f.hasVideo && !f.hasAudio);
  if (filter === 'videoandaudio') return formats.filter(f => f.hasVideo && f.hasAudio);
  return formats;
}

const ytdl = function (url, options = {}) {
  return ytdlInstance.download(url, options);
};

ytdl.getInfo = getInfo;
ytdl.download = download;
ytdl.chooseFormat = chooseFormat;
ytdl.filterFormats = filterFormats;
ytdl.validateURL = validateURL;
ytdl.parseVideoId = parseVideoId;

export { chooseFormat, parseVideoId };
export default ytdl;

