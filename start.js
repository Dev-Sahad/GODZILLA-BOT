/**
 * start.js — Entry point for Render and other cloud platforms
 * Executes the launcher which starts the bot
 */
import('./launcher.js').catch(err => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
