interface ShardCalculation {
  totalShares: number;
  threshold: number;
  reason: string;
}

export const calculateOptimalShards = (availableCustodians: number): ShardCalculation => {
  // Minimum requirements
  if (availableCustodians < 3) {
    return {
      totalShares: 2,
      threshold: 2,
      reason: "Minimum configuration due to limited custodians"
    };
  }

  // For security and reliability, we use these rules:
  // 1. Never use all custodians (keep some as backup)
  // 2. Threshold should be > 50% of shares for security
  // 3. Maximum shares should scale with custodian count but not be too high
  
  let totalShares: number;
  let threshold: number;
  
  if (availableCustodians <= 5) {
    // Small pool: Use N-1 custodians, threshold = N/2 + 1
    totalShares = availableCustodians - 1;
    threshold = Math.ceil(totalShares / 2);
    return {
      totalShares,
      threshold,
      reason: "Small custodian pool configuration"
    };
  }
  
  if (availableCustodians <= 10) {
    // Medium pool: Use 70% of custodians, threshold = 60% of shares
    totalShares = Math.floor(availableCustodians * 0.7);
    threshold = Math.ceil(totalShares * 0.6);
    return {
      totalShares,
      threshold,
      reason: "Medium custodian pool configuration"
    };
  }
  
  // Large pool: Cap at 15 shares, threshold = 60% of shares
  totalShares = Math.min(15, Math.floor(availableCustodians * 0.5));
  threshold = Math.ceil(totalShares * 0.6);
  
  return {
    totalShares,
    threshold,
    reason: "Large custodian pool configuration"
  };
}; 