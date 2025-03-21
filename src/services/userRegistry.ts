import fetch from 'node-fetch';
import logger from '../utils/logger';
import { mockRegistrationEndpoint } from './mockEndpoint';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Endpoint configuration
const REGISTRATION_ENDPOINT = process.env.REGISTRATION_ENDPOINT || 'https://api.example.com/register';
const USE_MOCK_ENDPOINT = process.env.USE_MOCK_ENDPOINT ||'true';
console.log(USE_MOCK_ENDPOINT);
interface RegistrationResponse {
  success: boolean;
  message?: string;
  transactionId?: string;
}

/**
 * Register a user's Telegram ID with the blockchain via an API endpoint
 */
export async function registerUserOnBlockchain(telegramId: number, username?: string): Promise<RegistrationResponse> {
  try {
    console.log(USE_MOCK_ENDPOINT);
    // Use mock implementation if in development mode
    if (USE_MOCK_ENDPOINT === 'true') {
      logger.info(`Using mock endpoint for registering user ${telegramId}`);
      const mockResponse = await mockRegistrationEndpoint(telegramId, username);

      // Save the mock response to a JSON file
      saveToJsonFile({ telegramId, username, ...mockResponse });

      return mockResponse;
    } else {
      logger.info(`Registering user ${telegramId} on blockchain`);
      const response = await fetch(REGISTRATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          telegramId,
          username,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json() as RegistrationResponse;
      logger.info(`User ${telegramId} successfully registered`, { transactionId: data.transactionId });

      return data;
    }
  } catch (error) {
    logger.error(`Failed to register user ${telegramId}`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Save registration data to a JSON file
 */
function saveToJsonFile(data: any): void {
  //save to root directory
  const filePath = path.join(__dirname, '..', 'registrations.json');
  let registrations = [];

  // Read existing data if the file exists
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    registrations = JSON.parse(fileContent);
  }

  // Add new data
  registrations.push(data);

  // Write updated data back to the file
  fs.writeFileSync(filePath, JSON.stringify(registrations, null, 2));
  logger.info(`Data saved to ${filePath}`);
}