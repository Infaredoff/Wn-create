import React, { useMemo } from 'react';
import { useProject } from '../store';

export const Calculator: React.FC = () => {
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
      
      // Sim derived stats
      const simStats = { STR: 10 + (i * 5), VIT: 10 + (i * 5), INT: 10 + (i * 5), WIS: 10 + (i * 5) };
      
      // Safe eval
      const evalFormula = (f: string) => {
        try {
           let s = f;
           Object.keys(simStats).forEach(k => { s = s.replace(new RegExp(k, 'g'), (simStats as any)[k]); });
           // Basic security: only allow math chars
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
        
        <div>
           <label className="label">XP Curve Function</label>
           <select className="select" value={xpCurve} onChange={e => updateProject(p => ({ ...p, systemRules: { ...p.systemRules, xpCurve: e.target.value as any } }))}>
             <option value="linear">Linear (Slow)</option>
             <option value="quadratic">Quadratic (Standard RPG)</option>
             <option value="exponential">Exponential (Cultivation)</option>
           </select>
        </div>

        <div className="grid-2">
           <div>
             <label className="label">Base XP</label>
             <input type="number" className="input" value={xpBase} onChange={e => updateProject(p => ({ ...p, systemRules: { ...p.systemRules, xpBase: parseInt(e.target.value) } }))} />
           </div>
           <div>
             <label className="label">Growth Factor</label>
             <input type="number" step="0.1" className="input" value={xpFactor} onChange={e => updateProject(p => ({ ...p, systemRules: { ...p.systemRules, xpFactor: parseFloat(e.target.value) } }))} />
           </div>
        </div>

        <div className="border-t border-border pt-4">
           <h4>Derived Stats Formulas</h4>
           <p className="text-xs text-muted mb-2">Available vars: STR, VIT, AGI, INT, WIS</p>
           
           <div className="mb-2">
             <label className="label">HP Formula</label>
             <input className="input mono" value={formulas.hp} onChange={e => updateProject(p => ({ ...p, systemRules: { ...p.systemRules, formulas: { ...p.systemRules.formulas, hp: e.target.value } } }))} />
           </div>
           <div>
             <label className="label">MP Formula</label>
             <input className="input mono" value={formulas.mp} onChange={e => updateProject(p => ({ ...p, systemRules: { ...p.systemRules, formulas: { ...p.systemRules.formulas, mp: e.target.value } } }))} />
           </div>
        </div>
      </div>

      <div className="card flex flex-col overflow-hidden">
        <h3>Progression Preview</h3>
        <div className="overflow-y-auto flex-1 border border-border rounded">
           <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
             <thead style={{ background: 'var(--bg-input)', position: 'sticky', top: 0 }}>
               <tr>
                 <th className="p-2 text-sm text-muted font-medium">Lvl</th>
                 <th className="p-2 text-sm text-muted font-medium">XP Needed</th>
                 <th className="p-2 text-sm text-muted font-medium">Total XP</th>
                 <th className="p-2 text-sm text-muted font-medium">Est. HP</th>
               </tr>
             </thead>
             <tbody className="mono text-sm">
               {data.map(r => (
                 <tr key={r.level} style={{ borderBottom: '1px solid var(--border)' }}>
                   <td className="p-2">{r.level}</td>
                   <td className="p-2" style={{ color: 'var(--accent)' }}>{r.xp.toLocaleString()}</td>
                   <td className="p-2 text-muted">{r.total.toLocaleString()}</td>
                   <td className="p-2 text-success">{r.hp}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};