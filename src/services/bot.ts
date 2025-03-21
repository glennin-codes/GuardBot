import { Telegraf } from 'telegraf';
import { BotContext } from '../types';
import config from '../config';
import { registerCommands } from '../commands';
import logger from '../utils/logger';
import { 
  handleSecretProviderRole,
  handleShardCustodianRole,
  handleAcceptProviderTerms,
  handleAcceptCustodianTerms,
  handleDeclineTerms,
  handleTextMessage
} from '../actions/roles';

// Create a bot instance
export const createBot = (): Telegraf<BotContext> => {
  const bot = new Telegraf<BotContext>(config.botToken as string);
  
  // Register commands
  registerCommands(bot);
  
  // Register role selection handlers
  bot.action('role_secret_provider', handleSecretProviderRole);
  bot.action('role_shard_custodian', handleShardCustodianRole);
  
  // Register terms acceptance handlers
  bot.action('accept_provider_terms', handleAcceptProviderTerms);
  bot.action('accept_custodian_terms', handleAcceptCustodianTerms);
  bot.action('decline_provider_terms', handleDeclineTerms);
  bot.action('decline_custodian_terms', handleDeclineTerms);
  
  // Register message handler for secret sharing flow
  bot.on('text', async (ctx, next) => {
    if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text;
      
      // Skip if it's a command
      if (text.startsWith('/')) {
        return next();
      }
      
      await handleTextMessage(ctx);
    }
    return next();
  });
  
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