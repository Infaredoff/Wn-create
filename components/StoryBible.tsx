import React, { useState } from 'react';
import { useProject } from '../store';
import { callGemini } from '../ai';

export const StoryBible: React.FC = () => {
  const { project, updateProject, apiKey, mode, addNotification } = useProject();
  const [loading, setLoading] = useState(false);

  const generate = async (field: string) => {
    setLoading(true);
    try {
      const prompt = `You are a creative world builder. Write a unique, webnovel-style description for the "${field}" of a story with the premise: "${project.storyBible.logline}". Keep it punchy and engaging.`;
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
    <div className="animate-fade h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1>Story Bible</h1>
        {loading && <div className="spinner"></div>}
      </div>

      <div className="grid-2 h-full overflow-hidden">
        <div className="flex flex-col gap-4 overflow-y-auto" style={{ paddingRight: '0.5rem' }}>
          <div className="card">
            <h3>Core Premise</h3>
            <div className="mb-4">
              <label className="label">Logline</label>
              <textarea className="textarea" rows={3} value={project.storyBible.logline} onChange={e => updateProject(p => ({ ...p, storyBible: { ...p.storyBible, logline: e.target.value } }))} placeholder="A weak F-rank hunter finds a glitched system..." />
            </div>
            <div>
              <label className="label flex justify-between">
                Themes 
                <button className="btn-ghost btn-sm" onClick={() => generate('themes')}>✨ AI Gen</button>
              </label>
              <textarea className="textarea" rows={2} value={project.storyBible.themes} onChange={e => updateProject(p => ({ ...p, storyBible: { ...p.storyBible, themes: e.target.value } }))} />
            </div>
          </div>

          <div className="card">
             <h3>World Building</h3>
             <label className="label flex justify-between">
                World Overview 
                <button className="btn-ghost btn-sm" onClick={() => generate('worldOverview')}>✨ AI Gen</button>
             </label>
             <textarea className="textarea mono text-sm" rows={8} value={project.storyBible.worldOverview} onChange={e => updateProject(p => ({ ...p, storyBible: { ...p.storyBible, worldOverview: e.target.value } }))} />
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto">
          <div className="card">
             <h3>Magic & System</h3>
             <div className="mb-4">
               <label className="label">Source of Power</label>
               <input className="input" value={project.storyBible.magicSystem.source} onChange={e => updateProject(p => ({ ...p, storyBible: { ...p.storyBible, magicSystem: { ...p.storyBible.magicSystem, source: e.target.value } } }))} placeholder="Mana, Qi, System Points..." />
             </div>
             <div>
                <label className="label">Costs & Limits</label>
                <textarea className="textarea" rows={3} value={project.storyBible.magicSystem.costs} onChange={e => updateProject(p => ({ ...p, storyBible: { ...p.storyBible, magicSystem: { ...p.storyBible.magicSystem, costs: e.target.value } } }))} />
             </div>
          </div>

          <div className="card flex-1">
             <h3>Taboos & Rules</h3>
             <p className="text-sm text-muted mb-2">Hard constraints the story must never break.</p>
             <textarea 
               className="textarea h-full" 
               style={{ minHeight: '150px' }}
               value={project.storyBible.taboos.join('\n')} 
               onChange={e => updateProject(p => ({ ...p, storyBible: { ...p.storyBible, taboos: e.target.value.split('\n') } }))}
               placeholder="One rule per line..." 
             />
          </div>
        </div>
      </div>
    </div>
  );
};