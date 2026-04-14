// commands/owner.js — Owner-only commands (broadcast, restart, etc.)

import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * Check if sender is the owner
 */
export function isOwner(sender) {
  return sender === config.ownerNumber;
}

/**
 * .broadcast <message> — Send message to all open chats
 */
export async function broadcastCommand(sock, msg, args) {
  const jid    = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) {
    return sock.sendMessage(jid, { text: '❌ This command is *owner only*.' });
  }

  const text = args.join(' ').trim();
  if (!text) {
    return sock.sendMessage(jid, { text: `❌ *Usage:* ${config.prefix}broadcast <message>` });
  }

  try {
    const chats = await sock.groupFetchAllParticipating();
    const groupIds = Object.keys(chats);

    await sock.sendMessage(jid, { text: `📣 *Broadcasting to ${groupIds.length} groups…*` });

    let sent = 0;
    for (const groupId of groupIds) {
      try {
        await sock.sendMessage(groupId, {
          text: `📢 *Broadcast from ${config.botName}*\n\n${text}`,
        });
        sent++;
        await new Promise(r => setTimeout(r, 1000)); // 1s delay to avoid spam
      } catch (e) {
        logger.warn(`Failed to broadcast to ${groupId}: ${e.message}`);
      }
    }

    await sock.sendMessage(jid, { text: `✅ *Broadcast complete!* Sent to ${sent}/${groupIds.length} groups.` });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Broadcast failed.\n_${err.message}_` });
  }
}

/**
 * .restart — Restart the bot process
 */
export async function restartCommand(sock, msg) {
  const jid    = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) {
    return sock.sendMessage(jid, { text: '❌ This command is *owner only*.' });
  }

  await sock.sendMessage(jid, { text: '🔄 *Restarting bot…*' });
  logger.info('Restart requested by owner');
  setTimeout(() => process.exit(0), 2000);
}

/**
 * .mode <public|private|group> — Change bot mode
 */
export async function modeCommand(sock, msg, args) {
  const jid    = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) {
    return sock.sendMessage(jid, { text: '❌ Owner only.' });
  }

  const newMode = args[0]?.toLowerCase();
  if (!['public', 'private', 'group'].includes(newMode)) {
    return sock.sendMessage(jid, {
      text: `❌ *Usage:* ${config.prefix}mode <public|private|group>\n\nCurrent mode: *${config.mode}*`,
    });
  }

  config.mode = newMode;
  await sock.sendMessage(jid, {
    text: `✅ Bot mode changed to *${newMode}*`,
  });
}
