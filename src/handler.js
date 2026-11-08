// handler.js — Routes incoming messages to the correct command

import { config }         from './config.js';
import { logger }         from './logger.js';
import { isOnCooldown, getSender, getMessageText, isGroup } from './helpers.js';

// ── Import all command modules ────────────────────────────────────────────────
import { ytMusicCommand }   from './commands/ytmusic.js';
import { ytVideoCommand }   from './commands/ytvideo.js';
import { spotifyCommand }   from './commands/spotify.js';
import { socialDlCommand }  from './commands/socialdl.js';
import { wallpaperCommand, wallMobileCommand, wallPCCommand } from './commands/wallpaper.js';
import { pingCommand, uptimeCommand, aliveCommand, infoCommand, helpCommand } from './commands/utils.js';
import { jokeCommand, quoteCommand, memeCommand, lyricsCommand, ytSearchCommand } from './commands/fun.js';
import {
  adminPanelCommand,
  evalCommand,
  execCommand,
  backupCommand,
  clearTempCommand,
  setPrefixCommand,
  setNameCommand,
  joinCommand,
  leaveCommand,
  blockCommand,
  unblockCommand,
  broadcastCommand,
  restartCommand,
  modeCommand,
} from './commands/owner.js';
import { weatherCommand }   from './commands/weather.js';
import { stickerCommand }   from './commands/sticker.js';
import { aiCommand, aiClearCommand, aiStatusCommand } from './commands/ai.js';
import { calcCommand, currencyCommand, translateCommand, ttsCommand } from './commands/tools.js';
import { kickCommand, promoteCommand, demoteCommand, muteCommand, unmuteCommand, groupInfoCommand, tagAllCommand } from './commands/group.js';
import { eightBallCommand, diceCommand, coinFlipCommand, rpsCommand, triviaCommand, checkTriviaAnswer } from './commands/games.js';
import {
  imagineCommand,
  wikiCommand,
  catCommand,
  dogCommand,
  animeCommand,
  factCommand,
  remindCommand,
  fancyCommand,
  githubCommand,
  passwordCommand,
} from './commands/extra.js';
import {
  soundCommand,
  soundsListCommand,
  randomSoundCommand,
  soundShortcutCommand,
} from './commands/myinstants.js';

// ── Command registry ──────────────────────────────────────────────────────────
const COMMANDS = {
  // Music
  'ytmusic':   ytMusicCommand,
  'ytmp3':     ytMusicCommand,
  'music':     ytMusicCommand,
  'song':      ytMusicCommand,

  // YouTube Video
  'ytvideo':   ytVideoCommand,
  'ytmp4':     ytVideoCommand,
  'video':     ytVideoCommand,

  // Spotify
  'spotify':   spotifyCommand,
  'sp':        spotifyCommand,

  // Social Download
  'sdl':       socialDlCommand,
  'dl':        socialDlCommand,
  'download':  socialDlCommand,
  'ig':        socialDlCommand,
  'tiktok':    socialDlCommand,
  'fb':        socialDlCommand,

  // Wallpapers
  'wall':      wallpaperCommand,
  'wallpaper': wallpaperCommand,
  'wp':        wallpaperCommand,
  'wallmobile': wallMobileCommand,
  'wmobile':   wallMobileCommand,
  'wallpc':    wallPCCommand,
  'wpc':       wallPCCommand,

  // Utilities
  'ping':      pingCommand,
  'uptime':    uptimeCommand,
  'alive':     aliveCommand,
  'info':      infoCommand,
  'help':      helpCommand,
  'menu':      helpCommand,
  'start':     helpCommand,

  // Fun & Entertainment
  'joke':      jokeCommand,
  'quote':     quoteCommand,
  'meme':      memeCommand,
  'lyrics':    lyricsCommand,
  'ytsearch':  ytSearchCommand,
  'yts':       ytSearchCommand,

  // Weather
  'weather':   weatherCommand,
  'w':         weatherCommand,

  // Sticker
  'sticker':   stickerCommand,
  's':         stickerCommand,
  'stiker':    stickerCommand,

  // AI Chat (Google Gemini)
  'ai':        aiCommand,
  'ask':       aiCommand,
  'gemini':    aiCommand,
  'chat':      aiCommand,
  'gpt':       aiCommand,
  'aiclear':   aiClearCommand,
  'aistatus':  aiStatusCommand,

  // Creative & Extras
  'imagine':   imagineCommand,
  'aiart':     imagineCommand,
  'draw':      imagineCommand,
  'dalle':     imagineCommand,
  'wiki':      wikiCommand,
  'wikipedia': wikiCommand,
  'cat':       catCommand,
  'kitten':    catCommand,
  'dog':       dogCommand,
  'puppy':     dogCommand,
  'anime':     animeCommand,
  'waifu':     animeCommand,
  'fact':      factCommand,
  'facts':     factCommand,
  'remind':    remindCommand,
  'reminder':  remindCommand,
  'fancy':     fancyCommand,
  'font':      fancyCommand,
  'style':     fancyCommand,
  'github':    githubCommand,
  'gh':        githubCommand,
  'password':  passwordCommand,
  'pass':      passwordCommand,
  'pw':        passwordCommand,

  // MyInstants Meme Sounds
  'sound':        soundCommand,
  'instant':      soundCommand,
  'instants':     soundsListCommand,
  'sounds':       soundsListCommand,
  'searchsound':  soundsListCommand,
  'randomsound':  randomSoundCommand,
  'randominstant': randomSoundCommand,

  // Meme Audio Shortcuts
  'bruh':         (sock, msg) => soundShortcutCommand(sock, msg, 'bruh'),
  'boom':         (sock, msg) => soundShortcutCommand(sock, msg, 'vine boom'),
  'vineboom':     (sock, msg) => soundShortcutCommand(sock, msg, 'vine boom'),
  'fbi':          (sock, msg) => soundShortcutCommand(sock, msg, 'fbi open up'),
  'emotional':    (sock, msg) => soundShortcutCommand(sock, msg, 'emotional damage'),
  'airhorn':      (sock, msg) => soundShortcutCommand(sock, msg, 'mlg airhorn'),
  'fart':         (sock, msg) => soundShortcutCommand(sock, msg, 'dry fart'),
  'tada':         (sock, msg) => soundShortcutCommand(sock, msg, 'tada'),
  'yeet':         (sock, msg) => soundShortcutCommand(sock, msg, 'yeet'),
  'sheesh':       (sock, msg) => soundShortcutCommand(sock, msg, 'sheesh'),
  'augh':         (sock, msg) => soundShortcutCommand(sock, msg, 'augh'),

  // Tools
  'calc':      calcCommand,
  'calculate': calcCommand,
  'math':      calcCommand,
  'currency':  currencyCommand,
  'convert':   currencyCommand,
  'cur':       currencyCommand,
  'tr':        translateCommand,
  'translate': translateCommand,
  'tts':       ttsCommand,

  // Group Admin
  'kick':      kickCommand,
  'remove':    kickCommand,
  'promote':   promoteCommand,
  'demote':    demoteCommand,
  'mute':      muteCommand,
  'unmute':    unmuteCommand,
  'groupinfo': groupInfoCommand,
  'ginfo':     groupInfoCommand,
  'tagall':    tagAllCommand,
  'everyone':  tagAllCommand,
  'all':       tagAllCommand,

  // Games
  '8ball':     eightBallCommand,
  'dice':      diceCommand,
  'roll':      diceCommand,
  'flip':      coinFlipCommand,
  'coinflip':  coinFlipCommand,
  'rps':       rpsCommand,
  'trivia':    triviaCommand,

  // Owner & Admin Panel
  'admin':     adminPanelCommand,
  'panel':     adminPanelCommand,
  'dashboard': adminPanelCommand,
  'control':   adminPanelCommand,
  'eval':      evalCommand,
  'exec':      execCommand,
  'sh':        execCommand,
  'terminal':  execCommand,
  'backup':    backupCommand,
  'cleartemp': clearTempCommand,
  'clean':     clearTempCommand,
  'setprefix': setPrefixCommand,
  'setname':   setNameCommand,
  'join':      joinCommand,
  'leave':     leaveCommand,
  'block':     blockCommand,
  'unblock':   unblockCommand,
  'broadcast': broadcastCommand,
  'bc':        broadcastCommand,
  'restart':   restartCommand,
  'mode':      modeCommand,
};

// ── Main message handler ──────────────────────────────────────────────────────
export async function handleMessage(sock, msg) {
  try {
    // Ignore status broadcasts
    if (msg.key.remoteJid === 'status@broadcast') return;

    // Ignore own messages ONLY if not a command
    // (some bots use same number — allow fromMe commands)
    const text   = getMessageText(msg);
    const sender = getSender(msg);
    const jid    = msg.key.remoteJid;

    // Debug — log ALL incoming messages so we can see what's arriving
    if (text) {
      logger.info(`📨 MSG from ${sender} | jid: ${jid} | fromMe: ${msg.key.fromMe} | text: "${text}"`);
    }

    // Ignore own messages
    if (msg.key.fromMe) return;

    // Ignore empty messages
    if (!text) return;

    // Check if message is answering an active trivia session
    const triviaResult = checkTriviaAnswer(jid, text);
    if (triviaResult) {
      if (triviaResult.correct) {
        await sock.sendMessage(jid, {
          text: `🎉 *Correct!* Great job!\n✅ Answer: *${triviaResult.answer}*`,
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, {
          text: `❌ *Incorrect!* Better luck next time.\n✅ Correct Answer: *${triviaResult.answer}*`,
        }, { quoted: msg });
      }
      return;
    }

    // Must start with prefix
    if (!text.startsWith(config.prefix)) {
      logger.info(`⏭️  No prefix found in: "${text}" (prefix is "${config.prefix}")`);
      return;
    }

    // Parse command and args
    const body    = text.slice(config.prefix.length).trim();
    const [cmd, ...args] = body.split(/\s+/);
    const command = cmd?.toLowerCase();

    if (!command) return;

    logger.info(`🔍 Command detected: [${command}] from ${sender}`);

    // ── Mode guard ────────────────────────────────────────────────────────────
    const inGroup  = isGroup(msg);
    if (config.mode === 'private' && sender !== config.ownerNumber) {
      logger.info(`🔒 Private mode — blocked ${sender}`);
      return;
    }
    if (config.mode === 'group' && !inGroup) {
      logger.info(`🔒 Group mode — blocked DM from ${sender}`);
      return;
    }

    // ── Cooldown check ────────────────────────────────────────────────────────
    if (sender !== config.ownerNumber && isOnCooldown(sender, command)) {
      await sock.sendMessage(jid, {
        text: `⏳ Please wait ${config.cooldown}s before using *${config.prefix}${command}* again.`,
      });
      return;
    }

    // ── Look up command ───────────────────────────────────────────────────────
    const handler = COMMANDS[command];
    if (!handler) {
      logger.info(`❓ Unknown command: [${command}]`);
      return;
    }

    logger.info(`✅ Executing [${command}] for ${sender}`);

    // ── Execute ───────────────────────────────────────────────────────────────
    await handler(sock, msg, args);

  } catch (err) {
    logger.error('Handler error:', err);
  }
}
