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
import { restoreSession, getSessionBase64 } from './src/session.js';
import http              from 'http';
import axios             from 'axios';
import QRCode            from 'qrcode';
import { handleDashboardRequest, setLatestQr, clearLatestQr } from './src/dashboard.js';

let currentSock = null;

// ── 24/7 Keep-Alive Self-Pinger (Never sleep on Render / Koyeb / Railway) ─────
function startKeepAlive() {
  const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
  if (!externalUrl) return;

  logger.info(`⏰ 24/7 Keep-Alive active for: ${externalUrl}`);
  const target = externalUrl.endsWith('/') ? `${externalUrl}api/ping` : `${externalUrl}/api/ping`;

  setInterval(async () => {
    try {
      await axios.get(target, { timeout: 12000 });
      logger.info(`💓 24/7 Keep-Alive heartbeat sent to ${target}`);
    } catch (err) {
      logger.warn(`Keep-Alive heartbeat failed: ${err.message}`);
    }
  }, 8 * 60 * 1000); // 8 minutes (Render sleeps at 15m)
}

// ── Web Service Health & Admin Dashboard Server (Render / Railway / Cloud) ────
const PORT = process.env.PORT;
if (PORT) {
  const server = http.createServer((req, res) => {
    handleDashboardRequest(req, res, () => currentSock);
  });

  server.listen(PORT, () => {
    logger.info(`🌐 Web Admin Dashboard active on port ${PORT}`);
    startKeepAlive();
  });
}

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

  currentSock = sock;

  // ── QR Code ───────────────────────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('Scan the QR code below to link your WhatsApp:');
      qrcode.generate(qr, { small: true });
      try {
        const dataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
        setLatestQr(dataUrl);
      } catch {}
    }

    if (connection === 'open') {
      logger.info(`✅ ${config.botName} connected successfully!`);
      logger.info(`📌 Prefix: ${config.prefix} | Mode: ${config.mode}`);

      clearLatestQr();

      // Automatically deliver permanent session backup to owner
      try {
        const sessionStr = await getSessionBase64();
        await sock.sendMessage(config.ownerNumber, {
          text: `✅ *${config.botName} is now Online! 🦖*\n\n📌 Prefix: \`${config.prefix}\`\n⚙️ Mode: ${config.mode}\n\n🔐 *YOUR PERMANENT 24/7 SESSION STRING:*\n\`\`\`\n${sessionStr}\n\`\`\`\n\n📌 *To run 24/7 on Render without ever scanning QR code again:*\n1. Open your Render Dashboard.\n2. Go to Environment Variables.\n3. Add \`GODZILLA_SESSION\` with the string above.\n\nNow you can turn off your PC and the bot will stay online forever! 🚀`,
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
