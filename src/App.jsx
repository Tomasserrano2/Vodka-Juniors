import React, { useState, useEffect, useRef } from 'react';
import { Users, LayoutTemplate, Shield, Plus, X, GripVertical, CheckCircle, XCircle, Search, Download, History, Play, Square, Save, Activity, Clock, Trophy, Trash2, Edit2, Check } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyAI1tfjgtlLqfVEfSnyhUYWIEcz_yjlTCE",
  authDomain: "vodka-juniors.firebaseapp.com",
  projectId: "vodka-juniors",
  storageBucket: "vodka-juniors.firebasestorage.app",
  messagingSenderId: "836406435815",
  appId: "1:836406435815:web:0b10e00b5cc635a8d82742"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fallback data just in case Firebase is totally empty
const INITIAL_PLAYERS = [
  { id: '1', name: 'Alex (GK)', positions: 'GK', attendance: 12, refereeDuty: 1, goals: 0, assists: 1, performance: 8.5, available: true, mvps: 0 },
  { id: '2', name: 'Marcus (CB)', positions: 'CB', attendance: 10, refereeDuty: 0, goals: 1, assists: 0, performance: 7.2, available: true, mvps: 0 }
];

const FORMATIONS = {
  '4-4-2': [1, 4, 4, 2],
  '4-3-3': [1, 4, 3, 3],
  '3-5-2': [1, 3, 5, 2],
  '4-2-3-1': [1, 4, 2, 3, 1],
  '5-3-2': [1, 5, 3, 2]
};

const FORMATION_LABELS = {
  '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
  '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'LCM', 'CM', 'RCM', 'LW', 'ST', 'RW'],
  '3-5-2': ['GK', 'LCB', 'CB', 'RCB', 'LWB', 'CM', 'CDM', 'CM', 'RWB', 'ST', 'ST'],
  '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'LAM', 'CAM', 'RAM', 'ST'],
  '5-3-2': ['GK', 'LWB', 'LCB', 'CB', 'RCB', 'RWB', 'LCM', 'CM', 'RCM', 'ST', 'ST']
};

const SyncInput = ({ value, onSave, type = "text", className, step, onClick, placeholder }) => {
  const [localVal, setLocalVal] = useState(value);
  useEffect(() => { setLocalVal(value); }, [value]);

  const handleBlur = () => {
    let finalVal = localVal;
    if (type === 'number') finalVal = parseFloat(localVal) || 0;
    onSave(finalVal);
  };

  return (
    <input 
      type={type} 
      step={step}
      value={localVal} 
      onChange={(e) => setLocalVal(e.target.value)} 
      onBlur={handleBlur}
      onClick={onClick}
      placeholder={placeholder}
      className={className} 
    />
  );
};

export default function VodkaJuniorsApp() {
  const [activeTab, setActiveTab] = useState('matchday');
  
  const [players, setPlayers] = useState([]);
  const [pastMatches, setPastMatches] = useState([]);
  
  const [formation, setFormation] = useState('4-3-3');
  const [customFormationStr, setCustomFormationStr] = useState('1-4-2-3');
  const [pitchState, setPitchState] = useState({});
  const [customLabels, setCustomLabels] = useState({});
  const [matchStatus, setMatchStatus] = useState('pre'); 
  const [matchEvents, setMatchEvents] = useState([]); 
  const [matchRatings, setMatchRatings] = useState({}); 
  const [matchLeague, setMatchLeague] = useState('');
  const [matchMvp, setMatchMvp] = useState('');
  const [matchOpponent, setMatchOpponent] = useState('');
  const [matchScoreVJ, setMatchScoreVJ] = useState('');
  const [matchScoreOpp, setMatchScoreOpp] = useState('');

  const [benchSearchQuery, setBenchSearchQuery] = useState('');
  const [activeSlotSearch, setActiveSlotSearch] = useState(null);
  const [slotSearchQuery, setSlotSearchQuery] = useState('');
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbSortOption, setDbSortOption] = useState('default');
  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState(null);
  const [actionModal, setActionModal] = useState(null); 
  const [editingHistoryId, setEditingHistoryId] = useState(null); // For inline history editing
  
  const exportRef = useRef(null); // Moved ref up to wrap both bench and pitch

  // --- FIREBASE CONNECTIONS ---

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "players"), (snapshot) => {
      if (snapshot.empty) {
        INITIAL_PLAYERS.forEach(async (player) => {
          await setDoc(doc(db, "players", player.id), player);
        });
      } else {
        const loadedPlayers = [];
        snapshot.forEach((doc) => {
          loadedPlayers.push({ id: doc.id, ...doc.data() });
        });
        setPlayers(loadedPlayers);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "pastMatches"), (snapshot) => {
      const matches = [];
      snapshot.forEach(doc => matches.push({ id: doc.id, ...doc.data() }));
      matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).reverse();
      setPastMatches(matches);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "match", "currentLineup"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPitchState(data.pitchState || {});
        setFormation(data.formation || '4-3-3');
        setCustomFormationStr(data.customFormationStr || '1-4-2-3');
        setCustomLabels(data.customLabels || {});
        setMatchStatus(data.status || 'pre');
        setMatchEvents(data.events || []);
        setMatchRatings(data.ratings || {});
        setMatchLeague(data.league || '');
        setMatchMvp(data.mvp || '');
        setMatchOpponent(data.opponent || '');
        setMatchScoreVJ(data.scoreVJ || '');
        setMatchScoreOpp(data.scoreOpp || '');
      } else {
        setDoc(doc(db, "match", "currentLineup"), {
          pitchState: {}, formation: '4-3-3', customFormationStr: '1-4-2-3', customLabels: {}, status: 'pre', events: [], ratings: {}, league: '', mvp: '', opponent: '', scoreVJ: '', scoreOpp: ''
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // --- ACTIONS (Write to Cloud) ---

  const handleFormationChange = async (e) => {
    const newForm = e.target.value;
    await setDoc(doc(db, "match", "currentLineup"), { formation: newForm, pitchState: {}, customLabels: {} }, { merge: true });
  };

  const handleCustomFormationBlur = async () => {
    await setDoc(doc(db, "match", "currentLineup"), { customFormationStr, pitchState: {}, customLabels: {} }, { merge: true });
  };

  const updateCustomLabel = async (slotIndex, newLabel) => {
    const updatedLabels = { ...customLabels, [slotIndex]: newLabel.toUpperCase() };
    await setDoc(doc(db, "match", "currentLineup"), { customLabels: updatedLabels }, { merge: true });
  };

  const updateMatchField = async (field, value) => {
    await setDoc(doc(db, "match", "currentLineup"), { [field]: value }, { merge: true });
  };

  const handleDragStart = (e, playerId) => {
    e.dataTransfer.setData('playerId', playerId);
  };

  const handleDropOnPitch = async (e, slotIndex) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('playerId');
    
    if (matchStatus === 'live') {
      const oldPlayerId = pitchState[slotIndex];
      if (oldPlayerId && oldPlayerId !== playerId) {
        setActionModal({ type: 'sub', playerIn: playerId, playerOut: oldPlayerId, slotIndex });
      }
      return;
    }

    const newState = { ...pitchState };
    Object.keys(newState).forEach(key => {
      if (newState[key] === playerId) newState[key] = null;
    });
    newState[slotIndex] = playerId;
    await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true });
  };

  const handleDropOnBench = async (e) => {
    e.preventDefault();
    if (matchStatus === 'live') return; 
    const playerId = e.dataTransfer.getData('playerId');
    
    const newState = { ...pitchState };
    Object.keys(newState).forEach(key => {
      if (newState[key] === playerId) delete newState[key];
    });
    await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true });
  };

  const handleQuickAssign = async (slotIndex, playerId) => {
    if (matchStatus === 'live') {
        const oldPlayerId = pitchState[slotIndex];
        if (oldPlayerId && oldPlayerId !== playerId) {
          setActionModal({ type: 'sub', playerIn: playerId, playerOut: oldPlayerId, slotIndex });
        }
        setActiveSlotSearch(null);
        return;
    }

    const newState = { ...pitchState };
    Object.keys(newState).forEach(key => {
      if (newState[key] === playerId) newState[key] = null;
    });
    newState[slotIndex] = playerId;

    await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true });
    setActiveSlotSearch(null);
    setSlotSearchQuery('');
    setSelectedPlayerDetails(null);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleSaveImage = async () => {
    if (exportRef.current) {
      try {
        if (!window.html2canvas) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        // Take screenshot of the entire container (Bench + Pitch)
        const canvas = await window.html2canvas(exportRef.current, { backgroundColor: '#020617', scale: 2 });
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `VodkaJuniors_Squad.png`;
        link.click();
      } catch (err) { console.error("Error saving image:", err); }
    }
  };

  // --- MATCH ENGINE FUNCTIONS ---

  const changeMatchStatus = async (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'live') {
      updates.events = [];
      updates.ratings = {};
      updates.league = '';
      updates.mvp = '';
      updates.opponent = '';
      updates.scoreVJ = '';
      updates.scoreOpp = '';
    }
    await setDoc(doc(db, "match", "currentLineup"), updates, { merge: true });
  };

  const processActionModal = async (minute) => {
    if (!actionModal) return;
    const newEvents = [...matchEvents, { id: Date.now().toString(), type: actionModal.type, minute: parseInt(minute) || 0 }];
    
    if (actionModal.type === 'sub') {
      newEvents[newEvents.length - 1].playerIn = actionModal.playerIn;
      newEvents[newEvents.length - 1].playerOut = actionModal.playerOut;
      
      const newState = { ...pitchState };
      newState[actionModal.slotIndex] = actionModal.playerIn;
      await setDoc(doc(db, "match", "currentLineup"), { events: newEvents, pitchState: newState }, { merge: true });
    } else {
      newEvents[newEvents.length - 1].playerId = actionModal.playerId;
      // Auto-increment Vodka Juniors score if it's a goal and score fields are visible
      let newScoreVJ = matchScoreVJ;
      if (actionModal.type === 'goal') {
        newScoreVJ = (parseInt(matchScoreVJ) || 0) + 1;
      }
      await setDoc(doc(db, "match", "currentLineup"), { events: newEvents, scoreVJ: newScoreVJ }, { merge: true });
    }
    setActionModal(null);
  };

  const updateMatchRating = async (playerId, rating) => {
    const newRatings = { ...matchRatings, [playerId]: parseFloat(rating) || 0 };
    await setDoc(doc(db, "match", "currentLineup"), { ratings: newRatings }, { merge: true });
  };

  const finishAndSaveMatch = async () => {
    const playersInvolved = new Set([
        ...Object.values(pitchState),
        ...matchEvents.filter(e => e.type === 'sub').map(e => e.playerOut)
    ].filter(Boolean));

    const newMatch = {
      date: new Date().toISOString(),
      formation,
      pitchState,
      events: matchEvents,
      ratings: matchRatings,
      participated: Array.from(playersInvolved),
      league: matchLeague,
      mvp: matchMvp,
      opponent: matchOpponent || 'Unknown Opponent',
      scoreVJ: matchScoreVJ || 0,
      scoreOpp: matchScoreOpp || 0
    };
    
    await addDoc(collection(db, "pastMatches"), newMatch);
    
    // Reset back to pre-match
    await setDoc(doc(db, "match", "currentLineup"), { status: 'pre', events: [], ratings: {}, league: '', mvp: '', opponent: '', scoreVJ: '', scoreOpp: '' }, { merge: true });
    setActiveTab('history');
  };

  const deletePastMatch = async (matchId) => {
    if(window.confirm('Are you sure you want to delete this match? This will recalculate all player averages and goals instantly.')) {
      await deleteDoc(doc(db, "pastMatches", matchId));
    }
  };

  // --- STATS ENGINE ---
  const getCalculatedStats = (player) => {
    if (!player) return { goals: 0, assists: 0, avg: 0, mvps: 0 };
    let goals = player.goals || 0; 
    let assists = player.assists || 0; 
    let mvps = player.mvps || 0;
    let totalRating = (player.performance || 0) * (player.attendance || 0); 
    let ratingCount = player.attendance || 0;

    pastMatches.forEach(m => {
       if (m.mvp === player.id) mvps++;
       (m.events || []).forEach(e => {
           if (e.playerId === player.id) {
               if (e.type === 'goal') goals++;
               if (e.type === 'assist') assists++;
           }
       });
       if (m.ratings && m.ratings[player.id]) {
           totalRating += Number(m.ratings[player.id]);
           ratingCount++;
       }
    });

    const avg = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : (player.performance || 0);
    return { goals, assists, avg, mvps };
  };

  const getDisplayName = (player) => {
    if (!player) return '';
    const firstName = player.name.split(' ')[0];
    const duplicates = players.filter(p => p.name.split(' ')[0] === firstName);
    if (duplicates.length > 1) return player.name.replace(/\s*\(.*?\)\s*/g, ''); 
    return firstName;
  };

  // --- UI RENDER LOGIC ---

  const renderActionModal = () => {
    if (!actionModal) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl w-full max-w-sm animate-in zoom-in-95">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-400" />
            {actionModal.type === 'sub' ? 'Substitution Minute' : `Log ${actionModal.type.charAt(0).toUpperCase() + actionModal.type.slice(1)}`}
          </h3>
          {actionModal.type === 'sub' && (
             <p className="text-sm text-slate-400 mb-4">
               Subbing <strong className="text-white">{players.find(p => p.id === actionModal.playerIn)?.name}</strong> ON for <strong className="text-white">{players.find(p => p.id === actionModal.playerOut)?.name}</strong>
             </p>
          )}
          <input 
            type="number" 
            id="eventMinuteInput" 
            placeholder="Minute (e.g. 45)"
            className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:border-indigo-500 focus:outline-none mb-6 text-lg text-center" 
            autoFocus 
            onKeyDown={(e) => e.key === 'Enter' && processActionModal(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
             <button onClick={() => setActionModal(null)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
             <button 
                onClick={() => processActionModal(document.getElementById('eventMinuteInput').value)} 
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
             >
               Save Event
             </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    let dbPlayers = [...players].filter(p => 
      p.name.toLowerCase().includes(dbSearchQuery.toLowerCase()) || 
      p.positions.toLowerCase().includes(dbSearchQuery.toLowerCase())
    );

    if (dbSortOption === 'name') {
      dbPlayers.sort((a, b) => a.name.localeCompare(b.name));
    } else if (dbSortOption === 'performance') {
      dbPlayers.sort((a, b) => getCalculatedStats(b).avg - getCalculatedStats(a).avg);
    } else {
      dbPlayers.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    }

    return (
      <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-700 w-full overflow-x-auto">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 shrink-0">
            <Users className="w-5 h-5 text-indigo-400" />
            Squad Database
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search players..."
                value={dbSearchQuery}
                onChange={(e) => setDbSearchQuery(e.target.value)}
                className="w-full bg-slate-800 text-sm text-white border border-slate-600 rounded-md py-1.5 pl-9 pr-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
            
            <select 
              value={dbSortOption}
              onChange={(e) => setDbSortOption(e.target.value)}
              className="w-full sm:w-auto bg-slate-800 text-sm text-white border border-slate-600 rounded-md py-1.5 px-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="default">Sort: Added (Newest Last)</option>
              <option value="name">Sort: A-Z</option>
              <option value="performance">Sort: Avg Rating</option>
            </select>

            <button 
              onClick={() => {
                const newId = Date.now().toString();
                setDoc(doc(db, "players", newId), {
                  id: newId, name: 'New Player', positions: '', attendance: 0, refereeDuty: 0, goals: 0, assists: 0, performance: 0, available: true, mvps: 0
                });
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-800 text-slate-300 text-sm border-b border-slate-700">
              <th className="p-3 font-semibold">Matchday</th>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Position</th>
              <th className="p-3 font-semibold text-center" title="Manual">Att</th>
              <th className="p-3 font-semibold text-center" title="Manual">Ref</th>
              <th className="p-3 font-semibold text-center text-amber-400" title="Auto-Calculated">MVP 🏆</th>
              <th className="p-3 font-semibold text-center text-indigo-300" title="Auto-Calculated">G 🔒</th>
              <th className="p-3 font-semibold text-center text-indigo-300" title="Auto-Calculated">A 🔒</th>
              <th className="p-3 font-semibold text-center text-emerald-400" title="Auto-Calculated">Avg 🔒</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 text-slate-200">
            {dbPlayers.map(player => {
              const stats = getCalculatedStats(player);
              return (
                <tr key={player.id} className="hover:bg-slate-750 transition-colors group">
                  <td className="p-3">
                    <button 
                      onClick={async () => {
                        const newAvail = !player.available;
                        await setDoc(doc(db, "players", player.id), { available: newAvail }, { merge: true });
                        if (!newAvail && matchStatus === 'pre') {
                          const newState = { ...pitchState };
                          Object.keys(newState).forEach(k => { if (newState[k] === player.id) delete newState[k]; });
                          await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true });
                        }
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${player.available ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}
                    >
                      {player.available ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {player.available ? 'In' : 'Out'}
                    </button>
                  </td>
                  <td className="p-3">
                    <SyncInput value={player.name} onSave={(val) => setDoc(doc(db, "players", player.id), { name: val }, { merge: true })} className="bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none w-full" />
                  </td>
                  <td className="p-3">
                    <SyncInput value={player.positions} onSave={(val) => setDoc(doc(db, "players", player.id), { positions: val }, { merge: true })} className="bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none w-24 text-sm" />
                  </td>
                  <td className="p-3 text-center">
                    <SyncInput type="number" value={player.attendance} onSave={(val) => setDoc(doc(db, "players", player.id), { attendance: val }, { merge: true })} className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center" />
                  </td>
                  <td className="p-3 text-center">
                    <SyncInput type="number" value={player.refereeDuty} onSave={(val) => setDoc(doc(db, "players", player.id), { refereeDuty: val }, { merge: true })} className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center" />
                  </td>
                  <td className="p-3 text-center text-amber-400 font-bold">{stats.mvps}</td>
                  <td className="p-3 text-center text-indigo-300 font-medium">{stats.goals}</td>
                  <td className="p-3 text-center text-indigo-300 font-medium">{stats.assists}</td>
                  <td className="p-3 text-center text-emerald-400 font-bold">{stats.avg}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="space-y-4">
      {pastMatches.map((match, i) => {
        const isEditing = editingHistoryId === match.id;
        
        return (
          <div key={match.id} className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-5 relative group">
            
            {/* Quick Actions (Edit/Delete) */}
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEditing ? (
                <button onClick={() => setEditingHistoryId(null)} className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/40" title="Done Editing"><Check className="w-4 h-4" /></button>
              ) : (
                <button onClick={() => setEditingHistoryId(match.id)} className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white" title="Edit Match Details"><Edit2 className="w-4 h-4" /></button>
              )}
              <button onClick={() => deletePastMatch(match.id)} className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/30" title="Delete Match"><Trash2 className="w-4 h-4" /></button>
            </div>

            <div className="flex flex-col mb-4 border-b border-slate-700 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-5 h-5 text-indigo-400" />
                {isEditing ? (
                  <SyncInput 
                    value={match.league} 
                    placeholder="League / Competition"
                    onSave={(val) => setDoc(doc(db, "pastMatches", match.id), { league: val }, { merge: true })}
                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">{match.league || 'Match'}</h3>
                )}
                <span className="bg-indigo-600/20 text-indigo-400 px-3 py-0.5 rounded-full text-xs font-bold ml-2">
                  {match.formation}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                {isEditing ? (
                  <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700">
                    <span className="text-white font-bold">Vodka Juniors</span>
                    <SyncInput type="number" value={match.scoreVJ} onSave={(val) => setDoc(doc(db, "pastMatches", match.id), { scoreVJ: val }, { merge: true })} className="w-12 bg-slate-800 border border-slate-600 rounded text-center text-white" />
                    <span className="text-slate-500">-</span>
                    <SyncInput type="number" value={match.scoreOpp} onSave={(val) => setDoc(doc(db, "pastMatches", match.id), { scoreOpp: val }, { merge: true })} className="w-12 bg-slate-800 border border-slate-600 rounded text-center text-white" />
                    <SyncInput value={match.opponent} placeholder="Opponent Name" onSave={(val) => setDoc(doc(db, "pastMatches", match.id), { opponent: val }, { merge: true })} className="bg-slate-800 border border-slate-600 rounded px-2 text-white" />
                  </div>
                ) : (
                  <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                    <span>Vodka Juniors</span>
                    <span className="text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">{match.scoreVJ || 0} - {match.scoreOpp || 0}</span>
                    <span className="text-slate-400">{match.opponent || 'Opponent'}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">{new Date(match.date).toLocaleDateString()}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <h4 className="text-slate-400 text-sm font-semibold mb-2">Match Events</h4>
                {match.events && match.events.length > 0 ? (
                  <ul className="space-y-2">
                    {match.events.sort((a,b) => a.minute - b.minute).map((ev, j) => (
                      <li key={j} className="text-sm flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-700/50">
                        <span className="text-indigo-400 font-mono w-10">{ev.minute}'</span>
                        {ev.type === 'goal' && <span>⚽ <strong className="text-emerald-400">{players.find(p=>p.id===ev.playerId)?.name || 'Unknown'}</strong> scored!</span>}
                        {ev.type === 'assist' && <span>👟 <strong className="text-indigo-300">{players.find(p=>p.id===ev.playerId)?.name || 'Unknown'}</strong> assisted.</span>}
                        {ev.type === 'sub' && <span>🔄 <strong className="text-emerald-400">{players.find(p=>p.id===ev.playerIn)?.name || 'In'}</strong> ON, <span className="text-slate-500">{players.find(p=>p.id===ev.playerOut)?.name || 'Out'}</span> OFF</span>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-slate-500 italic">No events recorded.</p>}

                {match.mvp && !isEditing && (
                  <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3 w-fit">
                    <Trophy className="w-6 h-6 text-amber-500" />
                    <div>
                      <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider">Match MVP</p>
                      <p className="text-white font-bold">{players.find(p => p.id === match.mvp)?.name || 'Unknown Player'}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="text-slate-400 text-sm font-semibold mb-2">Player Ratings</h4>
                <div className="grid grid-cols-2 gap-2">
                  {match.participated?.map(pid => {
                     const p = players.find(p => p.id === pid);
                     if (!p) return null;
                     return (
                       <div key={pid} className="flex justify-between items-center text-sm bg-slate-900/50 p-2 rounded border border-slate-700/50">
                         <span className="text-slate-300 truncate pr-2">{getDisplayName(p)}</span>
                         {isEditing ? (
                            <SyncInput 
                              type="number" 
                              step="0.1" 
                              value={match.ratings[pid] || 0} 
                              onSave={(val) => {
                                const newRatings = { ...match.ratings, [pid]: parseFloat(val) || 0 };
                                setDoc(doc(db, "pastMatches", match.id), { ratings: newRatings }, { merge: true });
                              }} 
                              className="w-14 bg-slate-800 border border-slate-600 text-emerald-400 font-bold rounded p-1 text-center focus:outline-none" 
                            />
                         ) : (
                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">{match.ratings[pid] || '-'}</span>
                         )}
                       </div>
                     )
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {pastMatches.length === 0 && (
        <div className="bg-slate-800 p-10 rounded-xl border border-slate-700 text-center">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-xl text-white font-bold">No Match History</h3>
          <p className="text-slate-400 mt-2">Finish a live match to see it saved here.</p>
        </div>
      )}
    </div>
  );

  const renderPostMatchReview = () => {
    const playersInvolved = Array.from(new Set([
        ...Object.values(pitchState),
        ...matchEvents.filter(e => e.type === 'sub').map(e => e.playerOut)
    ].filter(Boolean)));

    return (
      <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-6 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white mb-2">Post-Match Review</h2>
          <p className="text-slate-400">Rate the players and log match details to update the career stats!</p>
        </div>

        {/* New Opponent & Score Section */}
        <div className="bg-slate-900 rounded-lg p-5 border border-slate-700 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 w-full">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Opponent Name</label>
            <input 
              type="text" 
              placeholder="e.g. FC Bayern" 
              value={matchOpponent}
              onChange={(e) => updateMatchField('opponent', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 text-white rounded p-3 focus:outline-none focus:border-indigo-500 font-bold"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1 block">Vodka Jrs</label>
              <input 
                type="number" 
                value={matchScoreVJ}
                onChange={(e) => updateMatchField('scoreVJ', e.target.value)}
                className="w-20 bg-slate-800 border border-indigo-500/50 text-white rounded p-3 focus:outline-none focus:border-indigo-500 font-black text-2xl text-center"
              />
            </div>
            <span className="text-2xl text-slate-500 font-black mt-4">-</span>
            <div className="text-center">
              <label className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1 block">Opponent</label>
              <input 
                type="number" 
                value={matchScoreOpp}
                onChange={(e) => updateMatchField('scoreOpp', e.target.value)}
                className="w-20 bg-slate-800 border border-rose-500/50 text-white rounded p-3 focus:outline-none focus:border-rose-500 font-black text-2xl text-center"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider text-slate-400">Competition / League</h3>
            <input 
              type="text" 
              placeholder="e.g. Sunday League, Friendly..." 
              value={matchLeague}
              onChange={(e) => updateMatchField('league', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-amber-500/30 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10"><Trophy className="w-24 h-24 text-amber-500" /></div>
            <h3 className="text-amber-500 font-bold mb-3 text-sm uppercase tracking-wider flex items-center gap-2 relative z-10"><Trophy className="w-4 h-4"/> Select MVP</h3>
            <select 
              value={matchMvp}
              onChange={(e) => updateMatchField('mvp', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 focus:outline-none focus:border-amber-500 relative z-10 appearance-none"
            >
              <option value="">No MVP Selected...</option>
              {playersInvolved.map(pid => {
                const p = players.find(player => player.id === pid);
                if (!p) return null;
                return <option key={pid} value={pid}>{p.name}</option>;
              })}
            </select>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-4 mb-6">
          <h3 className="text-indigo-400 font-bold mb-3 border-b border-slate-700 pb-2">Today's Events</h3>
          {matchEvents.length === 0 ? <p className="text-sm text-slate-500">No goals or subs logged.</p> : (
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {matchEvents.sort((a,b) => a.minute - b.minute).map((ev, j) => (
                <div key={j} className="text-sm flex items-center gap-2">
                  <span className="text-slate-500 font-mono w-10">{ev.minute}'</span>
                  {ev.type === 'goal' && <span>⚽ {players.find(p=>p.id===ev.playerId)?.name}</span>}
                  {ev.type === 'assist' && <span>👟 {players.find(p=>p.id===ev.playerId)?.name}</span>}
                  {ev.type === 'sub' && <span>🔄 {players.find(p=>p.id===ev.playerIn)?.name} in, {players.find(p=>p.id===ev.playerOut)?.name} out</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <h3 className="text-white font-bold mb-4">Player Ratings (1-10)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {playersInvolved.map(pid => {
            const player = players.find(p => p.id === pid);
            if (!player) return null;
            return (
              <div key={pid} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                <span className="text-slate-300 font-medium">{player.name}</span>
                <input 
                  type="number" 
                  step="0.1" 
                  max="10"
                  min="1"
                  placeholder="-"
                  value={matchRatings[pid] || ''}
                  onChange={(e) => updateMatchRating(pid, e.target.value)}
                  className="w-16 bg-slate-800 border border-slate-600 text-emerald-400 font-bold rounded p-1.5 text-center focus:outline-none focus:border-emerald-500"
                />
              </div>
            );
          })}
        </div>

        <button 
          onClick={finishAndSaveMatch}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
        >
          <Save className="w-5 h-5" /> Save Match to History
        </button>
      </div>
    );
  };

  const renderMatchday = () => {
    if (matchStatus === 'review') return renderPostMatchReview();

    const availablePlayers = players.filter(p => p.available);
    const pitchPlayerIds = Object.values(pitchState).filter(Boolean);
    const benchPlayers = availablePlayers.filter(p => !pitchPlayerIds.includes(p.id));

    const filteredBench = benchPlayers.filter(p => 
      p.name.toLowerCase().includes(benchSearchQuery.toLowerCase()) || 
      p.positions.toLowerCase().includes(benchSearchQuery.toLowerCase())
    );

    const layout = formation === 'Custom' 
      ? customFormationStr.split(/[-,\s]+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0)
      : FORMATIONS[formation] || [1, 4, 3, 3];
      
    let globalSlotIndex = 0;

    return (
      // Added exportRef here so the camera captures both the Bench and the Pitch
      <div ref={exportRef} className="flex flex-col lg:flex-row gap-6 bg-slate-950 p-2 sm:p-0 rounded-xl">
        {/* Bench Sidebar */}
        <div 
          className={`lg:w-1/4 w-full rounded-xl shadow-xl border flex flex-col h-[400px] lg:h-[800px] transition-colors ${matchStatus === 'live' ? 'bg-indigo-900/40 border-indigo-500/50' : 'bg-slate-800 border-slate-700'}`}
          onDrop={handleDropOnBench}
          onDragOver={handleDragOver}
        >
          <div className={`p-4 border-b rounded-t-xl ${matchStatus === 'live' ? 'bg-indigo-900/60 border-indigo-500/50' : 'bg-slate-900 border-slate-700'}`}>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className={`w-5 h-5 ${matchStatus === 'live' ? 'text-emerald-400' : 'text-indigo-400'}`} />
              Available Bench
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {matchStatus === 'live' ? 'Drag onto pitch to substitute' : 'Drag players to the pitch'}
            </p>
            
            <div className="mt-3 relative" data-html2canvas-ignore>
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search bench..."
                value={benchSearchQuery}
                onChange={(e) => setBenchSearchQuery(e.target.value)}
                className={`w-full text-sm text-white border rounded-md py-1.5 pl-9 pr-3 focus:outline-none ${matchStatus === 'live' ? 'bg-indigo-950/50 border-indigo-500/50 focus:border-emerald-500' : 'bg-slate-800 border-slate-600 focus:border-indigo-500'}`}
              />
            </div>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {filteredBench.length === 0 ? (
              <div className="text-slate-500 text-sm text-center mt-10">
                {benchSearchQuery ? 'No players match your search.' : 'No players on the bench.'}
              </div>
            ) : (
              filteredBench.map(player => (
                <div 
                  key={player.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, player.id)}
                  className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-colors flex items-center shadow-sm ${matchStatus === 'live' ? 'bg-indigo-900/40 border-indigo-500/30 hover:bg-indigo-800/60' : 'bg-slate-700 border-slate-600 hover:bg-slate-650'}`}
                >
                  <GripVertical className="w-4 h-4 text-slate-400 mr-2 shrink-0" data-html2canvas-ignore />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{player.name}</div>
                    <div className="text-xs text-indigo-300 font-semibold truncate">{player.positions}</div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded shrink-0 ml-2 flex flex-col items-end ${matchStatus === 'live' ? 'bg-indigo-950 text-emerald-400' : 'bg-slate-900 text-slate-300'}`}>
                    <span>Avg: {getCalculatedStats(player).avg}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pitch Area */}
        <div className="lg:w-3/4 w-full flex flex-col gap-4">
          
          {/* Match Control Header */}
          <div data-html2canvas-ignore className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl transition-colors ${matchStatus === 'live' ? 'bg-indigo-900/80 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}>
            <div className="flex items-center gap-3">
              {matchStatus === 'live' ? (
                <>
                  <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div>
                  <div className="text-white font-bold text-lg">LIVE MATCH</div>
                </>
              ) : (
                <div className="text-white font-bold">Lineup Builder</div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {matchStatus === 'pre' && (
                <>
                  <button onClick={handleSaveImage} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-md">
                    <Download className="w-4 h-4" /> Export Squad
                  </button>
                  <select 
                    value={formation}
                    onChange={handleFormationChange}
                    className="bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    {Object.keys(FORMATIONS).map(form => <option key={form} value={form}>{form}</option>)}
                    <option value="Custom">Custom...</option>
                  </select>
                  {formation === 'Custom' && (
                    <input type="text" value={customFormationStr} onChange={(e) => setCustomFormationStr(e.target.value)} onBlur={handleCustomFormationBlur} placeholder="1-4-3-3" className="bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-24 text-sm" />
                  )}
                  <button onClick={() => changeMatchStatus('live')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg font-bold transition-colors shadow-md ml-auto sm:ml-0">
                    <Play className="w-4 h-4 fill-current" /> Start Match
                  </button>
                </>
              )}

              {matchStatus === 'live' && (
                <button onClick={() => changeMatchStatus('review')} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 rounded-lg font-bold transition-colors shadow-md w-full sm:w-auto justify-center">
                  <Square className="w-4 h-4 fill-current" /> End Match
                </button>
              )}
            </div>
          </div>

          <div 
            className="relative w-full max-w-2xl mx-auto aspect-[3/4] bg-emerald-700 border-4 border-white shadow-2xl rounded-sm overflow-hidden flex flex-col-reverse justify-between py-8"
            onClick={() => { 
              if (activeSlotSearch !== null) setActiveSlotSearch(null); 
              setSelectedPlayerDetails(null);
            }}
          >
            {/* Pitch Markings */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[15%] border-4 border-t-0 border-white opacity-50 pointer-events-none"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-4 border-t-0 border-white opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40%] h-[15%] border-4 border-b-0 border-white opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[20%] h-[6%] border-4 border-b-0 border-white opacity-50 pointer-events-none"></div>
            <div className="absolute top-1/2 left-0 w-full h-1 bg-white opacity-50 -translate-y-1/2 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 w-[25%] aspect-square border-4 border-white rounded-full opacity-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

            {/* Formation Rows */}
            {layout.map((playerCountInRow, rowIndex) => (
              <div key={rowIndex} className="flex justify-evenly items-center w-full relative z-10 px-4">
                {Array.from({ length: playerCountInRow }).map((_, colIndex) => {
                  const currentSlotIndex = globalSlotIndex++;
                  const assignedPlayerId = pitchState[currentSlotIndex];
                  const assignedPlayer = players.find(p => p.id === assignedPlayerId);
                  
                  const defaultLabel = FORMATION_LABELS[formation] ? FORMATION_LABELS[formation][currentSlotIndex] || 'POS' : 'POS';
                  const currentLabel = customLabels[currentSlotIndex] || defaultLabel;

                  return (
                    <div className="relative flex flex-col items-center" key={currentSlotIndex}>
                      <div 
                        onDrop={(e) => handleDropOnPitch(e, currentSlotIndex)}
                        onDragOver={handleDragOver}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!assignedPlayer) {
                            if (matchStatus === 'pre') {
                              setActiveSlotSearch(activeSlotSearch === currentSlotIndex ? null : currentSlotIndex);
                              setSlotSearchQuery('');
                            }
                            setSelectedPlayerDetails(null);
                          } else {
                            setSelectedPlayerDetails(assignedPlayer);
                            setActiveSlotSearch(null);
                          }
                        }}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shadow-lg z-20
                          ${assignedPlayer ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900/50 border-white/50 border-dashed hover:bg-slate-800/60'}`}
                      >
                        {assignedPlayer ? (
                          <div 
                            draggable={matchStatus === 'pre'} 
                            onDragStart={(e) => matchStatus === 'pre' && handleDragStart(e, assignedPlayer.id)}
                            className="flex flex-col items-center justify-center w-full h-full text-white"
                          >
                            <div className="font-bold text-xs sm:text-sm truncate w-full text-center px-1">
                              {getDisplayName(assignedPlayer)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-white/40 text-xs text-center px-1 flex flex-col items-center">
                            {matchStatus === 'pre' ? <Plus className="w-4 h-4 mb-1" /> : <span className="opacity-50">Empty</span>}
                          </div>
                        )}
                      </div>
                      
                      {matchStatus === 'pre' ? (
                        <SyncInput 
                          value={currentLabel}
                          onSave={(val) => updateCustomLabel(currentSlotIndex, val)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 bg-transparent text-white/80 font-bold text-[10px] sm:text-xs text-center w-16 focus:outline-none focus:bg-slate-800/50 rounded px-1 transition-colors z-20"
                          title="Edit position label"
                        />
                      ) : (
                        <div className="mt-1 text-white/80 font-bold text-[10px] sm:text-xs text-center w-16 z-20 bg-black/30 rounded px-1">{currentLabel}</div>
                      )}

                      {/* Quick Search Popover (Pre-Match Only) */}
                      {activeSlotSearch === currentSlotIndex && matchStatus === 'pre' && (
                        <div className="absolute z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-2 w-48 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={e => e.stopPropagation()} data-html2canvas-ignore>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-300 font-semibold">Assign Player</span>
                            <button onClick={() => setActiveSlotSearch(null)} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
                          </div>
                          <input autoFocus type="text" placeholder="Search bench..." value={slotSearchQuery} onChange={e => setSlotSearchQuery(e.target.value)} className="w-full bg-slate-900 text-white px-2 py-1.5 rounded text-xs border border-slate-700 focus:outline-none focus:border-indigo-500 mb-2"/>
                          <div className="max-h-40 overflow-y-auto flex flex-col gap-1 custom-scrollbar">
                            {benchPlayers.filter(p => p.name.toLowerCase().includes(slotSearchQuery.toLowerCase())).map(p => (
                                <button key={p.id} onClick={() => handleQuickAssign(currentSlotIndex, p.id)} className="text-left text-xs text-slate-200 hover:bg-indigo-600 px-2 py-1.5 rounded flex justify-between items-center">
                                  <span className="truncate">{p.name.replace(/\s*\(.*?\)\s*/g, '')}</span>
                                  <span className="text-[10px] text-indigo-300 ml-1">{p.positions}</span>
                                </button>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          
          {/* Player Details & Action Panel */}
          {selectedPlayerDetails && (
            <div data-html2canvas-ignore className={`mt-2 p-4 rounded-xl border shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-in slide-in-from-bottom-4 relative transition-colors ${matchStatus === 'live' ? 'bg-indigo-900/50 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {selectedPlayerDetails.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedPlayerDetails.name}</h3>
                  <p className="text-indigo-400 text-sm font-semibold">{selectedPlayerDetails.positions}</p>
                </div>
              </div>
              
              {matchStatus === 'live' ? (
                <div className="flex flex-wrap justify-center sm:justify-end gap-3 w-full sm:w-auto">
                  <button onClick={() => setActionModal({type: 'goal', playerId: selectedPlayerDetails.id})} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2">⚽ Log Goal</button>
                  <button onClick={() => setActionModal({type: 'assist', playerId: selectedPlayerDetails.id})} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2">👟 Log Assist</button>
                </div>
              ) : (
                <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6 text-center w-full sm:w-auto">
                  {(() => {
                    const stats = getCalculatedStats(selectedPlayerDetails);
                    return (
                      <>
                        <div><div className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider">MVP</div><div className="font-bold text-lg text-amber-400">{stats.mvps}</div></div>
                        <div><div className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider">Avg</div><div className="font-bold text-lg text-emerald-400">{stats.avg}</div></div>
                        <div><div className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider">Goals</div><div className="font-bold text-lg text-white">{stats.goals}</div></div>
                        <div><div className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider">Assists</div><div className="font-bold text-lg text-white">{stats.assists}</div></div>
                        <div><div className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider">Att</div><div className="font-bold text-lg text-white">{selectedPlayerDetails.attendance}</div></div>
                      </>
                    )
                  })()}
                </div>
              )}
              
              <button onClick={() => setSelectedPlayerDetails(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white sm:hidden"><X className="w-5 h-5" /></button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 sm:p-8">
      {renderActionModal()}
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Navigation */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900 p-4 sm:px-8 sm:py-6 rounded-2xl shadow-2xl border border-slate-800">
          <div className="flex items-center gap-4">
            <img src="/Vodka Juniors.jpeg" alt="Vodka Juniors Crest" className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-lg border border-slate-700 object-cover" />
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                Vodka Juniors
              </h1>
              <p className="text-sm text-slate-400 mt-1">Team Management Platform</p>
            </div>
          </div>
          
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 overflow-x-auto w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('matchday')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all min-w-[100px] ${activeTab === 'matchday' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutTemplate className="w-4 h-4" /> Matchday
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all min-w-[100px] ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Users className="w-4 h-4" /> Database
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all min-w-[100px] ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Activity className="w-4 h-4" /> History
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="animate-in fade-in duration-300 slide-in-from-bottom-4">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'matchday' && renderMatchday()}
          {activeTab === 'history' && renderHistory()}
        </main>
      </div>
    </div>
  );
}