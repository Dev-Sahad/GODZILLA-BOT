// launcher.js — GODZILLA Auto-Restart Launcher
// Keeps the bot alive 24/7 by watching the process and restarting on crash
// Usage: node launcher.js

import { spawn }   from 'child_process';
import fs          from 'fs';
import path        from 'path';

const BOT_SCRIPT    = 'index.js';
const LOG_FILE      = './godzilla.log';
const MAX_RESTARTS  = 10;       // max restarts in the window
const RESET_WINDOW  = 60000;    // 1 minute window
const MIN_UPTIME    = 5000;     // if bot dies in <5s, count as crash

let restartCount  = 0;
let lastResetTime = Date.now();
let botProcess    = null;

const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(msg) {
  const timestamp = new Date().toLocaleTimeString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

function startBot() {
  const startTime = Date.now();
  log('🦖 Starting GODZILLA bot...');

  botProcess = spawn('node', [BOT_SCRIPT], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });

  // Pipe output to console + log file
  botProcess.stdout?.on('data', (data) => {
    process.stdout.write(data);
    logStream.write(data);
  });

  botProcess.stderr?.on('data', (data) => {
    process.stderr.write(data);
    logStream.write(data);
  });

  botProcess.on('exit', (code, signal) => {
    const uptime = Date.now() - startTime;

    if (code === 0) {
      log('✅ Bot exited cleanly (code 0). Restarting...');
    } else {
      log(`⚠️  Bot crashed! Code: ${code} | Signal: ${signal} | Uptime: ${(uptime/1000).toFixed(1)}s`);
    }

    // Reset crash counter every RESET_WINDOW ms
    if (Date.now() - lastResetTime > RESET_WINDOW) {
      restartCount = 0;
      lastResetTime = Date.now();
    }

    restartCount++;

    if (restartCount > MAX_RESTARTS) {
      log(`❌ Too many restarts (${restartCount}) in 1 minute. Waiting 30s before retry...`);
      setTimeout(() => {
        restartCount = 0;
        startBot();
      }, 30000);
      return;
    }

    // Short delay before restart
    const delay = uptime < MIN_UPTIME ? 5000 : 2000;
    log(`🔄 Restarting in ${delay/1000}s... (restart #${restartCount})`);
    setTimeout(startBot, delay);
  });

  botProcess.on('error', (err) => {
    log(`❌ Failed to start bot: ${err.message}`);
    setTimeout(startBot, 5000);
  });
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  log('🛑 Launcher received SIGINT. Shutting down...');
  if (botProcess) botProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Launcher received SIGTERM. Shutting down...');
  if (botProcess) botProcess.kill('SIGTERM');
  process.exit(0);
});

// ── Start ─────────────────────────────────────────────────────────────────────
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('  🦖  GODZILLA Bot Launcher v2.0');
log('  by Sxhd — 24/7 Auto-Restart');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

startBot();
