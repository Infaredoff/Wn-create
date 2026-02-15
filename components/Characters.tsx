import React, { useState } from 'react';
import { useProject } from '../store';
import { callGemini } from '../ai';
import { Character } from '../types';

export const Characters: React.FC = () => {
  const { project, updateProject, apiKey, mode, addNotification } = useProject();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = project.characters.find(c => c.id === selectedId);

  const createChar = () => {
    const newChar: Character = {
      id: Date.now().toString(),
      name: "New Character",
      role: "Protagonist",
      cultureTag: project.setting.culturalNameRules[0]?.id || "imperial",
      level: 1,
      stats: { STR: 10, AGI: 10, INT: 10 },
      personality: "",
      demographics: "Unknown"
    };
    updateProject(p => ({ ...p, characters: [...p.characters, newChar] }));
    setSelectedId(newChar.id);
  };

  const updateSelected = (fn: (c: Character) => Character) => {
    if (!selected) return;
    updateProject(p => ({
      ...p,
      characters: p.characters.map(c => c.id === selected.id ? fn(c) : c)
    }));
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
        if (name) {
          updateSelected(c => ({ ...c, name }));
          addNotification("Name generated");
        }
      }
    } catch (e: any) {
      addNotification("Gen Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex gap-4 animate-fade">
      {/* List Panel */}
      <div className="card flex flex-col" style={{ width: '250px' }}>
        <div className="flex justify-between items-center mb-4">
          <h3>Roster</h3>
          <button className="btn btn-primary btn-sm" onClick={createChar}>+ New</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {project.characters.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSelectedId(c.id)}
              className="p-2 cursor-pointer rounded hover:bg-hover mb-1 flex justify-between items-center"
              style={{ background: selectedId === c.id ? 'var(--bg-input)' : 'transparent', borderLeft: selectedId === c.id ? '2px solid var(--primary)' : '2px solid transparent' }}
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-muted">Lv.{c.level}</span>
            </div>
          ))}
          {project.characters.length === 0 && <div className="text-muted text-sm text-center mt-4">No characters yet.</div>}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="flex-1 card overflow-y-auto">
        {selected ? (
          <div className="flex flex-col h-full">
            <div className="flex justify-between mb-4 border-b border-border pb-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="label">Name</label>
                  <div className="flex gap-2">
                    <input className="input" value={selected.name} onChange={e => updateSelected(c => ({ ...c, name: e.target.value }))} />
                    <button className="btn btn-secondary" onClick={generateName} disabled={loading}>{loading ? '...' : '🎲'}</button>
                  </div>
                </div>
                <div style={{ width: '100px' }}>
                  <label className="label">Level</label>
                  <input type="number" className="input" value={selected.level} onChange={e => updateSelected(c => ({ ...c, level: parseInt(e.target.value) }))} />
                </div>
              </div>
              <button className="btn btn-ghost text-error" onClick={() => {
                updateProject(p => ({ ...p, characters: p.characters.filter(c => c.id !== selected.id) }));
                setSelectedId(null);
              }}>Delete</button>
            </div>

            <div className="grid-2 mb-4">
               <div>
                 <label className="label">Role</label>
                 <input className="input" value={selected.role} onChange={e => updateSelected(c => ({ ...c, role: e.target.value }))} />
               </div>
               <div>
                 <label className="label">Culture</label>
                 <select className="select" value={selected.cultureTag} onChange={e => updateSelected(c => ({ ...c, cultureTag: e.target.value }))}>
                   {project.setting.culturalNameRules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                 </select>
               </div>
            </div>

            <div className="grid-2 flex-1">
              <div>
                <label className="label">Personality & Traits</label>
                <textarea className="textarea h-full" value={selected.personality} onChange={e => updateSelected(c => ({ ...c, personality: e.target.value }))} placeholder="Motivations, fears, quirks..." />
              </div>
              <div className="flex flex-col">
                <label className="label">Stats (JSON)</label>
                <textarea 
                  className="textarea mono text-sm flex-1" 
                  value={JSON.stringify(selected.stats, null, 2)} 
                  onChange={e => {
                    try {
                      const stats = JSON.parse(e.target.value);
                      updateSelected(c => ({ ...c, stats }));
                    } catch {}
                  }} 
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted">Select a character to edit</div>
        )}
      </div>
    </div>
  );
};