import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(req: any, accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { id, name, emails, photos } = profile;
    const userEmail = emails[0].value;
    const userPicture = photos[0]?.value;

    const user = await this.authService.findOrCreateUser({
      googleId: id,
      email: userEmail,
      name: `${name.givenName} ${name.familyName}`,
      picture: userPicture,
    });

    // Pass frontend_url from query to the user object
    const userWithFrontendUrl = {
      ...user,
      frontendUrl: req.query.frontend_url || req.query.state,
    };

    done(null, userWithFrontendUrl);
  }
}
