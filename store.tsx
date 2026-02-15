import React, { createContext, useContext, useEffect, useState } from 'react';
import { Project, AppMode, CulturalRule } from './types';

const DEFAULT_PROJECT: Project = {
  meta: { title: "Untitled System Novel", author: "Author", genres: "", updated: Date.now(), version: 1 },
  setting: {
    culturalNameRules: [
      { id: "imperial", name: "High Imperial", phonemes: ["ae", "us", "ius", "th", "or"], examples: ["Valerius", "Thorian"] },
      { id: "tribal", name: "Wildlands", phonemes: ["k", "r", "og", "uk", "z"], examples: ["Krogg", "Zura"] }
    ]
  },
  storyBible: {
    logline: "", themes: "", worldOverview: "",
    factions: [], geography: [], taboos: [],
    magicSystem: { source: "", costs: "" }
  },
  characters: [],
  systemRules: {
    xpCurve: "quadratic", xpBase: 100, xpFactor: 1.5,
    formulas: { hp: "VIT * 10 + 50", mp: "INT * 10 + WIS * 5" }
  },
  chapters: []
};

type ProjectContextType = {
  project: Project;
  setProject: (p: Project) => void;
  updateProject: (fn: (p: Project) => Project) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  mode: AppMode;
  setMode: (m: AppMode) => void;
  notifications: string[];
  addNotification: (msg: string) => void;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProjectState] = useState<Project>(DEFAULT_PROJECT);
  const [apiKey, setApiKeyState] = useState('');
  const [mode, setMode] = useState<AppMode>('mock');
  const [notifications, setNotifications] = useState<string[]>([]);

  // Load from storage
  useEffect(() => {
    const savedProj = localStorage.getItem('webnovel_project');
    if (savedProj) {
      try { setProjectState(JSON.parse(savedProj)); } catch (e) { console.error("Load failed", e); }
    }
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKeyState(savedKey);
  }, []);

  // Auto-save
  useEffect(() => {
    localStorage.setItem('webnovel_project', JSON.stringify(project));
  }, [project]);

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const updateProject = (fn: (p: Project) => Project) => {
    setProjectState(prev => {
      const next = fn(prev);
      next.meta.updated = Date.now();
      return next;
    });
  };

  const addNotification = (msg: string) => {
    setNotifications(prev => [...prev, msg]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 4000);
  };

  return (
    <ProjectContext.Provider value={{ project, setProject: setProjectState, updateProject, apiKey, setApiKey, mode, setMode, notifications, addNotification }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
};