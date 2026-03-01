/**
 * Custom complexity estimator for GraphQL queries
 * Calculates query complexity considering:
 * - Field types (scalar, object, list)
 * - List multipliers from limit arguments
 * - Mutations with base costs
 * - Federation entity references with DataLoader discount
 */

import { GraphQLList } from 'graphql';
import { ComplexityConfig } from './complexity-config';

export interface ComplexityEstimatorArgs {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Creates a complexity estimator function for use with graphql-query-complexity
 * @param config - Complexity configuration
 * @returns Estimator function
 */
export function createComplexityEstimator(config: ComplexityConfig) {
  return function complexityEstimator(
    field: any,
    args: ComplexityEstimatorArgs,
    childComplexity: number
  ): number {
    let cost = config.defaultFieldCost;

    // Detect if this is a list field
    const isListField = field.type instanceof GraphQLList;

    if (isListField) {
      // Use 'limit' or 'first' argument for multiplier, default to 10
      const limit = args.limit || args.first || args.pageSize || 10;
      cost = Math.min(limit, 100) * config.listFieldMultiplier;
    }

    // Check if it's a mutation (mutations are typically root Query/Mutation fields)
    const fieldName = (field.name || '').toLowerCase();
    const isMutation =
      fieldName.includes('create') ||
      fieldName.includes('update') ||
      fieldName.includes('delete') ||
      fieldName.includes('add') ||
      fieldName.includes('remove');

    if (isMutation) {
      cost += config.mutationBaseCost;
    }

    // Check for federation references (@key, @requires directives)
    // Federation references have entity references that benefit from DataLoader
    const isFederationReference =
      field.directives?.some(
        (d: any) =>
          d.name === 'key' || d.name === 'requires' || d.name === 'external'
      ) || false;

    if (isFederationReference) {
      cost += config.federationReferenceCost;
      // Apply DataLoader discount since batching is handled
      cost *= config.dataLoaderDiscount;
    }

    // Add child complexity
    const totalCost = cost + childComplexity;

    return totalCost;
  };
}
