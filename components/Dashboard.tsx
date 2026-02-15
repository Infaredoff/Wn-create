import React from 'react';
import { useProject } from '../store';

export const Dashboard: React.FC = () => {
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
            <p className="text-sm text-muted" style={{ marginTop: '1rem' }}>
              Last Updated: {new Date(project.meta.updated).toLocaleString()}
            </p>
          </div>
          <button className="btn btn-primary w-full" onClick={exportJSON}>
             💾 Export Project JSON
          </button>
        </div>
      </div>
    </div>
  );
};