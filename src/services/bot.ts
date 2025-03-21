import { Telegraf } from 'telegraf';
import { BotContext } from '../types';
import config from '../config';
import { registerCommands } from '../commands';
import logger from '../utils/logger';

// Create a bot instance
export const createBot = (): Telegraf<BotContext> => {
  const bot = new Telegraf<BotContext>(config.botToken as string);
  
  // Register commands
  registerCommands(bot);
  
  // Register middleware if needed
  // bot.use(async (ctx, next) => {
  //   // Custom middleware
  //   await next();
  // });
  
  return bot;
};

// Start the bot
export const startBot = async (bot: Telegraf<BotContext>): Promise<void> => {
  try {
    await bot.launch();
  logger.info('Bot started successfully!');
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (error) {
    console.error('Error starting bot:', error);
    process.exit(1);
  }
}; 