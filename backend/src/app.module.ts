import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EntriesModule } from './entries/entries.module';
import { Entry } from './entries/entities/entry.entity';
import { User } from './auth/entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { AppCacheModule } from './cache/cache.module';
import { HealthModule } from './health/health.module';
import { LoggingModule } from './logging/logging.module';
import { LoggingInterceptor } from './logging/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [Entry, User],
      migrations: ['dist/database/migrations/*.js'],
      synchronize: false,
      migrationsRun: false,
    }),
    AuthModule,
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
export class AppModule {}