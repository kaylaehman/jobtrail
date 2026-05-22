import { CreateRoundDto } from './create-round.dto';

export class UpdateRoundDto implements Partial<CreateRoundDto> {
  roundNumber?: number;
  type?: CreateRoundDto['type'];
  scheduledAt?: string;
  durationMinutes?: number;
  interviewer?: string;
  status?: CreateRoundDto['status'];
  notes?: string;
}
