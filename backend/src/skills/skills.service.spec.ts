import { SkillsService } from './skills.service';

describe('SkillsService', () => {
  const svc = new SkillsService();

  describe('extract()', () => {
    it('returns the §8.3 shape: skills by category + experience + arrangement + flat tags', () => {
      const out = svc.extract('We use JavaScript, TypeScript, React, and PostgreSQL.');
      expect(out.skills).toHaveProperty('languages');
      expect(out.skills).toHaveProperty('frameworks');
      expect(out.skills).toHaveProperty('databases');
      expect(out.skills).toHaveProperty('cloud');
      expect(out.skills).toHaveProperty('tools');
      expect(out.tags).toEqual(expect.arrayContaining(['JavaScript', 'React']));
    });

    it('detects senior experience level from "5+ years"', () => {
      const out = svc.extract('Senior role requiring 6+ years of experience.');
      expect(out.experienceLevel).toMatch(/Senior/);
    });

    it('detects hybrid work arrangement', () => {
      const out = svc.extract('Hybrid schedule: 3 days in office, 2 remote.');
      expect(out.workArrangement).toMatch(/Hybrid/);
      expect(out.workArrangement).toMatch(/Remote/);
    });
  });

  // These tests target the matcher the user implements.
  // They are skipped via .skip until the user-supplied matcher passes them.
  describe('findSkillInContext (user-supplied matcher)', () => {
    it('matches a real mention of "react"', () => {
      expect(svc.findSkillInContext('we use react and node.js daily', 'react')).toBe(true);
    });

    // The next two assertions only pass once the user implements a real matcher.
    // The stubbed substring matcher fails them on purpose.
    it('rejects "react" inside "reacted"', () => {
      expect(svc.findSkillInContext('she reacted to the news', 'react')).toBe(false);
    });

    it('rejects "go" inside "google"', () => {
      expect(svc.findSkillInContext('google for answers', 'go')).toBe(false);
    });

    it('matches "c++" with its punctuation', () => {
      expect(svc.findSkillInContext('strong c++ background required', 'c++')).toBe(true);
    });
  });
});
