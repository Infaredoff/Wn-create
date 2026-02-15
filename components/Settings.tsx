import React from 'react';
import { useProject } from '../store';

export const Settings: React.FC = () => {
  const { apiKey, setApiKey, mode, setMode } = useProject();

  return (
    <div className="animate-fade max-w-2xl mx-auto mt-8">
      <h1>System Settings</h1>
      
      <div className="card mb-4">
        <h3>Connectivity</h3>
        <div className="mb-4">
          <label className="label">Operation Mode</label>
          <div className="flex gap-2">
            <button 
              className={`btn ${mode === 'mock' ? 'btn-primary' : 'btn-secondary'} flex-1`}
              onClick={() => setMode('mock')}
            >
              Mock Mode (Offline)
            </button>
            <button 
              className={`btn ${mode === 'api' ? 'btn-primary' : 'btn-secondary'} flex-1`}
              onClick={() => setMode('api')}
            >
              Gemini API Mode
            </button>
          </div>
        </div>

        {mode === 'api' && (
          <div className="animate-fade">
            <label className="label">Google Gemini API Key</label>
            <input 
              type="password" 
              className="input mb-2" 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              placeholder="AIzaSy..." 
            />
            <p className="text-xs text-muted">
              Key is stored in LocalStorage. Never sent to our servers.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h3>System Info</h3>
        <p className="text-sm text-muted">Webnovel Studio v1.0.2</p>
        <p className="text-sm text-muted">Engine: React + Gemini Flash 2.5</p>
      </div>
    </div>
  );
};