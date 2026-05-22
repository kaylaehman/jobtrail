import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNoteDto {
  // Cap matches the JobApplication.description db.Text — large enough for a paragraph of
  // thoughts but bounded so a runaway client can't dump a novel into the table.
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  body!: string;
}
