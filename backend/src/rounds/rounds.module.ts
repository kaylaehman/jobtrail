import { Module } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';

@Module({
  controllers: [RoundsController],
  providers: [RoundsService],
})
export class RoundsModule {}
