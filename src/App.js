import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Copy, Check, Settings, Trash2, Save, Download, RefreshCw, Search, Clock, Users, CheckSquare, BarChart3, FileText } from 'lucide-react';

export default function GranolaDashboardSystem() {
  const [view, setView] = useState('meetings'); // 'meetings', 'actions', 'settings'
  const [meetings, setMeetings] = useState([]);
  const [meetingDetails, setMeetingDetails] = useState({});
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingDetail, setMeetingDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ actions: true, decisions: true, summary: true });
  const [completedItems, setCompletedItems] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [actionOwnerFilter, setActionOwnerFilter] = useState('all');

  useEffect(() => {
    const saved = localStorage.getItem('granola-dashboard-state');
    if (saved) {
      const state = JSON.parse(saved);
      setCompletedItems(state.completed || {});
      setMeetingDetails(state.details || {});
    }
    fetchMeetings();
  }, []);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMeetings();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const saveState = useCallback((completed, details) => {
    localStorage.setItem('granola-dashboard-state', JSON.stringify({
      completed: completed || completedItems,
      details: details || meetingDetails
    }));
  }, [completedItems, meetingDetails]);

  const fetchMeetings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/meetings');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const list = data.notes || data.docs || data.meetings || data || [];
      setMeetings(Array.isArray(list) ? list : []);
      setLastRefresh(new Date());
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
      if (!res.ok) throw new Error('Failed to load meeting');
      const data = await res.json();
      setMeetingDetail(data);
      const newDetails = { ...meetingDetails, [id]: data };
      setMeetingDetails(newDetails);
      saveState(null, newDetails);
    } catch (err) {
      setError(err.message);
    }
    setLoadingDetail(false);
  };

  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0 });

  const loadAllMeetingDetails = async () => {
    setLoadingActions(true);
    const unloaded = meetings.filter(m => !meetingDetails[m.id || m._id]);
    setLoadProgress({ current: 0, total: unloaded.length });
    const batchUpdates = {};

    for (let i = 0; i < unloaded.length; i++) {
      try {
        const id = unloaded[i].id || unloaded[i]._id;
        const res = await fetch(`/api/meetings/${id}`);
        if (res.ok) {
          const data = await res.json();
          const slim = {
            title: data.title,
            summary_markdown: data.summary_markdown,
            summary_text: data.summary_text,
            attendees: data.attendees,
            web_url: data.web_url,
            created_at: data.created_at,
          };
          batchUpdates[id] = slim;
          setLoadProgress({ current: i + 1, total: unloaded.length });
          if ((i + 1) % 5 === 0 || i === unloaded.length - 1) {
            setMeetingDetails(prev => {
              const updated = { ...prev, ...batchUpdates };
              try { saveState(null, updated); } catch {}
              return updated;
            });
          }
        }
      } catch {}
    }

    setMeetingDetails(prev => {
      const updated = { ...prev, ...batchUpdates };
      try { saveState(null, updated); } catch {}
      return updated;
    });
    setLoadingActions(false);
  };

  const detectMeetingType = (title) => {
    const lower = (title || '').toLowerCase();
    if (lower.includes('1:1') || lower.includes('1on1') || lower.match(/\w+\/\w+.*(weekly|1:1)/)) return '1on1';
    if (lower.includes('standup') || lower.includes('huddle') || lower.includes('daily huddle')) return 'status';
    if (lower.includes('brainstorm') || lower.includes('idea')) return 'brainstorm';
    if (lower.includes('sales') || lower.includes('pitch') || lower.includes('prospect')) return 'sales-call';
    if (lower.includes('planning') || lower.includes('roadmap') || lower.includes('kickoff') || lower.includes('kick-off')) return 'planning';
    return 'meeting';
  };

  const getMeetingTypeStyle = (type) => {
    const styles = {
      '1on1': { gradient: 'from-indigo-400 to-purple-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30', text: 'text-indigo-400', label: '1:1' },
      'status': { gradient: 'from-blue-400 to-cyan-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', label: 'Status' },
      'brainstorm': { gradient: 'from-purple-400 to-pink-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', label: 'Brainstorm' },
      'sales-call': { gradient: 'from-green-400 to-emerald-400', bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', label: 'Sales' },
      'planning': { gradient: 'from-orange-400 to-yellow-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', label: 'Planning' },
      'meeting': { gradient: 'from-slate-400 to-slate-300', bg: 'bg-slate-500/20', border: 'border-slate-500/30', text: 'text-slate-400', label: 'Meeting' },
    };
    return styles[type] || styles['meeting'];
  };

  const extractData = (detail) => {
    const summary = detail?.summary_markdown || detail?.summary_text || '';
    const lines = summary.split('\n');
    const decisions = [];
    const actionItems = [];
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
          actionItems.push({ id: `a${actionIdx++}`, task: boldMatch[1], owner: boldMatch[2] || 'TBD', priority: 'medium', due: 'This week' });
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
        if (bulletClean.includes('“') || bulletClean.includes('”') || bulletClean.includes('"')) {
          const quoteMatch = bulletClean.match(/[“”](.+?)[“”]/) || bulletClean.match(/"(.+?)"/);
          if (quoteMatch) {
            quotes.push({ id: `q${idx}`, text: quoteMatch[1], speaker: 'Speaker', theme: currentSection || 'Key point' });
          }
        }
      }
    });

    return { decisions, actionItems, quotes, blockers };
  };

  const getAllActions = () => {
    const allActions = [];
    meetings.forEach(meeting => {
      const id = meeting.id || meeting._id;
      const detail = meetingDetails[id];
      if (!detail) return;
      const extracted = extractData(detail);
      extracted.actionItems.forEach(item => {
        allActions.push({
          ...item,
          id: `${id}_${item.id}`,
          meetingTitle: meeting.title || meeting.name || 'Untitled',
          meetingDate: meeting.created_at || meeting.date,
          meetingId: id
        });
      });
    });
    allActions.sort((a, b) => new Date(b.meetingDate) - new Date(a.meetingDate));
    return allActions;
  };

  const getAnalytics = () => {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = meetings.filter(m => new Date(m.created_at || m.date) >= weekAgo);

    const typeCounts = {};
    meetings.forEach(m => {
      const type = detectMeetingType(m.title || m.name);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const peopleCounts = {};
    meetings.forEach(m => {
      (m.attendees || []).forEach(a => {
        const name = a.name || a.email || a;
        if (name && !name.includes('Ross')) {
          peopleCounts[name] = (peopleCounts[name] || 0) + 1;
        }
      });
    });
    const topPeople = Object.entries(peopleCounts).sort(([,a], [,b]) => b - a).slice(0, 5);

    const allActions = getAllActions();
    const openActions = allActions.filter(a => !completedItems[a.id]);
    const completedCount = allActions.filter(a => completedItems[a.id]).length;

    const dayCounts = {};
    meetings.forEach(m => {
      const d = new Date(m.created_at || m.date);
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const busiestDay = Object.entries(dayCounts).sort(([,a], [,b]) => b - a)[0];

    return { thisWeek: thisWeek.length, total: meetings.length, typeCounts, topPeople, openActions: openActions.length, completedCount, busiestDay, allActions };
  };

  const toggleSection = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  const toggleComplete = (id) => {
    const updated = { ...completedItems, [id]: !completedItems[id] };
    setCompletedItems(updated);
    saveState(updated, null);
  };
  const copyToClipboard = (text, id) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredMeetings = meetings.filter(m => {
    const title = (m.title || m.name || '').toLowerCase();
    const summary = (meetingDetails[m.id || m._id]?.summary_text || '').toLowerCase();
    const matchesSearch = title.includes(searchQuery.toLowerCase()) || summary.includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || detectMeetingType(m.title || m.name) === typeFilter;
    return matchesSearch && matchesType;
  });

  const exportActions = () => {
    const allActions = getAllActions();
    const open = allActions.filter(a => !completedItems[a.id]);
    let md = `# Open Action Items\n_Exported ${new Date().toLocaleDateString()}_\n\n`;
    let currentMeeting = '';
    open.forEach(a => {
      if (a.meetingTitle !== currentMeeting) {
        currentMeeting = a.meetingTitle;
        md += `\n## ${a.meetingTitle} (${formatShortDate(a.meetingDate)})\n`;
      }
      md += `- [ ] **${a.task}** — ${a.owner}\n`;
    });
    navigator.clipboard.writeText(md);
    setCopiedId('export');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportMeetingSummary = () => {
    if (!meetingDetail) return;
    const title = meetingDetail.title || selectedMeeting?.title || 'Meeting';
    const summary = meetingDetail.summary_markdown || meetingDetail.summary_text || '';
    const md = `# ${title}\n_${formatDate(meetingDetail.created_at)}_\n\n${summary}`;
    navigator.clipboard.writeText(md);
    setCopiedId('export-meeting');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const ActionItemCard = ({ item, showMeeting }) => (
    <div className={`pb-3 border-b border-slate-700 last:border-b-0 p-3 rounded hover:bg-slate-750 transition ${completedItems[item.id] ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button onClick={() => toggleComplete(item.id)} className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${completedItems[item.id] ? 'bg-green-600 border-green-600' : 'border-slate-600'}`}>
          {completedItems[item.id] && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1">
          <p className={`font-medium text-white ${completedItems[item.id] ? 'line-through' : ''}`}>{item.task}</p>
          <div className="flex gap-3 text-xs text-slate-400 mt-1 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">{item.owner}</span>
            {showMeeting && <span className="text-slate-500">{item.meetingTitle}</span>}
            {showMeeting && <span className="text-slate-600">{formatShortDate(item.meetingDate)}</span>}
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

  const renderMarkdown = (md) => {
    if (!md) return null;
    return md.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-white mt-6 mb-2">{line.slice(4)}</h3>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-white mt-8 mb-3">{line.slice(3)}</h2>;
      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-white mt-8 mb-3">{line.slice(2)}</h1>;
      if (line.startsWith('- [ ] ')) return <div key={i} className="flex items-start gap-2 ml-4 my-1"><span className="text-slate-500 mt-0.5">&#9744;</span><span className="text-slate-300">{line.slice(6)}</span></div>;
      if (line.startsWith('- [x] ')) return <div key={i} className="flex items-start gap-2 ml-4 my-1"><span className="text-green-400 mt-0.5">&#9745;</span><span className="text-slate-400 line-through">{line.slice(6)}</span></div>;
      if (line.match(/^[-*] /)) return <div key={i} className="flex items-start gap-2 ml-4 my-1"><span className="text-slate-500">&bull;</span><span className="text-slate-300">{line.slice(2)}</span></div>;
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

  // NAV BAR
  const NavBar = () => (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Granola Dashboard</h1>
        {lastRefresh && <p className="text-xs text-slate-500 mt-1">Auto-refreshes every 15 min &middot; Last: {lastRefresh.toLocaleTimeString()}</p>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => { setView('meetings'); setSelectedMeeting(null); setMeetingDetail(null); }} className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${view === 'meetings' && !selectedMeeting ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
          <FileText className="w-4 h-4" /> Meetings
        </button>
        <button onClick={() => { setView('actions'); setSelectedMeeting(null); setMeetingDetail(null); }} className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${view === 'actions' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
          <CheckSquare className="w-4 h-4" /> My Actions
        </button>
        <button onClick={fetchMeetings} disabled={loading} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={() => setView('settings')} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ANALYTICS CARDS
  const AnalyticsCards = () => {
    const stats = getAnalytics();
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Clock className="w-4 h-4" /> This Week
          </div>
          <p className="text-3xl font-bold text-white">{stats.thisWeek}</p>
          <p className="text-xs text-slate-500">{stats.total} total meetings</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <CheckSquare className="w-4 h-4" /> Open Actions
          </div>
          <p className="text-3xl font-bold text-orange-400">{stats.openActions}</p>
          <p className="text-xs text-slate-500">{stats.completedCount} completed</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Users className="w-4 h-4" /> Top Collaborator
          </div>
          <p className="text-lg font-bold text-white truncate">{stats.topPeople[0]?.[0] || 'N/A'}</p>
          <p className="text-xs text-slate-500">{stats.topPeople[0]?.[1] || 0} meetings together</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <BarChart3 className="w-4 h-4" /> Busiest Day
          </div>
          <p className="text-3xl font-bold text-cyan-400">{stats.busiestDay?.[0] || 'N/A'}</p>
          <p className="text-xs text-slate-500">{stats.busiestDay?.[1] || 0} meetings</p>
        </div>
      </div>
    );
  };

  // SETTINGS VIEW
  if (view === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-5xl mx-auto">
          <NavBar />
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 space-y-6">
              <h2 className="text-2xl font-bold text-white">Settings</h2>
              <div className="space-y-2">
                <button onClick={() => { setCompletedItems({}); setMeetingDetails({}); localStorage.clear(); }} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Clear All Cached Data
                </button>
                <button onClick={() => saveState()} className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Save State
                </button>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Cached Meetings</h3>
                <p className="text-slate-400 text-sm">{Object.keys(meetingDetails).length} of {meetings.length} meeting details loaded</p>
                <button onClick={loadAllMeetingDetails} disabled={loadingActions} className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50">
                  {loadingActions ? `Loading ${loadProgress.current}/${loadProgress.total}...` : 'Load All Meeting Details'}
                </button>
                <p className="text-xs text-slate-500 mt-1">Required for full action item tracking across all meetings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIONS VIEW
  if (view === 'actions') {
    const allActions = getAllActions();
    const owners = [...new Set(allActions.map(a => a.owner))].sort();
    const filtered = allActions.filter(a => {
      if (actionOwnerFilter !== 'all' && a.owner !== actionOwnerFilter) return false;
      return true;
    });
    const open = filtered.filter(a => !completedItems[a.id]);
    const completed = filtered.filter(a => completedItems[a.id]);
    const loadedCount = Object.keys(meetingDetails).length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-5xl mx-auto">
          <NavBar />
          <AnalyticsCards />

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">All Action Items</h2>
            <div className="flex gap-2">
              <button onClick={exportActions} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition flex items-center gap-2 text-sm">
                {copiedId === 'export' ? <><Check className="w-4 h-4 text-green-400" /> Copied!</> : <><Download className="w-4 h-4" /> Export Markdown</>}
              </button>
            </div>
          </div>

          {loadedCount < meetings.length && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6 flex items-center justify-between">
              <p className="text-blue-300 text-sm">{loadedCount} of {meetings.length} meetings loaded. Load all for complete action tracking.</p>
              <button onClick={loadAllMeetingDetails} disabled={loadingActions} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition disabled:opacity-50">
                {loadingActions ? `Loading ${loadProgress.current}/${loadProgress.total}...` : 'Load All'}
              </button>
            </div>
          )}

          <div className="flex gap-2 mb-6 flex-wrap">
            <button onClick={() => setActionOwnerFilter('all')} className={`px-3 py-1 rounded-lg text-sm font-medium transition ${actionOwnerFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>All</button>
            {owners.map(owner => (
              <button key={owner} onClick={() => setActionOwnerFilter(owner)} className={`px-3 py-1 rounded-lg text-sm font-medium transition ${actionOwnerFilter === owner ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{owner}</button>
            ))}
          </div>

          <div className="space-y-6">
            {open.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Open ({open.length})</h3>
                <div className="space-y-2">
                  {open.map(item => <ActionItemCard key={item.id} item={item} showMeeting />)}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <button onClick={() => toggleSection('completedActions')} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-750 transition">
                  <h3 className="text-lg font-semibold text-white">Completed ({completed.length})</h3>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition ${expandedSections.completedActions ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.completedActions && (
                  <div className="px-6 py-4 border-t border-slate-700 space-y-2">
                    {completed.map(item => <ActionItemCard key={item.id} item={item} showMeeting />)}
                  </div>
                )}
              </div>
            )}

            {allActions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500">No action items found. Click "Load All" above to scan all meetings.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MEETING DETAIL VIEW
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
          <NavBar />

          <button onClick={() => { setSelectedMeeting(null); setMeetingDetail(null); }} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition">&larr; All Meetings</button>

          <div className="border-b border-slate-700 pb-6 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.border} border ${style.text}`}>{style.label}</span>
              <span className="text-slate-500 text-sm">{formatDate(createdAt)}</span>
              {webUrl && <a href={webUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">Open in Granola</a>}
              <button onClick={exportMeetingSummary} className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition">
                {copiedId === 'export-meeting' ? 'Copied!' : 'Copy Summary'}
              </button>
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

  // MAIN MEETINGS LIST
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <NavBar />
        <AnalyticsCards />

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Search meetings and summaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', '1on1', 'status', 'meeting', 'planning', 'brainstorm', 'sales-call'].map(type => {
            const style = type === 'all' ? null : getMeetingTypeStyle(type);
            return (
              <button key={type} onClick={() => setTypeFilter(type)} className={`px-3 py-1 rounded-lg text-sm font-medium transition ${typeFilter === type ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                {type === 'all' ? `All (${meetings.length})` : `${style?.label || type} (${meetings.filter(m => detectMeetingType(m.title || m.name) === type).length})`}
              </button>
            );
          })}
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
            const participants = meeting.attendees || meeting.participants || [];
            const hasDetail = !!meetingDetails[meeting.id || meeting._id];

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
                      {hasDetail && <span className="text-xs text-green-500/60">cached</span>}
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
