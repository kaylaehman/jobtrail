import { Body, Controller, Post } from '@nestjs/common';
import { DiscoverService } from './discover.service';
import { DiscoverImportDto, DiscoverSearchDto } from './dto/discover.dto';

@Controller('discover')
export class DiscoverController {
  constructor(private readonly discover: DiscoverService) {}

  @Post('search')
  search(@Body() dto: DiscoverSearchDto) {
    return this.discover.search(dto);
  }

  @Post('import')
  import(@Body() dto: DiscoverImportDto) {
    return this.discover.import(dto);
  }
}
