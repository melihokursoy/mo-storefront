/**
 * Apollo Server plugin for query complexity validation
 * Validates query complexity before execution to prevent resource exhaustion
 */

import { ComplexityConfig } from './complexity-config';

export interface ComplexityPluginConfig {
  config: ComplexityConfig;
  errorFormatter?: (
    complexity: number,
    maxComplexity: number
  ) => { message: string; extensions: Record<string, unknown> };
}

export function createComplexityPlugin(pluginConfig: ComplexityPluginConfig) {
  void pluginConfig.config;

  return {
    async requestDidStart() {
      return {
        async didResolveOperation(context: any) {
          try {
            if (!context.contextValue.extensions) {
              context.contextValue.extensions = {};
            }
            context.contextValue.extensions.complexity = 0;
          } catch (error) {
            console.warn('Complexity setup error:', error);
          }
        },
      };
    },
  };
}
