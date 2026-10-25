import type { SourceAsset } from './source';

/**
 * What the upload is *about*, decided by the content rather than by the file
 * extension or a user selection.
 */
export type SourceKind =
  | 'resume'
  | 'pitch_deck'
  | 'business'
  | 'restaurant'
  | 'event'
  | 'store'
  | 'blog'
  | 'nonprofit'
  | 'agency'
  | 'creator'
  | 'personal';

/**
 * Semantic role of a heading. Content Intelligence labels every heading it
 * finds with one of these, which is how a menu, a roadmap, and a services page
 * can all reach the same renderer.
 */
export type SectionRole =
  | 'summary'
  | 'about'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'offerings'
  | 'process'
  | 'pricing'
  | 'proof'
  | 'team'
  | 'testimonials'
  | 'faq'
  | 'agenda'
  | 'gallery'
  | 'posts'
  | 'contact'
  | 'languages'
  | 'interests'
  | 'narrative'
  | 'other';

export interface RoleHistory {
  role: string;
  org: string;
  period: string;
  location?: string;
  bullets: string[];
  stack?: string[];
}

export interface ProjectRecord {
  name: string;
  description: string;
  tags: string[];
  url?: string;
}

export interface EducationRecord {
  award: string;
  org: string;
  period: string;
  detail?: string;
}

/**
 * One labelled thing. The meaning depends on the section role:
 * offerings -> feature name + description; pricing -> item + detail, meta = price;
 * team -> name, meta = role; testimonials -> author, meta = affiliation, body = quote;
 * faq -> question, body = answer; agenda -> slot, meta = time, body = description.
 */
export interface ContentItem {
  title: string;
  body: string;
  meta?: string;
  tags: string[];
  url?: string;
}

export interface ContentSection {
  heading: string;
  role: SectionRole;
  items: ContentItem[];
  paragraphs: string[];
  /** Raw non-empty lines, kept so copy generation can fall back to real text. */
  lines: string[];
}

/** Agent 1 output: the structured understanding of whatever was uploaded. */
export interface ContentProfile {
  kind: SourceKind;
  kindEvidence: string[];
  name: string;
  headline: string;
  /** Secondary descriptor from the header line, e.g. "Payments & Reliability". */
  focus?: string;
  summary: string;
  location?: string;
  email?: string;
  phone?: string;
  links: { label: string; href: string }[];
  skills: { group: string; items: string[] }[];
  experience: RoleHistory[];
  projects: ProjectRecord[];
  education: EducationRecord[];
  /** Every heading found in the upload, labelled by role. The generic backbone. */
  sections: ContentSection[];
  metrics: { value: string; label: string }[];
  languages: string[];
  interests: string[];
  industries: string[];
  /** Dates, venue, and tickets when the upload reads as an event or deadline. */
  when?: string;
  where?: string;
  prices: string[];
  seniority: 'student' | 'junior' | 'mid' | 'senior' | 'lead' | 'unknown';
  signals: string[];
  gallery: SourceAsset[];
  rawLength: number;
}
