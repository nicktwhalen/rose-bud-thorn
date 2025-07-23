import { IsOptional, IsString } from 'class-validator';

export class CreateEntryDto {
  @IsOptional()
  @IsString()
  rose?: string;

  @IsOptional()
  @IsString()
  thorn?: string;

  @IsOptional()
  @IsString()
  bud?: string;

  @IsOptional()
  @IsString()
  date?: string;
}

// Helper function to validate at least one field
export function validateAtLeastOneField(dto: CreateEntryDto): boolean {
  const hasRose = dto.rose && dto.rose.trim().length > 0;
  const hasThorn = dto.thorn && dto.thorn.trim().length > 0;
  const hasBud = dto.bud && dto.bud.trim().length > 0;
  
  return hasRose || hasThorn || hasBud;
}