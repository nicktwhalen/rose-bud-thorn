import { Controller, Get, Post, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { LoginResponse } from './types/auth.types';
import { AuditService } from '../audit/audit.service';
import { RequestWithIp } from '../audit/ip-extractor.middleware';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private auditService: AuditService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request): Promise<void> {
    // This endpoint initiates the Google OAuth flow
    // frontend_url will be preserved through OAuth state parameter
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: RequestWithIp, @Res() res: Response): Promise<void> {
    const user = req.user as User & { frontendUrl?: string };
    const loginResponse: LoginResponse = await this.authService.login(user);

    // Log successful login
    await this.auditService.logLogin(user, req.clientIp || 'unknown', req.get('user-agent'));

    // Get potential frontend URL from OAuth state or query param
    const requestedFrontendUrl = user.frontendUrl || (req.query.frontend_url as string);

    // Validate frontend URL against whitelist for security
    const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);

    let frontendUrl = process.env.FRONTEND_URL; // default fallback

    if (requestedFrontendUrl) {
      try {
        const url = new URL(requestedFrontendUrl);
        const origin = url.origin;
        if (allowedOrigins.includes(origin)) {
          frontendUrl = origin;
        }
      } catch (error) {
        // Invalid URL, use default
      }
    }

    const redirectUrl = `${frontendUrl}/auth/callback?token=${loginResponse.access_token}`;
    res.redirect(redirectUrl);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: RequestWithIp): Promise<User> {
    return req.user as User;
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req: RequestWithIp): Promise<{ message: string }> {
    const user = req.user as User;

    // Log logout
    await this.auditService.logLogout(user, req.clientIp || 'unknown', req.get('user-agent'));

    // JWT logout is handled on the client side by removing the token
    return { message: 'Logged out successfully' };
  }
}
