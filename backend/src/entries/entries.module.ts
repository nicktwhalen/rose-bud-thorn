import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';
import { Entry } from './entities/entry.entity';
import { AppCacheModule } from '../cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([Entry]), AppCacheModule],
  controllers: [EntriesController],
  providers: [EntriesService],
})
export class EntriesModule {}
