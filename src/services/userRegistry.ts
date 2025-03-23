import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const USE_MOCK_ENDPOINT = process.env.USE_MOCK_ENDPOINT || 'true';

interface User {
  telegramId: number;
  username?: string;
  registrationDate: string;
  transactionId?: string;
}

// Helper functions to read and write JSON files
const readUsersFile = (): User[] => {
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeUsersFile = (users: User[]): void => {
  const dirPath = path.dirname(USERS_FILE);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Check if user is already registered
const isUserRegistered = (telegramId: number): boolean => {
  const users = readUsersFile();
  return users.some(user => user.telegramId === telegramId);
};

// Mock registration endpoint for testing
const mockRegistrationEndpoint = async (
  telegramId: number,
  username?: string
): Promise<{ success: boolean; transactionId?: string; message: string }> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    transactionId: `mock_tx_${Date.now()}`,
    message: 'Successfully registered on mock blockchain'
  };
};

// Save user registration data
const saveUserRegistration = (
  telegramId: number,
  username?: string,
  transactionId?: string
): void => {
  const users = readUsersFile();
  
  // Check for existing user
  const existingUserIndex = users.findIndex(u => u.telegramId === telegramId);
  const newUser: User = {
    telegramId,
    username,
    registrationDate: new Date().toISOString(),
    transactionId
  };

  if (existingUserIndex >= 0) {
    // Update existing user
    users[existingUserIndex] = {
      ...users[existingUserIndex],
      username, // Update username if changed
      transactionId // Update transaction ID if provided
    };
  } else {
    // Add new user
    users.push(newUser);
  }

  writeUsersFile(users);
  logger.info(`User registration saved: ${telegramId}`);
};

// Register user on blockchain
export const registerUserOnBlockchain = async (
  telegramId: number,
  username?: string
): Promise<{ success: boolean; transactionId?: string; message: string }> => {
  try {
    // Check if user is already registered
    if (isUserRegistered(telegramId)) {
      logger.info(`User ${telegramId} is already registered`);
      return {
        success: true,
        message: 'User is already registered'
      };
    }

    let result;
    if (USE_MOCK_ENDPOINT === 'true') {
      logger.info(`Using mock endpoint for registering user ${telegramId}`);
      result = await mockRegistrationEndpoint(telegramId, username);
    } else {
      // Real blockchain registration would go here
      throw new Error('Real blockchain registration not implemented');
    }

    if (result.success) {
      // Save registration data
      saveUserRegistration(telegramId, username, result.transactionId);
    }

    return result;
  } catch (error) {
    logger.error('Error registering user:', error);
    return {
      success: false,
      message: 'Failed to register user: ' + (error instanceof Error ? error.message : String(error))
    };
  }
};