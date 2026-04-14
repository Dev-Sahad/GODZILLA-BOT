// commands/group.js — Group admin commands
// kick, add, promote, demote, mute, unmute, antilink, welcome

import { config } from '../config.js';

async function isGroupAdmin(sock, jid, participant) {
  try {
    const metadata = await sock.groupMetadata(jid);
    return metadata.participants.some(
      p => p.id === participant && (p.admin === 'admin' || p.admin === 'superadmin')
    );
  } catch { return false; }
}

async function isBotAdmin(sock, jid) {
  try {
    const metadata = await sock.groupMetadata(jid);
    const botId = sock.user?.id;
    return metadata.participants.some(
      p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin')
    );
  } catch { return false; }
}

function requireAdmin(sock, msg, jid, sender) {
  return isGroupAdmin(sock, jid, sender);
}

/**
 * .kick @user — Remove a member from the group
 */
export async function kickCommand(sock, msg, args) {
  const jid    = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) {
    return sock.sendMessage(jid, { text: '❌ This command works only in groups.' });
  }

  const isAdmin = await requireAdmin(sock, msg, jid, sender);
  if (!isAdmin) return sock.sendMessage(jid, { text: '❌ You need to be a group admin.' });

  const botAdmin = await isBotAdmin(sock, jid);
  if (!botAdmin) return sock.sendMessage(jid, { text: '❌ Make GODZILLA an admin first.' });

  // Get mentioned user
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || msg.message?.extendedTextMessage?.contextInfo?.participant;

  if (!mentioned) {
    return sock.sendMessage(jid, {
      text: `❌ *Usage:* ${config.prefix}kick @user\n_Reply to a user's message or mention them_`,
    });
  }

  try {
    await sock.groupParticipantsUpdate(jid, [mentioned], 'remove');
    await sock.sendMessage(jid, {
      text: `✅ *Kicked* @${mentioned.split('@')[0]} from the group.`,
      mentions: [mentioned],
    });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed to kick.\n_${err.message}_` });
  }
}

/**
 * .promote @user — Make user an admin
 */
export async function promoteCommand(sock, msg, args) {
  const jid    = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });

  const isAdmin = await requireAdmin(sock, msg, jid, sender);
  if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Admins only.' });

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentioned) return sock.sendMessage(jid, { text: `❌ Mention a user: ${config.prefix}promote @user` });

  try {
    await sock.groupParticipantsUpdate(jid, [mentioned], 'promote');
    await sock.sendMessage(jid, {
      text: `⬆️ @${mentioned.split('@')[0]} has been *promoted to admin*!`,
      mentions: [mentioned],
    });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed.\n_${err.message}_` });
  }
}

/**
 * .demote @user — Remove admin status
 */
export async function demoteCommand(sock, msg, args) {
  const jid    = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });

  const isAdmin = await requireAdmin(sock, msg, jid, sender);
  if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Admins only.' });

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentioned) return sock.sendMessage(jid, { text: `❌ Mention a user: ${config.prefix}demote @user` });

  try {
    await sock.groupParticipantsUpdate(jid, [mentioned], 'demote');
    await sock.sendMessage(jid, {
      text: `⬇️ @${mentioned.split('@')[0]} has been *demoted*.`,
      mentions: [mentioned],
    });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed.\n_${err.message}_` });
  }
}

/**
 * .mute — Restrict group (only admins can send)
 */
export async function muteCommand(sock, msg) {
  const jid    = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });

  const isAdmin = await requireAdmin(sock, msg, jid, sender);
  if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Admins only.' });

  try {
    await sock.groupSettingUpdate(jid, 'announcement'); // only admins can send
    await sock.sendMessage(jid, { text: '🔇 *Group muted.* Only admins can send messages now.' });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed.\n_${err.message}_` });
  }
}

/**
 * .unmute — Open group for everyone
 */
export async function unmuteCommand(sock, msg) {
  const jid    = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });

  const isAdmin = await requireAdmin(sock, msg, jid, sender);
  if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Admins only.' });

  try {
    await sock.groupSettingUpdate(jid, 'not_announcement');
    await sock.sendMessage(jid, { text: '🔊 *Group unmuted.* Everyone can send messages.' });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed.\n_${err.message}_` });
  }
}

/**
 * .groupinfo — Show group details
 */
export async function groupInfoCommand(sock, msg) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });

  try {
    const meta    = await sock.groupMetadata(jid);
    const admins  = meta.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`);
    const total   = meta.participants.length;
    const created = new Date(meta.creation * 1000).toLocaleDateString();

    await sock.sendMessage(jid, {
      text: `📋 *Group Info*\n\n` +
        `📌 *Name:* ${meta.subject}\n` +
        `👥 *Members:* ${total}\n` +
        `📅 *Created:* ${created}\n` +
        `👑 *Admins:* ${admins.join(', ')}\n` +
        (meta.desc ? `📝 *Desc:* ${meta.desc}` : ''),
      mentions: meta.participants.filter(p => p.admin).map(p => p.id),
    });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed.\n_${err.message}_` });
  }
}

/**
 * .tagall — Tag all group members
 */
export async function tagAllCommand(sock, msg, args) {
  const jid    = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Groups only.' });

  const isAdmin = await requireAdmin(sock, msg, jid, sender);
  if (!isAdmin) return sock.sendMessage(jid, { text: '❌ Admins only.' });

  try {
    const meta    = await sock.groupMetadata(jid);
    const members = meta.participants.map(p => p.id);
    const text    = args.join(' ') || '📢 Attention everyone!';

    const tags = members.map(m => `@${m.split('@')[0]}`).join(' ');

    await sock.sendMessage(jid, {
      text: `📢 *${text}*\n\n${tags}`,
      mentions: members,
    });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed.\n_${err.message}_` });
  }
}
