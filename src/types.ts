import { Context } from 'telegraf';

export interface BotContext extends Context {
  // Add any custom context properties here
}

export interface Command {
  name: string;
  description: string;
  execute: (ctx: BotContext) => Promise<void>;
}

export interface Secret {
  secretId: string;
  ownerTelegramId: number;
  ownerUsername?: string;
  totalShares: number;
  threshold: number;
  createdAt: string;
  status: 'pending' | 'distributed' | 'compromised';
}

export interface Custodian {
  telegramId: number;
  username?: string;
  shards: {
    [secretId: string]: string; // Maps secretId to shardData
  };
  totalShardsHeld: number;
  lastAssignmentDate?: string;
} 