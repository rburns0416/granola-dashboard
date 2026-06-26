import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Copy, Download, Filter, X, Check, Settings, Plus, Trash2, Save, Upload } from 'lucide-react';

export default function GranolaDashboardSystem() {
  const [mode, setMode] = useState('dashboard'); // 'dashboard' or 'settings'
  const [activeTab, setActiveTab] = useState('status');
  const [expandedSections, setExpandedSections] = useState({});
  const [filterPriority, setFilterPriority] = useState('all');
  const [completedItems, setCompletedItems] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [customNotes, setCustomNotes] = useState({});
  const [transcript, setTranscript] = useState('');
  const [detectedType, setDetectedType] = useState('status');
  const [displaySettings, setDisplaySettings] = useState({
    showDecisions: true,
    showActions: true,
    showBlockers: true,
    showQuotes: true,
    colorTheme: 'dark'
  });
  const dashboardRef = useRef(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('granola-dashboard-state');
    if (saved) {
      const state = JSON.parse(saved);
      setCompletedItems(state.completed || {});
      setCustomNotes(state.notes || {});
    }
  }, []);

  // Save to localStorage
  const saveState = () => {
    localStorage.setItem('granola-dashboard-state', JSON.stringify({
      completed: completedItems,
      notes: customNotes
    }));
  };

  // Detect meeting type from transcript
  const detectMeetingType = (text) => {
    const lower = text.toLowerCase();
    const signals = {
      brainstorm: ['idea', 'think about', 'what if', 'explore', 'possibilities', 'brainstorm'],
      planning: ['timeline', 'deadline', 'phases', 'milestones', 'roadmap', 'schedule', 'sprint'],
      'sales-call': ['client', 'prospect', 'pitch', 'close', 'deal', 'pricing', 'roi'],
      '1on1': ['feedback', 'performance', 'goals', 'development', '1:1'],
      decision: ['decide', 'consensus', 'resolved', 'we decided', 'going with'],
      kickoff: ['kickoff', 'launch', 'project start', 'scope', 'roles'],
      retro: ['retrospective', 'what went well', 'blockers', 'improvements'],
      'customer-interview': ['user research', 'customer', 'feedback', 'pain point'],
      status: ['standup', 'status', 'update', 'progress', 'weekly']
    };

    const scores = {};
    Object.entries(signals).forEach(([type, keywords]) => {
      scores[type] = keywords.filter(k => lower.includes(k)).length;
    });

    return Object.entries(scores).sort(([,a], [,b]) => b - a)[0][0];
  };

  // Extract data from transcript
  const extractData = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    const decisions = [];
    const actionItems = [];
    const questions = [];
    const quotes = [];

    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();
      
      if (lower.includes('decided') || lower.includes('we\'re going')) {
        decisions.push({ id: `d${idx}`, text: line.trim(), owner: 'Team' });
      }
      if (lower.includes(' will ') || lower.includes(' need to ') || lower.includes('by ')) {
        actionItems.push({ id: `a${idx}`, task: line.trim(), owner: 'TBD', priority: 'medium', due: 'This week' });
      }
      if (line.trim().includes('?')) {
        questions.push(line.trim());
      }
      if (line.includes('"') || line.includes('"')) {
        quotes.push({ id: `q${idx}`, text: line.trim(), speaker: 'Speaker', theme: 'Key point' });
      }
    });

    return { decisions, actionItems, questions, quotes };
  };

  // Dashboard Components
  const StatusDashboard = ({ data }) => (
    <div ref={dashboardRef} className="space-y-8">
      <div className="border-b border-slate-700 pb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">Weekly Team Standup</h1>
        <p className="text-slate-400">Status, Progress & Alignment Meeting</p>
      </div>

      {displaySettings.showActions && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <button onClick={() => toggleSection('actions')} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-750 transition">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <h2 className="text-xl font-semibold text-white">Action Items</h2>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition ${expandedSections.actions ? 'rotate-180' : ''}`} />
          </button>
          {expandedSections.actions && (
            <div className="px-6 py-4 border-t border-slate-700">
              <div className="flex gap-2 mb-4 flex-wrap">
                {['all', 'high', 'medium', 'low'].map(p => (
                  <button key={p} onClick={() => setFilterPriority(p)} className={`px-3 py-1 rounded text-xs font-medium transition ${filterPriority === p ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.actionItems?.filter(a => filterPriority === 'all' || a.priority === filterPriority).map((item) => (
                  <ActionItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {displaySettings.showDecisions && data.decisions?.length > 0 && (
        <CollapsibleSection title="✓ Decisions Made" section="decisions" items={data.decisions} />
      )}

      {displaySettings.showBlockers && data.blockers?.length > 0 && (
        <CollapsibleSection title="🚨 Blockers" section="blockers" items={data.blockers} isBlocker />
      )}

      {displaySettings.showQuotes && data.quotes?.length > 0 && (
        <CollapsibleSection title="✎ Key Quotes" section="quotes" items={data.quotes} isQuote />
      )}
    </div>
  );

  const BrainstormDashboard = ({ data }) => (
    <div className="space-y-8">
      <div className="border-b border-slate-700 pb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Brainstorm Session</h1>
        <p className="text-slate-400">Ideas, Themes & Creative Directions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.actionItems?.map((idea) => (
          <div key={idea.id} className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/50 transition cursor-pointer group">
            <p className="text-white font-medium mb-2 group-hover:text-purple-300">{idea.task}</p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">{idea.owner}</span>
              <button onClick={() => copyToClipboard(idea.task, idea.id)} className="opacity-0 group-hover:opacity-100 transition">
                {copiedId === idea.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
            {customNotes[idea.id] && <p className="text-xs text-slate-400 mt-2 italic">Note: {customNotes[idea.id]}</p>}
          </div>
        ))}
      </div>

      {displaySettings.showQuotes && data.quotes?.length > 0 && (
        <CollapsibleSection title="✎ Inspirational Quotes" section="quotes" items={data.quotes} isQuote />
      )}
    </div>
  );

  const SalesCallDashboard = ({ data }) => (
    <div className="space-y-8">
      <div className="border-b border-slate-700 pb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">Sales Call</h1>
        <p className="text-slate-400">Prospect, Objections & Next Steps</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {displaySettings.showDecisions && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Deal Summary</h2>
              {data.decisions?.map(d => (
                <div key={d.id} className="mb-4 p-4 bg-slate-750 rounded border-l-4 border-green-500">
                  <p className="text-white font-medium">{d.text}</p>
                </div>
              ))}
            </div>
          )}

          {displaySettings.showBlockers && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Objections Raised</h2>
              {data.blockers?.map(b => (
                <div key={b.id} className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
                  <p className="text-white font-medium text-sm">{b.issue}</p>
                  <p className="text-xs text-green-400 mt-1">Response: {b.resolution}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-b from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-6">
          <h3 className="text-lg font-bold text-green-300 mb-4">Next Steps</h3>
          {data.actionItems?.slice(0, 5).map(a => (
            <div key={a.id} className="mb-3 pb-3 border-b border-slate-700 last:border-b-0">
              <p className="text-white text-sm font-medium">{a.task}</p>
              <p className="text-xs text-slate-400">{a.due}</p>
            </div>
          ))}
        </div>
      </div>

      {displaySettings.showQuotes && (
        <CollapsibleSection title="✎ Key Discussion Points" section="quotes" items={data.quotes} isQuote />
      )}
    </div>
  );

  const PlanningDashboard = ({ data }) => (
    <div className="space-y-8">
      <div className="border-b border-slate-700 pb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-2">Planning Session</h1>
        <p className="text-slate-400">Timeline, Phases & Roadmap</p>
      </div>

      <div className="space-y-6">
        {data.actionItems?.map((item, idx) => (
          <div key={item.id} className="relative pb-8">
            <div className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {idx + 1}
                </div>
                {idx < data.actionItems.length - 1 && <div className="w-1 h-12 bg-orange-500/30 mt-2"></div>}
              </div>
              <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-orange-500/50 transition">
                <h3 className="text-lg font-bold text-white mb-2">{item.task}</h3>
                <p className="text-sm text-slate-400 mb-3">Due: {item.due}</p>
                <div className="flex gap-2 flex-wrap">
                  {item.owner && <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">{item.owner}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const OneOnOneDashboard = ({ data }) => (
    <div className="space-y-8">
      <div className="border-b border-slate-700 pb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">1:1 Meeting</h1>
        <p className="text-slate-400">Performance, Development & Goals</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {displaySettings.showDecisions && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Key Decisions</h2>
              {data.decisions?.map(d => (
                <div key={d.id} className="mb-3 pb-3 border-b border-slate-700 last:border-b-0">
                  <p className="text-white font-medium">{d.text}</p>
                </div>
              ))}
            </div>
          )}

          {displaySettings.showQuotes && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Feedback Themes</h2>
              {data.quotes?.map(q => (
                <div key={q.id} className="mb-3 pb-3 border-b border-slate-700 last:border-b-0">
                  <p className="text-white text-sm">"{q.text}"</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-slate-400">{q.speaker}</span>
                    <span className="text-xs text-indigo-400">{q.theme}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-b from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-lg p-6">
          <h3 className="text-lg font-bold text-indigo-300 mb-4">Development Goals</h3>
          {data.actionItems?.slice(0, 4).map(a => (
            <div key={a.id} className="mb-4 pb-4 border-b border-slate-700 last:border-b-0">
              <button onClick={() => toggleComplete(a.id)} className={`flex items-center gap-2 w-full ${completedItems[a.id] ? 'opacity-60' : ''}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${completedItems[a.id] ? 'bg-green-600 border-green-600' : 'border-slate-600'}`}>
                  {completedItems[a.id] && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={`text-sm font-medium ${completedItems[a.id] ? 'line-through text-slate-500' : 'text-white'}`}>{a.task}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Helper Components
  const ActionItemCard = ({ item }) => (
    <div className={`pb-3 border-b border-slate-700 last:border-b-0 p-3 rounded hover:bg-slate-750 transition ${completedItems[item.id] ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button onClick={() => toggleComplete(item.id)} className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${completedItems[item.id] ? 'bg-green-600 border-green-600' : 'border-slate-600'}`}>
          {completedItems[item.id] && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1">
          <p className={`font-medium text-white ${completedItems[item.id] ? 'line-through' : ''}`}>{item.task}</p>
          <div className="flex gap-3 text-xs text-slate-400 mt-1 flex-wrap">
            <span className={`px-2 py-0.5 rounded ${item.priority === 'high' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{item.priority}</span>
            <span>{item.owner}</span>
            <span className="text-slate-500">{item.due}</span>
          </div>
          {customNotes[item.id] && <p className="text-xs text-slate-400 mt-2 italic">📝 {customNotes[item.id]}</p>}
        </div>
        <button onClick={() => copyToClipboard(item.task, item.id)} className="text-slate-400 hover:text-white transition">
          {copiedId === item.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  const CollapsibleSection = ({ title, section, items, isBlocker, isQuote }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <button onClick={() => toggleSection(section)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-750 transition">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition ${expandedSections[section] ? 'rotate-180' : ''}`} />
      </button>
      {expandedSections[section] && (
        <div className="px-6 py-4 border-t border-slate-700 space-y-3">
          {items?.map(item => (
            <div key={item.id} className="pb-3 border-b border-slate-700 last:border-b-0 hover:bg-slate-750/50 p-2 rounded transition">
              {isQuote ? (
                <>
                  <p className="text-sm italic text-slate-300 mb-2">"{item.text}"</p>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-medium">{item.speaker}</span>
                    <span className="text-cyan-400">{item.theme}</span>
                  </div>
                </>
              ) : isBlocker ? (
                <>
                  <p className="text-white font-medium mb-1">{item.issue}</p>
                  <p className="text-xs text-slate-400">✓ {item.resolution}</p>
                </>
              ) : (
                <>
                  <p className="text-white font-medium">{item.text}</p>
                  <div className="flex gap-2 text-xs text-slate-400 mt-1">
                    <span>{item.owner}</span> • <span>{item.context}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleComplete = (id) => {
    setCompletedItems(prev => ({ ...prev, [id]: !prev[id] }));
    saveState();
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportPDF = () => {
    alert('📄 Use browser print (Cmd/Ctrl+P) and select "Save as PDF"');
  };

  const exportMarkdown = () => {
    let md = `# ${detectedType.toUpperCase()} Dashboard\n\n`;
    md += `Generated: ${new Date().toLocaleString()}\n\n`;
    alert('✅ Export ready! Use browser print or copy the dashboard content.');
  };

  // Extract data
  const extractedData = transcript ? extractData(transcript) : {};

  // Settings Panel
  if (mode === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setMode('dashboard')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition">← Back to Dashboard</button>
          
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 space-y-6">
            <h1 className="text-3xl font-bold text-white">Settings</h1>

            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Display Options</h2>
              {Object.entries(displaySettings).filter(([k]) => k !== 'colorTheme').map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 mb-3 cursor-pointer">
                  <input type="checkbox" checked={value} onChange={(e) => setDisplaySettings(prev => ({ ...prev, [key]: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Data Management</h2>
              <div className="space-y-2">
                <button onClick={() => { setCompletedItems({}); setCustomNotes({}); localStorage.clear(); alert('✅ Data cleared'); }} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Clear All Data
                </button>
                <button onClick={saveState} className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Save to Local Storage
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header & Controls */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold text-white">Granola Dashboard</h1>
            <div className="flex gap-2">
              <button onClick={() => setMode('settings')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition flex items-center gap-2">
                <Settings className="w-4 h-4" /> Settings
              </button>
            </div>
          </div>

          {/* Transcript Input */}
          {!transcript && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">📝 Paste Granola Transcript</h2>
              <textarea value={transcript} onChange={(e) => { setTranscript(e.target.value); setDetectedType(detectMeetingType(e.target.value)); }} placeholder="Paste your meeting transcript here..." className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 font-mono text-sm" />
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setTranscript(''); setDetectedType('status'); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition">Clear</button>
              </div>
            </div>
          )}

          {/* Detected Type & Navigation */}
          {transcript && (
            <>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
                <p className="text-white">
                  <span className="text-slate-400">Detected Type:</span> <span className="font-semibold text-cyan-400 capitalize">{detectedType}</span>
                  <button onClick={() => setTranscript('')} className="ml-4 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition">Load New</button>
                </p>
              </div>

              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['status', '1on1', 'brainstorm', 'sales-call', 'planning'].map(type => (
                  <button key={type} onClick={() => setActiveTab(type)} className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${activeTab === type ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                    {type === '1on1' ? '👤 1:1' : type === 'sales-call' ? '💰 Sales' : type === 'brainstorm' ? '💡 Brainstorm' : type === 'planning' ? '📅 Planning' : '📊 Status'}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mb-6">
                <input type="text" placeholder="Search..." value={filterPriority === 'search' ? '' : ''} className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-600" />
                <button onClick={exportPDF} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2">
                  <Download className="w-4 h-4" /> PDF
                </button>
                <button onClick={exportMarkdown} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition">📝 Export</button>
              </div>
            </>
          )}
        </div>

        {/* Dashboard Rendering */}
        {transcript && (
          <div>
            {activeTab === 'status' && <StatusDashboard data={extractedData} />}
            {activeTab === '1on1' && <OneOnOneDashboard data={extractedData} />}
            {activeTab === 'brainstorm' && <BrainstormDashboard data={extractedData} />}
            {activeTab === 'sales-call' && <SalesCallDashboard data={extractedData} />}
            {activeTab === 'planning' && <PlanningDashboard data={extractedData} />}
          </div>
        )}

        {!transcript && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">👆 Paste a Granola transcript to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
