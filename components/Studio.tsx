import React, { useState } from 'react';
import { useProject } from '../store';
import { callGemini } from '../ai';
import { Chapter } from '../types';

export const Studio: React.FC = () => {
  const { project, updateProject, apiKey, mode, addNotification } = useProject();
  const [chapNum, setChapNum] = useState(1);
  const [loading, setLoading] = useState(false);

  // Get current chapter or default
  const chapter = project.chapters.find(c => c.num === chapNum) || {
    id: Date.now().toString(),
    num: chapNum,
    title: '',
    goal: '',
    beats: '',
    content: '',
    systemNotices: ''
  };

  const updateChapter = (updates: Partial<Chapter>) => {
    updateProject(p => {
      const idx = p.chapters.findIndex(c => c.num === chapNum);
      if (idx === -1) {
        return { ...p, chapters: [...p.chapters, { ...chapter, ...updates }] };
      }
      const newChapters = [...p.chapters];
      newChapters[idx] = { ...newChapters[idx], ...updates };
      return { ...p, chapters: newChapters };
    });
  };

  const runAI = async (action: 'outline' | 'write') => {
    setLoading(true);
    try {
      let prompt = '';
      if (action === 'outline') {
        prompt = `Create a 5-beat detailed outline for Chapter ${chapNum}: "${chapter.title}". Goal: ${chapter.goal}. Context: ${project.storyBible.logline}. Ensure a cliffhanger.`;
      } else {
        prompt = `Write Chapter ${chapNum}: "${chapter.title}" based on this outline:\n${chapter.beats}\n\nStyle: Webnovel (short paragraphs, punchy, sensory details). Include these system notices naturally:\n${chapter.systemNotices}.`;
      }
      
      const result = await callGemini(prompt, apiKey, mode);
      if (result) {
        if (action === 'outline') updateChapter({ beats: result });
        else updateChapter({ content: result });
        addNotification(action === 'outline' ? "Outline Generated" : "Chapter Written");
      }
    } catch (e: any) {
      addNotification("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade">
      <div className="flex justify-between items-center mb-4 p-2 bg-panel border-b border-border">
        <div className="flex gap-4 items-center">
          <h2 className="m-0">Chapter</h2>
          <input 
            type="number" 
            className="input w-20 text-center font-bold" 
            value={chapNum} 
            onChange={e => setChapNum(parseInt(e.target.value) || 1)} 
          />
          <input 
            className="input w-64" 
            placeholder="Chapter Title..."
            value={chapter.title}
            onChange={e => updateChapter({ title: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
           {loading && <div className="spinner self-center"></div>}
           <button className="btn btn-secondary" onClick={() => runAI('outline')} disabled={loading}>Generate Outline</button>
           <button className="btn btn-primary" onClick={() => runAI('write')} disabled={loading}>Write Chapter</button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Pane: Config & Outline */}
        <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
           <div className="card">
             <label className="label">Chapter Goal</label>
             <textarea className="textarea" rows={2} value={chapter.goal} onChange={e => updateChapter({ goal: e.target.value })} />
           </div>
           
           <div className="card">
             <label className="label">System Notices</label>
             <textarea className="textarea mono text-xs" rows={3} placeholder="[You have leveled up!]" value={chapter.systemNotices} onChange={e => updateChapter({ systemNotices: e.target.value })} />
           </div>

           <div className="card flex-1 flex flex-col">
             <label className="label">Beats / Outline</label>
             <textarea className="textarea flex-1" value={chapter.beats} onChange={e => updateChapter({ beats: e.target.value })} />
           </div>
        </div>

        {/* Right Pane: Writing */}
        <div className="flex-1 card flex flex-col p-0 overflow-hidden">
           <textarea 
             className="w-full h-full bg-transparent border-none p-6 text-lg mono resize-none focus:outline-none" 
             style={{ lineHeight: 1.6 }}
             placeholder="The story begins..."
             value={chapter.content}
             onChange={e => updateChapter({ content: e.target.value })}
           />
        </div>
      </div>
    </div>
  );
};