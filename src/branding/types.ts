export type SchoolPresetId =
  | 'coding-academy'
  | 'language-school'
  | 'corporate-training'
  | 'music-school'
  | 'k12-school'
  | 'custom';

export interface TerminologyConfig {
  learnerSingular: string;
  learnerPlural: string;
  lessonSingular: string;
  lessonPlural: string;
  moduleSingular: string;
  modulePlural: string;
  missionSingular: string;
  missionPlural: string;
}

export interface WhiteLabelConfig {
  presetId: SchoolPresetId;
  brandName: string;
  legalName: string;
  logoEmoji: string;
  tagline: string;
  valueProposition: string;
  subjectArea: string;
  aiTutorName: string;
  aiTutorRoleDescription: string;
  certificateProgramFallback: string;
  certificateIssuer: string;
  accentPalette: [string, string, string, string];
  terminology: TerminologyConfig;
}

export interface SchoolPreset {
  id: SchoolPresetId;
  name: string;
  description: string;
  config: WhiteLabelConfig;
}
