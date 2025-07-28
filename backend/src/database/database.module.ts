import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Entry } from '../entries/entities/entry.entity';
import { User } from '../auth/entities/user.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { DatabaseLoggerService } from './database-logger.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<TypeOrmModuleOptions> => {
        const dbLogger = new DatabaseLoggerService();
        const logger = new Logger('DatabaseModule');

        // Extract database configuration
        const config = {
          host: configService.get('DB_HOST'),
          port: parseInt(configService.get('DB_PORT')) || 5432,
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_DATABASE'),
        };

        // Log connection attempt
        dbLogger.logConnectionAttempt(config);

        const typeormConfig: TypeOrmModuleOptions = {
          type: 'postgres',
          ...config,
          entities: [Entry, User, AuditLog],
          migrations: ['dist/migrations/*.js'],
          synchronize: false,
          migrationsRun: false,
          logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn', 'migration', 'query'] : ['error'],
          logger: 'advanced-console',
          extra: {
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 10,
          },
        };

        // If DATABASE_URL is provided, use it instead
        const databaseUrl = configService.get('DATABASE_URL');
        if (databaseUrl) {
          logger.log('🔗 Using DATABASE_URL for connection');
          try {
            const url = new URL(databaseUrl);
            logger.log(`🌐 Parsed DATABASE_URL - Host: ${url.hostname}, Port: ${url.port}`);

            const urlConfig = {
              ...typeormConfig,
              url: databaseUrl,
            } as TypeOrmModuleOptions;

            if (url.protocol === 'postgres:' && url.hostname !== 'localhost') {
              (urlConfig as any).ssl = { rejectUnauthorized: false };
            }

            return urlConfig;
          } catch (error) {
            logger.error('❌ Failed to parse DATABASE_URL:', error.message);
            dbLogger.logConnectionError(error);
          }
        }

        return typeormConfig;
      },
    }),
  ],
  providers: [DatabaseLoggerService],
  exports: [DatabaseLoggerService],
})
export class DatabaseModule {}
