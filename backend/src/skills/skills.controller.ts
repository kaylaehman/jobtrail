import { Body, Controller, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { SkillsService } from './skills.service';

class ExtractDto {
  @IsString() @MinLength(1)
  description!: string;
}

@Controller('skills')
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  // POST /api/skills/extract { description }  → preview chips before saving
  @Post('extract')
  extract(@Body() dto: ExtractDto) {
    return this.skills.extract(dto.description);
  }
}
