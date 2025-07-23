import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Entry } from './entities/entry.entity';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { getLocalDateString } from '../utils/dateUtils';
import { AppLogger } from '../logging/logger.service';

@Injectable()
export class EntriesService {
  constructor(
    @InjectRepository(Entry)
    private entriesRepository: Repository<Entry>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private logger: AppLogger,
  ) {}

  async create(createEntryDto: CreateEntryDto, userId: string): Promise<Entry> {
    const date = createEntryDto.date || getLocalDateString();
    
    this.logger.logEntryOperation('create_attempt', date);
    
    // Check if entry already exists for this user and date
    const existingEntry = await this.entriesRepository.findOne({ 
      where: { date, userId } 
    });
    if (existingEntry) {
      this.logger.warn('Entry creation failed - already exists', { entryDate: date, userId });
      throw new ConflictException(`An entry already exists for date ${date}`);
    }
    
    const entry = this.entriesRepository.create({
      ...createEntryDto,
      date,
      userId,
    });
    const savedEntry = await this.entriesRepository.save(entry);
    
    // Cache the new entry with user-specific key
    const cacheKey = `entry:${userId}:${date}`;
    await this.cacheManager.set(cacheKey, savedEntry, 600);
    this.logger.logCacheOperation('set', cacheKey);
    this.logger.logEntryOperation('created', date);
    
    return savedEntry;
  }

  async createOrUpdate(createEntryDto: CreateEntryDto, userId: string): Promise<Entry> {
    const date = createEntryDto.date || getLocalDateString();
    
    // Check if entry already exists for this user and date
    const existingEntry = await this.entriesRepository.findOne({ 
      where: { date, userId } 
    });
    if (existingEntry) {
      // Update existing entry
      Object.assign(existingEntry, createEntryDto);
      const updatedEntry = await this.entriesRepository.save(existingEntry);
      
      // Update cache
      const cacheKey = `entry:${userId}:${date}`;
      await this.cacheManager.set(cacheKey, updatedEntry, 600);
      
      return updatedEntry;
    }
    
    // Create new entry
    const entry = this.entriesRepository.create({
      ...createEntryDto,
      date,
      userId,
    });
    const savedEntry = await this.entriesRepository.save(entry);
    
    // Cache the new entry
    const cacheKey = `entry:${userId}:${date}`;
    await this.cacheManager.set(cacheKey, savedEntry, 600);
    
    return savedEntry;
  }

  async findAll(userId: string, limit: number = 10, offset: number = 0): Promise<{ entries: Entry[]; total: number }> {
    const [entries, total] = await this.entriesRepository.findAndCount({
      where: { userId },
      order: { date: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { entries, total };
  }

  async findOne(date: string, userId: string): Promise<Entry> {
    const cacheKey = `entry:${userId}:${date}`;
    
    // Try to get from cache first
    const cachedEntry = await this.cacheManager.get<Entry>(cacheKey);
    if (cachedEntry) {
      this.logger.logCacheOperation('hit', cacheKey, true);
      return cachedEntry;
    }
    
    this.logger.logCacheOperation('miss', cacheKey, false);
    
    // If not in cache, get from database
    const entry = await this.entriesRepository.findOne({ 
      where: { date, userId } 
    });
    if (!entry) {
      this.logger.warn('Entry not found', { entryDate: date, userId });
      throw new NotFoundException(`Entry for date ${date} not found`);
    }
    
    // Cache the result for 10 minutes
    await this.cacheManager.set(cacheKey, entry, 600);
    this.logger.logCacheOperation('set', cacheKey);
    this.logger.logEntryOperation('retrieved', date);
    
    return entry;
  }

  async update(date: string, updateEntryDto: UpdateEntryDto, userId: string): Promise<Entry> {
    const entry = await this.findOne(date, userId);
    Object.assign(entry, updateEntryDto);
    const updatedEntry = await this.entriesRepository.save(entry);
    
    // Update cache with new data
    const cacheKey = `entry:${userId}:${date}`;
    await this.cacheManager.set(cacheKey, updatedEntry, 600);
    
    return updatedEntry;
  }

  async remove(date: string, userId: string): Promise<{ success: boolean }> {
    const entry = await this.findOne(date, userId);
    await this.entriesRepository.remove(entry);
    
    // Remove from cache
    const cacheKey = `entry:${userId}:${date}`;
    await this.cacheManager.del(cacheKey);
    
    return { success: true };
  }
}