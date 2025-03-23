import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { combineShares } from '../utils/secretSharing';
import { Secret, Custodian } from '../types';
import { bot } from './botInstance';
import { calculateOptimalShards } from '../utils/shardCalculator';

const CUSTODIANS_FILE = path.join(__dirname, '..', 'data', 'custodians.json');
const SECRETS_FILE = path.join(__dirname, '..', 'data', 'secrets.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Helper functions to read and write JSON files
const readJsonFile = <T>(filePath: string): T[] => {
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

const writeJsonFile = <T>(filePath: string, data: T[]): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Register a new custodian
export const registerCustodian = async (
  telegramId: number,
  username?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const custodians = readJsonFile<Custodian>(CUSTODIANS_FILE);
    
    // Check if custodian already exists
    const existingCustodian = custodians.find(c => c.telegramId === telegramId);
    if (existingCustodian) {
      logger.info(`Custodian ${telegramId} already registered`);
      return {
        success: false,
        message: 'You are already registered as a custodian.'
      };
    }

    // Create new custodian record
    const newCustodian: Custodian = {
      telegramId,
      username,
      shards: {},
      totalShardsHeld: 0,
      lastAssignmentDate: undefined
    };

    // Add to custodians list and save
    custodians.push(newCustodian);
    writeJsonFile(CUSTODIANS_FILE, custodians);
    
    logger.info(`New custodian registered: ${telegramId}`);
    return {
      success: true,
      message: 'Successfully registered as a custodian.'
    };
  } catch (error) {
    logger.error('Error registering custodian:', error);
    return {
      success: false,
      message: 'An error occurred while registering you as a custodian.'
    };
  }
};

// Save a new secret metadata and distribute shards
export const saveSecret = async (
  ownerTelegramId: number,
  ownerUsername: string | undefined,
  totalShares: number,
  threshold: number,
  shares: string[]
): Promise<string> => {
  const secretId = uuidv4();
  const secrets = readJsonFile<Secret>(SECRETS_FILE);
  
  const newSecret: Secret = {
    secretId,
    ownerTelegramId,
    ownerUsername,
    totalShares,
    threshold,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  
  secrets.push(newSecret);
  writeJsonFile(SECRETS_FILE, secrets);

  // Immediately try to distribute shards
  const distributionSuccess = await distributeShards(secretId, shares);
  
  if (distributionSuccess) {
    newSecret.status = 'distributed';
    writeJsonFile(SECRETS_FILE, secrets);
  }
  
  return secretId;
};

// Get available custodians for shard assignment
const getAvailableCustodians = (
  ownerTelegramId: number,
  secretId: string,
  requiredCustodians: number
): Custodian[] => {
  const custodians = readJsonFile<Custodian>(CUSTODIANS_FILE);
  
  return custodians
    .filter(c => 
      c.telegramId !== ownerTelegramId && // Don't assign to the secret owner
      !c.shards[secretId] && // Don't assign multiple shards of the same secret
      c.totalShardsHeld < 100 // Limit total shards per custodian
    )
    .sort((a, b) => a.totalShardsHeld - b.totalShardsHeld) // Prioritize custodians with fewer shards
    .slice(0, requiredCustodians);
};

// Distribute shards to custodians
export const distributeShards = async (secretId: string, shares: string[]): Promise<boolean> => {
  try {
    const secrets = readJsonFile<Secret>(SECRETS_FILE);
    const secret = secrets.find(s => s.secretId === secretId);
    
    if (!secret || secret.status !== 'pending') {
      logger.error(`Secret ${secretId} not found or not pending`);
      return false;
    }

    const availableCustodians = getAvailableCustodians(
      secret.ownerTelegramId,
      secretId,
      shares.length
    );

    if (availableCustodians.length < shares.length) {
      logger.error(`Not enough custodians available for secret ${secretId}`);
      return false;
    }

    const custodians = readJsonFile<Custodian>(CUSTODIANS_FILE);

    // Assign shards to custodians
    for (let i = 0; i < shares.length; i++) {
      const custodian = availableCustodians[i];
      const assignmentDate = new Date().toISOString();

      // Update custodian records
      const custodianRecord = custodians.find(c => c.telegramId === custodian.telegramId);
      if (custodianRecord) {
        custodianRecord.shards[secretId] = shares[i];
        custodianRecord.totalShardsHeld++;
        custodianRecord.lastAssignmentDate = assignmentDate;

        // Notify custodian
        try {
          await bot.telegram.sendMessage(
            custodian.telegramId,
            `🔐 You have been assigned a new shard to protect!\n\n` +
            `Secret ID: ${secretId}\n` +
            `Assignment Date: ${assignmentDate}\n\n` +
            `Please keep this shard safe and secure. You will be notified when it's needed for reconstruction.`
          );
        } catch (error) {
          logger.error(`Failed to notify custodian ${custodian.telegramId}`, error);
        }
      }
    }

    // Save all changes
    writeJsonFile(CUSTODIANS_FILE, custodians);
    return true;
  } catch (error) {
    logger.error('Error distributing shards:', error);
    return false;
  }
};

// Get secret information
export const getSecretInfo = async (
  secretId: string,
  telegramId: number
): Promise<Secret | null> => {
  const secrets = readJsonFile<Secret>(SECRETS_FILE);
  const secret = secrets.find(s => s.secretId === secretId);
  
  if (!secret || secret.ownerTelegramId !== telegramId) {
    return null;
  }
  
  return secret;
};

// Reconstruct secret from shards
export const reconstructSecret = async (
  secretId: string,
  telegramId: number
): Promise<{ success: boolean; message: string; secret?: string }> => {
  try {
    // Get secret info and verify ownership
    const secret = await getSecretInfo(secretId, telegramId);
    if (!secret) {
      return { 
        success: false, 
        message: 'Secret not found or you are not the owner.' 
      };
    }

    logger.info(`Attempting to reconstruct secret ${secretId} for user ${telegramId}`);
    logger.info(`Secret requires ${secret.threshold} of ${secret.totalShares} shares`);

    // Get shards from custodians
    const custodians = readJsonFile<Custodian>(CUSTODIANS_FILE);
    const shardsFound = custodians
      .filter(c => c.shards[secretId])
      .map(c => c.shards[secretId])
      .slice(0, secret.threshold);

    if (shardsFound.length < secret.threshold) {
      return {
        success: false,
        message: `Not enough shards available. Need ${secret.threshold} shards, but only found ${shardsFound.length}.`
      };
    }

    logger.info(`Found ${shardsFound.length} shards for reconstruction`);

    // Attempt reconstruction
    const reconstructedSecret = await combineShares(shardsFound);
    return {
      success: true,
      message: 'Secret successfully reconstructed.',
      secret: reconstructedSecret
    };
  } catch (error) {
    logger.error('Error reconstructing secret:', error);
    return {
      success: false,
      message: 'Failed to reconstruct secret: ' + (error instanceof Error ? error.message : String(error))
    };
  }
};

// Get all secrets owned by a user
export const getUserSecrets = async (telegramId: number): Promise<Secret[]> => {
  try {
    const secrets = readJsonFile<Secret>(SECRETS_FILE);
    return secrets.filter(s => s.ownerTelegramId === telegramId);
  } catch (error) {
    logger.error('Error getting user secrets:', error);
    return [];
  }
};

// Get custodian information for a secret
export const getSecretCustodians = (secretId: string): Array<{
  shardIndex: number;
  custodianId: number;
  username?: string;
}> => {
  const custodians = readJsonFile<Custodian>(CUSTODIANS_FILE);
  
  return custodians
    .filter(c => c.shards[secretId])
    .map((c, index) => ({
      shardIndex: index,
      custodianId: c.telegramId,
      username: c.username
    }));
};

// Generate dummy custodians for testing
export const generateDummyCustodians = async (count: number = 100): Promise<void> => {
  try {
    const custodians = readJsonFile<Custodian>(CUSTODIANS_FILE);
    const startId = 1000000; // Start from a high number to avoid conflicts
    
    for (let i = 0; i < count; i++) {
      const telegramId = startId + i;
      
      // Skip if custodian already exists
      if (custodians.some(c => c.telegramId === telegramId)) {
        continue;
      }
      
      custodians.push({
        telegramId,
        username: `custodian_${i + 1}`,
        shards: {},
        totalShardsHeld: 0,
        lastAssignmentDate: undefined
      });
    }
    
    writeJsonFile(CUSTODIANS_FILE, custodians);
    logger.info(`Generated ${count} dummy custodians`);
  } catch (error) {
    logger.error('Error generating dummy custodians:', error);
    throw error;
  }
};

// Function to clear all dummy custodians (for cleanup)
export const clearDummyCustodians = async (): Promise<void> => {
  try {
    const custodians = readJsonFile<Custodian>(CUSTODIANS_FILE);
    const realCustodians = custodians.filter(c => c.telegramId < 1000000);
    writeJsonFile(CUSTODIANS_FILE, realCustodians);
    logger.info('Cleared all dummy custodians');
  } catch (error) {
    logger.error('Error clearing dummy custodians:', error);
    throw error;
  }
};

// Get count of available custodians for a secret owner
export const getAvailableCustodianCount = (ownerTelegramId: number): number => {
  const custodians = readJsonFile<Custodian>(CUSTODIANS_FILE);
  return custodians.filter(c => 
    c.telegramId !== ownerTelegramId && // Don't count the secret owner
    c.totalShardsHeld < 100 // Only count custodians who can accept more shards
  ).length;
};

// Calculate optimal shares and threshold for a secret owner
export const calculateOptimalShareConfig = (ownerTelegramId: number): {
  totalShares: number;
  threshold: number;
  reason: string;
} => {
  const availableCustodians = getAvailableCustodianCount(ownerTelegramId);
  return calculateOptimalShards(availableCustodians);
}; 