import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { QueryJobDto } from './dto/query-job.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(@Query() q: QueryJobDto) {
    return this.jobs.list(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobs.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateJobDto) {
    return this.jobs.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobs.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobs.remove(id);
  }
}
