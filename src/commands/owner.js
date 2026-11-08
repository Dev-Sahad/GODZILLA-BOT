// commands/owner.js — Supercharged Admin Panel with All Access
// Exclusively for Bot Owner:
//   👑 .admin / .panel — Live Interactive Control Center
//   💻 .eval — Execute JavaScript with full runtime context
//   ⚡ .exec / .sh — Execute shell & terminal commands
//   💾 .backup — Export and receive session backup directly on WhatsApp
//   🧹 .cleartemp — Wipe cache and report freed disk space
//   ⚙️ .setprefix — Change prefix on the fly
//   ⚙️ .setname — Change bot name dynamically
//   🚪 .join — Join group by invite link
//   🏃 .leave — Leave current group
//   🚫 .block / .unblock — WhatsApp contact blocking
//   📢 .broadcast — Broadcast message to all participating groups
//   🔄 .restart — Safe bot reboot

import os from 'os';
import util from 'util';
import path from 'path';
import { exec } from 'child_process';
import fs from 'fs-extra';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { formatBytes } from '../helpers.js';

/**
 * Check if sender is the bot owner (with normalized JID matching)
 */
export function isOwner(sender) {
  if (!sender) return false;
  const cleanSender = sender.split('@')[0].split(':')[0];
  const cleanOwner  = config.ownerNumber.split('@')[0].split(':')[0];
  return cleanSender === cleanOwner;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

/**
 * .admin / .panel — Master Admin Control Dashboard
 */
export async function adminPanelCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) {
    return sock.sendMessage(jid, { text: '❌ Access Denied: *Owner Only*.' });
  }

  try {
    const memory = process.memoryUsage();
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || 'Generic';
    const cpuCores = cpus.length;

    let groupCount = 0;
    try {
      const chats = await sock.groupFetchAllParticipating();
      groupCount = Object.keys(chats).length;
    } catch {}

    const uptime = formatUptime(process.uptime());

    const text =
`╔═════════════════════════════════╗
║   🦖 *GODZILLA ADMIN PANEL*     ║
║        _Master Access_          ║
╚═════════════════════════════════╝

━━━━━━ 📊 *SYSTEM VITALS* ━━━━━━━
🟢 *Status*      : ONLINE & ACTIVE
⏱️ *Uptime*      : ${uptime}
⚙️ *Bot Name*    : ${config.botName}
📌 *Prefix*      : \`${config.prefix}\`
🔒 *Mode*        : ${config.mode.toUpperCase()}
👥 *Groups*      : ${groupCount} participating

━━━━━━ 💻 *HARDWARE & MEMORY* ━━━
🧠 *Heap Used*   : ${formatBytes(memory.heapUsed)} / ${formatBytes(memory.heapTotal)}
📦 *RSS Memory*  : ${formatBytes(memory.rss)}
🖥️ *System RAM*  : ${formatBytes(totalMem - freeMem)} / ${formatBytes(totalMem)}
⚡ *CPU*         : ${cpuModel} (${cpuCores} Cores)
💻 *Platform*    : ${os.platform()} ${os.arch()} (Node ${process.version})

━━━━━━ 🛠️ *ALL ACCESS COMMANDS* ━
▸ *Execution:*
  • \`${config.prefix}eval <code>\` → Run dynamic JavaScript
  • \`${config.prefix}exec <cmd>\` → Run shell command

▸ *Configuration:*
  • \`${config.prefix}setprefix <prefix>\` → Change command prefix
  • \`${config.prefix}setname <name>\` → Rename bot
  • \`${config.prefix}mode <public|private|group>\` → Switch access mode

▸ *Group & Network:*
  • \`${config.prefix}join <invite_link>\` → Join group via link
  • \`${config.prefix}leave\` → Exit current group
  • \`${config.prefix}broadcast <msg>\` → Announcement to all groups
  • \`${config.prefix}block @user\` → Block contact
  • \`${config.prefix}unblock @user\` → Unblock contact

▸ *Maintenance & State:*
  • \`${config.prefix}backup\` → Export session string directly
  • \`${config.prefix}cleartemp\` → Wipe temporary cache
  • \`${config.prefix}restart\` → Reboot bot process

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Logged in as Master Owner_`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed to load admin panel: ${err.message}` });
  }
}

/**
 * .eval <code> — Evaluate JavaScript code
 */
export async function evalCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) return sock.sendMessage(jid, { text: '❌ Owner only.' });

  const code = args.join(' ').trim();
  if (!code) {
    return sock.sendMessage(jid, { text: `💻 *Usage:* ${config.prefix}eval <JavaScript code>` });
  }

  try {
    let result = await eval(`(async () => { ${code} })()`);
    if (typeof result !== 'string') {
      result = util.inspect(result, { depth: 2 });
    }
    await sock.sendMessage(jid, {
      text: `💻 *EVAL RESULT:*\n\`\`\`javascript\n${result || 'undefined'}\n\`\`\``,
    }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ *EVAL ERROR:*\n\`\`\`javascript\n${err.stack || err.message}\n\`\`\``,
    }, { quoted: msg });
  }
}

/**
 * .exec <terminal_command> — Execute shell commands
 */
export async function execCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) return sock.sendMessage(jid, { text: '❌ Owner only.' });

  const command = args.join(' ').trim();
  if (!command) {
    return sock.sendMessage(jid, { text: `⚡ *Usage:* ${config.prefix}exec <terminal command>` });
  }

  await sock.sendMessage(jid, { text: `⚡ *Executing:* \`${command}\`…` });

  exec(command, { timeout: 60000 }, async (err, stdout, stderr) => {
    let output = '';
    if (stdout) output += `*STDOUT:*\n\`\`\`\n${stdout.slice(0, 3000)}\n\`\`\`\n`;
    if (stderr) output += `*STDERR:*\n\`\`\`\n${stderr.slice(0, 1000)}\n\`\`\`\n`;
    if (err) output += `*ERROR:* ${err.message}`;

    if (!output.trim()) output = '✅ Command executed with no output.';

    await sock.sendMessage(jid, { text: output }, { quoted: msg });
  });
}

/**
 * .backup — Generate and deliver session backup directly to WhatsApp
 */
export async function backupCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) return sock.sendMessage(jid, { text: '❌ Owner only.' });

  try {
    await sock.sendMessage(jid, { text: '💾 *Generating session backup…*' });

    const exists = await fs.pathExists(config.sessionsDir);
    if (!exists) throw new Error('Sessions directory not found.');

    const files = {};
    const items = await fs.readdir(config.sessionsDir);

    for (const item of items) {
      const filePath = path.join(config.sessionsDir, item);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        files[item] = await fs.readFile(filePath, 'utf-8');
      }
    }

    const sessionString = Buffer.from(JSON.stringify(files)).toString('base64');

    await sock.sendMessage(config.ownerNumber, {
      text: `🔐 *GODZILLA SESSION BACKUP EXPORT*\n\nCopy this string and set as \`GODZILLA_SESSION\` in your environment variables:\n\n\`\`\`\n${sessionString}\n\`\`\``,
    });

    if (jid !== config.ownerNumber) {
      await sock.sendMessage(jid, { text: '✅ Session backup generated and sent to your private chat!' });
    }
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Backup failed: ${err.message}` });
  }
}

/**
 * .cleartemp — Delete cached media and report freed storage
 */
export async function clearTempCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) return sock.sendMessage(jid, { text: '❌ Owner only.' });

  try {
    await fs.ensureDir(config.tempDir);
    const files = await fs.readdir(config.tempDir);
    let totalBytes = 0;
    let deletedCount = 0;

    for (const file of files) {
      const fullPath = path.join(config.tempDir, file);
      const stat = await fs.stat(fullPath);
      totalBytes += stat.size;
      await fs.remove(fullPath);
      deletedCount++;
    }

    await sock.sendMessage(jid, {
      text: `🧹 *Temp Directory Cleared!*\n\n🗑️ Files removed: *${deletedCount}*\n💾 Space freed: *${formatBytes(totalBytes)}*`,
    });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed to clear temp: ${err.message}` });
  }
}

/**
 * .setprefix <prefix> — Change command prefix dynamically
 */
export async function setPrefixCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) return sock.sendMessage(jid, { text: '❌ Owner only.' });

  const newPrefix = args[0]?.trim();
  if (!newPrefix) {
    return sock.sendMessage(jid, { text: `❌ *Usage:* ${config.prefix}setprefix <new_prefix>` });
  }

  config.prefix = newPrefix;
  await sock.sendMessage(jid, {
    text: `✅ Command prefix has been updated to: *${newPrefix}*\n\nTry: *${newPrefix}help*`,
  });
}

/**
 * .setname <name> — Change bot display name dynamically
 */
export async function setNameCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) return sock.sendMessage(jid, { text: '❌ Owner only.' });

  const newName = args.join(' ').trim();
  if (!newName) {
    return sock.sendMessage(jid, { text: `❌ *Usage:* ${config.prefix}setname <new_bot_name>` });
  }

  config.botName = newName;
  await sock.sendMessage(jid, {
    text: `✅ Bot name updated to: *${newName}*`,
  });
}

/**
 * .join <invite_link> — Bot joins group via link
 */
export async function joinCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) return sock.sendMessage(jid, { text: '❌ Owner only.' });

  const link = args[0]?.trim();
  const match = link?.match(/chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/);

  if (!match) {
    return sock.sendMessage(jid, {
      text: `❌ *Usage:* ${config.prefix}join <WhatsApp group invite URL>\n\nExample: ${config.prefix}join https://chat.whatsapp.com/ABC123xyz`,
    });
  }

  try {
    const inviteCode = match[1];
    const joinedJid = await sock.groupAcceptInvite(inviteCode);
    await sock.sendMessage(jid, { text: `✅ Successfully joined group! (ID: ${joinedJid})` });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Could not join group: ${err.message}` });
  }
}

/**
 * .leave — Bot exits the current group
 */
export async function leaveCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) return sock.sendMessage(jid, { text: '❌ Owner only.' });
  if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ This command works only inside groups.' });

  await sock.sendMessage(jid, { text: '👋 *Goodbye everyone!* Leaving group as requested by owner.' });
  await sock.groupLeave(jid);
}

/**
 * .block @user / .unblock @user
 */
export async function blockCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) return sock.sendMessage(jid, { text: '❌ Owner only.' });

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || msg.message?.extendedTextMessage?.contextInfo?.participant
    || (args[0]?.includes('@') ? args[0] : `${args[0]}@s.whatsapp.net`);

  if (!mentioned || !mentioned.includes('@')) {
    return sock.sendMessage(jid, { text: `❌ Mention or reply to a user to block: ${config.prefix}block @user` });
  }

  try {
    await sock.updateBlockStatus(mentioned, 'block');
    await sock.sendMessage(jid, { text: `🚫 Blocked @${mentioned.split('@')[0]}`, mentions: [mentioned] });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed to block: ${err.message}` });
  }
}

export async function unblockCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) return sock.sendMessage(jid, { text: '❌ Owner only.' });

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || msg.message?.extendedTextMessage?.contextInfo?.participant
    || (args[0]?.includes('@') ? args[0] : `${args[0]}@s.whatsapp.net`);

  if (!mentioned || !mentioned.includes('@')) {
    return sock.sendMessage(jid, { text: `❌ Mention or reply to a user to unblock: ${config.prefix}unblock @user` });
  }

  try {
    await sock.updateBlockStatus(mentioned, 'unblock');
    await sock.sendMessage(jid, { text: `✅ Unblocked @${mentioned.split('@')[0]}`, mentions: [mentioned] });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed to unblock: ${err.message}` });
  }
}

/**
 * .broadcast <message> — Send message to all participating groups
 */
export async function broadcastCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) {
    return sock.sendMessage(jid, { text: '❌ Owner only.' });
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
          text: `📢 *Broadcast Announcement from ${config.botName}*\n\n${text}`,
        });
        sent++;
        await new Promise(r => setTimeout(r, 1200)); // Delay to avoid flood detection
      } catch (e) {
        logger.warn(`Failed to broadcast to ${groupId}: ${e.message}`);
      }
    }

    await sock.sendMessage(jid, { text: `✅ *Broadcast complete!* Delivered to ${sent}/${groupIds.length} groups.` });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Broadcast failed.\n_${err.message}_` });
  }
}

/**
 * .restart — Reboot bot process
 */
export async function restartCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(sender)) {
    return sock.sendMessage(jid, { text: '❌ Owner only.' });
  }

  await sock.sendMessage(jid, { text: '🔄 *Restarting GODZILLA Bot…*' });
  logger.info('Restart requested by owner via admin panel');
  setTimeout(() => process.exit(0), 1500);
}

/**
 * .mode <public|private|group> — Switch bot operation mode
 */
export async function modeCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;
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
    text: `✅ Bot mode changed to: *${newMode.toUpperCase()}*`,
  });
}
