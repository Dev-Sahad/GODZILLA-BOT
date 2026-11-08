// commands/ai.js — GODZILLA AI — Powered by Google Gemini AI
// Features:
//   ✅ Google Gemini AI (Multimodal vision + conversational reasoning)
//   ✅ Per-user conversation memory (30 min TTL)
//   ✅ Image understanding (send image + .ai caption or reply to image)
//   ✅ Quoted message context
//   ✅ Group-aware (knows group name, user name)
//   ✅ Automatic fallback across Gemini models
//   ✅ Native WhatsApp formatting cleanup

import { GoogleGenerativeAI } from '@google/generative-ai';
import NodeCache from 'node-cache';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { config } from '../config.js';
import { getSender, getDisplayName } from '../helpers.js';

const chatHistories = new NodeCache({ stdTTL: 1800 });
const MAX_HISTORY = 16;
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

const SYSTEM_PROMPT = `You are GODZILLA, a powerful, witty, and intelligent WhatsApp bot assistant created by Sxhd for the community.

Your personality:
- Friendly, smart, helpful, and energetic
- Concise and structured — messages must be easily readable on mobile
- You know you are GODZILLA — powerful, reliable, and always online

Formatting rules for WhatsApp:
- Use *bold* for key terms and emphasis (single asterisk like *this*)
- Use _italics_ for tone or quotes (single underscore like _this_)
- Use line breaks between paragraphs
- For lists, use numbers or ▸ bullets
- Keep responses concise (under 350 words) unless requested to write in depth

If asked who created you: "I was created by *Sxhd* 🦖"
If asked what you are: "I'm *GODZILLA* — your Google AI-powered WhatsApp assistant!"`;

function formatWhatsAppText(text) {
  if (!text) return '';
  return text
    .replace(/^###\s*(.+)$/gm, '*$1*')
    .replace(/^##\s*(.+)$/gm, '*$1*')
    .replace(/^#\s*(.+)$/gm, '*$1*')
    .replace(/\*\*(.+?)\*\*/g, '*$1*');
}

async function getImageFromMessage(sock, msg) {
  try {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgMsg = msg.message?.imageMessage || quoted?.imageMessage;
    if (!imgMsg) return null;

    const messageToDownload = msg.message?.imageMessage
      ? msg
      : {
          key: {
            remoteJid: msg.key.remoteJid,
            id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId,
            participant: msg.message?.extendedTextMessage?.contextInfo?.participant,
          },
          message: quoted,
        };

    const buffer = await downloadMediaMessage(
      messageToDownload,
      'buffer',
      {},
      { reuploadRequest: sock.updateMediaMessage }
    );

    if (!buffer) return null;
    return {
      data: buffer.toString('base64'),
      mimeType: imgMsg.mimetype || 'image/jpeg',
    };
  } catch {
    return null;
  }
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
  const jid = msg.key.remoteJid;
  const sender = getSender(msg);
  const name = getDisplayName(msg);
  const isGroup = jid.endsWith('@g.us');
  const text = args.join(' ').trim();
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const hasImage = !!(msg.message?.imageMessage || quoted?.imageMessage);

  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    return sock.sendMessage(jid, {
      text: `❌ *Google AI Not Configured.*\n\nOwner needs to add *GEMINI_API_KEY* in \`.env\`.\nGet your free key at: https://aistudio.google.com/app/apikey`,
    });
  }

  if (!text && !hasImage) {
    return sock.sendMessage(jid, {
      text: `🤖 *GODZILLA AI (Google Gemini)*\n\n*How to use:*\n▸ ${config.prefix}ai <your question>\n▸ Send image + caption: ${config.prefix}ai what is this?\n▸ Reply to any image + ${config.prefix}ai analyze\n▸ Reply to any message + ${config.prefix}ai explain\n\n*Examples:*\n${config.prefix}ai explain quantum computing simply\n${config.prefix}ai write an apology message\n${config.prefix}ai debug this code: ...\n\n_${config.prefix}aiclear to reset memory_`,
    });
  }

  await sock.sendPresenceUpdate('composing', jid);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const historyKey = `ai_${sender}`;
    let history = chatHistories.get(historyKey) || [];
    const imageData = hasImage ? await getImageFromMessage(sock, msg) : null;
    const quotedText = getQuotedText(msg);
    const userQuery = text || 'Analyze and describe this image in detail.';

    // Construct system instruction with chat context
    let systemInstruction = SYSTEM_PROMPT;
    if (isGroup) {
      try {
        const meta = await sock.groupMetadata(jid);
        systemInstruction += `\n\nYou are chatting in WhatsApp group "${meta.subject}". User's name is ${name}.`;
      } catch {
        systemInstruction += `\n\nYou are in a WhatsApp group. User's name is ${name}.`;
      }
    } else {
      systemInstruction += `\n\nYou are in a private chat with ${name}.`;
    }

    // Build user content parts
    const userParts = [];
    if (imageData) {
      userParts.push({
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType,
        },
      });
    }

    const promptText = quotedText
      ? `[Quoted Context: "${quotedText}"]\n\n${userQuery}`
      : userQuery;
    userParts.push({ text: promptText });

    let reply = null;
    let lastError = null;

    // Try models in priority order
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });

        if (imageData || history.length === 0) {
          // Multimodal / single-turn
          const result = await model.generateContent(userParts);
          reply = result.response.text();
        } else {
          // Conversational multi-turn
          const chat = model.startChat({
            history: history.map(h => ({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.content }],
            })),
          });
          const result = await chat.sendMessage(promptText);
          reply = result.response.text();
        }

        if (reply) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!reply) {
      throw lastError || new Error('Failed to generate response from Google AI.');
    }

    // Update conversation history (text-only memory)
    const updated = [
      ...history,
      { role: 'user', content: userQuery },
      { role: 'assistant', content: reply },
    ].slice(-MAX_HISTORY);
    chatHistories.set(historyKey, updated);

    await sock.sendPresenceUpdate('paused', jid);
    const formattedReply = formatWhatsAppText(reply);

    await sock.sendMessage(
      jid,
      { text: `🦖 *GODZILLA AI*\n\n${formattedReply}\n\n_${config.prefix}aiclear to reset memory_` },
      { quoted: msg }
    );

  } catch (err) {
    await sock.sendPresenceUpdate('paused', jid);
    const errMsg = err.message || 'Error contacting Google AI';
    await sock.sendMessage(jid, { text: `❌ *Google AI Error:*\n_${errMsg}_` });
  }
}

export async function aiClearCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  chatHistories.del(`ai_${getSender(msg)}`);
  await sock.sendMessage(jid, {
    text: `🗑️ *Memory cleared!* Starting a brand new conversation. Try ${config.prefix}ai`,
  });
}

export async function aiStatusCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  const history = chatHistories.get(`ai_${getSender(msg)}`) || [];
  const ttl = chatHistories.getTtl(`ai_${getSender(msg)}`);
  const mins = ttl ? Math.max(0, Math.round((ttl - Date.now()) / 60000)) : 0;
  await sock.sendMessage(jid, {
    text: `🤖 *GODZILLA AI Status (Google Gemini)*\n\n🧠 Model: *Google Gemini Flash*\n💬 Messages in memory: *${history.length}/${MAX_HISTORY}*\n⏱ Memory expires in: *${mins} min*\n\n_${config.prefix}aiclear to reset_`,
  });
}
