/**
 * Integration Test Configuration
 *
 * This module provides configuration settings for integration tests,
 * including test environment setup, database connections, provider settings,
 * and performance benchmarks.
 */

import { ProviderType } from '../../../src/services/history/types';

export interface DatabaseTestConfig {
  type: 'sqlite' | 'memory' | 'postgresql';
  connectionString?: string;
  poolSize?: number;
  timeout?: number;
  migrations?: boolean;
  seedData?: boolean;
}

export interface ProviderTestConfig {
  type: ProviderType;
  enabled: boolean;
  mockMode: boolean;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface PerformanceTestConfig {
  enabled: boolean;
  benchmarks: {
    iterations: number;
    warmupIterations: number;
    maxExecutionTime: number;
    maxMemoryUsage: number;
  };
  monitoring: {
    collectMetrics: boolean;
    sampleInterval: number;
    resourceLimits: {
      maxCpuPercent: number;
      maxMemoryMB: number;
    };
  };
}

export interface IntegrationTestConfig {
  environment: 'test' | 'ci' | 'development';
  database: DatabaseTestConfig;
  providers: ProviderTestConfig[];
  performance: PerformanceTestConfig;
  parallelism: {
    enabled: boolean;
    maxWorkers: number;
    isolationLevel: 'none' | 'process' | 'thread';
  };
  cleanup: {
    afterEach: boolean;
    afterAll: boolean;
    retainOnFailure: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    includeTimestamps: boolean;
    includeMetrics: boolean;
  };
  timeouts: {
    setup: number;
    test: number;
    teardown: number;
  };
}

/**
 * Default integration test configuration
 */
export const defaultIntegrationConfig: IntegrationTestConfig = {
  environment: 'test',

  database: {
    type: 'memory',
    timeout: 10000,
    migrations: true,
    seedData: false,
  },

  providers: [
    {
      type: ProviderType.OPENAI,
      enabled: true,
      mockMode: true,
      timeout: 30000,
      retries: 3,
    },
    {
      type: ProviderType.ANTHROPIC,
      enabled: true,
      mockMode: true,
      timeout: 30000,
      retries: 3,
    },
  ],

  performance: {
    enabled: true,
    benchmarks: {
      iterations: 100,
      warmupIterations: 10,
      maxExecutionTime: 30000,
      maxMemoryUsage: 512,
    },
    monitoring: {
      collectMetrics: true,
      sampleInterval: 1000,
      resourceLimits: {
        maxCpuPercent: 80,
        maxMemoryMB: 512,
      },
    },
  },

  parallelism: {
    enabled: false, // Disabled for deterministic test results
    maxWorkers: 1,
    isolationLevel: 'process',
  },

  cleanup: {
    afterEach: true,
    afterAll: true,
    retainOnFailure: false,
  },

  logging: {
    level: 'info',
    includeTimestamps: true,
    includeMetrics: false,
  },

  timeouts: {
    setup: 30000,
    test: 60000,
    teardown: 10000,
  },
};

/**
 * CI-specific integration test configuration
 */
export const ciIntegrationConfig: IntegrationTestConfig = {
  ...defaultIntegrationConfig,

  environment: 'ci',

  database: {
    ...defaultIntegrationConfig.database,
    type: 'memory', // Use in-memory for CI speed
    seedData: true,
  },

  performance: {
    ...defaultIntegrationConfig.performance,
    benchmarks: {
      ...defaultIntegrationConfig.performance.benchmarks,
      iterations: 50, // Fewer iterations in CI
      maxExecutionTime: 60000,
    },
    monitoring: {
      ...defaultIntegrationConfig.performance.monitoring,
      resourceLimits: {
        maxCpuPercent: 90, // Allow higher usage in CI
        maxMemoryMB: 1024,
      },
    },
  },

  parallelism: {
    enabled: true, // Enable parallelism in CI
    maxWorkers: 2,
    isolationLevel: 'process',
  },

  logging: {
    level: 'warn', // Less verbose in CI
    includeTimestamps: true,
    includeMetrics: true,
  },

  timeouts: {
    setup: 60000,
    test: 120000,
    teardown: 30000,
  },
};

/**
 * Development-specific integration test configuration
 */
export const developmentIntegrationConfig: IntegrationTestConfig = {
  ...defaultIntegrationConfig,

  environment: 'development',

  database: {
    ...defaultIntegrationConfig.database,
    type: 'sqlite',
    seedData: true,
  },

  performance: {
    ...defaultIntegrationConfig.performance,
    enabled: false, // Disable performance testing in dev
    monitoring: {
      ...defaultIntegrationConfig.performance.monitoring,
      collectMetrics: false,
    },
  },

  cleanup: {
    afterEach: false, // Keep data for inspection
    afterAll: false,
    retainOnFailure: true,
  },

  logging: {
    level: 'debug',
    includeTimestamps: true,
    includeMetrics: true,
  },
};

/**
 * Gets configuration based on environment
 */
export function getIntegrationConfig(
  environment?: string,
): IntegrationTestConfig {
  const env = environment || process.env.NODE_ENV || 'test';

  switch (env) {
    case 'ci':
      return ciIntegrationConfig;
    case 'development':
      return developmentIntegrationConfig;
    case 'test':
    default:
      return defaultIntegrationConfig;
  }
}

/**
 * Validates integration test configuration
 */
export function validateIntegrationConfig(
  config: IntegrationTestConfig,
): boolean {
  try {
    // Validate environment
    if (!['test', 'ci', 'development'].includes(config.environment)) {
      throw new Error(`Invalid environment: ${config.environment}`);
    }

    // Validate database config
    if (!['sqlite', 'memory', 'postgresql'].includes(config.database.type)) {
      throw new Error(`Invalid database type: ${config.database.type}`);
    }

    // Validate providers
    for (const provider of config.providers) {
      if (!Object.values(ProviderType).includes(provider.type)) {
        throw new Error(`Invalid provider type: ${provider.type}`);
      }
    }

    // Validate timeouts
    if (config.timeouts.test <= 0 || config.timeouts.setup <= 0) {
      throw new Error('Timeouts must be positive numbers');
    }

    // Validate parallelism
    if (config.parallelism.enabled && config.parallelism.maxWorkers <= 0) {
      throw new Error(
        'Max workers must be positive when parallelism is enabled',
      );
    }

    return true;
  } catch (error) {
    console.error('Configuration validation failed:', error);
    return false;
  }
}

/**
 * Creates a custom configuration by merging with defaults
 */
export function createCustomConfig(
  overrides: Partial<IntegrationTestConfig>,
): IntegrationTestConfig {
  return {
    ...defaultIntegrationConfig,
    ...overrides,
    database: {
      ...defaultIntegrationConfig.database,
      ...(overrides.database || {}),
    },
    performance: {
      ...defaultIntegrationConfig.performance,
      ...(overrides.performance || {}),
      benchmarks: {
        ...defaultIntegrationConfig.performance.benchmarks,
        ...(overrides.performance?.benchmarks || {}),
      },
      monitoring: {
        ...defaultIntegrationConfig.performance.monitoring,
        ...(overrides.performance?.monitoring || {}),
        resourceLimits: {
          ...defaultIntegrationConfig.performance.monitoring.resourceLimits,
          ...(overrides.performance?.monitoring?.resourceLimits || {}),
        },
      },
    },
    parallelism: {
      ...defaultIntegrationConfig.parallelism,
      ...(overrides.parallelism || {}),
    },
    cleanup: {
      ...defaultIntegrationConfig.cleanup,
      ...(overrides.cleanup || {}),
    },
    logging: {
      ...defaultIntegrationConfig.logging,
      ...(overrides.logging || {}),
    },
    timeouts: {
      ...defaultIntegrationConfig.timeouts,
      ...(overrides.timeouts || {}),
    },
  };
}

/**
 * Export configuration presets
 */
export const configPresets = {
  default: defaultIntegrationConfig,
  ci: ciIntegrationConfig,
  development: developmentIntegrationConfig,
} as const;

export type ConfigPreset = keyof typeof configPresets;
