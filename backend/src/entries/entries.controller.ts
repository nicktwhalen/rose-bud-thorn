import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { EntriesService } from './entries.service';
import { CreateEntryDto, validateAtLeastOneField } from './dto/create-entry.dto';
import { UpdateEntryDto, validateAtLeastOneFieldUpdate } from './dto/update-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { RequestWithIp } from '../audit/ip-extractor.middleware';

@Controller('api/entries')
@UseGuards(JwtAuthGuard)
export class EntriesController {
  constructor(
    private readonly entriesService: EntriesService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  async create(@Body() createEntryDto: CreateEntryDto, @Req() req: RequestWithIp) {
    if (!validateAtLeastOneField(createEntryDto)) {
      throw new BadRequestException('At least one field (rose, thorn, or bud) must have a value');
    }
    const user = req.user as User;
    const result = await this.entriesService.create(createEntryDto, user.id);

    // Log entry creation
    await this.auditService.logCreateEntry(user, createEntryDto.date, req.clientIp || 'unknown', req.get('user-agent'));

    return result;
  }

  @Post('upsert')
  async createOrUpdate(@Body() createEntryDto: CreateEntryDto, @Req() req: RequestWithIp) {
    if (!validateAtLeastOneField(createEntryDto)) {
      throw new BadRequestException('At least one field (rose, thorn, or bud) must have a value');
    }
    const user = req.user as User;
    const result = await this.entriesService.createOrUpdate(createEntryDto, user.id);

    // Log entry creation or update (upsert operation)
    await this.auditService.logCreateEntry(user, createEntryDto.date, req.clientIp || 'unknown', req.get('user-agent'));

    return result;
  }

  @Get()
  findAll(@Req() req: Request, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    const user = req.user as User;
    return this.entriesService.findAll(user.id, limit, offset);
  }

  @Get(':date')
  findOne(@Param('date') date: string, @Req() req: Request) {
    const user = req.user as User;
    return this.entriesService.findOne(date, user.id);
  }

  @Patch(':date')
  async update(@Param('date') date: string, @Body() updateEntryDto: UpdateEntryDto, @Req() req: RequestWithIp) {
    if (!validateAtLeastOneFieldUpdate(updateEntryDto)) {
      throw new BadRequestException('At least one field (rose, thorn, or bud) must have a value');
    }
    const user = req.user as User;
    const result = await this.entriesService.update(date, updateEntryDto, user.id);

    // Log entry update
    await this.auditService.logUpdateEntry(user, date, req.clientIp || 'unknown', req.get('user-agent'), updateEntryDto);

    return result;
  }

  @Delete(':date')
  async remove(@Param('date') date: string, @Req() req: RequestWithIp) {
    const user = req.user as User;
    const result = await this.entriesService.remove(date, user.id);

    // Log entry deletion
    await this.auditService.logDeleteEntry(user, date, req.clientIp || 'unknown', req.get('user-agent'));

    return result;
  }
}
