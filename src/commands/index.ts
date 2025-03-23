import { Telegraf } from 'telegraf';
import { BotContext } from '../types';
import { startCommand } from './start';
import { retrieveSecretCommand, handleSecretRetrieval } from './retrieve-secret';
import { generateDummyCustodiansCommand, clearDummyCustodiansCommand } from './generate-dummy-custodians';
import { becomeProviderCommand, becomeCustodianCommand } from './roles';
import logger from '../utils/logger';

// List of all available commands
const commands = [
  startCommand,
  retrieveSecretCommand,
  generateDummyCustodiansCommand,
  clearDummyCustodiansCommand,
  becomeProviderCommand,
  becomeCustodianCommand
];

export const registerCommands = (bot: Telegraf<BotContext>): void => {
  // Register each command
  commands.forEach(command => {
    bot.command(command.name, command.execute);
    logger.info(`Registered command: /${command.name}`);
  });

  // Register action handlers
  bot.action(/retrieve_(.+)/, async (ctx) => {
    const match = ctx.match[1];
    if (match) {
      await handleSecretRetrieval(ctx, match);
    }
  });
}; 