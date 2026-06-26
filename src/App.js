import React, { useState, useEffect } from 'react';
import { ChevronDown, Copy, Check, Settings, Trash2, Save, Download, RefreshCw } from 'lucide-react';

export default function GranolaDashboardSystem() {
  const [mode, setMode] = useState('dashboard');
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingDetail, setMeetingDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ actions: true, decisions: true });
  const [filterPriority, setFilterPriority] = useState('all');
  const [completedItems, setCompletedItems] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [customNotes, setCustomNotes] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [displaySettings, setDisplaySettings] = useState({
    showDecisions: true,
    showActions: true,
    showBlockers: true,
    showQuotes: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem('granola-dashboard-state');
    if (saved) {
      const state = JSON.parse(saved);
      setCompletedItems(state.completed || {});
      setCustomNotes(state.notes || {});
    }
    fetchMeetings();
  }, []);

  const saveState = () => {
    localStorage.setItem('granola-dashboard-state', JSON.stringify({
      completed: completedItems,
      notes: customNotes
    }));
  };

  const fetchMeetings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/meetings');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const list = data.notes || data.docs || data.meetings || data || [];
      setMeetings(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const loadMeeting = async (meeting) => {
    setSelectedMeeting(meeting);
    setLoadingDetail(true);
    try {
      const id = meeting.id || meeting._id;
      const res = await fetch(`/api/meetings/${id}`);
      if (!res.ok) throw new Error(`Failed to load meeting`);
      const data = await res.json();
      setMeetingDetail(data);
    } catch (err) {
      setError(err.message);
    }
    setLoadingDetail(false);
  };

  const detectMeetingType = (title) => {
    const lower = (title || '').toLowerCase();
    if (lower.includes('1:1') || lower.includes('1on1') || lower.match(/\b\w+\/\w+ (weekly )?1:/)) return '1on1';
    if (lower.includes('standup') || lower.includes('huddle') || lower.includes('status') || lower.includes('weekly')) return 'status';
    if (lower.includes('brainstorm') || lower.includes('idea')) return 'brainstorm';
    if (lower.includes('sales') || lower.includes('pitch') || lower.includes('deal') || lower.includes('prospect')) return 'sales-call';
    if (lower.includes('planning') || lower.includes('roadmap') || lower.includes('kickoff') || lower.includes('kick-off')) return 'planning';
    return 'status';
  };

  const getMeetingTypeStyle = (type) => {
    const styles = {
      '1on1': { gradient: 'from-indigo-400 to-purple-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30', text: 'text-indigo-400', label: '1:1' },
      'status': { gradient: 'from-blue-400 to-cyan-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', label: 'Status' },
      'brainstorm': { gradient: 'from-purple-400 to-pink-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', label: 'Brainstorm' },
      'sales-call': { gradient: 'from-green-400 to-emerald-400', bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', label: 'Sales' },
      'planning': { gradient: 'from-orange-400 to-yellow-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', label: 'Planning' },
    };
    return styles[type] || styles['status'];
  };

  const extractData = (detail) => {
    const summary = detail?.summary_markdown || detail?.summary_text || '';
    const lines = summary.split('\n');
    const decisions = [];
    const actionItems = [];
    const questions = [];
    const quotes = [];
    const blockers = [];

    let currentSection = '';
    let actionIdx = 0;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();

      if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
        currentSection = lower.replace(/^#+\s*/, '');
        return;
      }

      const isNextSteps = currentSection.includes('next step') || currentSection.includes('action') || currentSection.includes('follow') || currentSection.includes('to do') || currentSection.includes('todo');
      const isDecision = currentSection.includes('decision') || currentSection.includes('outcome') || currentSection.includes('agreed') || currentSection.includes('resolution');
      const isBlocker = currentSection.includes('blocker') || currentSection.includes('risk') || currentSection.includes('concern') || currentSection.includes('challenge') || currentSection.includes('gap');

      if (isNextSteps && trimmed.startsWith('- **')) {
        const boldMatch = trimmed.match(/\*\*(.+?)\*\*\s*(?:\((.+?)\))?/);
        if (boldMatch) {
          actionItems.push({
            id: `a${actionIdx++}`,
            task: boldMatch[1],
            owner: boldMatch[2] || 'TBD',
            priority: 'medium',
            due: 'This week'
          });
        }
        return;
      }

      if (isNextSteps && trimmed.startsWith('- ')) {
        const clean = trimmed.slice(2).replace(/\*\*/g, '');
        const ownerMatch = clean.match(/\(([^)]+)\)\s*$/);
        actionItems.push({
          id: `a${actionIdx++}`,
          task: ownerMatch ? clean.replace(ownerMatch[0], '').trim() : clean,
          owner: ownerMatch ? ownerMatch[1] : 'TBD',
          priority: 'medium',
          due: 'This week'
        });
        return;
      }

      const bulletClean = trimmed.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').trim();
      if (!bulletClean || bulletClean.length < 5) return;

      if (isDecision && trimmed.startsWith('- ')) {
        decisions.push({ id: `d${idx}`, text: bulletClean, owner: 'Team' });
        return;
      }

      if (isBlocker && trimmed.startsWith('- ')) {
        blockers.push({ id: `b${idx}`, issue: bulletClean, resolution: 'Pending', severity: 'medium' });
        return;
      }

      if (!isNextSteps && !isDecision && !isBlocker) {
        if (lower.includes('decision:') || lower.includes('decided') || lower.includes('agreed to')) {
          decisions.push({ id: `d${idx}`, text: bulletClean, owner: 'Team' });
        }
        if ((lower.includes('blocker') || lower.includes('blocked') || lower.includes('concern') || lower.includes('frustrat')) && trimmed.startsWith('- ')) {
          blockers.push({ id: `b${idx}`, issue: bulletClean, resolution: 'Pending', severity: 'medium' });
        }
        if (bulletClean.includes('”') || bulletClean.includes('”')) {
          const quoteMatch = bulletClean.match(/[“”](.+?)[“”]/) || bulletClean.match(/”(.+?)”/);
          if (quoteMatch) {
            quotes.push({ id: `q${idx}`, text: quoteMatch[1], speaker: 'Speaker', theme: currentSection || 'Key point' });
          }
        }
      }
    });

    return { decisions, actionItems, questions, quotes, blockers };
  };

  const toggleSection = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  const toggleComplete = (id) => { setCompletedItems(prev => ({ ...prev, [id]: !prev[id] })); saveState(); };
  const copyToClipboard = (text, id) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getParticipants = (meeting) => {
    if (meeting.participants) return meeting.participants;
    if (meeting.attendees) return meeting.attendees;
    return [];
  };

  const filteredMeetings = meetings.filter(m => {
    const title = (m.title || m.name || '').toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

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
        <h2 className="text-lg font-semibold text-white">{title} <span className="text-sm text-slate-500 ml-2">({items?.length || 0})</span></h2>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition ${expandedSections[section] ? 'rotate-180' : ''}`} />
      </button>
      {expandedSections[section] && (
        <div className="px-6 py-4 border-t border-slate-700 space-y-3">
          {items?.length === 0 && <p className="text-slate-500 text-sm">No items extracted</p>}
          {items?.map(item => (
            <div key={item.id} className="pb-3 border-b border-slate-700 last:border-b-0 hover:bg-slate-750/50 p-2 rounded transition">
              {isQuote ? (
                <>
                  <p className="text-sm italic text-slate-300 mb-2">{item.text}</p>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-medium">{item.speaker}</span>
                    <span className="text-cyan-400">{item.theme}</span>
                  </div>
                </>
              ) : isBlocker ? (
                <>
                  <p className="text-white font-medium mb-1">{item.issue}</p>
                  <p className="text-xs text-slate-400">{item.resolution}</p>
                </>
              ) : (
                <p className="text-white font-medium">{item.text}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Settings
  if (mode === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setMode('dashboard')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition">&larr; Back</button>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 space-y-6">
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Display Options</h2>
              {Object.entries(displaySettings).map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 mb-3 cursor-pointer">
                  <input type="checkbox" checked={value} onChange={(e) => setDisplaySettings(prev => ({ ...prev, [key]: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <button onClick={() => { setCompletedItems({}); setCustomNotes({}); localStorage.clear(); }} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Clear All Data
              </button>
              <button onClick={saveState} className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderMarkdown = (md) => {
    if (!md) return null;
    return md.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-white mt-6 mb-2">{line.slice(4)}</h3>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-white mt-8 mb-3">{line.slice(3)}</h2>;
      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-white mt-8 mb-3">{line.slice(2)}</h1>;
      if (line.startsWith('- [ ] ')) return <div key={i} className="flex items-start gap-2 ml-4 my-1"><span className="text-slate-500 mt-0.5">&#9744;</span><span className="text-slate-300">{line.slice(6)}</span></div>;
      if (line.startsWith('- [x] ')) return <div key={i} className="flex items-start gap-2 ml-4 my-1"><span className="text-green-400 mt-0.5">&#9745;</span><span className="text-slate-400 line-through">{line.slice(6)}</span></div>;
      if (line.match(/^[-*] /)) return <div key={i} className="flex items-start gap-2 ml-4 my-1"><span className="text-slate-500">•</span><span className="text-slate-300">{line.slice(2)}</span></div>;
      if (line.match(/^\d+\. /)) return <div key={i} className="flex items-start gap-2 ml-4 my-1"><span className="text-slate-500 font-medium">{line.match(/^\d+/)[0]}.</span><span className="text-slate-300">{line.replace(/^\d+\.\s*/, '')}</span></div>;
      if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-cyan-500/50 pl-4 py-1 my-2 text-slate-300 italic">{line.slice(2)}</blockquote>;
      if (line.startsWith('---') || line.startsWith('***')) return <hr key={i} className="border-slate-700 my-4" />;
      if (line.trim() === '') return <div key={i} className="h-2" />;
      const formatted = line
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      return <p key={i} className="text-slate-300 my-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  // Meeting detail view
  if (selectedMeeting && meetingDetail) {
    const title = meetingDetail.title || selectedMeeting.title || selectedMeeting.name;
    const type = detectMeetingType(title);
    const style = getMeetingTypeStyle(type);
    const summaryMd = meetingDetail.summary_markdown || '';
    const summaryText = meetingDetail.summary_text || '';
    const transcript = meetingDetail.transcript || '';
    const extracted = extractData(meetingDetail);
    const attendees = meetingDetail.attendees || selectedMeeting.attendees || [];
    const webUrl = meetingDetail.web_url || '';
    const createdAt = meetingDetail.created_at || selectedMeeting.created_at || selectedMeeting.date;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => { setSelectedMeeting(null); setMeetingDetail(null); }} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition">&larr; All Meetings</button>

          <div className="border-b border-slate-700 pb-6 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.border} border ${style.text}`}>{style.label}</span>
              <span className="text-slate-500 text-sm">{formatDate(createdAt)}</span>
              {webUrl && <a href={webUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">Open in Granola</a>}
            </div>
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${style.gradient} bg-clip-text text-transparent`}>{title}</h1>
            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {attendees.map((a, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-400">
                    {a.name || a.email || a}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {summaryMd && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <button onClick={() => toggleSection('summary')} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-750 transition">
                  <h2 className="text-lg font-semibold text-white">Meeting Summary</h2>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition ${expandedSections.summary !== false ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.summary !== false && (
                  <div className="px-6 py-4 border-t border-slate-700">
                    {renderMarkdown(summaryMd)}
                  </div>
                )}
              </div>
            )}

            {!summaryMd && summaryText && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Meeting Summary</h2>
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{summaryText}</p>
              </div>
            )}

            {extracted.actionItems.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <button onClick={() => toggleSection('actions')} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-750 transition">
                  <h2 className="text-lg font-semibold text-white">Action Items <span className="text-sm text-slate-500 ml-2">({extracted.actionItems.length})</span></h2>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition ${expandedSections.actions ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.actions && (
                  <div className="px-6 py-4 border-t border-slate-700 space-y-3">
                    {extracted.actionItems.map(item => <ActionItemCard key={item.id} item={item} />)}
                  </div>
                )}
              </div>
            )}

            {extracted.decisions.length > 0 && (
              <CollapsibleSection title="Decisions" section="decisions" items={extracted.decisions} />
            )}

            {extracted.blockers.length > 0 && (
              <CollapsibleSection title="Blockers" section="blockers" items={extracted.blockers} isBlocker />
            )}

            {extracted.quotes.length > 0 && (
              <CollapsibleSection title="Key Quotes" section="quotes" items={extracted.quotes} isQuote />
            )}

            {transcript && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <button onClick={() => toggleSection('transcript')} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-750 transition">
                  <h2 className="text-lg font-semibold text-white">Full Transcript</h2>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition ${expandedSections.transcript ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.transcript && (
                  <div className="px-6 py-4 border-t border-slate-700 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{transcript}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main meeting list
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Granola Dashboard</h1>
            <p className="text-slate-400 mt-1">{meetings.length} meetings loaded</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchMeetings} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => setMode('settings')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition flex items-center gap-2">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>

        {loading && meetings.length === 0 && (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 text-slate-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading your meetings...</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredMeetings.map(meeting => {
            const title = meeting.title || meeting.name || 'Untitled';
            const date = meeting.date || meeting.created_at;
            const type = detectMeetingType(title);
            const style = getMeetingTypeStyle(type);
            const participants = getParticipants(meeting);

            return (
              <div
                key={meeting.id || meeting._id}
                onClick={() => loadMeeting(meeting)}
                className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-slate-500 transition cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.border} border ${style.text}`}>{style.label}</span>
                      <span className="text-xs text-slate-500">{formatDate(date)}</span>
                    </div>
                    <h3 className="text-white font-medium group-hover:text-blue-400 transition truncate">{title}</h3>
                    {participants.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {participants.map(p => p.name || p.email || p).join(', ')}
                      </p>
                    )}
                  </div>
                  <ChevronDown className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition -rotate-90 flex-shrink-0 mt-2" />
                </div>
              </div>
            );
          })}
        </div>

        {!loading && filteredMeetings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No meetings found</p>
          </div>
        )}

        {loadingDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 flex items-center gap-4">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
              <p className="text-white">Loading meeting...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
