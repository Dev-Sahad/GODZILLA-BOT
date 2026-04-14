// commands/games.js — Mini games: trivia, 8ball, dice, coinflip, rps

import axios from 'axios';
import { config } from '../config.js';

/**
 * .8ball <question> — Magic 8 ball
 */
const EIGHTBALL_RESPONSES = [
  '✅ It is certain.', '✅ It is decidedly so.', '✅ Without a doubt.',
  '✅ Yes, definitely.', '✅ You may rely on it.', '✅ As I see it, yes.',
  '✅ Most likely.', '✅ Outlook good.', '✅ Yes.',
  '⚪ Reply hazy, try again.', '⚪ Ask again later.', '⚪ Better not tell you now.',
  '⚪ Cannot predict now.', '⚪ Concentrate and ask again.',
  '❌ Don\'t count on it.', '❌ My reply is no.', '❌ My sources say no.',
  '❌ Outlook not so good.', '❌ Very doubtful.',
];

export async function eightBallCommand(sock, msg, args) {
  const jid      = msg.key.remoteJid;
  const question = args.join(' ').trim();

  if (!question) {
    return sock.sendMessage(jid, { text: `🎱 *Usage:* ${config.prefix}8ball <your question>` });
  }

  const answer = EIGHTBALL_RESPONSES[Math.floor(Math.random() * EIGHTBALL_RESPONSES.length)];
  await sock.sendMessage(jid, {
    text: `🎱 *Magic 8-Ball*\n\n❓ _${question}_\n\n${answer}`,
  });
}

/**
 * .dice [sides] — Roll a dice
 */
export async function diceCommand(sock, msg, args) {
  const jid   = msg.key.remoteJid;
  const sides = parseInt(args[0]) || 6;

  if (sides < 2 || sides > 1000) {
    return sock.sendMessage(jid, { text: `❌ Sides must be between 2 and 1000.` });
  }

  const result = Math.floor(Math.random() * sides) + 1;
  await sock.sendMessage(jid, {
    text: `🎲 *Dice Roll (d${sides})*\n\nResult: *${result}*`,
  });
}

/**
 * .flip — Flip a coin
 */
export async function coinFlipCommand(sock, msg) {
  const jid    = msg.key.remoteJid;
  const result = Math.random() < 0.5 ? '🪙 *HEADS*' : '🪙 *TAILS*';
  await sock.sendMessage(jid, { text: `🪙 *Coin Flip*\n\n${result}` });
}

/**
 * .rps <rock|paper|scissors> — Rock Paper Scissors
 */
export async function rpsCommand(sock, msg, args) {
  const jid    = msg.key.remoteJid;
  const moves  = ['rock', 'paper', 'scissors'];
  const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
  const user   = args[0]?.toLowerCase();

  if (!moves.includes(user)) {
    return sock.sendMessage(jid, {
      text: `✂️ *Usage:* ${config.prefix}rps <rock|paper|scissors>`,
    });
  }

  const bot = moves[Math.floor(Math.random() * 3)];

  let result;
  if (user === bot) result = "🤝 *It's a tie!*";
  else if (
    (user === 'rock'     && bot === 'scissors') ||
    (user === 'paper'    && bot === 'rock')     ||
    (user === 'scissors' && bot === 'paper')
  ) result = '🏆 *You win!*';
  else result = '😈 *GODZILLA wins!*';

  await sock.sendMessage(jid, {
    text: `✂️ *Rock Paper Scissors*\n\nYou: ${emojis[user]} ${user}\nBot: ${emojis[bot]} ${bot}\n\n${result}`,
  });
}

/**
 * .trivia — Random trivia question
 */
const triviaActive = new Map();

export async function triviaCommand(sock, msg) {
  const jid = msg.key.remoteJid;

  if (triviaActive.has(jid)) {
    return sock.sendMessage(jid, {
      text: `⚠️ A trivia is already active!\nAnswer: *${triviaActive.get(jid).answer}*\n_(sending answer and starting new)_`,
    });
  }

  await sock.sendMessage(jid, { text: '🧠 *Loading trivia question…*' });

  try {
    const res  = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', { timeout: 8000 });
    const q    = res.data.results[0];
    const all  = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
    const opts = all.map((a, i) => `${['A', 'B', 'C', 'D'][i]}. ${decodeHTML(a)}`).join('\n');
    const answer = ['A', 'B', 'C', 'D'][all.indexOf(q.correct_answer)];

    triviaActive.set(jid, { answer: `${answer}. ${decodeHTML(q.correct_answer)}` });

    await sock.sendMessage(jid, {
      text: `🧠 *Trivia!*\n📚 Category: ${q.category}\n⭐ Difficulty: ${q.difficulty}\n\n❓ ${decodeHTML(q.question)}\n\n${opts}\n\n_Reply with A, B, C, or D. Answer reveals in 30s_`,
    });

    // Auto-reveal answer after 30s
    setTimeout(async () => {
      if (triviaActive.has(jid)) {
        const saved = triviaActive.get(jid);
        triviaActive.delete(jid);
        await sock.sendMessage(jid, {
          text: `⏰ *Time's up!*\n✅ Answer: *${saved.answer}*`,
        });
      }
    }, 30000);

  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed to load trivia.\n_${err.message}_` });
  }
}

function decodeHTML(str) {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

// Trivia answer checker (called from handler for non-command messages)
export function checkTriviaAnswer(jid, text) {
  if (!triviaActive.has(jid)) return null;
  const answer = triviaActive.get(jid).answer;
  const userAns = text.trim().toUpperCase()[0];
  if (!['A', 'B', 'C', 'D'].includes(userAns)) return null;

  const correct = answer[0];
  triviaActive.delete(jid);
  return { correct: userAns === correct, answer };
}
