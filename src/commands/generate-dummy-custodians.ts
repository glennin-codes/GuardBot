import { BotContext, Command } from '../types';
import { generateDummyCustodians, clearDummyCustodians } from '../services/shardDistribution';
import logger from '../utils/logger';

export const generateDummyCustodiansCommand: Command = {
  name: 'generate',
  description: 'Generate dummy custodians for testing',
  async execute(ctx: BotContext): Promise<void> {
    try {
      if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please provide the number of custodians to generate (default: 100)');
        return;
      }

      const args = ctx.message.text.split(' ');
      const count = args[1] ? parseInt(args[1]) : 100;

      if (isNaN(count) || count < 1 || count > 1000) {
        await ctx.reply('Please provide a valid number between 1 and 1000');
        return;
      }

      await ctx.reply(`Generating ${count} dummy custodians...`);
      await generateDummyCustodians(count);
      
      await ctx.reply(
        `✅ Successfully generated ${count} dummy custodians!\n\n` +
        'You can now test the secret sharing functionality.\n' +
        'To remove dummy custodians, use /clear-dummy-custodians'
      );
    } catch (error) {
      logger.error('Error in generate-dummy-custodians command', error);
      await ctx.reply('An error occurred while generating dummy custodians.');
    }
  }
};

export const clearDummyCustodiansCommand: Command = {
  name: 'clear',
  description: 'Remove all dummy custodians',
  async execute(ctx: BotContext): Promise<void> {
    try {
      await ctx.reply('Clearing dummy custodians...');
      await clearDummyCustodians();
      
      await ctx.reply('✅ Successfully removed all dummy custodians!');
    } catch (error) {
      logger.error('Error in clear-dummy-custodians command', error);
      await ctx.reply('An error occurred while clearing dummy custodians.');
    }
  }
}; 