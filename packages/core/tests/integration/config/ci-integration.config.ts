/**
 * CI Integration Test Configuration
 *
 * This module provides specialized configuration for running integration tests
 * in CI/CD environments, including GitHub Actions, Jenkins, and other CI systems.
 */

import {
  IntegrationTestConfig,
  createCustomConfig,
} from './integration-test.config';
import { ProviderType } from '../../../src/services/history/types';

export interface CIEnvironmentConfig {
  name: 'github-actions' | 'jenkins' | 'gitlab-ci' | 'circle-ci' | 'generic';
  features: {
    parallelism: boolean;
    artifactStorage: boolean;
    secretsManagement: boolean;
    containerSupport: boolean;
  };
  limits: {
    maxExecutionTime: number;
    maxMemoryMB: number;
    maxConcurrency: number;
  };
}

export interface CIReportingConfig {
  formats: ('junit' | 'json' | 'html' | 'lcov')[];
  outputPaths: Record<string, string>;
  includeMetrics: boolean;
  includeCoverage: boolean;
  uploadArtifacts: boolean;
}

export interface CIPipelineStage {
  name: string;
  enabled: boolean;
  parallel: boolean;
  dependencies: string[];
  timeout: number;
  retries: number;
  conditions: string[];
}

/**
 * GitHub Actions specific configuration
 */
export const githubActionsConfig: CIEnvironmentConfig = {
  name: 'github-actions',
  features: {
    parallelism: true,
    artifactStorage: true,
    secretsManagement: true,
    containerSupport: true,
  },
  limits: {
    maxExecutionTime: 360000, // 6 minutes
    maxMemoryMB: 7000,
    maxConcurrency: 4,
  },
};

/**
 * Jenkins specific configuration
 */
export const jenkinsConfig: CIEnvironmentConfig = {
  name: 'jenkins',
  features: {
    parallelism: true,
    artifactStorage: true,
    secretsManagement: true,
    containerSupport: true,
  },
  limits: {
    maxExecutionTime: 1200000, // 20 minutes
    maxMemoryMB: 4000,
    maxConcurrency: 2,
  },
};

/**
 * GitLab CI specific configuration
 */
export const gitlabCIConfig: CIEnvironmentConfig = {
  name: 'gitlab-ci',
  features: {
    parallelism: true,
    artifactStorage: true,
    secretsManagement: true,
    containerSupport: true,
  },
  limits: {
    maxExecutionTime: 3600000, // 60 minutes
    maxMemoryMB: 8000,
    maxConcurrency: 8,
  },
};

/**
 * Default CI reporting configuration
 */
export const defaultCIReporting: CIReportingConfig = {
  formats: ['junit', 'json'],
  outputPaths: {
    junit: './test-results/junit.xml',
    json: './test-results/results.json',
    html: './test-results/report.html',
    lcov: './coverage/lcov.info',
  },
  includeMetrics: true,
  includeCoverage: false,
  uploadArtifacts: true,
};

/**
 * CI pipeline stages configuration
 */
export const ciPipelineStages: CIPipelineStage[] = [
  {
    name: 'setup',
    enabled: true,
    parallel: false,
    dependencies: [],
    timeout: 120000, // 2 minutes
    retries: 2,
    conditions: ['always'],
  },
  {
    name: 'unit-tests',
    enabled: true,
    parallel: true,
    dependencies: ['setup'],
    timeout: 300000, // 5 minutes
    retries: 1,
    conditions: ['setup-success'],
  },
  {
    name: 'integration-tests',
    enabled: true,
    parallel: true,
    dependencies: ['unit-tests'],
    timeout: 600000, // 10 minutes
    retries: 2,
    conditions: ['unit-tests-success'],
  },
  {
    name: 'performance-tests',
    enabled: true,
    parallel: false,
    dependencies: ['integration-tests'],
    timeout: 900000, // 15 minutes
    retries: 1,
    conditions: ['integration-tests-success', 'not-pull-request'],
  },
  {
    name: 'cleanup',
    enabled: true,
    parallel: false,
    dependencies: ['integration-tests', 'performance-tests'],
    timeout: 60000, // 1 minute
    retries: 0,
    conditions: ['always'],
  },
];

/**
 * Creates CI-optimized integration test configuration
 */
export function createCIIntegrationConfig(
  environment?: CIEnvironmentConfig,
  reporting?: Partial<CIReportingConfig>,
): IntegrationTestConfig {
  const ciEnv = environment || detectCIEnvironment();
  const reportingConfig = { ...defaultCIReporting, ...reporting };

  return createCustomConfig({
    environment: 'ci',

    database: {
      type: 'memory',
      timeout: 30000,
      migrations: true,
      seedData: true,
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
      enabled: shouldRunPerformanceTests(),
      benchmarks: {
        iterations: Math.min(50, ciEnv.limits.maxExecutionTime / 1000),
        warmupIterations: 5,
        maxExecutionTime: ciEnv.limits.maxExecutionTime,
        maxMemoryUsage: ciEnv.limits.maxMemoryMB,
      },
      monitoring: {
        collectMetrics: true,
        sampleInterval: 5000,
        resourceLimits: {
          maxCpuPercent: 90,
          maxMemoryMB: ciEnv.limits.maxMemoryMB,
        },
      },
    },

    parallelism: {
      enabled: ciEnv.features.parallelism && shouldEnableParallelism(),
      maxWorkers: Math.min(
        ciEnv.limits.maxConcurrency,
        getOptimalWorkerCount(),
      ),
      isolationLevel: 'process',
    },

    cleanup: {
      afterEach: true,
      afterAll: true,
      retainOnFailure: isDebugMode(),
    },

    logging: {
      level: getLogLevel(),
      includeTimestamps: true,
      includeMetrics: reportingConfig.includeMetrics,
    },

    timeouts: {
      setup: Math.min(120000, ciEnv.limits.maxExecutionTime * 0.1),
      test: Math.min(300000, ciEnv.limits.maxExecutionTime * 0.5),
      teardown: Math.min(60000, ciEnv.limits.maxExecutionTime * 0.05),
    },
  });
}

/**
 * Detects CI environment automatically
 */
export function detectCIEnvironment(): CIEnvironmentConfig {
  // GitHub Actions
  if (process.env.GITHUB_ACTIONS === 'true') {
    return githubActionsConfig;
  }

  // Jenkins
  if (process.env.JENKINS_URL || process.env.BUILD_NUMBER) {
    return jenkinsConfig;
  }

  // GitLab CI
  if (process.env.GITLAB_CI === 'true') {
    return gitlabCIConfig;
  }

  // CircleCI
  if (process.env.CIRCLECI === 'true') {
    return {
      name: 'circle-ci',
      features: {
        parallelism: true,
        artifactStorage: true,
        secretsManagement: true,
        containerSupport: true,
      },
      limits: {
        maxExecutionTime: 300000, // 5 minutes for free tier
        maxMemoryMB: 4000,
        maxConcurrency: 2,
      },
    };
  }

  // Generic CI environment
  return {
    name: 'generic',
    features: {
      parallelism: false,
      artifactStorage: false,
      secretsManagement: false,
      containerSupport: false,
    },
    limits: {
      maxExecutionTime: 600000, // 10 minutes
      maxMemoryMB: 2000,
      maxConcurrency: 1,
    },
  };
}

/**
 * Determines if performance tests should run
 */
function shouldRunPerformanceTests(): boolean {
  // Skip performance tests on pull requests
  if (
    process.env.GITHUB_EVENT_NAME === 'pull_request' ||
    process.env.CI_MERGE_REQUEST_ID
  ) {
    return false;
  }

  // Run on main branch or manual triggers
  return (
    process.env.GITHUB_REF === 'refs/heads/main' ||
    process.env.CI_COMMIT_REF_NAME === 'main' ||
    process.env.MANUAL_PERFORMANCE_TESTS === 'true'
  );
}

/**
 * Determines if parallelism should be enabled
 */
function shouldEnableParallelism(): boolean {
  // Disable parallelism for debugging
  if (isDebugMode()) {
    return false;
  }

  // Enable based on CI environment capabilities
  const ciEnv = detectCIEnvironment();
  return ciEnv.features.parallelism && ciEnv.limits.maxConcurrency > 1;
}

/**
 * Gets optimal worker count based on available resources
 */
function getOptimalWorkerCount(): number {
  const ciEnv = detectCIEnvironment();
  const availableCPUs = parseInt(process.env.CI_AVAILABLE_CPUS || '2', 10);

  return Math.min(
    ciEnv.limits.maxConcurrency,
    availableCPUs,
    4, // Reasonable upper limit
  );
}

/**
 * Checks if debug mode is enabled
 */
function isDebugMode(): boolean {
  return (
    process.env.DEBUG === 'true' ||
    process.env.CI_DEBUG === 'true' ||
    process.env.RUNNER_DEBUG === '1'
  );
}

/**
 * Gets appropriate log level for CI
 */
function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
  if (isDebugMode()) {
    return 'debug';
  }

  if (process.env.CI_VERBOSE === 'true') {
    return 'info';
  }

  return 'warn';
}

/**
 * Gets CI-specific test command arguments
 */
export function getCITestArgs(): string[] {
  const args: string[] = [];

  // Add CI-specific flags
  args.push('--ci');
  args.push('--passWithNoTests');

  // Add parallelism if enabled
  if (shouldEnableParallelism()) {
    args.push(`--maxWorkers=${getOptimalWorkerCount()}`);
  } else {
    args.push('--runInBand');
  }

  // Add timeout configuration
  const ciEnv = detectCIEnvironment();
  args.push(`--testTimeout=${ciEnv.limits.maxExecutionTime}`);

  // Add coverage if enabled
  if (process.env.COLLECT_COVERAGE === 'true') {
    args.push('--coverage');
    args.push('--coverageDirectory=coverage');
  }

  // Add reporter configuration
  args.push('--reporter=default');
  args.push('--reporter=junit');
  args.push('--outputFile=test-results/junit.xml');

  return args;
}

/**
 * Validates CI configuration
 */
export function validateCIConfig(config: IntegrationTestConfig): boolean {
  const ciEnv = detectCIEnvironment();

  // Check timeouts don't exceed CI limits
  if (config.timeouts.test > ciEnv.limits.maxExecutionTime) {
    console.warn(
      `Test timeout (${config.timeouts.test}) exceeds CI limit (${ciEnv.limits.maxExecutionTime})`,
    );
    return false;
  }

  // Check memory limits
  if (
    config.performance.monitoring.resourceLimits.maxMemoryMB >
    ciEnv.limits.maxMemoryMB
  ) {
    console.warn(`Memory limit exceeds CI capacity`);
    return false;
  }

  // Check concurrency
  if (
    config.parallelism.enabled &&
    config.parallelism.maxWorkers > ciEnv.limits.maxConcurrency
  ) {
    console.warn(`Worker count exceeds CI concurrency limit`);
    return false;
  }

  return true;
}

/**
 * Export CI environment configurations
 */
export const ciEnvironments = {
  githubActions: githubActionsConfig,
  jenkins: jenkinsConfig,
  gitlabCI: gitlabCIConfig,
} as const;

export type CIEnvironmentType = keyof typeof ciEnvironments;
