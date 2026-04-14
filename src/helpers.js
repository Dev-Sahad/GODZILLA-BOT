// helpers.js — Shared utility functions
import NodeCache from 'node-cache';
import fs from 'fs-extra';
import path from 'path';
import { config } from './config.js';

// ── Cooldown cache (TTL = cooldown seconds) ───────────────────────────────────
export const cooldownCache = new NodeCache({ stdTTL: config.cooldown });

/**
 * Check if a user is on cooldown for a command.
 * Returns true if they should be blocked.
 */
export function isOnCooldown(userId, command) {
  const key = `${userId}:${command}`;
  if (cooldownCache.has(key)) return true;
  cooldownCache.set(key, true);
  return false;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/**
 * Format seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

/**
 * Ensure temp directory exists and return a temp file path
 */
export async function getTempPath(filename) {
  await fs.ensureDir(config.tempDir);
  return path.join(config.tempDir, filename);
}

/**
 * Delete a file silently (no throw)
 */
export async function cleanupFile(filePath) {
  try { await fs.remove(filePath); } catch {}
}

/**
 * Sleep for ms milliseconds
 */
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Extract sender JID from message
 */
export function getSender(msg) {
  return msg.key.fromMe
    ? msg.key.remoteJid
    : (msg.key.participant || msg.key.remoteJid);
}

/**
 * Get display name of sender
 */
export function getDisplayName(msg) {
  return msg.pushName || 'User';
}

/**
 * Is the message from a group?
 */
export function isGroup(msg) {
  return msg.key.remoteJid?.endsWith('@g.us');
}

/**
 * Get text content of a message
 */
export function getMessageText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  );
}
