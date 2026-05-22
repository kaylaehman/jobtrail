// Plain CommonJS so the production container can run it without ts-node.
// Mirrors prisma/seed.ts (deleted) — kept as JS to avoid ts-node ESM issues on Node 20.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.jobApplication.count();
  if (count > 0) {
    console.log(`[seed] ${count} applications already present — skipping.`);
    return;
  }

  // Sample 1: in-progress with multi-round timeline matching REQUIREMENTS.md §8.2.
  await prisma.jobApplication.create({
    data: {
      company: 'TechCorp Inc.',
      position: 'Senior Software Engineer',
      source: 'linkedin',
      sourceJobId: 'seed-techcorp-001',
      jobUrl: 'https://www.linkedin.com/jobs/view/seed-techcorp-001',
      location: 'San Francisco, CA',
      salaryMin: 160000,
      salaryMax: 220000,
      salaryCurrency: 'USD',
      remote: true,
      status: 'interview',
      appliedAt: new Date('2024-01-10T00:00:00Z'),
      tags: ['react', 'typescript', 'remote'],
      description:
        'Senior Software Engineer with 5+ years experience. Stack: React, TypeScript, Node.js, PostgreSQL, AWS, Docker. Hybrid (3 days remote).',
      rounds: {
        create: [
          {
            roundNumber: 1,
            type: 'online_assessment',
            scheduledAt: new Date('2024-01-15T10:00:00Z'),
            durationMinutes: 90,
            status: 'passed',
            notes: 'Algorithms + system design. Focus on data structures and complexity analysis.',
          },
          {
            roundNumber: 2,
            type: 'hr_screen',
            scheduledAt: new Date('2024-01-22T15:00:00Z'),
            durationMinutes: 30,
            interviewer: 'Sarah Chen (HR Manager)',
            status: 'passed',
            notes: 'Asked about salary expectations and work preferences.',
          },
          {
            roundNumber: 3,
            type: 'technical',
            scheduledAt: new Date('2024-01-29T17:00:00Z'),
            durationMinutes: 60,
            interviewer: 'Mike Johnson (Tech Lead)',
            status: 'waiting',
            notes: 'In-depth project discussion, live coding session.',
          },
          {
            roundNumber: 4,
            type: 'final',
            scheduledAt: new Date('2024-02-05T14:00:00Z'),
            durationMinutes: 60,
            interviewer: 'David Liu (Engineering Director)',
            status: 'scheduled',
            notes: 'Prepare for deep project discussion, team culture, development plans.',
          },
        ],
      },
    },
  });

  // Sample 2: rejected — for filter/status pill demos.
  await prisma.jobApplication.create({
    data: {
      company: 'StartupXYZ',
      position: 'Full Stack Developer',
      source: 'indeed',
      sourceJobId: 'seed-startupxyz-002',
      location: 'Remote',
      remote: true,
      status: 'rejected',
      appliedAt: new Date('2024-01-05T00:00:00Z'),
      tags: ['python', 'django'],
      description:
        'Full Stack Developer with Python, Django, PostgreSQL, Docker. 2+ years experience required. Fully remote.',
      rounds: {
        create: [
          {
            roundNumber: 1,
            type: 'hr_screen',
            scheduledAt: new Date('2024-01-08T11:00:00Z'),
            status: 'rejected',
            notes: 'Mismatch on salary expectations.',
          },
        ],
      },
    },
  });

  // Sample 3: saved but not applied yet — exercises the deadline reminder badge.
  const inFiveDays = new Date();
  inFiveDays.setDate(inFiveDays.getDate() + 5);
  await prisma.jobApplication.create({
    data: {
      company: 'CloudCo',
      position: 'Platform Engineer',
      source: 'manual',
      jobUrl: 'https://cloudco.example.com/careers/platform-engineer',
      location: 'New York, NY (Hybrid)',
      remote: false,
      status: 'saved',
      deadline: inFiveDays,
      tags: ['kubernetes', 'aws', 'terraform'],
      description:
        'Platform Engineer for Kubernetes, AWS, Terraform infrastructure. Senior (8+ years). On-site/hybrid.',
    },
  });

  console.log('[seed] Inserted 3 example applications.');
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
