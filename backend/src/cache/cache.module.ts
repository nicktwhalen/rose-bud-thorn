import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      ttl: 300, // 5 minutes default TTL
      max: 1000, // maximum number of items in cache
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}