import React, { useState } from 'react';
import { useProject } from './store';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { StoryBible } from './components/StoryBible';
import { Characters } from './components/Characters';
import { Calculator } from './components/Calculator';
import { Studio } from './components/Studio';
import { Consistency } from './components/Consistency';
import { Settings } from './components/Settings';

export const App: React.FC = () => {
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
        <header className="p-4 border-b border-border bg-panel flex justify-between items-center md:hidden">
          <div className="font-bold">System Studio</div>
        </header>
        
        <div className="flex-1 overflow-hidden p-6 relative">
           {renderContent()}
        </div>

        {/* System Notifications */}
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 pointer-events-none">
          {notifications.map((msg, i) => (
            <div key={i} className="system-msg animate-fade">
              <div className="text-xs text-primary font-bold mb-1">[SYSTEM NOTICE]</div>
              <div>{msg}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};