import { BotContext } from '../types';
import logger from '../utils/logger';
import { Markup, Context } from 'telegraf';
import { splitPrivateKey } from '../utils/secretSharing';
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

    // Set state to await secret input
    const userState = userStates.get(ctx.from.id) || { role: 'provider' };
    userState.awaitingInput = 'secret';
    userStates.set(ctx.from.id, userState);

    await ctx.reply(
      '🔐 Please enter your secret that you want to split (send it as a message).\n' +
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
    if (!userState) return;

    const text = ctx.message.text;

    switch (userState.awaitingInput) {
      case 'secret':
        userState.secret = text;
        userState.awaitingInput = 'totalShares';
        userStates.set(ctx.from.id, userState);
        
        await ctx.reply(
          'How many total shares should we create? (minimum 2, maximum 255)\n' +
          'Enter a number between 2 and 255.',
          Markup.forceReply()
        );
        break;

      case 'totalShares':
        const totalShares = parseInt(text);
        if (isNaN(totalShares) || totalShares < 2 || totalShares > 255) {
          await ctx.reply('Please enter a valid number between 2 and 255.');
          return;
        }

        userState.totalShares = totalShares;
        userState.awaitingInput = 'threshold';
        userStates.set(ctx.from.id, userState);

        await ctx.reply(
          'How many shares should be required to reconstruct the secret? (threshold)\n' +
          `Enter a number between 2 and ${totalShares}.`,
          Markup.forceReply()
        );
        break;

      case 'threshold':
        const threshold = parseInt(text);
        if (!userState.totalShares || !userState.secret) {
          await ctx.reply('Something went wrong. Please start over with /start.');
          return;
        }

        if (isNaN(threshold) || threshold < 2 || threshold > userState.totalShares) {
          await ctx.reply(`Please enter a valid number between 2 and ${userState.totalShares}.`);
          return;
        }

        // Split the secret
        const shares = await splitPrivateKey(userState.secret, {
          totalShares: userState.totalShares,
          threshold: threshold
        });

        // Save shares to JSON file
        const shardsData = {
          telegramId: ctx.from.id,
          username: ctx.from.username,
          totalShares: userState.totalShares,
          threshold: threshold,
          shares: shares,
          timestamp: new Date().toISOString()
        };

        const filePath = path.join(__dirname, '..', 'shards.json');
        let existingData: any[] = [];
        
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          existingData = JSON.parse(fileContent);
        }
        
        existingData.push(shardsData);
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

        // Clear user state
        userStates.delete(ctx.from.id);

        await ctx.reply(
          '✅ Your secret has been successfully split into shards!\n\n' +
          `Total Shares: ${userState.totalShares}\n` +
          `Threshold: ${threshold}\n\n` +
          'The shards will be distributed to trusted custodians.\n' +
          'You will be notified when the distribution is complete.'
        );
        break;
    }
  } catch (error) {
    logger.error('Error handling text message', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}; 