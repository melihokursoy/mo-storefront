/**
 * Configuration for GraphQL query complexity validation
 */

export interface ComplexityConfig {
  maxComplexity: number;
  defaultFieldCost: number;
  listFieldMultiplier: number;
  mutationBaseCost: number;
  federationReferenceCost: number;
  dataLoaderDiscount: number;
}

export const GATEWAY_COMPLEXITY_CONFIG: ComplexityConfig = {
  maxComplexity: 1000, // Allows for federated cross-subgraph queries
  defaultFieldCost: 1,
  listFieldMultiplier: 10,
  mutationBaseCost: 10,
  federationReferenceCost: 5,
  dataLoaderDiscount: 0.5, // 50% discount for batched loads
};

export const SUBGRAPH_COMPLEXITY_CONFIG: ComplexityConfig = {
  maxComplexity: 500, // Lower per-subgraph to prevent resource exhaustion
  defaultFieldCost: 1,
  listFieldMultiplier: 10,
  mutationBaseCost: 10,
  federationReferenceCost: 5,
  dataLoaderDiscount: 0.5,
};
