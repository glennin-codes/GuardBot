# Telegram Bot

A modular Telegram bot built with TypeScript and the Telegraf framework.

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the example environment file and update with your Telegram bot token:
   ```
   cp .env.example .env
   ```
   Then edit `.env` to add your bot token from BotFather.

## Development

Run the bot in development mode with hot-reload:
```
npm run dev
```

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
