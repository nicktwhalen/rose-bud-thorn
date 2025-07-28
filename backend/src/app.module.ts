import { Module, MiddlewareConsumer, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
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

// Database connection logging
const logger = new Logger('DatabaseConnection');
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;

logger.log('🔄 Configuring database connection...');
logger.log(`📍 Host: ${dbHost || 'undefined'}`);
logger.log(`🔌 Port: ${dbPort || 'undefined'}`);
logger.log(`👤 Username: ${process.env.DB_USERNAME || 'undefined'}`);
logger.log(`🗄️  Database: ${process.env.DB_DATABASE || 'undefined'}`);
logger.log(`🔒 Password: ${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}`);
logger.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'}`);

// Analyze host for IPv6/IPv4
if (dbHost) {
  const isIPv6 = dbHost.includes(':') && !dbHost.includes('.');
  const isIPv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(dbHost);

  if (isIPv6) {
    logger.warn('🌐 IPv6 address detected!');
    logger.warn('   Your host appears to be an IPv6 address');
    logger.warn('   Some cloud platforms/environments disable IPv6');
    logger.warn('   If you get ENETUNREACH errors, try:');
    logger.warn('   1. Use hostname instead of IPv6 address');
    logger.warn('   2. Contact your hosting provider about IPv6 support');
    logger.warn('   3. Use IPv4 address if available');
  } else if (isIPv4) {
    logger.log('🌐 IPv4 address detected');
  } else {
    logger.log('🌐 Hostname detected (will resolve to IPv4/IPv6)');
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
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
