import { Controller, Get, Param, Post } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompanyResponse, toCompanyResponse } from './dto/company.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CompanyResponse> {
    return toCompanyResponse(await this.companies.findOne(id));
  }

  @Get('by-application/:appId')
  async byApplication(@Param('appId') appId: string): Promise<CompanyResponse | null> {
    const c = await this.companies.findByApplication(appId);
    return c ? toCompanyResponse(c) : null;
  }

  @Post(':id/refresh')
  async refresh(@Param('id') id: string): Promise<CompanyResponse> {
    return toCompanyResponse(await this.companies.refresh(id));
  }
}
