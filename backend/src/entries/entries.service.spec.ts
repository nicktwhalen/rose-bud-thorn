import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EntriesService } from './entries.service';
import { Entry } from './entities/entry.entity';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { AppLogger } from '../logging/logger.service';

describe('EntriesService', () => {
  let service: EntriesService;
  let repository: Repository<Entry>;

  const testUserId = 'test-user-id';

  const mockRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    logEntryOperation: jest.fn(),
    logCacheOperation: jest.fn(),
    logHealthCheckCritical: jest.fn(),
    logHealthCheckBenchmark: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntriesService,
        {
          provide: getRepositoryToken(Entry),
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<EntriesService>(EntriesService);
    repository = module.get<Repository<Entry>>(getRepositoryToken(Entry));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new entry successfully', async () => {
      const createEntryDto: CreateEntryDto = {
        rose: 'Test rose',
        thorn: 'Test thorn',
        bud: 'Test bud',
        date: '2025-07-18',
      };
      const savedEntry = { id: 1, ...createEntryDto, userId: testUserId };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedEntry);
      mockRepository.save.mockResolvedValue(savedEntry);

      const result = await service.create(createEntryDto, testUserId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { date: createEntryDto.date, userId: testUserId },
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createEntryDto,
        userId: testUserId,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(savedEntry);
      expect(result).toEqual(savedEntry);
    });

    it('should throw ConflictException when entry already exists', async () => {
      const createEntryDto: CreateEntryDto = {
        rose: 'Test rose',
        date: '2025-07-18',
      };
      const existingEntry = { id: 1, ...createEntryDto, userId: testUserId };

      mockRepository.findOne.mockResolvedValue(existingEntry);

      await expect(service.create(createEntryDto, testUserId)).rejects.toThrow(ConflictException);
    });
  });

  describe('createOrUpdate', () => {
    it('should create a new entry when none exists', async () => {
      const createEntryDto: CreateEntryDto = {
        rose: 'Test rose',
        date: '2025-07-18',
      };
      const savedEntry = { id: 1, ...createEntryDto, userId: testUserId };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedEntry);
      mockRepository.save.mockResolvedValue(savedEntry);

      const result = await service.createOrUpdate(createEntryDto, testUserId);

      expect(result).toEqual(savedEntry);
    });

    it('should update existing entry', async () => {
      const createEntryDto: CreateEntryDto = {
        rose: 'Updated rose',
        date: '2025-07-18',
      };
      const existingEntry = { id: 1, rose: 'Old rose', date: '2025-07-18', userId: testUserId };
      const updatedEntry = { ...existingEntry, ...createEntryDto };

      mockRepository.findOne.mockResolvedValue(existingEntry);
      mockRepository.save.mockResolvedValue(updatedEntry);

      const result = await service.createOrUpdate(createEntryDto, testUserId);

      expect(result).toEqual(updatedEntry);
    });
  });

  describe('findAll', () => {
    it('should return entries with pagination', async () => {
      const entries = [
        { id: 1, date: '2025-07-18', userId: testUserId },
        { id: 2, date: '2025-07-17', userId: testUserId },
      ];
      const total = 2;

      mockRepository.findAndCount.mockResolvedValue([entries, total]);

      const result = await service.findAll(testUserId, 10, 0);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: testUserId },
        order: { date: 'DESC' },
        take: 10,
        skip: 0,
      });
      expect(result).toEqual({ entries, total });
    });

    it('should use default pagination values', async () => {
      const entries: any[] = [];
      const total = 0;

      mockRepository.findAndCount.mockResolvedValue([entries, total]);

      await service.findAll(testUserId);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: testUserId },
        order: { date: 'DESC' },
        take: 10,
        skip: 0,
      });
    });
  });

  describe('findOne', () => {
    it('should return an entry when found', async () => {
      const date = '2025-07-18';
      const entry = { id: 1, date, userId: testUserId };

      mockRepository.findOne.mockResolvedValue(entry);

      const result = await service.findOne(date, testUserId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { date, userId: testUserId },
      });
      expect(result).toEqual(entry);
    });

    it('should throw NotFoundException when entry not found', async () => {
      const date = '2025-07-18';

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(date, testUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an entry successfully', async () => {
      const date = '2025-07-18';
      const updateDto: UpdateEntryDto = {
        rose: 'Updated rose',
      };
      const existingEntry = { id: 1, date, rose: 'Old rose', userId: testUserId };
      const updatedEntry = { ...existingEntry, ...updateDto };

      mockRepository.findOne.mockResolvedValue(existingEntry);
      mockRepository.save.mockResolvedValue(updatedEntry);

      const result = await service.update(date, updateDto, testUserId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { date, userId: testUserId },
      });
      expect(result).toEqual(updatedEntry);
    });

    it('should throw NotFoundException when entry not found', async () => {
      const date = '2025-07-18';
      const updateDto: UpdateEntryDto = {
        rose: 'Updated rose',
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(date, updateDto, testUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an entry successfully', async () => {
      const date = '2025-07-18';
      const existingEntry = { id: 1, date, userId: testUserId };

      mockRepository.findOne.mockResolvedValue(existingEntry);
      mockRepository.remove.mockResolvedValue(existingEntry);

      const result = await service.remove(date, testUserId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { date, userId: testUserId },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(existingEntry);
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when entry not found', async () => {
      const date = '2025-07-18';

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(date, testUserId)).rejects.toThrow(NotFoundException);
    });
  });
});
