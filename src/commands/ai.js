// commands/ai.js — GODZILLA AI — Full-featured Claude-powered assistant
// Features:
//   ✅ Per-user conversation memory (30 min TTL)
//   ✅ Image understanding (send image + .ai caption)
//   ✅ Quoted message context
//   ✅ Group-aware (knows group name, user name)
//   ✅ Typing simulation
//   ✅ GODZILLA personality
//   ✅ .aiclear / .aistatus

import axios from 'axios';
import NodeCache from 'node-cache';
import { config } from '../config.js';
import { getSender, getDisplayName } from '../helpers.js';

const chatHistories = new NodeCache({ stdTTL: 1800 });
const MAX_HISTORY   = 20;
const CLAUDE_API    = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL  = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are GODZILLA, a powerful and intelligent WhatsApp bot assistant created by Sxhd for the Mangalashery RP (MRP) community.

Your personality:
- Friendly, helpful, and a little playful
- Concise but thorough — WhatsApp messages should be readable on mobile
- You can be funny sometimes but stay helpful
- You know you are GODZILLA — powerful, reliable, always online

Formatting rules for WhatsApp:
- Use *bold* for important words (single asterisks)
- Use _italic_ for emphasis (single underscores)
- Use line breaks to separate sections
- NO markdown headers like ## or ### — they don't render in WhatsApp
- Keep responses under 400 words unless the user asks for something long
- For lists, use numbers or ▸

You can help with:
- Answering any question (science, history, coding, general knowledge)
- Writing (essays, captions, messages, stories)
- Explaining concepts simply
- Coding help (Python, JavaScript, etc.)
- Math, translations, creative tasks

If someone asks who made you: "I was created by *Sxhd* 🦖"
If someone asks what you are: "I'm *GODZILLA* — your AI-powered WhatsApp assistant!"`;

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data',  c => chunks.push(c));
    stream.on('end',   () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function getImageFromMessage(sock, msg) {
  try {
    const imgMsg = msg.message?.imageMessage;
    if (!imgMsg) return null;
    const stream = await sock.downloadMediaMessage(msg);
    const buffer = await streamToBuffer(stream);
    return { data: buffer.toString('base64'), mimetype: imgMsg.mimetype || 'image/jpeg' };
  } catch { return null; }
}

function getQuotedText(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return ctx.quotedMessage?.conversation
    || ctx.quotedMessage?.extendedTextMessage?.text
    || ctx.quotedMessage?.imageMessage?.caption
    || null;
}

export async function aiCommand(sock, msg, args) {
  const jid     = msg.key.remoteJid;
  const sender  = getSender(msg);
  const name    = getDisplayName(msg);
  const isGroup = jid.endsWith('@g.us');
  const text    = args.join(' ').trim();
  const hasImage = !!(msg.message?.imageMessage);

  if (!process.env.ANTHROPIC_API_KEY) {
    return sock.sendMessage(jid, {
      text: `❌ *AI not configured.*\nOwner needs to add *ANTHROPIC_API_KEY* in .env`,
    });
  }

  if (!text && !hasImage) {
    return sock.sendMessage(jid, {
      text: `🤖 *GODZILLA AI*\n\n*How to use:*\n▸ ${config.prefix}ai <your question>\n▸ Send an image with caption: ${config.prefix}ai describe this\n▸ Reply to any message + ${config.prefix}ai explain this\n\n*Examples:*\n${config.prefix}ai What is a black hole?\n${config.prefix}ai Write a WhatsApp bio for a gamer\n${config.prefix}ai Fix this code: ...\n\n_${config.prefix}aiclear to reset conversation_`,
    });
  }

  await sock.sendPresenceUpdate('composing', jid);

  try {
    const historyKey = `ai_${sender}`;
    let history      = chatHistories.get(historyKey) || [];
    const imageData  = hasImage ? await getImageFromMessage(sock, msg) : null;
    const quotedText = getQuotedText(msg);
    const userQuery  = text || 'Describe this image.';

    // Build content array
    const contentArr = [];
    if (imageData) {
      contentArr.push({ type: 'image', source: { type: 'base64', media_type: imageData.mimetype, data: imageData.data } });
    }
    contentArr.push({ type: 'text', text: quotedText ? `[Quoted: "${quotedText}"]\n\n${userQuery}` : userQuery });

    const messages = [
      ...history,
      { role: 'user', content: contentArr.length === 1 ? contentArr[0].text : contentArr },
    ].slice(-MAX_HISTORY);

    // Group/user context
    let systemPrompt = SYSTEM_PROMPT;
    if (isGroup) {
      try {
        const meta = await sock.groupMetadata(jid);
        systemPrompt += `\n\nYou are in WhatsApp group: "${meta.subject}". User's name: ${name}.`;
      } catch {
        systemPrompt += `\n\nYou are in a WhatsApp group. User's name: ${name}.`;
      }
    } else {
      systemPrompt += `\n\nYou are in a private chat. User's name: ${name}.`;
    }

    const response = await axios.post(CLAUDE_API, {
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    const reply = response.data.content[0]?.text;
    if (!reply) throw new Error('Empty response from AI');

    // Save to history (text only)
    const updated = [...history,
      { role: 'user',      content: userQuery },
      { role: 'assistant', content: reply },
    ].slice(-MAX_HISTORY);
    chatHistories.set(historyKey, updated);

    await sock.sendPresenceUpdate('paused', jid);
    await sock.sendMessage(jid, { text: `🤖 ${reply}\n\n_${config.prefix}aiclear to reset_` }, { quoted: msg });

  } catch (err) {
    await sock.sendPresenceUpdate('paused', jid);
    const errMsg = err.response?.data?.error?.message || err.message;
    await sock.sendMessage(jid, { text: `❌ *AI Error:* _${errMsg}_` });
  }
}

export async function aiClearCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  chatHistories.del(`ai_${getSender(msg)}`);
  await sock.sendMessage(jid, { text: `🗑️ *Conversation cleared!* Start fresh with ${config.prefix}ai` });
}

export async function aiStatusCommand(sock, msg) {
  const jid     = msg.key.remoteJid;
  const history = chatHistories.get(`ai_${getSender(msg)}`) || [];
  const ttl     = chatHistories.getTtl(`ai_${getSender(msg)}`);
  const mins    = ttl ? Math.round((ttl - Date.now()) / 60000) : 0;
  await sock.sendMessage(jid, {
    text: `🤖 *GODZILLA AI Status*\n\n💬 Messages in memory: *${history.length}/${MAX_HISTORY}*\n⏱ Expires in: *${mins} min*\n\n_${config.prefix}aiclear to reset_`,
  });
}
