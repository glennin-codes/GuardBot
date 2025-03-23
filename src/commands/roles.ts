import { BotContext, Command } from '../types';
import { handleSecretProviderRole, handleShardCustodianRole } from '../actions/roles';

export const becomeProviderCommand: Command = {
  name: 'provider',
  description: 'Become a secret provider and start splitting secrets',
  async execute(ctx: BotContext): Promise<void> {
    await handleSecretProviderRole(ctx);
  }
};

export const becomeCustodianCommand: Command = {
  name: 'custodian',
  description: 'Become a shard custodian and help secure secrets',
  async execute(ctx: BotContext): Promise<void> {
    await handleShardCustodianRole(ctx);
  }
}; 