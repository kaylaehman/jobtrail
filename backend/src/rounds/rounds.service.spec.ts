import { RoundsService } from './rounds.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RoundsService.nextRoundNumber', () => {
  it('returns 1 when no prior rounds exist', async () => {
    const prisma = {
      jobApplication: { findUnique: jest.fn().mockResolvedValue({ id: 'j1' }) },
      interviewRound: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'r1', ...data })),
      },
    };
    const svc = new RoundsService(prisma as unknown as PrismaService);
    const created = await svc.create('j1', {});
    expect(created.roundNumber).toBe(1);
  });

  it('increments from the highest existing round', async () => {
    const prisma = {
      jobApplication: { findUnique: jest.fn().mockResolvedValue({ id: 'j1' }) },
      interviewRound: {
        findFirst: jest.fn().mockResolvedValue({ roundNumber: 4 }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'r5', ...data })),
      },
    };
    const svc = new RoundsService(prisma as unknown as PrismaService);
    const created = await svc.create('j1', {});
    expect(created.roundNumber).toBe(5);
  });
});
