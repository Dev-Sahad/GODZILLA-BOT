// src/session.js — Session backup & restore via environment variable
// Encodes sessions/ folder to base64 string → paste as GODZILLA_SESSION in Render / Railway
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

  if (!sessionData || !sessionData.trim()) return false;

  const alreadyExists = await fs.pathExists(path.join(SESSIONS_DIR, 'creds.json'));
  if (alreadyExists) {
    logger.info('Session already exists locally, skipping restore.');
    return true;
  }

  try {
    logger.info('🔄 Restoring WhatsApp session from environment variable...');
    const decoded = Buffer.from(sessionData.trim(), 'base64').toString('utf-8');
    const files = JSON.parse(decoded);

    await fs.ensureDir(SESSIONS_DIR);

    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(SESSIONS_DIR, filename);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf-8');
    }

    logger.info(`✅ WhatsApp session restored! (${Object.keys(files).length} files) — No QR scan needed!`);
    return true;

  } catch (err) {
    logger.error('Failed to restore session:', err.message);
    return false;
  }
}

/**
 * Get current session as a Base64 string programmatically
 */
export async function getSessionBase64() {
  const credsPath = path.join(SESSIONS_DIR, 'creds.json');
  const exists = await fs.pathExists(credsPath);
  if (!exists) return null;

  try {
    const files = {};
    const items = await fs.readdir(SESSIONS_DIR);

    for (const item of items) {
      const filePath = path.join(SESSIONS_DIR, item);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        files[item] = await fs.readFile(filePath, 'utf-8');
      }
    }

    if (Object.keys(files).length === 0) return null;
    return Buffer.from(JSON.stringify(files)).toString('base64');
  } catch {
    return null;
  }
}

/**
 * Export current sessions/ folder as a base64 string to console
 * Run: node src/session.js export
 */
export async function exportSession() {
  const encoded = await getSessionBase64();
  if (!encoded) {
    console.log('❌ No valid sessions/creds.json found. Run the bot and scan QR first.');
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  SESSION EXPORT SUCCESSFUL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Copy this ENTIRE string and paste it as:');
  console.log('   GODZILLA_SESSION=<paste here>\n');
  console.log('   In your Render / Railway dashboard Environment Variables\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(encoded);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run directly: node src/session.js export
if (process.argv[2] === 'export') {
  exportSession();
}
