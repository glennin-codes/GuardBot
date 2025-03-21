import { Telegraf } from 'telegraf';
import { BotContext, Command } from '../types';
import { startCommand } from './start';
import { termsCommand } from './terms';
import logger from '../utils/logger';

// Array of all commands
export const commands: Command[] = [
  startCommand,
  termsCommand,
  // Add more commands here
];

// Register all commands with the bot
export const registerCommands = (bot: Telegraf<BotContext>): void => {
  for (const command of commands) {
    bot.command(command.name, (ctx) => command.execute(ctx));
    logger.info(`Registered command: /${command.name}`);
  }
}; 