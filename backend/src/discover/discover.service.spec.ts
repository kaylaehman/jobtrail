import { DiscoverService } from './discover.service';
import { JobsService } from '../jobs/jobs.service';
import { CompaniesService } from '../companies/companies.service';

describe('DiscoverService.import', () => {
  const makeMocks = (appOverrides: Record<string, unknown> = {}) => {
    const jobs = {
      upsertFromSource: jest.fn().mockResolvedValue({ id: 'j1', companyMatchStatus: 'auto', companyId: null, ...appOverrides }),
      setCompanyId: jest.fn().mockImplementation((id, companyId) => Promise.resolve({ id, companyId, companyMatchStatus: 'auto' })),
    };
    const companies = {
      findOrCreateByNameOrDomain: jest.fn().mockResolvedValue({ id: 'c1', name: 'Acme' }),
      enqueueIfStale: jest.fn(),
    };
    return { jobs, companies };
  };

  it('delegates to JobsService.upsertFromSource with status=saved', async () => {
    const { jobs, companies } = makeMocks();
    const svc = new DiscoverService(jobs as unknown as JobsService, companies as unknown as CompaniesService);
    await svc.import({
      source: 'linkedin',
      sourceJobId: 'li-123',
      company: 'Acme',
      position: 'Engineer',
    });
    expect(jobs.upsertFromSource).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'saved', source: 'linkedin', sourceJobId: 'li-123' }),
    );
  });

  it('resolves and links Company when status is auto', async () => {
    const { jobs, companies } = makeMocks();
    const svc = new DiscoverService(jobs as unknown as JobsService, companies as unknown as CompaniesService);
    await svc.import({
      source: 'linkedin',
      sourceJobId: 'li-123',
      company: 'Acme',
      position: 'Engineer',
      companyUrl: 'acme.com',
    });
    expect(companies.findOrCreateByNameOrDomain).toHaveBeenCalledWith('Acme', 'acme.com');
    expect(jobs.setCompanyId).toHaveBeenCalledWith('j1', 'c1');
    expect(companies.enqueueIfStale).toHaveBeenCalled();
  });

  it('skips Company resolution when status is rejected', async () => {
    const { jobs, companies } = makeMocks({ companyMatchStatus: 'rejected' });
    const svc = new DiscoverService(jobs as unknown as JobsService, companies as unknown as CompaniesService);
    await svc.import({
      source: 'linkedin',
      sourceJobId: 'li-123',
      company: 'Acme',
      position: 'Engineer',
    });
    expect(companies.findOrCreateByNameOrDomain).not.toHaveBeenCalled();
    expect(jobs.setCompanyId).not.toHaveBeenCalled();
  });

  it('skips Company resolution when status is confirmed', async () => {
    const { jobs, companies } = makeMocks({ companyMatchStatus: 'confirmed', companyId: 'existing' });
    const svc = new DiscoverService(jobs as unknown as JobsService, companies as unknown as CompaniesService);
    await svc.import({
      source: 'linkedin',
      sourceJobId: 'li-123',
      company: 'Acme',
      position: 'Engineer',
    });
    expect(companies.findOrCreateByNameOrDomain).not.toHaveBeenCalled();
  });
});
