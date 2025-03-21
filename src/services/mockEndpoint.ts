import logger from '../utils/logger';

/**
 * A mock implementation that simulates registration endpoint responses.
 * Use this for development/testing when the actual endpoint is not available.
 */
export function mockRegistrationEndpoint(telegramId: number, username?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      logger.info(`MOCK: Registering user ${telegramId} (${username || 'no username'}) on blockchain`);
      
      // Generate a random success/failure (90% success rate)
      const isSuccess = Math.random() < 0.9;
      
      if (isSuccess) {
        // Create a mock transaction ID
        const transactionId = `tx_${Math.random().toString(36).substring(2, 15)}`;
        logger.info(`MOCK: User ${telegramId} successfully registered`, { transactionId });
        
        resolve({
          success: true,
          message: 'Registration successful',
          transactionId
        });
      } else {
        // Simulate an error
        logger.error(`MOCK: Failed to register user ${telegramId}`);
        resolve({
          success: false,
          message: 'Mock endpoint simulation: Registration failed'
        });
      }
    }, 1500); // 1.5 second delay to simulate network latency
  });
} 