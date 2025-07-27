import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface RequestWithIp extends Request {
  clientIp?: string;
  user?: any;
}

@Injectable()
export class IpExtractorMiddleware implements NestMiddleware {
  use(req: RequestWithIp, res: Response, next: NextFunction) {
    // Extract IP address from various headers and sources
    const ip = this.extractIpAddress(req);
    req.clientIp = ip;
    next();
  }

  private extractIpAddress(req: Request): string {
    // Check various headers in order of preference
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // Cloudflare
      'x-cluster-client-ip',
      'x-forwarded',
      'forwarded-for',
      'forwarded',
    ];

    // Check each header
    for (const header of headers) {
      const value = req.get(header);
      if (value) {
        // x-forwarded-for can contain multiple IPs, take the first one
        const ip = value.split(',')[0].trim();
        if (this.isValidIp(ip)) {
          return ip;
        }
      }
    }

    // Fallback to connection remote address
    const connectionIp = req.socket?.remoteAddress || req.connection?.remoteAddress;
    if (connectionIp && this.isValidIp(connectionIp)) {
      return connectionIp;
    }

    // Ultimate fallback
    return 'unknown';
  }

  private isValidIp(ip: string): boolean {
    if (!ip || ip === 'unknown') return false;

    // Remove IPv6 prefix if present
    const cleanIp = ip.replace(/^::ffff:/, '');

    // Basic IP validation (IPv4 and IPv6)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(cleanIp) || ipv6Regex.test(cleanIp) || cleanIp === '::1' || cleanIp === '127.0.0.1';
  }
}
