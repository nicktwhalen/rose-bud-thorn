import { Module, MiddlewareConsumer, Logger } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EntriesModule } from './entries/entries.module';
import { Entry } from './entries/entities/entry.entity';
import { User } from './auth/entities/user.entity';
import { AuditLog } from './audit/entities/audit-log.entity';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { AppCacheModule } from './cache/cache.module';
import { HealthModule } from './health/health.module';
import { LoggingModule } from './logging/logging.module';
import { LoggingInterceptor } from './logging/logging.interceptor';
import { IpExtractorMiddleware } from './audit/ip-extractor.middleware';

// Database configuration factory with comprehensive logging
function createDatabaseConfig(configService: ConfigService): TypeOrmModuleOptions {
  const logger = new Logger('DatabaseConfig');

  logger.log('🔄 Configuring database connection...');

  // Check for DATABASE_URL first (connection string approach)
  const databaseUrl = configService.get('DATABASE_URL');

  if (databaseUrl) {
    logger.log('🔗 Using DATABASE_URL connection string');

    try {
      const url = new URL(databaseUrl);
      logger.log(`📍 Parsed connection details:`);
      logger.log(`   Protocol: ${url.protocol}`);
      logger.log(`   Host: ${url.hostname}`);
      logger.log(`   Port: ${url.port || '5432'}`);
      logger.log(`   Database: ${url.pathname.substring(1)}`);
      logger.log(`   Username: ${url.username || 'undefined'}`);
      logger.log(`   Password: ${url.password ? '[SET]' : '[NOT SET]'}`);

      // Detect IPv6
      const isIPv6 = url.hostname.includes(':') && !url.hostname.includes('.');
      if (isIPv6) {
        logger.warn('🌐 IPv6 address detected in connection string!');
        logger.warn('   Some environments may not support IPv6');
        logger.warn('   If connection fails, try using IPv4 or hostname');
      }

      return {
        type: 'postgres',
        url: databaseUrl,
        entities: [Entry, User, AuditLog],
        migrations: ['dist/migrations/*.js'],
        synchronize: false,
        migrationsRun: false,
        logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn', 'migration'] : ['error'],
        logger: 'advanced-console',
        ssl: url.hostname !== 'localhost' && !url.hostname.startsWith('192.168.') && !url.hostname.startsWith('127.') ? { rejectUnauthorized: false } : undefined,
        extra: {
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          max: 10,
        },
      };
    } catch (error) {
      logger.error('❌ Failed to parse DATABASE_URL:', error.message);
      logger.error('   Falling back to individual environment variables');
    }
  }

  // Fallback to individual environment variables
  logger.log('🔧 Using individual environment variables');

  const host = configService.get('DB_HOST');
  const port = parseInt(configService.get('DB_PORT')) || 5432;
  const username = configService.get('DB_USERNAME');
  const password = configService.get('DB_PASSWORD');
  const database = configService.get('DB_DATABASE');

  logger.log('📋 Connection parameters:');
  logger.log(`   Host: ${host || 'undefined'}`);
  logger.log(`   Port: ${port}`);
  logger.log(`   Username: ${username || 'undefined'}`);
  logger.log(`   Password: ${password ? '[SET]' : '[NOT SET]'}`);
  logger.log(`   Database: ${database || 'undefined'}`);

  // Validate required parameters
  const missing = [];
  if (!host) missing.push('DB_HOST');
  if (!username) missing.push('DB_USERNAME');
  if (!password) missing.push('DB_PASSWORD');
  if (!database) missing.push('DB_DATABASE');

  if (missing.length > 0) {
    logger.error('❌ Missing required environment variables:');
    missing.forEach((env) => logger.error(`   ${env}`));
    logger.error('💡 Either provide DATABASE_URL or all individual DB_* variables');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Detect IPv6 in host
  if (host && host.includes(':') && !host.includes('.')) {
    logger.warn('🌐 IPv6 address detected in DB_HOST!');
    logger.warn('   Some cloud platforms disable IPv6');
    logger.warn('   If you get ENETUNREACH errors, try:');
    logger.warn('   1. Use hostname instead of IPv6 address');
    logger.warn('   2. Contact hosting provider about IPv6 support');
    logger.warn('   3. Use IPv4 address if available');
  }

  return {
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    entities: [Entry, User, AuditLog],
    migrations: ['dist/migrations/*.js'],
    synchronize: false,
    migrationsRun: false,
    logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn', 'migration'] : ['error'],
    logger: 'advanced-console',
    extra: {
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10,
    },
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createDatabaseConfig,
    }),
    AuthModule,
    AuditModule,
    LoggingModule,
    AppCacheModule,
    HealthModule,
    EntriesModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IpExtractorMiddleware).forRoutes('*');
  }
}
