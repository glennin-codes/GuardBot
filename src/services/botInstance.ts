import { Telegraf } from 'telegraf';
import { BotContext } from '../types';
import config from '../config';

// Create a singleton bot instance
export const bot = new Telegraf<BotContext>(config.botToken as string); 