import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { EntriesService } from './entries.service';
import { CreateEntryDto, validateAtLeastOneField } from './dto/create-entry.dto';
import { UpdateEntryDto, validateAtLeastOneFieldUpdate } from './dto/update-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/entities/user.entity';

@Controller('api/entries')
@UseGuards(JwtAuthGuard)
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Post()
  create(@Body() createEntryDto: CreateEntryDto, @Req() req: Request) {
    if (!validateAtLeastOneField(createEntryDto)) {
      throw new BadRequestException('At least one field (rose, thorn, or bud) must have a value');
    }
    const user = req.user as User;
    return this.entriesService.create(createEntryDto, user.id);
  }

  @Post('upsert')
  createOrUpdate(@Body() createEntryDto: CreateEntryDto, @Req() req: Request) {
    if (!validateAtLeastOneField(createEntryDto)) {
      throw new BadRequestException('At least one field (rose, thorn, or bud) must have a value');
    }
    const user = req.user as User;
    return this.entriesService.createOrUpdate(createEntryDto, user.id);
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
  update(@Param('date') date: string, @Body() updateEntryDto: UpdateEntryDto, @Req() req: Request) {
    if (!validateAtLeastOneFieldUpdate(updateEntryDto)) {
      throw new BadRequestException('At least one field (rose, thorn, or bud) must have a value');
    }
    const user = req.user as User;
    return this.entriesService.update(date, updateEntryDto, user.id);
  }

  @Delete(':date')
  remove(@Param('date') date: string, @Req() req: Request) {
    const user = req.user as User;
    return this.entriesService.remove(date, user.id);
  }
}
