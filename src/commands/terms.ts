import { BotContext, Command } from '../types';
import logger from '../utils/logger';

const TERMS_AND_CONDITIONS = `
📜 Terms and Conditions for Secret Sharing Service

1. Service Description:
   - We use Shamir's Secret Sharing to split private keys into multiple shards
   - Each shard is distributed to different users for safekeeping
   - Users are rewarded for maintaining their shards securely
   - Users may face penalties for losing their assigned shards

2. User Responsibilities:
   - Users agree to securely store any key shards assigned to them
   - Users must not share or expose their assigned shards to others
   - Users must maintain an active account to participate
   - Users must promptly report any potential compromise of their shards

3. Rewards and Penalties:
   - Users will be rewarded periodically for maintaining their shards
   - Rewards may be adjusted based on shard importance and storage duration
   - Loss or compromise of shards may result in penalties
   - Intentional exposure of shards will result in immediate termination

4. Privacy and Security:
   - We implement industry-standard security measures
   - Users' personal data is protected and encrypted
   - We do not store complete private keys in any single location
   - Regular security audits are performed

5. Disclaimer:
   - The service is provided "as is" without warranties
   - We are not responsible for losses due to user negligence
   - We reserve the right to modify these terms with notice
   - Users may terminate participation with proper notice

By using this service, you agree to these terms and conditions.`;

export const termsCommand: Command = {
  name: 'terms',
  description: 'Display the terms and conditions',
  async execute(ctx: BotContext): Promise<void> {
    try {
      await ctx.reply(TERMS_AND_CONDITIONS);
    } catch (error) {
      logger.error('Error displaying terms and conditions', error);
      await ctx.reply('An error occurred while displaying the terms and conditions. Please try again later.');
    }
  }
}; 