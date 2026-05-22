import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { CreateRoundDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';

// Mounted under /api/jobs/:jobId/rounds so the URL mirrors the resource hierarchy.
@Controller('jobs/:jobId/rounds')
export class RoundsController {
  constructor(private readonly rounds: RoundsService) {}

  @Get()
  list(@Param('jobId') jobId: string) {
    return this.rounds.listForJob(jobId);
  }

  @Post()
  create(@Param('jobId') jobId: string, @Body() dto: CreateRoundDto) {
    return this.rounds.create(jobId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoundDto) {
    return this.rounds.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rounds.remove(id);
  }
}
