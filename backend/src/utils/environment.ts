/**
 * Centralized environment configuration utility
 * Defaults to PRODUCTION if NODE_ENV is not set, ensuring security by default
 */

export enum Environment {
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
  TEST = 'test',
}

class EnvironmentConfig {
  private readonly nodeEnv: string;

  constructor() {
    // Default to production for security - never assume development
    this.nodeEnv = (process.env.NODE_ENV || Environment.PRODUCTION).toLowerCase();
  }

  /**
   * Get the current environment, defaults to production
   */
  get current(): Environment {
    switch (this.nodeEnv) {
      case 'development':
      case 'dev':
        return Environment.DEVELOPMENT;
      case 'test':
      case 'testing':
        return Environment.TEST;
      case 'production':
      case 'prod':
      default:
        return Environment.PRODUCTION;
    }
  }

  /**
   * Check if running in production (default)
   */
  get isProduction(): boolean {
    return this.current === Environment.PRODUCTION;
  }

  /**
   * Check if running in development
   */
  get isDevelopment(): boolean {
    return this.current === Environment.DEVELOPMENT;
  }

  /**
   * Check if running in test
   */
  get isTest(): boolean {
    return this.current === Environment.TEST;
  }

  /**
   * Check if NOT in production (development or test)
   */
  get isNonProduction(): boolean {
    return !this.isProduction;
  }

  /**
   * Get raw NODE_ENV value (for debugging)
   */
  get raw(): string {
    return process.env.NODE_ENV || 'undefined';
  }

  /**
   * Get logging configuration based on environment
   */
  get shouldEnableVerboseLogging(): boolean {
    return this.isDevelopment;
  }

  /**
   * Get database logging configuration
   */
  get shouldEnableDatabaseLogging(): boolean {
    return this.isNonProduction;
  }

  /**
   * Get whether to suppress logging (for tests)
   */
  get shouldSuppressLogging(): boolean {
    return this.isTest;
  }
}

// Export singleton instance
export const env = new EnvironmentConfig();

// Export for debugging
export const getEnvironmentInfo = () => ({
  current: env.current,
  isProduction: env.isProduction,
  isDevelopment: env.isDevelopment,
  isTest: env.isTest,
  raw: env.raw,
  nodeEnvSet: process.env.NODE_ENV !== undefined,
});
