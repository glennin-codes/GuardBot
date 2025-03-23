import { BotContext, Command } from '../types';
import { getUserSecrets, reconstructSecret } from '../services/shardDistribution';
import logger from '../utils/logger';
import { Markup } from 'telegraf';

export const retrieveSecretCommand: Command = {
  name: 'retrieve',
  description: 'Retrieve your secret using its ID',
  async execute(ctx: BotContext): Promise<void> {
    try {
      if (!ctx.from?.id) {
        await ctx.reply('Could not identify user.');
        return;
      }

      // If a secret ID is provided, try to retrieve that specific secret
      const args = ctx.message && 'text' in ctx.message ? ctx.message.text.split(' ') : [];
      if (args.length > 1) {
        const secretId = args[1];
        await handleSecretRetrieval(ctx, secretId);
        return;
      }

      // Otherwise, show list of user's secrets
      const secrets = await getUserSecrets(ctx.from.id);
      
      if (secrets.length === 0) {
        await ctx.reply(
          'You have no secrets stored in the system.\n' +
          'To store a new secret, use the /start command.'
        );
        return;
      }

      // Create buttons for each secret
      const buttons = secrets.map(secret => [
        Markup.button.callback(
          `Secret ${secret.secretId.slice(0, 8)}... (${secret.threshold}/${secret.totalShares} shares)`,
          `retrieve_${secret.secretId}`
        )
      ]);

      await ctx.reply(
        '🔐 Your Stored Secrets:\n' +
        'Select a secret to retrieve:',
        Markup.inlineKeyboard(buttons)
      );
    } catch (error) {
      logger.error('Error in retrieve command', error);
      await ctx.reply('An error occurred while retrieving your secrets.');
    }
  }
};

// Handle the retrieval of a specific secret
export const handleSecretRetrieval = async (
  ctx: BotContext,
  secretId: string
): Promise<void> => {
  try {
    if (!ctx.from?.id) {
      await ctx.reply('Could not identify user.');
      return;
    }

    await ctx.reply('🔄 Retrieving your secret...');

    const result = await reconstructSecret(secretId, ctx.from.id);

    if (!result.success) {
      await ctx.reply(
        '❌ Failed to retrieve your secret:\n' +
        result.message
      );
      return;
    }

    // Send the secret in a separate message
    await ctx.reply(
      '✅ Your secret has been successfully reconstructed!\n' +
      'Here is your secret (sent in a separate message for security):'
    );
    
    await ctx.reply(
      `🔑 ${result.secret}`,
      { parse_mode: 'MarkdownV2' } // Escape special characters
    );

    // Security reminder
    await ctx.reply(
      '⚠️ Security Reminder:\n' +
      '1. Delete these messages after saving your secret\n' +
      '2. Store your secret securely\n' +
      '3. Consider creating a new split if this was a recovery'
    );
  } catch (error) {
    logger.error('Error handling secret retrieval', error);
    await ctx.reply('An error occurred while retrieving your secret.');
  }
}; 