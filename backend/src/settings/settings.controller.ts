import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ResetSettingsDto } from './dto/reset-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }

  // POST /api/settings/reset — destructive. Caller must include `confirm: "DELETE_ALL_DATA"` in
  // the body or the DTO validator rejects with 400. Returns counts of what was deleted.
  @Post('reset')
  @HttpCode(200)
  reset(@Body() dto: ResetSettingsDto) {
    return this.settings.reset(dto);
  }
}
