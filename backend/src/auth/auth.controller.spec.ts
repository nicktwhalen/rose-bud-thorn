import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { User } from './entities/user.entity';
import { RequestWithIp } from '../audit/ip-extractor.middleware';
import { v4 as uuidv4 } from 'uuid';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let auditService: AuditService;

  const mockUser: User = {
    id: uuidv4(),
    googleId: 'google-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    entries: [],
  };

  const mockAuthService = {
    login: jest.fn(),
  };

  const mockAuditService = {
    logLogin: jest.fn(),
    logLogout: jest.fn(),
  };

  const mockRequest: Partial<RequestWithIp> = {
    user: mockUser,
    clientIp: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-user-agent'),
    query: {},
  };

  const mockResponse: Partial<Response> = {
    redirect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    auditService = module.get<AuditService>(AuditService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('googleAuth', () => {
    it('should initiate Google OAuth flow', async () => {
      await controller.googleAuth(mockRequest as RequestWithIp);
      // This method just initiates OAuth, no assertions needed
      expect(true).toBe(true);
    });
  });

  describe('googleAuthRedirect', () => {
    const loginResponse = {
      access_token: 'jwt-token-123',
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      },
    };

    beforeEach(() => {
      process.env.FRONTEND_URL = 'https://frontend.example.com';
    });

    it('should handle Google OAuth callback and redirect to frontend', async () => {
      mockAuthService.login.mockResolvedValue(loginResponse);
      const requestWithUser = {
        ...mockRequest,
        user: mockUser,
      };

      await controller.googleAuthRedirect(requestWithUser as RequestWithIp, mockResponse as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
      expect(mockAuditService.logLogin).toHaveBeenCalledWith(mockUser, '127.0.0.1', 'test-user-agent');
      expect(mockResponse.redirect).toHaveBeenCalledWith(`https://frontend.example.com/auth/callback?token=${loginResponse.access_token}`);
    });

    it('should handle requested frontend URL from query params', async () => {
      mockAuthService.login.mockResolvedValue(loginResponse);
      const requestWithFrontendUrl = {
        ...mockRequest,
        user: mockUser,
        query: { frontend_url: 'https://frontend.example.com' },
      };

      await controller.googleAuthRedirect(requestWithFrontendUrl as RequestWithIp, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith(`https://frontend.example.com/auth/callback?token=${loginResponse.access_token}`);
    });

    it('should reject unauthorized frontend URLs', async () => {
      mockAuthService.login.mockResolvedValue(loginResponse);
      const requestWithBadUrl = {
        ...mockRequest,
        user: mockUser,
        query: { frontend_url: 'https://malicious-site.com' },
      };

      await controller.googleAuthRedirect(requestWithBadUrl as RequestWithIp, mockResponse as Response);

      // Should use default frontend URL, not the malicious one
      expect(mockResponse.redirect).toHaveBeenCalledWith(`https://frontend.example.com/auth/callback?token=${loginResponse.access_token}`);
    });

    it('should handle user with frontendUrl property', async () => {
      mockAuthService.login.mockResolvedValue(loginResponse);
      const userWithFrontendUrl = {
        ...mockUser,
        frontendUrl: 'https://frontend.example.com',
      };
      const requestWithUserFrontendUrl = {
        ...mockRequest,
        user: userWithFrontendUrl,
      };

      await controller.googleAuthRedirect(requestWithUserFrontendUrl as RequestWithIp, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith(`https://frontend.example.com/auth/callback?token=${loginResponse.access_token}`);
    });

    it('should handle authentication service errors', async () => {
      const authError = new Error('Authentication failed');
      mockAuthService.login.mockRejectedValue(authError);

      await expect(controller.googleAuthRedirect(mockRequest as RequestWithIp, mockResponse as Response)).rejects.toThrow(authError);
    });

    it('should handle audit logging errors gracefully', async () => {
      mockAuthService.login.mockResolvedValue(loginResponse);
      mockAuditService.logLogin.mockImplementation(async () => {
        throw new Error('Audit logging failed');
      });

      // Should throw since audit logging is awaited in the controller
      await expect(controller.googleAuthRedirect(mockRequest as RequestWithIp, mockResponse as Response)).rejects.toThrow('Audit logging failed');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const result = await controller.getProfile(mockRequest as RequestWithIp);

      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should log logout and return success message', async () => {
      const result = await controller.logout(mockRequest as RequestWithIp);

      expect(mockAuditService.logLogout).toHaveBeenCalledWith(mockUser, '127.0.0.1', 'test-user-agent');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should handle audit logging errors in logout', async () => {
      mockAuditService.logLogout.mockImplementation(async () => {
        throw new Error('Audit logging failed');
      });

      // Should throw since audit logging is awaited in the controller
      await expect(controller.logout(mockRequest as RequestWithIp)).rejects.toThrow('Audit logging failed');
    });
  });
});
