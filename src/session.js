// src/session.js — Session backup & restore via environment variable
// Encodes sessions/ folder to base64 string → paste as GODZILLA_SESSION in .env
// On startup, if GODZILLA_SESSION exists, restores sessions/ automatically

import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';

const SESSIONS_DIR = './sessions';
const SESSION_ENV  = 'GODZILLA_SESSION';

/**
 * On startup — restore session from env variable if sessions/ doesn't exist
 */
export async function restoreSession() {
  const sessionData = process.env[SESSION_ENV];

  if (!sessionData) return false; // no session env var, normal first run

  const alreadyExists = await fs.pathExists(path.join(SESSIONS_DIR, 'creds.json'));
  if (alreadyExists) {
    logger.info('Session already exists locally, skipping restore.');
    return true;
  }

  try {
    logger.info('🔄 Restoring session from environment variable...');
    const decoded = Buffer.from(sessionData, 'base64').toString('utf-8');
    const files   = JSON.parse(decoded);

    await fs.ensureDir(SESSIONS_DIR);

    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(SESSIONS_DIR, filename);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf-8');
    }

    logger.info(`✅ Session restored! (${Object.keys(files).length} files)`);
    return true;

  } catch (err) {
    logger.error('Failed to restore session:', err.message);
    return false;
  }
}

/**
 * Export current sessions/ folder as a base64 string
 * Run: node src/session.js export
 */
export async function exportSession() {
  const exists = await fs.pathExists(SESSIONS_DIR);
  if (!exists) {
    console.log('❌ No sessions/ folder found. Run the bot and scan QR first.');
    process.exit(1);
  }

  const files  = {};
  const items  = await fs.readdir(SESSIONS_DIR);

  for (const item of items) {
    const filePath = path.join(SESSIONS_DIR, item);
    const stat     = await fs.stat(filePath);
    if (stat.isFile()) {
      files[item] = await fs.readFile(filePath, 'utf-8');
    }
  }

  const encoded = Buffer.from(JSON.stringify(files)).toString('base64');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  SESSION EXPORT SUCCESSFUL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Copy this ENTIRE string and paste it as:');
  console.log('   GODZILLA_SESSION=<paste here>\n');
  console.log('   In your .env file OR Render dashboard env vars\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(encoded);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run directly: node src/session.js export
if (process.argv[2] === 'export') {
  exportSession();
}
