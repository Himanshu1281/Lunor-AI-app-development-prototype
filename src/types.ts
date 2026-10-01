export type Level = 'Beginner' | 'Intermediate' | 'Pro';

export interface Idea {
  prompt: string;
  platform: 'iOS' | 'Android' | 'Both';
  framework: 'React Native' | 'Flutter' | 'SwiftUI';
  level: Level;
}

export interface Understanding {
  appName: string;
  tagline: string;
  summary: string;
  problem: string;
  personas: { name: string; description: string }[];
  features: { must: string[]; should: string[]; could: string[] };
  risks: string[];
  questions: { question: string; options: string[] }[];
}

export interface Plan {
  screens: { name: string; purpose: string; components: string[] }[];
  /** Structured screen navigation; the client builds the Mermaid diagram from it. */
  flow?: { from: string; to: string; label?: string }[];
  /** Structured data model; the client builds the Mermaid ER diagram from it. */
  entities?: { name: string; fields: { type: string; name: string }[] }[];
  relations?: { from: string; to: string; kind: 'one-to-one' | 'one-to-many' | 'many-to-many'; label: string }[];
  /** Raw Mermaid, used only when structured data is missing (e.g. demo mode). */
  flowMermaid?: string;
  dataModelMermaid?: string;
  techStack: { name: string; why: string }[];
  fileTree: string;
  milestones: { title: string; tasks: string[] }[];
}

export interface Build {
  /** Single-file React (web) implementation that previews the mobile app */
  code: string;
  /** Idiomatic snippet in the user's chosen native framework for the core screen */
  nativeSnippet: string;
  summary: string;
  changes: string[];
}

export interface Explanation {
  overview: string;
  sections: { title: string; snippet: string; explanation: string; concept: string }[];
  concepts: { name: string; oneLiner: string }[];
}

export interface Learning {
  lessons: { title: string; minutes: number; summary: string; content: string; exercise: string }[];
  quiz: { question: string; options: string[]; answer: number; why: string }[];
  challenges: { title: string; difficulty: 'Easy' | 'Medium' | 'Hard'; prompt: string }[];
}

export interface Project {
  idea: Idea;
  understanding?: Understanding;
  answers: Record<number, string>;
  plan?: Plan;
  build?: Build;
  explanation?: Explanation;
  learning?: Learning;
}
