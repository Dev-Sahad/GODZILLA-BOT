// commands/tools.js — Useful tools: calculator, currency converter, translate, QR generator

import axios from 'axios';
import { config } from '../config.js';

/**
 * .calc <expression>  — Safe math calculator
 * Example: .calc 15% of 3500
 */
export async function calcCommand(sock, msg, args) {
  const jid  = msg.key.remoteJid;
  const expr = args.join(' ').trim();

  if (!expr) {
    return sock.sendMessage(jid, {
      text: `🧮 *Usage:* ${config.prefix}calc <expression>\n\nExamples:\n${config.prefix}calc 250 * 18\n${config.prefix}calc 15% of 3500\n${config.prefix}calc sqrt(144) + 50`,
    });
  }

  try {
    // Handle "X% of Y" shorthand
    let processedExpr = expr.replace(/(\d+(\.\d+)?)%\s*of\s*(\d+(\.\d+)?)/gi, '($1/100)*$3');

    // Use mathjs via CDN API (safe eval)
    const res = await axios.get(`https://api.mathjs.org/v4/?expr=${encodeURIComponent(processedExpr)}`, {
      timeout: 5000,
    });

    const result = res.data;
    await sock.sendMessage(jid, {
      text: `🧮 *Calculator*\n\n📥 ${expr}\n📤 *${result}*`,
    });
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Invalid expression: _${expr}_\n\nTry: ${config.prefix}calc 100 * 3.14`,
    });
  }
}

/**
 * .currency <amount> <FROM> <TO>
 * Example: .currency 100 USD INR
 */
export async function currencyCommand(sock, msg, args) {
  const jid = msg.key.remoteJid;

  if (args.length < 3) {
    return sock.sendMessage(jid, {
      text: `💱 *Usage:* ${config.prefix}currency <amount> <FROM> <TO>\n\nExamples:\n${config.prefix}currency 100 USD INR\n${config.prefix}currency 50 EUR GBP\n${config.prefix}currency 1000 INR USD`,
    });
  }

  const [amountStr, from, to] = args;
  const amount = parseFloat(amountStr);

  if (isNaN(amount)) {
    return sock.sendMessage(jid, { text: `❌ Invalid amount: _${amountStr}_` });
  }

  await sock.sendMessage(jid, { text: `💱 *Converting ${amount} ${from.toUpperCase()} → ${to.toUpperCase()}…*` });

  try {
    // Use exchangerate-api (free tier, no key needed for basic)
    const res = await axios.get(
      `https://open.er-api.com/v6/latest/${from.toUpperCase()}`,
      { timeout: 8000 }
    );

    const rates = res.data.rates;
    const toUpper = to.toUpperCase();

    if (!rates[toUpper]) throw new Error(`Unknown currency: ${toUpper}`);

    const rate   = rates[toUpper];
    const result = (amount * rate).toFixed(2);

    await sock.sendMessage(jid, {
      text: `💱 *Currency Converter*\n\n💵 ${amount} *${from.toUpperCase()}*\n=\n💰 *${result} ${toUpper}*\n\n📊 Rate: 1 ${from.toUpperCase()} = ${rate.toFixed(4)} ${toUpper}\n🕒 _Rates updated live_`,
    });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Conversion failed.\n_${err.message}_` });
  }
}

/**
 * .tr <target_lang> <text>  — Translate text
 * Example: .tr ml Hello how are you
 */
export async function translateCommand(sock, msg, args) {
  const jid  = msg.key.remoteJid;
  const lang = args[0]?.toLowerCase();
  const text = args.slice(1).join(' ').trim();

  if (!lang || !text) {
    return sock.sendMessage(jid, {
      text: `🌐 *Usage:* ${config.prefix}tr <language_code> <text>\n\nExamples:\n${config.prefix}tr ml Hello, how are you?\n${config.prefix}tr ja Good morning\n${config.prefix}tr ar Thank you\n\n_Common codes: ml (Malayalam), hi (Hindi), ar (Arabic), ja (Japanese), fr (French), es (Spanish)_`,
    });
  }

  await sock.sendMessage(jid, { text: `🌐 *Translating to ${lang}…*` });

  try {
    // MyMemory free translation API
    const res = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: text, langpair: `en|${lang}` },
      timeout: 8000,
    });

    const translated = res.data.responseData?.translatedText;
    if (!translated || translated === text) throw new Error('Translation unavailable');

    await sock.sendMessage(jid, {
      text: `🌐 *Translation*\n\n📥 *EN:* ${text}\n📤 *${lang.toUpperCase()}:* ${translated}`,
    });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Translation failed.\n_${err.message}_` });
  }
}

/**
 * .tts <text> — Text to speech (sends as voice note)
 * Uses Google TTS (free, no key)
 */
export async function ttsCommand(sock, msg, args) {
  const jid  = msg.key.remoteJid;
  const text = args.join(' ').trim();

  if (!text || text.length > 200) {
    return sock.sendMessage(jid, {
      text: `🔊 *Usage:* ${config.prefix}tts <text> (max 200 chars)\n\nExample:\n${config.prefix}tts Hello from GODZILLA bot`,
    });
  }

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;

    await sock.sendMessage(jid, {
      audio:    { url: ttsUrl },
      mimetype: 'audio/mpeg',
      ptt:      true, // sends as voice note
    });
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ TTS failed.\n_${err.message}_` });
  }
}
