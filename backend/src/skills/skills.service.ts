import { Injectable } from '@nestjs/common';
import nlp from 'compromise';
import { SKILL_CATEGORIES, SkillCategory } from './data/categories';

export interface ExtractedSkills {
  skills: Record<SkillCategory, string[]>;
  experienceLevel: string | null;
  workArrangement: string | null;
  tags: string[];
}

@Injectable()
export class SkillsService {
  /**
   * Local NLP skills extraction (FR-4).
   *
   * Pipeline:
   *   1. Normalize the job description (lowercase, collapse whitespace).
   *   2. For every (category, skill) pair in SKILL_CATEGORIES, ask
   *      `findSkillInContext` whether the skill is genuinely mentioned.
   *   3. Detect experience level + work arrangement with regex helpers.
   *   4. Flatten the matched skills into a single `tags` list for chip UI.
   */
  extract(description: string): ExtractedSkills {
    const text = this.normalize(description);
    const skills = Object.fromEntries(
      (Object.keys(SKILL_CATEGORIES) as SkillCategory[]).map((category) => [
        category,
        SKILL_CATEGORIES[category].filter((skill) =>
          this.findSkillInContext(text, skill.toLowerCase()),
        ),
      ]),
    ) as Record<SkillCategory, string[]>;

    return {
      skills,
      experienceLevel: this.extractExperienceLevel(text),
      workArrangement: this.extractWorkArrangement(text),
      tags: Object.values(skills).flat(),
    };
  }

  private normalize(text: string): string {
    // compromise gives us proper sentence/term boundaries; for the MVP we just
    // lowercase + collapse whitespace, which is enough for `findSkillInContext`.
    const doc = nlp(text);
    return doc.text().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Decide whether `skill` is genuinely mentioned in `text`. Both inputs are
   * already lowercased. Spec ref: REQUIREMENTS.md §10.2.
   *
   * Approach: escape regex metacharacters in the skill, then bracket it with
   * alphanumeric lookarounds. `\b` is unusable here — it sits between a
   * word char and a non-word char, so it never fires on the `+` in "c++" or
   * the `.` in "node.js". Asserting that the *adjacent* char is not
   * alphanumeric is the right invariant: it gives word-boundary semantics for
   * "react" while leaving "c++" and "node.js" alone.
   */
  findSkillInContext(text: string, skill: string): boolean {
    if (!skill) return false;
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`);
    return re.test(text);
  }

  private extractExperienceLevel(text: string): string | null {
    const yearsMatch = text.match(/(\d+)\s*\+?\s*years?/);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1], 10);
      if (years >= 8) return `Staff/Principal (${years}+ years)`;
      if (years >= 5) return `Senior (${years}+ years)`;
      if (years >= 2) return `Mid-level (${years}+ years)`;
      return `Junior (${years}+ years)`;
    }
    if (/\bstaff\b|\bprincipal\b/.test(text)) return 'Staff/Principal';
    if (/\bsenior\b/.test(text)) return 'Senior';
    if (/\bjunior\b|\bentry[- ]level\b|\bintern\b/.test(text)) return 'Junior';
    return null;
  }

  private extractWorkArrangement(text: string): string | null {
    const remote = /\bremote\b/.test(text);
    const hybrid = /\bhybrid\b/.test(text);
    const onsite = /\bon[- ]?site\b|\bin[- ]?office\b/.test(text);
    const parts: string[] = [];
    if (remote) parts.push('Remote');
    if (hybrid) parts.push('Hybrid');
    if (onsite) parts.push('On-site');
    return parts.length ? parts.join(' / ') : null;
  }
}
