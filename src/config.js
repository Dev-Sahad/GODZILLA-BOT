// config.js — Central configuration for GODZILLA by Sxhd
import 'dotenv/config';

export const config = {
  // ── Core ──────────────────────────────────────────────
  botName:    process.env.BOT_NAME    || 'GODZILLA',
  prefix:     process.env.BOT_PREFIX  || '.',
  ownerNumber: (process.env.OWNER_NUMBER || '918147120709') + '@s.whatsapp.net',
  mode:       process.env.BOT_MODE    || 'public',   // public | private | group
  cooldown:   parseInt(process.env.COOLDOWN_SECONDS || '5'),

  // ── API Keys ──────────────────────────────────────────
  spotify: {
    clientId:     process.env.SPOTIFY_CLIENT_ID     || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
  },
  wallhaven: {
    apiKey: process.env.WALLHAVEN_API_KEY || '',
  },
  rapidApi: {
    key: process.env.RAPID_API_KEY || '',
  },

  // ── Paths ─────────────────────────────────────────────
  sessionsDir: './sessions',
  tempDir:     './temp',

  // ── Bot Limits ────────────────────────────────────────
  maxVideoSizeMB:  200,
  maxAudioSizeMB:  50,
  maxImageSizeMB:  10,
};

export default config;
