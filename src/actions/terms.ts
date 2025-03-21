import { BotContext } from '../types';
import logger from '../utils/logger';

export const handleViewTerms = async (ctx: BotContext): Promise<void> => {
  try {
    // Use the /terms command to show terms
    await ctx.reply('Use /terms to view our full terms and conditions.');
  } catch (error) {
    logger.error('Error handling view terms action', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
};

export const handleAcceptTerms = async (ctx: BotContext): Promise<void> => {
  try {
    await ctx.reply(
      '✅ Thank you for accepting our terms and conditions!\n\n' +
      'You are now eligible to participate in our secret sharing service. ' +
      'You may be assigned key shards to store securely and earn rewards for maintaining them.\n\n' +
      'We will notify you when you receive your first shard to protect.'
    );
  } catch (error) {
    logger.error('Error handling accept terms action', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
};

export const handleDeclineTerms = async (ctx: BotContext): Promise<void> => {
  try {
    await ctx.reply(
      '❌ You have declined the terms and conditions.\n\n' +
      'Unfortunately, you cannot participate in the secret sharing service without accepting the terms. ' +
      'If you change your mind, you can start over with the /start command.'
    );
  } catch (error) {
    logger.error('Error handling decline terms action', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}; 