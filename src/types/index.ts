import { Context } from 'telegraf';

export interface BotContext extends Context {
  // Add custom properties to the context here
}

export interface Command {
  name: string;
  description: string;
  execute(ctx: BotContext): Promise<void>;
} 