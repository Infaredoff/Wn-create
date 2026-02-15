import React, { useState, useEffect, useContext, createContext, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// ==========================================
// 1. TYPES & DOMAIN MODEL
// ==========================================

type AppMode = 'mock' | 'api';

type CulturalRule = {
  id: string;
  name: string;
  phonemes: string[];
  examples: string[];
};

type Character = {
  id: string;
  name: string;
  role: string;
  cultureTag: string;
  level: number;
  stats: Record<string, number>;
  personality: string;
  demographics: string;
};

type Chapter = {
  id: string;
  num: number;
  title: string;
  goal: string;
  beats: string;
  content: string;
  systemNotices: string;
};

type Project = {
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
    taboos: [],
    magicSystem: { source: "", costs: "" }
  },
  characters: [],
  systemRules: {
    xpCurve: "quadratic", xpBase: 100, xpFactor: 1.5,
    formulas: { hp: "VIT * 10 + 50", mp: "INT * 10 + WIS * 5" }
  },
  chapters: []
};

// ==========================================
// 2. AI SERVICE LAYER
// ==========================================

const callGemini = async (
  prompt: string, 
  apiKey: string, 
  mode: AppMode,
  jsonMode: boolean = false
): Promise<string | null> => {
  if (mode === 'mock') {
    await new Promise(r => setTimeout(r, 800)); // Simulate latency
    if (jsonMode) {
      return JSON.stringify({ 
        candidates: [{ name: "MockName", fit: "Standard" }],
        names: ["MockName1", "MockName2", "MockName3"] 
      });
    }
    return `[MOCK OUTPUT] generated based on: "${prompt.substring(0, 30)}..."\n\nTo use real AI, switch to API Mode in Settings.`;
  }

  const effectiveKey = apiKey || (typeof process !== 'undefined' && process.env ? process.env.API_KEY : '');
  
  if (!effectiveKey) {
    throw new Error("No API Key provided. Check Settings.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveKey });
    const model = ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: jsonMode ? "application/json" : "text/plain",
        temperature: 0.8
      }
    });
    
    const result = await model;
    return result.text;
  } catch (e: any) {
    console.error("Gemini API Error:", e);
    throw new Error(e.message || "Unknown API Error");
  }
};

// ==========================================
// 3. STATE MANAGEMENT (CONTEXT)
// ==========================================

type ProjectContextType = {
  project: Project;
  updateProject: (fn: (p: Project) => Project) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  mode: AppMode;
  setMode: (m: AppMode) => void;
  notifications: string[];
  addNotification: (msg: string) => void;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProjectState] = useState<Project>(DEFAULT_PROJECT);
  const [apiKey, setApiKeyState] = useState('');
  const [mode, setMode] = useState<AppMode>('mock');
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const savedProj = localStorage.getItem('webnovel_project');
    if (savedProj) {
      try { setProjectState(JSON.parse(savedProj)); } catch (e) { console.error("Load failed", e); }
    }
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKeyState(savedKey);
  }, []);

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
    <ProjectContext.Provider value={{ project, updateProject, apiKey, setApiKey, mode, setMode, notifications, addNotification }}>
      {children}
    </ProjectContext.Provider>
  );
};

const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
};

// ==========================================
// 4. COMPONENTS
// ==========================================

// --- Sidebar ---
const Sidebar: React.FC<{ activeTab: string; setTab: (t: string) => void }> = ({ activeTab, setTab }) => {
  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'bible', label: 'Story Bible', icon: '📖' },
    { id: 'chars', label: 'Characters', icon: '👥' },
    { id: 'calc', label: 'System Calc', icon: '🧮' },
    { id: 'studio', label: 'Chapter Studio', icon: '✍️' },
    { id: 'check', label: 'Consistency', icon: '🔍' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="sidebar flex-col h-full" style={{ width: '240px', background: 'var(--bg-panel)', borderRight: '1px solid var(--border)' }}>
      <div className="p-4" style={{ marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <span style={{ fontSize: '1.5rem' }}>⚔️</span> System
        </h2>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Webnovel Architect</div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`w-full text-left p-4 flex items-center gap-2`}
            style={{
              background: activeTab === tab.id ? 'var(--bg-input)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-main)' : 'var(--text-muted)',
              border: 'none',
              borderLeft: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer'
            }}
          >
            <span>{tab.icon}</span>
            <span style={{ fontWeight: activeTab === tab.id ? 600 : 400 }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

// --- Dashboard ---
const Dashboard: React.FC = () => {
  const { project, updateProject } = useProject();
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `system-project-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="animate-fade">
      <h1 className="flex items-center gap-2">Project Dashboard</h1>
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <h3>Metadata</h3>
          <div className="flex-col gap-2 flex">
            <div>
              <label className="label">Title</label>
              <input className="input" value={project.meta.title} onChange={e => updateProject(p => ({ ...p, meta: { ...p.meta, title: e.target.value } }))} />
            </div>
            <div>
              <label className="label">Author</label>
              <input className="input" value={project.meta.author} onChange={e => updateProject(p => ({ ...p, meta: { ...p.meta, author: e.target.value } }))} />
            </div>
            <div>
              <label className="label">Genre Tags</label>
              <input className="input" value={project.meta.genres} onChange={e => updateProject(p => ({ ...p, meta: { ...p.meta, genres: e.target.value } }))} />
            </div>
          </div>
        </div>
        <div className="card flex flex-col justify-between">
          <div>
            <h3>Statistics</h3>
            <div className="grid-2">
              <div className="p-4" style={{ background: 'var(--bg-input)', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{project.characters.length}</div>
                <div className="text-sm text-muted">Characters</div>
              </div>
              <div className="p-4" style={{ background: 'var(--bg-input)', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{project.chapters.length}</div>
                <div className="text-sm text-muted">Chapters</div>
              </div>
            </div>
            <p className="text-sm text-muted" style={{ marginTop: '1rem' }}>Last Updated: {new Date(project.meta.updated).toLocaleString()}</p>
          </div>
          <button className="btn btn-primary w-full" onClick={exportJSON}>💾 Export Project JSON</button>
        </div>
      </div>
    </div>
  );
};

// --- Story Bible ---
const StoryBible: React.FC = () => {
  const { project, updateProject, apiKey, mode, addNotification } = useProject();
  const [loading, setLoading] = useState(false);

  const generate = async (field: string) => {
    setLoading(true);
    try {
      const prompt = `You are a creative world builder. Write a unique description for "${field}" in a story with premise: "${project.storyBible.logline}". Keep it punchy.`;
      const result = await callGemini(prompt, apiKey, mode);
      if (result) {
        updateProject(p => ({ ...p, storyBible: { ...p.storyBible, [field]: result } }));
        addNotification(`Generated ${field}`);
      }
    } catch (e: any) {
      addNotification(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex justify-between items-center">
        <h1>Story Bible</h1>
        {loading && <div className="spinner"></div>}
      </div>
      <div className="grid-2">
        <div className="card">
          <h3>Core Premise</h3>
          <div className="mb-4">
            <label className="label">Logline</label>
            <textarea className="textarea" rows={3} value={project.storyBible.logline} onChange={e => updateProject(p => ({ ...p, storyBible: { ...p.storyBible, logline: e.target.value } }))} placeholder="A weak F-rank hunter finds a glitched system..." />
          </div>
          <div>
            <label className="label flex justify-between">Themes <button className="btn-ghost btn-sm" onClick={() => generate('themes')}>✨ AI Gen</button></label>
            <textarea className="textarea" rows={2} value={project.storyBible.themes} onChange={e => updateProject(p => ({ ...p, storyBible: { ...p.storyBible, themes: e.target.value } }))} />
          </div>
        </div>
        <div className="card">
           <h3>Magic & System</h3>
           <div className="mb-4">
             <label className="label">Source of Power</label>
             <input className="input" value={project.storyBible.magicSystem.source} onChange={e => updateProject(p => ({ ...p, storyBible: { ...p.storyBible, magicSystem: { ...p.storyBible.magicSystem, source: e.target.value } } }))} />
           </div>
           <div>
              <label className="label">Costs & Limits</label>
              <textarea className="textarea" rows={3} value={project.storyBible.magicSystem.costs} onChange={e => updateProject(p => ({ ...p, storyBible: { ...p.storyBible, magicSystem: { ...p.storyBible.magicSystem, costs: e.target.value } } }))} />
           </div>
        </div>
      </div>
      <div className="card flex-1">
         <h3>World Overview</h3>
         <button className="btn-ghost btn-sm mb-2" onClick={() => generate('worldOverview')}>✨ AI Generate Overview</button>
         <textarea className="textarea mono text-sm w-full h-full min-h-[200px]" value={project.storyBible.worldOverview} onChange={e => updateProject(p => ({ ...p, storyBible: { ...p.storyBible, worldOverview: e.target.value } }))} />
      </div>
    </div>
  );
};

// --- Characters ---
const Characters: React.FC = () => {
  const { project, updateProject, apiKey, mode, addNotification } = useProject();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selected = project.characters.find(c => c.id === selectedId);

  const createChar = () => {
    const newChar: Character = {
      id: Date.now().toString(), name: "New Character", role: "Protagonist", cultureTag: "imperial", level: 1, stats: { STR: 10, AGI: 10, INT: 10 }, personality: "", demographics: "Unknown"
    };
    updateProject(p => ({ ...p, characters: [...p.characters, newChar] }));
    setSelectedId(newChar.id);
  };

  const updateSelected = (fn: (c: Character) => Character) => {
    if (!selected) return;
    updateProject(p => ({ ...p, characters: p.characters.map(c => c.id === selected.id ? fn(c) : c) }));
  };

  const generateName = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const culture = project.setting.culturalNameRules.find(r => r.id === selected.cultureTag);
      const prompt = `Generate 5 fantasy names for a ${selected.role} from a culture with phonemes: [${culture?.phonemes.join(', ')}]. JSON format: { "names": ["Name1", "Name2"] }`;
      const res = await callGemini(prompt, apiKey, mode, true);
      if (res) {
        const data = JSON.parse(res);
        const name = data.names?.[0] || data.candidates?.[0]?.name;
        if (name) { updateSelected(c => ({ ...c, name })); addNotification("Name generated"); }
      }
    } catch (e: any) { addNotification("Gen Error: " + e.message); } finally { setLoading(false); }
  };

  return (
    <div className="h-full flex gap-4 animate-fade">
      <div className="card flex flex-col" style={{ width: '250px' }}>
        <div className="flex justify-between items-center mb-4"><h3>Roster</h3><button className="btn btn-primary btn-sm" onClick={createChar}>+ New</button></div>
        <div className="flex-1 overflow-y-auto">
          {project.characters.map(c => (
            <div key={c.id} onClick={() => setSelectedId(c.id)} className="p-2 cursor-pointer rounded hover:bg-hover mb-1 flex justify-between items-center" style={{ background: selectedId === c.id ? 'var(--bg-input)' : 'transparent', borderLeft: selectedId === c.id ? '2px solid var(--primary)' : '2px solid transparent' }}>
              <span className="font-medium">{c.name}</span><span className="text-xs text-muted">Lv.{c.level}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 card overflow-y-auto">
        {selected ? (
          <div className="flex flex-col h-full gap-4">
            <div className="flex gap-4 items-end border-b border-border pb-4">
              <div className="flex-1"><label className="label">Name</label><div className="flex gap-2"><input className="input" value={selected.name} onChange={e => updateSelected(c => ({ ...c, name: e.target.value }))} /><button className="btn btn-secondary" onClick={generateName} disabled={loading}>{loading ? '...' : '🎲'}</button></div></div>
              <div style={{ width: '100px' }}><label className="label">Level</label><input type="number" className="input" value={selected.level} onChange={e => updateSelected(c => ({ ...c, level: parseInt(e.target.value) }))} /></div>
              <button className="btn btn-ghost text-error" onClick={() => { updateProject(p => ({ ...p, characters: p.characters.filter(c => c.id !== selected.id) })); setSelectedId(null); }}>Delete</button>
            </div>
            <div className="grid-2">
               <div><label className="label">Role</label><input className="input" value={selected.role} onChange={e => updateSelected(c => ({ ...c, role: e.target.value }))} /></div>
               <div><label className="label">Culture</label><select className="select" value={selected.cultureTag} onChange={e => updateSelected(c => ({ ...c, cultureTag: e.target.value }))}>{project.setting.culturalNameRules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            </div>
            <div className="grid-2 flex-1">
              <div><label className="label">Personality</label><textarea className="textarea h-full" value={selected.personality} onChange={e => updateSelected(c => ({ ...c, personality: e.target.value }))} /></div>
              <div className="flex flex-col"><label className="label">Stats (JSON)</label><textarea className="textarea mono text-sm flex-1" value={JSON.stringify(selected.stats, null, 2)} onChange={e => { try { const stats = JSON.parse(e.target.value); updateSelected(c => ({ ...c, stats })); } catch {} }} /></div>
            </div>
          </div>
        ) : <div className="h-full flex items-center justify-center text-muted">Select a character</div>}
      </div>
    </div>
  );
};

// --- Calculator ---
const Calculator: React.FC = () => {
  const { project, updateProject } = useProject();
  const { xpBase, xpFactor, xpCurve, formulas } = project.systemRules;

  const data = useMemo(() => {
    const rows = [];
    let total = 0;
    for (let i = 1; i <= 20; i++) {
      let needed = 0;
      if (xpCurve === 'linear') needed = Math.floor(xpBase * i * xpFactor);
      else if (xpCurve === 'quadratic') needed = Math.floor(xpBase * Math.pow(i, 2) * xpFactor / 10);
      else needed = Math.floor(xpBase * Math.pow(xpFactor, i));
      if (needed < 100) needed = 100 * i;
      total += needed;
      
      const simStats = { STR: 10 + (i * 5), VIT: 10 + (i * 5), INT: 10 + (i * 5), WIS: 10 + (i * 5) };
      const evalFormula = (f: string) => {
        try {
           let s = f;
           Object.keys(simStats).forEach(k => { s = s.replace(new RegExp(k, 'g'), (simStats as any)[k]); });
           if (!/^[\d\s\+\-\*\/\(\)\.]+$/.test(s)) return 'Err';
           return new Function(`return ${s}`)();
        } catch { return 'Err'; }
      };
      rows.push({ level: i, xp: needed, total, hp: evalFormula(formulas.hp), mp: evalFormula(formulas.mp) });
    }
    return rows;
  }, [xpBase, xpFactor, xpCurve, formulas]);

  return (
    <div className="h-full grid-2 animate-fade">
      <div className="card flex flex-col gap-4">
        <h3>System Rules Engine</h3>
        <div><label className="label">XP Curve</label><select className="select" value={xpCurve} onChange={e => updateProject(p => ({ ...p, systemRules: { ...p.systemRules, xpCurve: e.target.value as any } }))}><option value="linear">Linear</option><option value="quadratic">Quadratic</option><option value="exponential">Exponential</option></select></div>
        <div className="grid-2">
           <div><label className="label">Base XP</label><input type="number" className="input" value={xpBase} onChange={e => updateProject(p => ({ ...p, systemRules: { ...p.systemRules, xpBase: parseInt(e.target.value) } }))} /></div>
           <div><label className="label">Factor</label><input type="number" step="0.1" className="input" value={xpFactor} onChange={e => updateProject(p => ({ ...p, systemRules: { ...p.systemRules, xpFactor: parseFloat(e.target.value) } }))} /></div>
        </div>
        <div className="border-t border-border pt-4">
           <h4>Derived Stats Formulas</h4>
           <div className="mb-2"><label className="label">HP Formula</label><input className="input mono" value={formulas.hp} onChange={e => updateProject(p => ({ ...p, systemRules: { ...p.systemRules, formulas: { ...p.systemRules.formulas, hp: e.target.value } } }))} /></div>
           <div><label className="label">MP Formula</label><input className="input mono" value={formulas.mp} onChange={e => updateProject(p => ({ ...p, systemRules: { ...p.systemRules, formulas: { ...p.systemRules.formulas, mp: e.target.value } } }))} /></div>
        </div>
      </div>
      <div className="card flex flex-col overflow-hidden">
        <h3>Progression Preview</h3>
        <div className="overflow-y-auto flex-1 border border-border rounded">
           <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
             <thead style={{ background: 'var(--bg-input)', position: 'sticky', top: 0 }}><tr><th className="p-2 text-sm text-muted">Lvl</th><th className="p-2 text-sm text-muted">XP Needed</th><th className="p-2 text-sm text-muted">Total</th><th className="p-2 text-sm text-muted">Est. HP</th></tr></thead>
             <tbody className="mono text-sm">{data.map(r => (<tr key={r.level} style={{ borderBottom: '1px solid var(--border)' }}><td className="p-2">{r.level}</td><td className="p-2 text-accent">{r.xp.toLocaleString()}</td><td className="p-2 text-muted">{r.total.toLocaleString()}</td><td className="p-2 text-success">{r.hp}</td></tr>))}</tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

// --- Studio ---
const Studio: React.FC = () => {
  const { project, updateProject, apiKey, mode, addNotification } = useProject();
  const [chapNum, setChapNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const chapter = project.chapters.find(c => c.num === chapNum) || { id: Date.now().toString(), num: chapNum, title: '', goal: '', beats: '', content: '', systemNotices: '' };

  const updateChapter = (updates: Partial<Chapter>) => {
    updateProject(p => {
      const idx = p.chapters.findIndex(c => c.num === chapNum);
      if (idx === -1) return { ...p, chapters: [...p.chapters, { ...chapter, ...updates }] };
      const newChapters = [...p.chapters]; newChapters[idx] = { ...newChapters[idx], ...updates };
      return { ...p, chapters: newChapters };
    });
  };

  const runAI = async (action: 'outline' | 'write') => {
    setLoading(true);
    try {
      const prompt = action === 'outline' 
        ? `Create a 5-beat detailed outline for Chapter ${chapNum}: "${chapter.title}". Goal: ${chapter.goal}. Context: ${project.storyBible.logline}. Ensure a cliffhanger.`
        : `Write Chapter ${chapNum}: "${chapter.title}" based on outline:\n${chapter.beats}\n\nStyle: Webnovel (short paragraphs, punchy). Include system notices:\n${chapter.systemNotices}.`;
      
      const result = await callGemini(prompt, apiKey, mode);
      if (result) {
        if (action === 'outline') updateChapter({ beats: result });
        else updateChapter({ content: result });
        addNotification(action === 'outline' ? "Outline Generated" : "Chapter Written");
      }
    } catch (e: any) { addNotification("Error: " + e.message); } finally { setLoading(false); }
  };

  return (
    <div className="h-full flex flex-col animate-fade">
      <div className="flex justify-between items-center mb-4 p-2 bg-panel border-b border-border">
        <div className="flex gap-4 items-center">
          <h2 className="m-0">Chapter</h2>
          <input type="number" className="input w-20 text-center font-bold" value={chapNum} onChange={e => setChapNum(parseInt(e.target.value) || 1)} />
          <input className="input w-64" placeholder="Chapter Title..." value={chapter.title} onChange={e => updateChapter({ title: e.target.value })} />
        </div>
        <div className="flex gap-2">
           {loading && <div className="spinner self-center"></div>}
           <button className="btn btn-secondary" onClick={() => runAI('outline')} disabled={loading}>Outline</button>
           <button className="btn btn-primary" onClick={() => runAI('write')} disabled={loading}>Write</button>
        </div>
      </div>
      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
           <div className="card"><label className="label">Chapter Goal</label><textarea className="textarea" rows={2} value={chapter.goal} onChange={e => updateChapter({ goal: e.target.value })} /></div>
           <div className="card"><label className="label">System Notices</label><textarea className="textarea mono text-xs" rows={3} placeholder="[You have leveled up!]" value={chapter.systemNotices} onChange={e => updateChapter({ systemNotices: e.target.value })} /></div>
           <div className="card flex-1 flex flex-col"><label className="label">Beats / Outline</label><textarea className="textarea flex-1" value={chapter.beats} onChange={e => updateChapter({ beats: e.target.value })} /></div>
        </div>
        <div className="flex-1 card flex flex-col p-0 overflow-hidden">
           <textarea className="w-full h-full bg-transparent border-none p-6 text-lg mono resize-none focus:outline-none" style={{ lineHeight: 1.6 }} placeholder="The story begins..." value={chapter.content} onChange={e => updateChapter({ content: e.target.value })} />
        </div>
      </div>
    </div>
  );
};

// --- Consistency ---
const Consistency: React.FC = () => {
  const { project } = useProject();
  const [report, setReport] = useState<{ type: 'warn' | 'err' | 'ok', msg: string }[]>([]);

  const runCheck = () => {
    const issues: typeof report = [];
    const latestChap = project.chapters[project.chapters.length - 1];
    
    if (!latestChap || !latestChap.content) {
      issues.push({ type: 'warn', msg: "No chapter content found to analyze." }); setReport(issues); return;
    }
    const text = latestChap.content.toLowerCase();
    project.storyBible.taboos.forEach(t => { if (t && text.includes(t.toLowerCase())) issues.push({ type: 'err', msg: `VIOLATION: Taboo phrase "${t}" detected.` }); });
    if (text.match(/level \d{3,}/)) issues.push({ type: 'warn', msg: "High level detected. Verify power scaling." });
    if (issues.length === 0) issues.push({ type: 'ok', msg: "All automated consistency checks passed." });
    setReport(issues);
  };

  return (
    <div className="animate-fade">
      <h1>Consistency Scanner</h1>
      <div className="card max-w-2xl">
        <p className="mb-4 text-muted">Scans the latest active chapter against Story Bible rules and Stats.</p>
        <button className="btn btn-primary w-full mb-6" onClick={runCheck}>Initiate Scan</button>
        <div className="flex flex-col gap-2">
          {report.map((r, i) => (
            <div key={i} className="p-3 rounded border flex items-center gap-3" style={{ borderColor: r.type === 'err' ? 'var(--error)' : r.type === 'ok' ? 'var(--success)' : 'var(--border)', background: 'var(--bg-input)' }}>
              <span>{r.type === 'err' ? '❌' : r.type === 'ok' ? '✅' : '⚠️'}</span><span>{r.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Settings ---
const Settings: React.FC = () => {
  const { apiKey, setApiKey, mode, setMode } = useProject();
  return (
    <div className="animate-fade max-w-2xl mx-auto mt-8">
      <h1>System Settings</h1>
      <div className="card mb-4">
        <h3>Connectivity</h3>
        <div className="mb-4">
          <label className="label">Operation Mode</label>
          <div className="flex gap-2">
            <button className={`btn ${mode === 'mock' ? 'btn-primary' : 'btn-secondary'} flex-1`} onClick={() => setMode('mock')}>Mock Mode (Offline)</button>
            <button className={`btn ${mode === 'api' ? 'btn-primary' : 'btn-secondary'} flex-1`} onClick={() => setMode('api')}>Gemini API Mode</button>
          </div>
        </div>
        {mode === 'api' && (
          <div className="animate-fade">
            <label className="label">Google Gemini API Key</label>
            <input type="password" className="input mb-2" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..." />
            <p className="text-xs text-muted">Key is stored in LocalStorage. Never sent to our servers.</p>
          </div>
        )}
      </div>
      <div className="card"><h3>System Info</h3><p className="text-sm text-muted">Webnovel Studio v1.0.2 - Engine: React + Gemini Flash 2.5</p></div>
    </div>
  );
};

// ==========================================
// 5. MAIN APP LAYOUT
// ==========================================

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { notifications } = useProject();

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'bible': return <StoryBible />;
      case 'chars': return <Characters />;
      case 'calc': return <Calculator />;
      case 'studio': return <Studio />;
      case 'check': return <Consistency />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-full w-full bg-app text-main overflow-hidden">
      <Sidebar activeTab={activeTab} setTab={setActiveTab} />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="p-4 border-b border-border bg-panel flex justify-between items-center md:hidden"><div className="font-bold">System Studio</div></header>
        <div className="flex-1 overflow-hidden p-6 relative">{renderContent()}</div>
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 pointer-events-none">
          {notifications.map((msg, i) => (
            <div key={i} className="system-msg animate-fade">
              <div className="text-xs text-primary font-bold mb-1">[SYSTEM NOTICE]</div><div>{msg}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </React.StrictMode>
);
