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
import { CreateNoteDto } from './dto/create-note.dto';
import { QidDto } from '../companies/dto/company.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(@Query() q: QueryJobDto) {
    return this.jobs.list(q);
  }

  // Defined BEFORE @Get(':id') so the route doesn't get swallowed by the param matcher.
  @Get('activity')
  activity() {
    return this.jobs.getActivity();
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

  // POST /api/jobs/:id/link-company { qid } — used by the picker UI when the user manually
  // selects the right entity from Wikidata search results. Marks the match as confirmed.
  @Post(':id/link-company')
  linkCompany(@Param('id') id: string, @Body() dto: QidDto) {
    return this.jobs.linkCompany(id, dto.qid);
  }

  @Post(':id/notes')
  createNote(@Param('id') id: string, @Body() dto: CreateNoteDto) {
    return this.jobs.createNote(id, dto.body);
  }

  @Delete(':id/notes/:noteId')
  deleteNote(@Param('id') id: string, @Param('noteId') noteId: string) {
    return this.jobs.deleteNote(id, noteId);
  }
}
