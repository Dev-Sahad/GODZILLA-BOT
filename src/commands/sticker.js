// commands/sticker.js — Convert image/video to WhatsApp sticker
// Uses sharp for images, @ffmpeg-installer for animated stickers

import sharp from 'sharp';
import fs from 'fs-extra';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { getTempPath, cleanupFile } from '../helpers.js';
import { config } from '../config.js';

ffmpeg.setFfmpegPath(ffmpegPath.path);

/**
 * .sticker — Reply to an image/video to convert it to a sticker
 * .stickerpack <author> <name> — Custom pack info
 */
export async function stickerCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    || msg.message;

  const imageMsg = quoted?.imageMessage;
  const videoMsg = quoted?.videoMessage;
  const stickerMsg = quoted?.stickerMessage;

  if (!imageMsg && !videoMsg) {
    return sock.sendMessage(jid, {
      text: `❌ *Reply to an image or short video* with ${config.prefix}sticker\n\nExample:\n> [Reply to image]\n> .sticker`,
    });
  }

  await sock.sendMessage(jid, { text: '🎨 *Creating sticker…*' });

  try {
    // Download media
    const stream = await sock.downloadMediaMessage(
      { message: quoted, key: msg.key },
    );

    const inputPath  = await getTempPath(`sticker_in_${Date.now()}${imageMsg ? '.jpg' : '.mp4'}`);
    const outputPath = await getTempPath(`sticker_out_${Date.now()}.webp`);

    await fs.writeFile(inputPath, stream);

    if (imageMsg) {
      // Static sticker — resize to 512x512
      await sharp(inputPath)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80 })
        .toFile(outputPath);
    } else {
      // Animated sticker from video (max 3s)
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .inputOptions(['-t', '3'])
          .outputOptions([
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
            '-loop', '0',
            '-an',
            '-vsync', '0',
          ])
          .format('webp')
          .on('end', resolve)
          .on('error', reject)
          .save(outputPath);
      });
    }

    const packName   = args[1] || 'GODZILLA';
    const authorName = args[0] || 'Sxhd';

    await sock.sendMessage(jid, {
      sticker: { url: outputPath },
      mimetype: 'image/webp',
      stickerMetadata: { packName, authorName },
    });

    await cleanupFile(inputPath);
    await cleanupFile(outputPath);

  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Sticker creation failed.\n_${err.message}_` });
  }
}
