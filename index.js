// index.js — GODZILLA by Sxhd Entry Point
// Framework: @whiskeysockets/baileys (WhatsApp Web API)

import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} from '@whiskeysockets/baileys';
import { Boom }       from '@hapi/boom';
import fs             from 'fs-extra';
import qrcode         from 'qrcode-terminal';
import 'dotenv/config';

import { config }        from './src/config.js';
import { logger }        from './src/logger.js';
import { handleMessage } from './src/handler.js';
import { restoreSession } from './src/session.js';

// ── Ensure required directories exist ────────────────────────────────────────
await fs.ensureDir(config.sessionsDir);
await fs.ensureDir(config.tempDir);

// ── Main connection function ──────────────────────────────────────────────────
async function connectBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionsDir);
  const { version }          = await fetchLatestBaileysVersion();

  logger.info(`Starting ${config.botName} — Baileys v${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, logger.child({ level: 'silent' })),
    },
    logger:          logger.child({ level: 'silent' }), // suppress noisy logs
    browser:         Browsers.ubuntu('Chrome'),
    printQRInTerminal: false, // we handle QR ourselves
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
  });

  // ── QR Code ───────────────────────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('Scan the QR code below to link your WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      logger.info(`✅ ${config.botName} connected successfully!`);
      logger.info(`📌 Prefix: ${config.prefix} | Mode: ${config.mode}`);

      // Send startup message to owner
      try {
        await sock.sendMessage(config.ownerNumber, {
          text: `✅ *${config.botName} is now Online!*\n\n📌 Prefix: \`${config.prefix}\`\n⚙️ Mode: ${config.mode}\n\n_Type ${config.prefix}help to see all commands_`,
        });
      } catch {}
    }

    if (connection === 'close') {
      // Try to extract a numeric reason code, but fall back to message checks
      const boomReason = lastDisconnect?.error ? new Boom(lastDisconnect.error) : null;
      const reasonCode = boomReason?.output?.statusCode || lastDisconnect?.status || null;
      const reasonMsg  = lastDisconnect?.error?.message || boomReason?.message || '';

      logger.warn(`Connection closed. Reason code: ${reasonCode} message: ${reasonMsg}`);

      // If WhatsApp reports a 'conflict' (connection replaced), stop reconnecting
      if (String(reasonMsg).toLowerCase().includes('conflict') || reasonCode === 440) {
        logger.error('Session conflict detected (another session replaced this one). Exiting to avoid reconnect loop.');
        process.exit(1);
      }

      // Reconnect logic with a small backoff to avoid tight loops
      if (reasonCode === DisconnectReason.badSession) {
        logger.error('Bad session — deleting session and restarting…');
        await fs.remove(config.sessionsDir);
        setTimeout(connectBot, 3000);
      } else if (
        reasonCode === DisconnectReason.connectionClosed    ||
        reasonCode === DisconnectReason.connectionLost      ||
        reasonCode === DisconnectReason.connectionReplaced  ||
        reasonCode === DisconnectReason.timedOut
      ) {
        logger.info('Reconnecting…');
        setTimeout(connectBot, 3000);
      } else if (reasonCode === DisconnectReason.loggedOut) {
        logger.error('Logged out — delete the sessions folder and restart.');
        process.exit(1);
      } else {
        logger.warn(`Unknown disconnect reason ${reasonCode}. Reconnecting with backoff…`);
        setTimeout(connectBot, 3000);
      }
    }
  });

  // ── Save credentials ──────────────────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Messages ──────────────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message) continue;
      await handleMessage(sock, msg);
    }
  });

  return sock;
}

// ── Handle uncaught errors ────────────────────────────────────────────────────
process.on('uncaughtException',  (err) => logger.error('Uncaught:', err));
process.on('unhandledRejection', (err) => logger.error('Unhandled:', err));

// ── Start ─────────────────────────────────────────────────────────────────────
await restoreSession(); // restore from GODZILLA_SESSION env var if available
connectBot();
