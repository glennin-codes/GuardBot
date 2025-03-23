import { BotContext } from '../types';
import logger from '../utils/logger';
import { Markup, Context } from 'telegraf';
import { splitPrivateKey } from '../utils/secretSharing';
import { 
  registerCustodian, 
  saveSecret, 
  distributeShards,
  getSecretCustodians,
  calculateOptimalShareConfig 
} from '../services/shardDistribution';
import fs from 'fs';
import path from 'path';

// Import terms from start command
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

// State management (in memory for now, should be moved to a proper database)
const userStates = new Map<number, {
  secret?: string;
  totalShares?: number;
  threshold?: number;
  role?: 'provider' | 'custodian';
  awaitingInput?: 'secret' | 'totalShares' | 'threshold';
}>();

export const handleSecretProviderRole = async (ctx: BotContext): Promise<void> => {
  try {
    if (!ctx.from?.id) return;

    userStates.set(ctx.from.id, { role: 'provider' });

    await ctx.reply(
      SECRET_PROVIDER_TERMS,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ I Accept', 'accept_provider_terms')],
        [Markup.button.callback('❌ I Decline', 'decline_provider_terms')]
      ])
    );
  } catch (error) {
    logger.error('Error handling secret provider role', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
};

export const handleShardCustodianRole = async (ctx: BotContext): Promise<void> => {
  try {
    if (!ctx.from?.id) return;

    userStates.set(ctx.from.id, { role: 'custodian' });

    await ctx.reply(
      SHARD_CUSTODIAN_TERMS,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ I Accept', 'accept_custodian_terms')],
        [Markup.button.callback('❌ I Decline', 'decline_custodian_terms')]
      ])
    );
  } catch (error) {
    logger.error('Error handling shard custodian role', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
};

export const handleAcceptProviderTerms = async (ctx: BotContext): Promise<void> => {
  try {
    if (!ctx.from?.id) return;

    // Calculate optimal shares based on available custodians
    const { totalShares, threshold, reason } = calculateOptimalShareConfig(ctx.from.id);

    // Set state with pre-calculated values
    const userState = {
      role: 'provider' as const,
      awaitingInput: 'secret' as const,
      totalShares,
      threshold
    };
    userStates.set(ctx.from.id, userState);

    await ctx.reply(
      '🔐 Please enter your secret that you want to split (send it as a message).\n\n' +
      'Based on available custodians, your secret will be:\n' +
      `- Split into ${totalShares} shares\n` +
      `- Require ${threshold} shares to reconstruct\n` +
      `(${reason})\n\n` +
      'Warning: Make sure you are in a secure environment when sharing your secret.'
    );
  } catch (error) {
    logger.error('Error handling provider terms acceptance', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
};

export const handleAcceptCustodianTerms = async (ctx: BotContext): Promise<void> => {
  try {
    if (!ctx.from?.id) return;
    
    // Register the user as a custodian
    const result = await registerCustodian(ctx.from.id, ctx.from.username);
    
    if (!result.success) {
      if (result.message === 'You are already registered as a custodian.') {
        await ctx.reply(
          '📝 You are already registered as a shard custodian.\n\n' +
          'Current Status:\n' +
          '- Ready to receive and protect shards\n' +
          '- Maintain high availability\n' +
          '- Report any security concerns\n\n' +
          'You will be notified when you are assigned new shards to protect.'
        );
      } else {
        await ctx.reply(
          '❌ Registration failed: ' + result.message + '\n' +
          'Please try again later or contact support.'
        );
      }
      return;
    }
    
    await ctx.reply(
      '💎 Thank you for becoming a shard custodian!\n\n' +
      'You are now eligible to receive and maintain secret shards. ' +
      'You will be notified when you are assigned a shard to protect.\n\n' +
      'Remember:\n' +
      '- Keep your assigned shards secure\n' +
      '- Never share shard contents with anyone\n' +
      '- Maintain high availability\n' +
      '- Report any security concerns immediately'
    );
  } catch (error) {
    logger.error('Error handling custodian terms acceptance', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
};

export const handleDeclineTerms = async (ctx: BotContext): Promise<void> => {
  try {
    if (!ctx.from?.id) return;
    userStates.delete(ctx.from.id);
    
    await ctx.reply(
      'You have declined the terms and conditions.\n' +
      'If you change your mind, you can start over with the /start command.'
    );
  } catch (error) {
    logger.error('Error handling terms decline', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
};

// Handle text messages for the secret sharing flow
export const handleTextMessage = async (ctx: BotContext): Promise<void> => {
  try {
    if (!ctx.from?.id || !ctx.message || !('text' in ctx.message)) return;

    const userState = userStates.get(ctx.from.id);
    if (!userState || !userState.awaitingInput) return;

    const text = ctx.message.text;

    switch (userState.awaitingInput) {
      case 'secret':
        if (!userState.totalShares || !userState.threshold) {
          await ctx.reply('Something went wrong. Please start over with /start.');
          return;
        }

        // Split the secret using pre-calculated values
        const shares = await splitPrivateKey(text, {
          totalShares: userState.totalShares,
          threshold: userState.threshold
        });

        // Save the secret and get its ID
        const secretId = await saveSecret(
          ctx.from.id,
          ctx.from.username,
          userState.totalShares,
          userState.threshold,
          shares
        );

        // Get custodian information
        const custodians = getSecretCustodians(secretId);
        
        if (custodians.length < userState.totalShares) {
          await ctx.reply(
            '⚠️ Your secret has been split, but we could not distribute all shards immediately.\n' +
            'This could be because there are not enough custodians available.\n' +
            'Your secret is safely stored and will be distributed as soon as more custodians join.\n\n' +
            `Secret ID: ${secretId}\n` +
            'Please save this ID for future reference.'
          );
        } else {
          await ctx.reply(
            '✅ Your secret has been successfully split and distributed!\n\n' +
            `Secret ID: ${secretId}\n` +
            `Total Shares: ${userState.totalShares}\n` +
            `Threshold: ${userState.threshold}\n\n` +
            'Shard Distribution:\n' +
            custodians.map(c => 
              `Shard ${c.shardIndex + 1}: Custodian @${c.username || 'Anonymous'}`
            ).join('\n') +
            '\n\nPlease save your Secret ID for future reference.'
          );
        }

        // Clear user state
        userStates.delete(ctx.from.id);
        break;
    }
  } catch (error) {
    logger.error('Error handling text message', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}; 