import { DiscoverService } from './discover.service';
import { JobsService } from '../jobs/jobs.service';

describe('DiscoverService.import', () => {
  it('delegates to JobsService.upsertFromSource with status=saved', async () => {
    const jobs = { upsertFromSource: jest.fn().mockResolvedValue({ id: 'j1' }) };
    const svc = new DiscoverService(jobs as unknown as JobsService);
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
});
