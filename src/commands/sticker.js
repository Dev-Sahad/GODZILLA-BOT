// commands/sticker.js — Convert image to WhatsApp sticker

import { downloadMediaMessage } from '@whiskeysockets/baileys';
import sharp from 'sharp';
import fs from 'fs-extra';
import { getTempPath, cleanupFile } from '../helpers.js';
import { config } from '../config.js';

/**
 * .sticker — Reply to an image to convert it to a sticker
 */
export async function stickerCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;

  // Check quoted message or direct image
  const quoted  = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  const imageMsg = msg.message?.imageMessage
    || quoted?.imageMessage;

  if (!imageMsg) {
    return sock.sendMessage(jid, {
      text: `❌ *Reply to an image* with ${config.prefix}sticker\n\nExample:\n> [Reply to any image]\n> .sticker`,
    });
  }

  await sock.sendMessage(jid, { text: '🎨 *Creating sticker…*' });

  try {
    // Use Baileys exported downloadMediaMessage function
    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    );

    const inputPath  = await getTempPath(`sticker_in_${Date.now()}.jpg`);
    const outputPath = await getTempPath(`sticker_out_${Date.now()}.webp`);

    await fs.writeFile(inputPath, buffer);

    // Convert to webp sticker
    await sharp(inputPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 80 })
      .toFile(outputPath);

    await sock.sendMessage(jid, {
      sticker: await fs.readFile(outputPath),
    });

    await cleanupFile(inputPath);
    await cleanupFile(outputPath);

  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Sticker creation failed.\n_${err.message}_`,
    });
  }
}
