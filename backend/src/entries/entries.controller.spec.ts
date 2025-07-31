import { Test, TestingModule } from '@nestjs/testing';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { User } from '../auth/entities/user.entity';
import { AuditService } from '../audit/audit.service';

describe('EntriesController', () => {
  let controller: EntriesController;
  let service: EntriesService;

  const mockUser: User = {
    id: 'test-user-id',
    googleId: 'test-google-id',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    entries: [],
  };

  const mockRequest = {
    user: mockUser,
    clientIp: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-user-agent'),
  } as any;

  const mockEntriesService = {
    create: jest.fn(),
    createOrUpdate: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockAuditService = {
    logCreateEntry: jest.fn(),
    logUpdateEntry: jest.fn(),
    logDeleteEntry: jest.fn(),
    logViewEntry: jest.fn(),
    logViewEntries: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntriesController],
      providers: [
        {
          provide: EntriesService,
          useValue: mockEntriesService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    controller = module.get<EntriesController>(EntriesController);
    service = module.get<EntriesService>(EntriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new entry with user ID', async () => {
      const createEntryDto: CreateEntryDto = {
        rose: 'Test rose',
        thorn: 'Test thorn',
        bud: 'Test bud',
        date: '2025-07-18',
      };
      const expectedResult = { id: 1, ...createEntryDto, userId: mockUser.id };
      mockEntriesService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createEntryDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(createEntryDto, mockUser.id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createOrUpdate', () => {
    it('should create or update an entry with user ID', async () => {
      const createEntryDto: CreateEntryDto = {
        rose: 'Test rose',
        thorn: 'Test thorn',
        bud: 'Test bud',
        date: '2025-07-18',
      };
      const expectedResult = { id: 1, ...createEntryDto, userId: mockUser.id };
      mockEntriesService.createOrUpdate.mockResolvedValue(expectedResult);

      const result = await controller.createOrUpdate(createEntryDto, mockRequest);

      expect(service.createOrUpdate).toHaveBeenCalledWith(createEntryDto, mockUser.id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should find all entries for user', async () => {
      const expectedResult = { entries: [], total: 0 };
      mockEntriesService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, undefined, undefined);
      expect(result).toEqual(expectedResult);
    });

    it('should find all entries with pagination', async () => {
      const expectedResult = { entries: [], total: 0 };
      mockEntriesService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockRequest, 10, 20);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.id, 10, 20);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should find one entry by date for user', async () => {
      const date = '2025-07-18';
      const expectedResult = { id: 1, date, userId: mockUser.id };
      mockEntriesService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(date, mockRequest);

      expect(service.findOne).toHaveBeenCalledWith(date, mockUser.id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should update an entry for user', async () => {
      const date = '2025-07-18';
      const updateEntryDto: UpdateEntryDto = {
        rose: 'Updated rose',
      };
      const expectedResult = { id: 1, date, ...updateEntryDto, userId: mockUser.id };
      mockEntriesService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(date, updateEntryDto, mockRequest);

      expect(service.update).toHaveBeenCalledWith(date, updateEntryDto, mockUser.id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should remove an entry for user', async () => {
      const date = '2025-07-18';
      const expectedResult = { success: true };
      mockEntriesService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(date, mockRequest);

      expect(service.remove).toHaveBeenCalledWith(date, mockUser.id);
      expect(result).toEqual(expectedResult);
    });
  });
});
