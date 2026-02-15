import React, { useState } from 'react';
import { useProject } from '../store';

export const Consistency: React.FC = () => {
  const { project } = useProject();
  const [report, setReport] = useState<{ type: 'warn' | 'err' | 'ok', msg: string }[]>([]);

  const runCheck = () => {
    const issues: typeof report = [];
    const latestChap = project.chapters[project.chapters.length - 1];
    
    if (!latestChap || !latestChap.content) {
      issues.push({ type: 'warn', msg: "No chapter content found to analyze." });
      setReport(issues);
      return;
    }

    const text = latestChap.content.toLowerCase();

    // Check Taboos
    project.storyBible.taboos.forEach(t => {
      if (t && text.includes(t.toLowerCase())) {
        issues.push({ type: 'err', msg: `VIOLATION: Taboo phrase "${t}" detected in text.` });
      }
    });

    // Check Numbers
    if (text.match(/level \d{3,}/)) {
      issues.push({ type: 'warn', msg: "High level detected. Verify power scaling." });
    }

    // Check Characters
    project.characters.forEach(c => {
      if (!text.includes(c.name.toLowerCase()) && c.role === 'Protagonist') {
         issues.push({ type: 'warn', msg: `Protagonist "${c.name}" not mentioned in latest chapter.` });
      }
    });

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
            <div 
              key={i} 
              className="p-3 rounded border flex items-center gap-3"
              style={{
                borderColor: r.type === 'err' ? 'var(--error)' : r.type === 'ok' ? 'var(--success)' : 'var(--border)',
                background: 'var(--bg-input)'
              }}
            >
              <span>{r.type === 'err' ? '❌' : r.type === 'ok' ? '✅' : '⚠️'}</span>
              <span>{r.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};