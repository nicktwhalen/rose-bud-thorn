import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: uuidv4(),
    googleId: 'google-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    entries: [],
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateUser', () => {
    const googleUserData = {
      googleId: 'google-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
    };

    it('should return existing user if found and update data', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.findOrCreateUser(googleUserData);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { googleId: googleUserData.googleId },
      });
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      // Should save to update user data
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should create new user if not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.findOrCreateUser(googleUserData);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { googleId: googleUserData.googleId },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        googleId: googleUserData.googleId,
        email: googleUserData.email,
        name: googleUserData.name,
        picture: googleUserData.picture,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockUserRepository.findOne.mockRejectedValue(dbError);

      await expect(service.findOrCreateUser(googleUserData)).rejects.toThrow(dbError);
    });
  });

  describe('login', () => {
    it('should generate JWT token for user', async () => {
      const expectedToken = 'jwt-token-123';
      mockJwtService.sign.mockReturnValue(expectedToken);

      const result = await service.login(mockUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        picture: mockUser.picture,
      });
      expect(result).toEqual({
        access_token: expectedToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          picture: mockUser.picture,
        },
      });
    });

    it('should handle JWT signing errors', async () => {
      const jwtError = new Error('JWT signing failed');
      mockJwtService.sign.mockImplementation(() => {
        throw jwtError;
      });

      await expect(service.login(mockUser)).rejects.toThrow(jwtError);
    });
  });

  describe('validateUser', () => {
    it('should return user if found by ID', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(mockUser.id);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle database errors in validation', async () => {
      const dbError = new Error('Database error');
      mockUserRepository.findOne.mockRejectedValue(dbError);

      await expect(service.validateUser(mockUser.id)).rejects.toThrow(dbError);
    });
  });
});
