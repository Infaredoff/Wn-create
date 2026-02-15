
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- Types & Defaults ---

type Project = {
  meta: { title: string; author: string; genres: string; updated: number };
  setting: {
    culturalNameRules: { id: string; name: string; phonemes: string[]; examples: string[] }[];
  };
  storyBible: {
    logline: string;
    themes: string;
    worldOverview: string;
    factions: { name: string; desc: string }[];
    geography: { name: string; desc: string }[];
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

const DEFAULT_PROJECT: Project = {
  meta: { title: "New System Novel", author: "Author", genres: "", updated: Date.now() },
  setting: {
    culturalNameRules: [
      {
        id: "imperial", name: "Imperial/Highborn",
        phonemes: ["ae", "th", "ius", "ia", "or", "an"],
        examples: ["Aethelgard", "Thorian", "Valeria"]
      },
      {
        id: "tribal", name: "Wildlands/Tribal",
        phonemes: ["k", "r", "g", "uk", "tar", "z"],
        examples: ["Krogg", "Zura", "Gark"]
      }
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

// --- Styles ---

const styles = `
  :root {
    --bg-dark: #121212; --bg-panel: #1e1e1e; --bg-input: #2a2a2a;
    --primary: #bb86fc; --text-main: #e0e0e0; --text-muted: #a0a0a0;
    --border: #333; --success: #4caf50; --danger: #cf6679;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', sans-serif; background: var(--bg-dark); color: var(--text-main); height: 100vh; overflow: hidden; }
  
  .app-container { display: flex; height: 100vh; }
  
  /* Sidebar */
  .sidebar { width: 240px; background: var(--bg-panel); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 1rem; }
  .brand { color: var(--primary); font-weight: bold; font-size: 1.2rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.5rem; }
  .nav-btn {
    background: none; border: none; color: var(--text-muted); padding: 0.8rem;
    text-align: left; cursor: pointer; border-radius: 4px; transition: 0.2s; margin-bottom: 2px;
  }
  .nav-btn:hover, .nav-btn.active { background: var(--bg-input); color: var(--text-main); }
  .nav-btn.active { border-left: 3px solid var(--primary); }
  
  /* Main Content */
  .main { flex: 1; padding: 2rem; overflow-y: auto; position: relative; }
  h1, h2, h3 { margin-top: 0; color: var(--text-main); }
  
  /* Components */
  .card { background: var(--bg-panel); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 1.5rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
  
  .form-group { margin-bottom: 1rem; }
  label { display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.9rem; }
  input, textarea, select {
    width: 100%; padding: 0.6rem; background: var(--bg-input); border: 1px solid var(--border);
    color: var(--text-main); border-radius: 4px; font-family: inherit;
  }
  textarea { resize: vertical; }
  
  .btn {
    padding: 0.6rem 1.2rem; background: var(--bg-input); border: 1px solid var(--border);
    color: var(--text-main); cursor: pointer; border-radius: 4px; font-weight: 600;
  }
  .btn.primary { background: var(--primary); color: #000; border: none; }
  .btn:hover { opacity: 0.9; }
  .btn-sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
  
  .row { display: flex; gap: 1rem; }
  .col { flex: 1; }
  
  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid var(--border); }
  th { color: var(--text-muted); }
  
  /* Lists */
  .list-item { padding: 0.8rem; border-bottom: 1px solid var(--border); cursor: pointer; }
  .list-item:hover, .list-item.selected { background: var(--bg-input); }
  
  /* Loading & Toast */
  .loader { position: fixed; top: 1rem; right: 1rem; background: var(--primary); color: #000; padding: 0.5rem 1rem; border-radius: 20px; font-weight: bold; display: none; }
  .loader.active { display: block; animation: pulse 1s infinite; }
  
  @keyframes pulse { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
`;

// --- Main Component ---

function App() {
  const [project, setProject] = useState<Project>(DEFAULT_PROJECT);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [mode, setMode] = useState<'mock' | 'api'>('mock');

  // Load/Save
  useEffect(() => {
    const saved = localStorage.getItem('webnovel_project');
    if (saved) {
      try {
        setProject(JSON.parse(saved));
      } catch (e) { console.error("Failed to load project", e); }
    }
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  useEffect(() => {
    localStorage.setItem('webnovel_project', JSON.stringify(project));
  }, [project]);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    localStorage.setItem('gemini_api_key', val);
  };

  // --- AI Logic ---

  const callAI = async (prompt: string, jsonMode = false): Promise<string | null> => {
    setLoading(true);
    try {
      if (mode === 'mock') {
        await new Promise(r => setTimeout(r, 800));
        setLoading(false);
        if (jsonMode) return JSON.stringify({ candidates: [{ name: "MockName", fit: "Good" }] });
        return "This is a mock response generated offline. Switch to API Mode to use Gemini.";
      }

      const activeKey = apiKey || process.env.API_KEY;
      if (!activeKey) {
        alert("Please provide a Gemini API Key in Settings.");
        setLoading(false);
        return null;
      }

      const ai = new GoogleGenAI({ apiKey: activeKey });
      const model = ai.models.getGenerativeModel({
         model: 'gemini-2.5-flash-latest', // Using latest flash as requested in guidelines for text tasks
         generationConfig: {
            responseMimeType: jsonMode ? "application/json" : "text/plain"
         }
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      setLoading(false);
      return result.response.text();
    } catch (e: any) {
      console.error(e);
      setLoading(false);
      alert("AI Error: " + e.message);
      return null;
    }
  };

  // --- Sub-Components ---

  const Dashboard = () => (
    <div className="grid">
      <div className="card">
        <h3>Metadata</h3>
        <div className="form-group">
          <label>Title</label>
          <input value={project.meta.title} onChange={e => setProject({...project, meta: {...project.meta, title: e.target.value}})} />
        </div>
        <div className="form-group">
          <label>Author</label>
          <input value={project.meta.author} onChange={e => setProject({...project, meta: {...project.meta, author: e.target.value}})} />
        </div>
        <div className="form-group">
          <label>Genre Tags</label>
          <input value={project.meta.genres} onChange={e => setProject({...project, meta: {...project.meta, genres: e.target.value}})} />
        </div>
      </div>
      <div className="card">
        <h3>Stats</h3>
        <p>Characters: {project.characters.length}</p>
        <p>Chapters: {project.chapters.length}</p>
        <p>Last Updated: {new Date(project.meta.updated).toLocaleString()}</p>
        <button className="btn primary" onClick={() => {
            const blob = new Blob([JSON.stringify(project, null, 2)], {type : 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'project.json'; a.click();
        }}>Export JSON</button>
      </div>
    </div>
  );

  const StoryBible = () => {
    const updateBible = (field: keyof typeof project.storyBible, val: any) => {
      setProject({...project, storyBible: {...project.storyBible, [field]: val}});
    };

    const generateLore = async (section: string) => {
      const prompt = `You are a fantasy world builder. Generate a creative, unique ${section} for a story with the premise: "${project.storyBible.logline}". Keep it concise.`;
      const txt = await callAI(prompt);
      if (txt) updateBible(section as any, txt);
    };

    return (
      <div className="grid">
        <div className="card">
          <h3>Overview</h3>
          <div className="form-group">
            <label>Logline / Premise</label>
            <textarea rows={3} value={project.storyBible.logline} onChange={e => updateBible('logline', e.target.value)} />
          </div>
          <div className="form-group">
            <label>World Overview <button className="btn btn-sm" onClick={() => generateLore('worldOverview')}>Auto-Fill</button></label>
            <textarea rows={5} value={project.storyBible.worldOverview} onChange={e => updateBible('worldOverview', e.target.value)} />
          </div>
        </div>
        <div className="card">
          <h3>Magic & System</h3>
          <div className="form-group">
            <label>Source of Power</label>
            <input value={project.storyBible.magicSystem.source} onChange={e => setProject({...project, storyBible: {...project.storyBible, magicSystem: {...project.storyBible.magicSystem, source: e.target.value}}})} />
          </div>
          <div className="form-group">
            <label>Taboos (One per line)</label>
            <textarea rows={4} value={project.storyBible.taboos.join('\n')} onChange={e => updateBible('taboos', e.target.value.split('\n'))} />
          </div>
        </div>
      </div>
    );
  };

  const Characters = () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = project.characters.find(c => c.id === selectedId);

    const addChar = () => {
      const newChar: Character = {
        id: Date.now().toString(), name: "New Character", role: "Protagonist",
        cultureTag: "imperial", level: 1, stats: { STR: 10, INT: 10 }, personality: "", demographics: ""
      };
      setProject({...project, characters: [...project.characters, newChar]});
      setSelectedId(newChar.id);
    };

    const updateChar = (field: keyof Character, val: any) => {
      if (!selected) return;
      const updated = project.characters.map(c => c.id === selected.id ? {...c, [field]: val} : c);
      setProject({...project, characters: updated});
    };

    const generateName = async () => {
      if (!selected) return;
      const culture = project.setting.culturalNameRules.find(r => r.id === selected.cultureTag);
      const prompt = `Generate a JSON object with a list of 5 fantasy names for a ${selected.role} from a culture with these phonemes: ${culture?.phonemes.join(', ')}. Format: { "names": ["Name1", "Name2"] }`;
      const json = await callAI(prompt, true);
      if (json) {
        try {
            const parsed = JSON.parse(json);
            const names = parsed.names || parsed.candidates?.map((c:any) => c.name);
            if(names && names.length > 0) updateChar('name', names[0]);
        } catch(e) { console.error(e); }
      }
    };

    return (
      <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 100px)' }}>
        <div className="card" style={{ width: '250px', overflowY: 'auto' }}>
          <button className="btn primary" style={{width:'100%'}} onClick={addChar}>+ New Character</button>
          <div style={{marginTop:'1rem'}}>
            {project.characters.map(c => (
              <div key={c.id} className={`list-item ${selectedId === c.id ? 'selected' : ''}`} onClick={() => setSelectedId(c.id)}>
                {c.name}
              </div>
            ))}
          </div>
        </div>
        {selected ? (
          <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
            <div className="row">
              <div className="col form-group">
                <label>Name <button className="btn btn-sm" onClick={generateName}>Auto-Gen</button></label>
                <input value={selected.name} onChange={e => updateChar('name', e.target.value)} />
              </div>
              <div className="col form-group">
                <label>Culture</label>
                <select value={selected.cultureTag} onChange={e => updateChar('cultureTag', e.target.value)}>
                  {project.setting.culturalNameRules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
               <label>Role / Archetype</label>
               <input value={selected.role} onChange={e => updateChar('role', e.target.value)} />
            </div>
            <div className="form-group">
               <label>Personality</label>
               <textarea rows={3} value={selected.personality} onChange={e => updateChar('personality', e.target.value)} />
            </div>
            <div className="form-group">
               <label>Stats (JSON)</label>
               <textarea rows={5} className="code" value={JSON.stringify(selected.stats, null, 2)} 
                 onChange={e => {
                   try { updateChar('stats', JSON.parse(e.target.value)); } catch(err) {}
                 }} 
               />
            </div>
          </div>
        ) : <div className="card" style={{flex:1}}>Select a character</div>}
      </div>
    );
  };

  const Calculator = () => {
    const [table, setTable] = useState<{level: number, xp: number, total: number}[]>([]);

    useEffect(() => {
      const t = [];
      const { xpBase, xpFactor, xpCurve } = project.systemRules;
      let total = 0;
      for(let i=1; i<=20; i++) {
        let next = 0;
        if(xpCurve === 'linear') next = Math.floor(xpBase * i * xpFactor);
        else if(xpCurve === 'quadratic') next = Math.floor(xpBase * Math.pow(i, 2) * xpFactor / 10);
        else next = Math.floor(xpBase * Math.pow(xpFactor, i));
        if(next < 100) next = 100 * i;
        total += next;
        t.push({ level: i, xp: next, total });
      }
      setTable(t);
    }, [project.systemRules]);

    return (
      <div className="grid">
        <div className="card">
          <h3>Configuration</h3>
          <div className="form-group">
            <label>Curve Type</label>
            <select value={project.systemRules.xpCurve} onChange={e => setProject({...project, systemRules: {...project.systemRules, xpCurve: e.target.value as any}})}>
              <option value="linear">Linear</option>
              <option value="quadratic">Quadratic</option>
              <option value="exponential">Exponential</option>
            </select>
          </div>
          <div className="row">
             <div className="col form-group">
               <label>Base XP</label>
               <input type="number" value={project.systemRules.xpBase} onChange={e => setProject({...project, systemRules: {...project.systemRules, xpBase: parseInt(e.target.value)}})} />
             </div>
             <div className="col form-group">
               <label>Factor</label>
               <input type="number" step="0.1" value={project.systemRules.xpFactor} onChange={e => setProject({...project, systemRules: {...project.systemRules, xpFactor: parseFloat(e.target.value)}})} />
             </div>
          </div>
        </div>
        <div className="card">
          <h3>Progression Table (Lv 1-20)</h3>
          <div style={{maxHeight: '400px', overflowY:'auto'}}>
            <table>
              <thead><tr><th>Lv</th><th>XP Needed</th><th>Total XP</th></tr></thead>
              <tbody>
                {table.map(r => (
                  <tr key={r.level}><td>{r.level}</td><td>{r.xp.toLocaleString()}</td><td>{r.total.toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const Studio = () => {
    const [chapNum, setChapNum] = useState(1);
    const chapter = project.chapters.find(c => c.num === chapNum) || { id: '', num: chapNum, title: '', goal: '', beats: '', content: '', systemNotices: '' };
    
    const updateChapter = (field: string, val: any) => {
        const exists = project.chapters.find(c => c.num === chapNum);
        let updated;
        if(exists) {
            updated = project.chapters.map(c => c.num === chapNum ? {...c, [field]: val} : c);
        } else {
            updated = [...project.chapters, { ...chapter, [field]: val, id: Date.now().toString() }];
        }
        setProject({...project, chapters: updated});
    };

    const generateContent = async () => {
        if(!chapter.beats) { alert("Create an outline/beats first."); return; }
        const prompt = `Write Chapter ${chapNum}: "${chapter.title}" based on these beats:\n${chapter.beats}\n\nStyle: Webnovel (short paragraphs, punchy). Include these system notices:\n${chapter.systemNotices}.`;
        const txt = await callAI(prompt);
        if(txt) updateChapter('content', txt);
    };

    const generateBeats = async () => {
        const prompt = `Create a 5-beat outline for Chapter ${chapNum}: ${chapter.title}. Goal: ${chapter.goal}. Context: ${project.storyBible.logline}`;
        const txt = await callAI(prompt);
        if(txt) updateChapter('beats', txt);
    };

    return (
        <div style={{display:'flex', gap:'1rem', height:'calc(100vh - 100px)'}}>
            <div className="card" style={{width:'300px', overflowY:'auto'}}>
                <div className="form-group">
                    <label>Chapter Number</label>
                    <input type="number" value={chapNum} onChange={e => setChapNum(parseInt(e.target.value))} />
                </div>
                <div className="form-group">
                    <label>Title</label>
                    <input value={chapter.title} onChange={e => updateChapter('title', e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Goal</label>
                    <textarea value={chapter.goal} onChange={e => updateChapter('goal', e.target.value)} />
                </div>
                <div className="form-group">
                    <label>System Notices (Loot, Level Ups)</label>
                    <textarea value={chapter.systemNotices} onChange={e => updateChapter('systemNotices', e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Outline <button className="btn btn-sm" onClick={generateBeats}>AI Outline</button></label>
                    <textarea rows={6} value={chapter.beats} onChange={e => updateChapter('beats', e.target.value)} />
                </div>
                <button className="btn primary" style={{width:'100%'}} onClick={generateContent}>Generate Chapter Text</button>
            </div>
            <div className="card" style={{flex:1, display:'flex', flexDirection:'column'}}>
                <textarea 
                    style={{flex:1, fontFamily:'Consolas, monospace', lineHeight:1.6, fontSize:'1.1rem'}} 
                    value={chapter.content} 
                    onChange={e => updateChapter('content', e.target.value)}
                    placeholder="Chapter content goes here..."
                />
            </div>
        </div>
    );
  };

  const Consistency = () => {
      const [report, setReport] = useState<string[]>([]);
      
      const check = () => {
          const issues = [];
          const text = (project.chapters[project.chapters.length - 1]?.content || "").toLowerCase();
          
          // Taboo check
          project.storyBible.taboos.forEach(t => {
              if(text.includes(t.toLowerCase())) issues.push(`VIOLATION: Taboo phrase found: "${t}"`);
          });
          
          // Basic Level Check
          if(text.includes("level 999")) issues.push("WARNING: High level detected. Verify power scaling.");
          
          if(issues.length === 0) issues.push("No obvious rule violations found.");
          setReport(issues);
      };

      return (
          <div className="card">
              <h3>Consistency Checker</h3>
              <p>Scans the latest chapter against Story Bible rules.</p>
              <button className="btn primary" onClick={check}>Run Scan</button>
              <ul style={{marginTop:'1rem'}}>
                  {report.map((r, i) => <li key={i} style={{color: r.includes("VIOLATION") ? 'var(--danger)' : 'inherit'}}>{r}</li>)}
              </ul>
          </div>
      );
  };

  const Settings = () => (
      <div className="card">
          <h3>Settings & API</h3>
          <div className="form-group">
              <label>Mode</label>
              <select value={mode} onChange={e => setMode(e.target.value as any)}>
                  <option value="mock">Mock Mode (Offline / Free)</option>
                  <option value="api">Gemini API Mode</option>
              </select>
          </div>
          {mode === 'api' && (
             <div className="form-group">
                 <label>Gemini API Key</label>
                 <input type="password" value={apiKey} onChange={e => handleApiKeyChange(e.target.value)} placeholder="Paste key here..." />
                 <p style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Key is stored in browser LocalStorage only.</p>
             </div>
          )}
          <div className="form-group">
              <label>Theme</label>
              <select disabled><option>Dark IDE (Default)</option></select>
          </div>
      </div>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="app-container">
        <nav className="sidebar">
          <div className="brand">⚔️ System Studio</div>
          <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button className={`nav-btn ${activeTab === 'bible' ? 'active' : ''}`} onClick={() => setActiveTab('bible')}>Story Bible</button>
          <button className={`nav-btn ${activeTab === 'chars' ? 'active' : ''}`} onClick={() => setActiveTab('chars')}>Characters</button>
          <button className={`nav-btn ${activeTab === 'calc' ? 'active' : ''}`} onClick={() => setActiveTab('calc')}>System Calculator</button>
          <button className={`nav-btn ${activeTab === 'studio' ? 'active' : ''}`} onClick={() => setActiveTab('studio')}>Chapter Studio</button>
          <button className={`nav-btn ${activeTab === 'check' ? 'active' : ''}`} onClick={() => setActiveTab('check')}>Consistency</button>
          <div style={{flex:1}}></div>
          <button className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
        </nav>
        <main className="main">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'bible' && <StoryBible />}
            {activeTab === 'chars' && <Characters />}
            {activeTab === 'calc' && <Calculator />}
            {activeTab === 'studio' && <Studio />}
            {activeTab === 'check' && <Consistency />}
            {activeTab === 'settings' && <Settings />}
        </main>
        <div className={`loader ${loading ? 'active' : ''}`}>AI Working...</div>
      </div>
    </>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
