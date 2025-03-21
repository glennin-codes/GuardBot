# Telegram Bot

A modular Telegram bot built with TypeScript and the Telegraf framework that registers users on a blockchain.

## Features

- User registration on blockchain when they start the bot
- Modular command structure for easy extensibility
- Development mode with mock blockchain endpoint

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the example environment file and update with your configuration:
   ```
   cp .env.example .env
   ```
   Then edit `.env` to add:
   - Your bot token from BotFather
   - Your registration endpoint URL
   - Set USE_MOCK_ENDPOINT to true/false for development/production

## Development

Run the bot in development mode with hot-reload:
```
npm run dev
```

When developing, you can set `USE_MOCK_ENDPOINT=true` in your `.env` file to use a simulated blockchain registration endpoint.

## Build and Run

Build the TypeScript project:
```
npm run build
```

Start the production version:
```
npm start
```

## Project Structure

- `src/commands/` - Bot commands
- `src/services/` - Services for the bot
- `src/config/` - Configuration management
- `src/utils/` - Utility functions
- `src/types/` - TypeScript type definitions

## Registration Workflow

When a user sends the `/start` command to the bot:
1. The bot captures their Telegram ID
2. The ID is sent to a blockchain registration endpoint
3. The user receives confirmation of successful registration
