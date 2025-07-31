import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { User } from '../auth/entities/user.entity';

export interface AuditLogData {
  userId?: string;
  user?: User;
  action: AuditAction;
  ipAddress: string;
  userAgent?: string;
  resourceId?: string;
  details?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Create an audit log entry
   */
  async log(data: AuditLogData): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      userId: data.userId || data.user?.id,
      action: data.action,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      resourceId: data.resourceId,
      details: data.details,
    });

    return await this.auditLogRepository.save(auditLog);
  }

  /**
   * Log successful login
   */
  async logLogin(user: User, ipAddress: string, userAgent?: string): Promise<AuditLog> {
    return this.log({
      user,
      action: AuditAction.LOGIN,
      ipAddress,
      userAgent,
      details: {
        email: user.email,
        name: user.name,
      },
    });
  }

  /**
   * Log failed login attempt
   */
  async logLoginFailed(email: string, ipAddress: string, userAgent?: string, reason?: string): Promise<AuditLog> {
    return this.log({
      action: AuditAction.LOGIN_FAILED,
      ipAddress,
      userAgent,
      details: {
        email,
        reason,
      },
    });
  }

  /**
   * Log logout
   */
  async logLogout(user: User, ipAddress: string, userAgent?: string): Promise<AuditLog> {
    return this.log({
      user,
      action: AuditAction.LOGOUT,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log entry creation
   */
  async logCreateEntry(user: User, entryDate: string, ipAddress: string, userAgent?: string): Promise<AuditLog> {
    return this.log({
      user,
      action: AuditAction.CREATE_ENTRY,
      ipAddress,
      userAgent,
      resourceId: entryDate,
      details: {
        entryDate,
      },
    });
  }

  /**
   * Log entry update
   */
  async logUpdateEntry(user: User, entryDate: string, ipAddress: string, userAgent?: string, changes?: Record<string, any>): Promise<AuditLog> {
    return this.log({
      user,
      action: AuditAction.UPDATE_ENTRY,
      ipAddress,
      userAgent,
      resourceId: entryDate,
      details: {
        entryDate,
        changes,
      },
    });
  }

  /**
   * Log entry deletion
   */
  async logDeleteEntry(user: User, entryDate: string, ipAddress: string, userAgent?: string): Promise<AuditLog> {
    return this.log({
      user,
      action: AuditAction.DELETE_ENTRY,
      ipAddress,
      userAgent,
      resourceId: entryDate,
      details: {
        entryDate,
      },
    });
  }

  /**
   * Log viewing a specific entry
   */
  async logViewEntry(user: User, entryDate: string, ipAddress: string, userAgent?: string): Promise<AuditLog> {
    return this.log({
      user,
      action: AuditAction.VIEW_ENTRY,
      ipAddress,
      userAgent,
      resourceId: entryDate,
      details: {
        entryDate,
      },
    });
  }

  /**
   * Log viewing entries list
   */
  async logViewEntries(user: User, ipAddress: string, userAgent?: string, pagination?: { limit?: number; offset?: number; totalReturned?: number }): Promise<AuditLog> {
    return this.log({
      user,
      action: AuditAction.VIEW_ENTRIES,
      ipAddress,
      userAgent,
      details: {
        pagination,
      },
    });
  }
}
