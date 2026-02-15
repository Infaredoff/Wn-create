export type Project = {
  meta: { 
    title: string; 
    author: string; 
    genres: string; 
    updated: number; 
    version: number;
  };
  setting: {
    culturalNameRules: CulturalRule[];
  };
  storyBible: {
    logline: string;
    themes: string;
    worldOverview: string;
    factions: EntityItem[];
    geography: EntityItem[];
    taboos: string[];
    magicSystem: { source: string; costs: string };
  };
  characters: Character[];
  systemRules: {
    xpCurve: 'linear' | 'quadratic' | 'exponential';
    xpBase: number;
    xpFactor: number;
    formulas: { hp: string; mp: string };
  };
  chapters: Chapter[];
};

export type CulturalRule = {
  id: string;
  name: string;
  phonemes: string[];
  examples: string[];
};

export type EntityItem = {
  id: string;
  name: string;
  desc: string;
};

export type Character = {
  id: string;
  name: string;
  role: string;
  cultureTag: string;
  level: number;
  stats: Record<string, number>;
  personality: string;
  demographics: string;
};

export type Chapter = {
  id: string;
  num: number;
  title: string;
  goal: string;
  beats: string;
  content: string;
  systemNotices: string;
};

export type AppMode = 'mock' | 'api';