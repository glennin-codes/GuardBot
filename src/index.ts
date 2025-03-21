import { createBot, startBot } from './services/bot';

async function main() {
  try {
    // Create and start the bot
    const bot = createBot();
    await startBot(bot);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Run the application
main(); 