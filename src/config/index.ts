import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const config = {
  botToken: process.env.BOT_TOKEN,
};

// Validate configuration
if (!config.botToken) {
  throw new Error('BOT_TOKEN is required in environment variables');
}

export default config; 