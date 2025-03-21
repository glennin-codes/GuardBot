import { BotContext, Command } from '../types';
import { registerUserOnBlockchain } from '../services/userRegistry';
import logger from '../utils/logger';
import { Markup } from 'telegraf';

// Different terms for different user types
const SECRET_PROVIDER_TERMS = `
📜 Terms and Conditions for Secret Providers

1. Service Description:
   - Your secret will be split into multiple shards using Shamir's Secret Sharing
   - Shards will be distributed to trusted custodians
   - Recovery requires a threshold number of shards

2. Security Measures:
   - Your secret is split client-side for maximum security
   - We never store your complete secret
   - Shards are encrypted before storage

3. Risks and Responsibilities:
   - We cannot recover your secret without sufficient shards
   - Choose appropriate threshold values
   - Verify your secret before submission

4. Privacy:
   - Your secret is protected by advanced cryptography
   - We maintain strict confidentiality
   - Only shard custodians approved by our system can participate

By proceeding, you agree to these terms and understand the risks involved.`;

const SHARD_CUSTODIAN_TERMS = `
📜 Terms and Conditions for Shard Custodians

1. Responsibilities:
   - Securely store assigned key shards
   - Maintain high availability
   - Report any potential security breaches
   - Never share shard contents

2. Rewards:
   - Earn rewards for maintaining shards
   - Bonus rewards for long-term reliability
   - Additional rewards for quick response time

3. Penalties:
   - Penalties for losing shards
   - Immediate termination for intentional exposure
   - Reputation impact for negligence

4. Security Requirements:
   - Use secure storage methods
   - Regular verification checks
   - Two-factor authentication required

By accepting, you commit to being a reliable shard custodian.`;

export const startCommand: Command = {
  name: 'start',
  description: 'Start the bot and register user on blockchain',
  async execute(ctx: BotContext): Promise<void> {
    try {
      const userName = ctx.from?.first_name || 'there';
      // Send initial welcome message
      await ctx.reply(`Hello, ${userName}! I'm processing your registration...`);
      
      if (!ctx.from?.id) {
        logger.error('Cannot register user: User ID not found in context');
        await ctx.reply('Error: Could not retrieve your user information. Please try again later.');
        return;
      }
      
      // Register the user on the blockchain
      const result = await registerUserOnBlockchain(
        ctx.from.id, 
        ctx.from.username
      );
      
      if (result.success) {
        await ctx.reply(
          `Registration successful! Your Telegram ID has been registered on the blockchain.\n` +
          `Transaction ID: ${result.transactionId || 'N/A'}\n\n` +
          `Please choose how you would like to participate in our service:`,
          Markup.inlineKeyboard([
            [Markup.button.callback('🔐 Split My Secret', 'role_secret_provider')],
            [Markup.button.callback('💎 Become a Shard Custodian', 'role_shard_custodian')]
          ])
        );
      } else {
        logger.error('Registration failed', { message: result.message });
        await ctx.reply(
          `Sorry, there was an issue with your registration: ${result.message}\n` +
          `Please try again later or contact support.`
        );
      }
    } catch (error) {
      logger.error('Error in start command', error);
      await ctx.reply('An unexpected error occurred. Please try again later.');
    }
  }
}; 