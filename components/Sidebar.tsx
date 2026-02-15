import React from 'react';

type Props = {
  activeTab: string;
  setTab: (t: string) => void;
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'bible', label: 'Story Bible', icon: '📖' },
  { id: 'chars', label: 'Characters', icon: '👥' },
  { id: 'calc', label: 'System Calculator', icon: '🧮' },
  { id: 'studio', label: 'Chapter Studio', icon: '✍️' },
  { id: 'check', label: 'Consistency', icon: '🔍' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export const Sidebar: React.FC<Props> = ({ activeTab, setTab }) => {
  return (
    <aside className="sidebar flex-col h-full" style={{ width: '240px', background: 'var(--bg-panel)', borderRight: '1px solid var(--border)' }}>
      <div className="p-4" style={{ marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚔️</span> System
        </h2>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Webnovel Architect v1.0</div>
      </div>
      
      <nav className="flex-1 overflow-y-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`w-full text-left p-4 flex items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}
            style={{
              background: activeTab === tab.id ? 'var(--bg-input)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-main)' : 'var(--text-muted)',
              borderLeft: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              border: 'none',
              borderBottom: '1px solid transparent'
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