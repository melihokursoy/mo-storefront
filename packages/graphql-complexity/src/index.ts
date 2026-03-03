/**
 * Shared GraphQL Complexity Validation Library
 * Provides complexity validation for Apollo Server gateway and subgraphs
 */

export type { ComplexityConfig } from './complexity-config';
export {
  GATEWAY_COMPLEXITY_CONFIG,
  SUBGRAPH_COMPLEXITY_CONFIG,
} from './complexity-config';

export {
  createComplexityPlugin,
  type ComplexityPluginConfig,
} from './complexity-plugin';
