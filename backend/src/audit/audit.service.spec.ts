import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from './audit.service';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { User } from '../auth/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: Repository<AuditLog>;

  const mockUser: User = {
    id: uuidv4(),
    googleId: 'google-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    entries: [],
  };

  const mockAuditLog: AuditLog = {
    id: 1,
    userId: mockUser.id,
    user: mockUser,
    action: AuditAction.LOGIN,
    timestamp: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'test-user-agent',
    resourceId: null,
    details: null,
  };

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogRepository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create and save audit log entry', async () => {
      const auditData = {
        user: mockUser,
        action: AuditAction.LOGIN,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: 'resource-123',
        details: { test: 'data' },
      };

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.log(auditData);

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.LOGIN,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: 'resource-123',
        details: { test: 'data' },
      });
      expect(mockAuditLogRepository.save).toHaveBeenCalledWith(mockAuditLog);
      expect(result).toEqual(mockAuditLog);
    });

    it('should handle userId directly when user object not provided', async () => {
      const auditData = {
        userId: mockUser.id,
        action: AuditAction.LOGIN,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
      };

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      await service.log(auditData);

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.LOGIN,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: undefined,
        details: undefined,
      });
    });
  });

  describe('logLogin', () => {
    it('should log successful login', async () => {
      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.logLogin(mockUser, '127.0.0.1', 'test-user-agent');

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.LOGIN,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: undefined,
        details: {
          email: mockUser.email,
          name: mockUser.name,
        },
      });
      expect(result).toEqual(mockAuditLog);
    });
  });

  describe('logLoginFailed', () => {
    it('should log failed login attempt', async () => {
      const failedLoginLog = { ...mockAuditLog, action: AuditAction.LOGIN_FAILED };
      mockAuditLogRepository.create.mockReturnValue(failedLoginLog);
      mockAuditLogRepository.save.mockResolvedValue(failedLoginLog);

      const result = await service.logLoginFailed('test@example.com', '127.0.0.1', 'test-user-agent', 'Invalid credentials');

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: undefined,
        action: AuditAction.LOGIN_FAILED,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: undefined,
        details: {
          email: 'test@example.com',
          reason: 'Invalid credentials',
        },
      });
      expect(result).toEqual(failedLoginLog);
    });
  });

  describe('logLogout', () => {
    it('should log user logout', async () => {
      const logoutLog = { ...mockAuditLog, action: AuditAction.LOGOUT };
      mockAuditLogRepository.create.mockReturnValue(logoutLog);
      mockAuditLogRepository.save.mockResolvedValue(logoutLog);

      const result = await service.logLogout(mockUser, '127.0.0.1', 'test-user-agent');

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.LOGOUT,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: undefined,
        details: undefined,
      });
      expect(result).toEqual(logoutLog);
    });
  });

  describe('logCreateEntry', () => {
    it('should log entry creation', async () => {
      const createLog = { ...mockAuditLog, action: AuditAction.CREATE_ENTRY };
      mockAuditLogRepository.create.mockReturnValue(createLog);
      mockAuditLogRepository.save.mockResolvedValue(createLog);

      const result = await service.logCreateEntry(mockUser, '2025-01-15', '127.0.0.1', 'test-user-agent');

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.CREATE_ENTRY,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: '2025-01-15',
        details: {
          entryDate: '2025-01-15',
        },
      });
      expect(result).toEqual(createLog);
    });
  });

  describe('logUpdateEntry', () => {
    it('should log entry update with changes', async () => {
      const updateLog = { ...mockAuditLog, action: AuditAction.UPDATE_ENTRY };
      const changes = { rose: 'Updated rose', thorn: 'Updated thorn' };
      mockAuditLogRepository.create.mockReturnValue(updateLog);
      mockAuditLogRepository.save.mockResolvedValue(updateLog);

      const result = await service.logUpdateEntry(mockUser, '2025-01-15', '127.0.0.1', 'test-user-agent', changes);

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.UPDATE_ENTRY,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: '2025-01-15',
        details: {
          entryDate: '2025-01-15',
          changes,
        },
      });
      expect(result).toEqual(updateLog);
    });
  });

  describe('logDeleteEntry', () => {
    it('should log entry deletion', async () => {
      const deleteLog = { ...mockAuditLog, action: AuditAction.DELETE_ENTRY };
      mockAuditLogRepository.create.mockReturnValue(deleteLog);
      mockAuditLogRepository.save.mockResolvedValue(deleteLog);

      const result = await service.logDeleteEntry(mockUser, '2025-01-15', '127.0.0.1', 'test-user-agent');

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.DELETE_ENTRY,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: '2025-01-15',
        details: {
          entryDate: '2025-01-15',
        },
      });
      expect(result).toEqual(deleteLog);
    });
  });

  describe('logViewEntry', () => {
    it('should log entry view', async () => {
      const viewLog = { ...mockAuditLog, action: AuditAction.VIEW_ENTRY };
      mockAuditLogRepository.create.mockReturnValue(viewLog);
      mockAuditLogRepository.save.mockResolvedValue(viewLog);

      const result = await service.logViewEntry(mockUser, '2025-01-15', '127.0.0.1', 'test-user-agent');

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.VIEW_ENTRY,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: '2025-01-15',
        details: {
          entryDate: '2025-01-15',
        },
      });
      expect(result).toEqual(viewLog);
    });
  });

  describe('logViewEntries', () => {
    it('should log entries list view with pagination', async () => {
      const viewEntriesLog = { ...mockAuditLog, action: AuditAction.VIEW_ENTRIES };
      const pagination = { limit: 10, offset: 0, totalReturned: 5 };
      mockAuditLogRepository.create.mockReturnValue(viewEntriesLog);
      mockAuditLogRepository.save.mockResolvedValue(viewEntriesLog);

      const result = await service.logViewEntries(mockUser, '127.0.0.1', 'test-user-agent', pagination);

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.VIEW_ENTRIES,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: undefined,
        details: {
          pagination,
        },
      });
      expect(result).toEqual(viewEntriesLog);
    });

    it('should log entries list view without pagination', async () => {
      const viewEntriesLog = { ...mockAuditLog, action: AuditAction.VIEW_ENTRIES };
      mockAuditLogRepository.create.mockReturnValue(viewEntriesLog);
      mockAuditLogRepository.save.mockResolvedValue(viewEntriesLog);

      const result = await service.logViewEntries(mockUser, '127.0.0.1', 'test-user-agent');

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.VIEW_ENTRIES,
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        resourceId: undefined,
        details: {
          pagination: undefined,
        },
      });
      expect(result).toEqual(viewEntriesLog);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors', async () => {
      const dbError = new Error('Database connection failed');
      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockRejectedValue(dbError);

      await expect(service.logLogin(mockUser, '127.0.0.1', 'test-user-agent')).rejects.toThrow(dbError);
    });
  });
});
