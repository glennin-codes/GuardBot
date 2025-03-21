import { BotContext, Command } from '../types';

export const startCommand: Command = {
  name: 'start',
  description: 'Start the bot',
  async execute(ctx: BotContext): Promise<void> {
    const userName = ctx.from?.first_name || 'there';
    await ctx.reply(`Hello, ${userName}! I'm your new bot. I'm ready to help you.`);
  }
}; 