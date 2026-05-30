import React, { useState, useEffect, useRef } from 'react';
import { Users, LayoutTemplate, Shield, Plus, X, GripVertical, CheckCircle, XCircle, Search, Download, History, Play, Square, Save, Activity, Clock, Trophy, Trash2, Edit2, Check, TableProperties, Swords, MessageSquare, ClipboardList, ArrowRightLeft, Camera } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';

// ----------------------------------------------------
// FIREBASE CONFIGURATION (REPLACE WITH YOUR NUMBERS!)
// ----------------------------------------------------
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

// Fallback data
const INITIAL_PLAYERS = [
  { id: '1', name: 'Alex (GK)', positions: 'GK', attendance: 12, refereeDuty: 1, goals: 0, assists: 0, performance: 8.5, available: true, mvps: 0, yellowCards: 0, redCards: 0, minutes: 0, comments: 'Solid shot stopper' },
  { id: '2', name: 'Marcus (CB)', positions: 'CB', attendance: 10, refereeDuty: 0, goals: 1, assists: 0, performance: 7.2, available: true, mvps: 0, yellowCards: 0, redCards: 0, minutes: 0, comments: 'Needs to work on passing' }
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
      value={localVal || ''} 
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
  
  // Matchday State
  const [formation, setFormation] = useState('4-3-3');
  const [customFormationStr, setCustomFormationStr] = useState('1-4-2-3');
  const [pitchState, setPitchState] = useState({});
  const [customLabels, setCustomLabels] = useState({});
  const [matchStatus, setMatchStatus] = useState('pre'); 
  const [matchEvents, setMatchEvents] = useState([]); 
  const [plannedEvents, setPlannedEvents] = useState([]); 
  const [matchRatings, setMatchRatings] = useState({}); 
  const [matchLeague, setMatchLeague] = useState('');
  const [matchStage, setMatchStage] = useState('Group Stage');
  const [matchdayWeek, setMatchdayWeek] = useState(1);
  const [matchMvps, setMatchMvps] = useState([]); 
  const [matchOpponent, setMatchOpponent] = useState('');
  const [matchScoreVJ, setMatchScoreVJ] = useState('');
  const [matchScoreOpp, setMatchScoreOpp] = useState('');
  const [matchDuration, setMatchDuration] = useState(90);
  
  // League Tracker State
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [leagueMatches, setLeagueMatches] = useState([]);

  // Local UI State
  const [benchSearchQuery, setBenchSearchQuery] = useState('');
  const [activeSlotSearch, setActiveSlotSearch] = useState(null);
  const [slotSearchQuery, setSlotSearchQuery] = useState('');
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbSortOption, setDbSortOption] = useState('default');
  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState(null);
  const [editingHistoryId, setEditingHistoryId] = useState(null); 
  const [newEvent, setNewEvent] = useState({ type: 'goal', playerId: '', playerOutId: '', minute: '' });
  const [newPlan, setNewPlan] = useState({ type: 'sub', minute: '', playerInId: '', playerOutId: '', notes: '' });
  const [previewMinute, setPreviewMinute] = useState(0);
  
  const exportRef = useRef(null); 
  const tacticalExportRef = useRef(null);

  // --- FIREBASE CONNECTIONS ---

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "players"), (snapshot) => {
      if (snapshot.empty) {
        INITIAL_PLAYERS.forEach(async (player) => { await setDoc(doc(db, "players", player.id), player); });
      } else {
        const loadedPlayers = [];
        snapshot.forEach((doc) => { loadedPlayers.push({ id: doc.id, ...doc.data() }); });
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
        setPlannedEvents(data.plannedEvents || []);
        setMatchRatings(data.ratings || {});
        setMatchLeague(data.league || '');
        setMatchStage(data.stage || 'Group Stage');
        setMatchdayWeek(data.matchdayWeek || 1);
        setMatchMvps(data.mvps || []);
        setMatchOpponent(data.opponent || '');
        setMatchScoreVJ(data.scoreVJ || '');
        setMatchScoreOpp(data.scoreOpp || '');
        setMatchDuration(data.duration || 90);
      } else {
        setDoc(doc(db, "match", "currentLineup"), {
          pitchState: {}, formation: '4-3-3', customFormationStr: '1-4-2-3', customLabels: {}, status: 'pre', events: [], plannedEvents: [], ratings: {}, league: '', stage: 'Group Stage', matchdayWeek: 1, mvps: [], opponent: '', scoreVJ: '', scoreOpp: '', duration: 90
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "leagues"), (snapshot) => {
        const l = [];
        snapshot.forEach(doc => l.push({ id: doc.id, ...doc.data() }));
        setLeagues(l);
        if (l.length > 0 && !selectedLeagueId) setSelectedLeagueId(l[0].id);
    });
    return () => unsub();
  }, [selectedLeagueId]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "leagueMatches"), (snapshot) => {
        const m = [];
        snapshot.forEach(doc => m.push({ id: doc.id, ...doc.data() }));
        setLeagueMatches(m);
    });
    return () => unsub();
  }, []);


  // --- ACTIONS (Write to Cloud) ---

  const deletePlayer = async (playerId) => {
      if (window.confirm("Are you sure you want to permanently delete this player?")) {
          await deleteDoc(doc(db, "players", playerId));
      }
  };

  const handleFormationChange = async (e) => {
    await setDoc(doc(db, "match", "currentLineup"), { formation: e.target.value, pitchState: {}, customLabels: {} }, { merge: true });
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

  const handleClearLineup = async () => {
    if (window.confirm("Are you sure you want to clear the entire lineup?")) {
        await setDoc(doc(db, "match", "currentLineup"), { pitchState: {} }, { merge: true });
    }
  };

  const handleDragStart = (e, playerId) => { e.dataTransfer.setData('playerId', playerId); };

  const handleDropOnPitch = async (e, slotIndex) => {
    e.preventDefault();
    if (matchStatus !== 'pre') return;
    const playerId = e.dataTransfer.getData('playerId');
    const newState = { ...pitchState };
    Object.keys(newState).forEach(key => { if (newState[key] === playerId) newState[key] = null; });
    newState[slotIndex] = playerId;
    await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true });
  };

  const handleDropOnBench = async (e) => {
    e.preventDefault();
    if (matchStatus !== 'pre') return; 
    const playerId = e.dataTransfer.getData('playerId');
    const newState = { ...pitchState };
    Object.keys(newState).forEach(key => { if (newState[key] === playerId) delete newState[key]; });
    await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true });
  };

  const handleQuickAssign = async (slotIndex, playerId) => {
    if (matchStatus !== 'pre') return;
    const newState = { ...pitchState };
    Object.keys(newState).forEach(key => { if (newState[key] === playerId) newState[key] = null; });
    newState[slotIndex] = playerId;
    await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true });
    setActiveSlotSearch(null);
    setSlotSearchQuery('');
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleSaveImage = async () => {
    if (exportRef.current) {
      try {
        const { toPng } = await import('https://esm.sh/html-to-image');
        const dataUrl = await toPng(exportRef.current, { backgroundColor: '#020617', pixelRatio: 2 });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `VodkaJuniors_Squad.png`;
        link.click();
      } catch (err) { 
        console.error("Error saving image:", err); 
        alert("Oops! Something went wrong saving the image.");
      }
    }
  };

  const handleSaveTacticsImage = async () => {
    if (tacticalExportRef.current) {
      try {
        const { toPng } = await import('https://esm.sh/html-to-image');
        const dataUrl = await toPng(tacticalExportRef.current, { backgroundColor: '#0f172a', pixelRatio: 2 });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `VodkaJuniors_Tactics.png`;
        link.click();
        alert("🦖 ROOOAAARRR!!! Tactical Game Plan Exported!"); // Mascot completion battle cry!
      } catch (err) { 
        console.error("Error saving image:", err); 
        alert("Oops! Something went wrong saving the tactical plan.");
      }
    }
  };

  // --- GAME PLAN ENGINE ---
  const addPlannedEvent = async () => {
    if (!newPlan.minute) return;
    const planToSave = { id: Date.now().toString(), ...newPlan, minute: parseInt(newPlan.minute) };
    const updatedPlans = [...plannedEvents, planToSave];
    await updateMatchField('plannedEvents', updatedPlans);
    setNewPlan({ type: 'sub', minute: '', playerInId: '', playerOutId: '', notes: '' });
  };

  const deletePlannedEvent = async (id) => {
    const updatedPlans = plannedEvents.filter(p => p.id !== id);
    await updateMatchField('plannedEvents', updatedPlans);
  };

  const executePlannedEvent = async (plan) => {
    if (plan.type === 'sub') {
      const eventToSave = { 
        id: Date.now().toString(), 
        type: 'sub', 
        minute: plan.minute, 
        playerIn: plan.playerInId, 
        playerOut: plan.playerOutId 
      };
      await updateMatchField('events', [...matchEvents, eventToSave]);
    }
    await deletePlannedEvent(plan.id);
  };

  const previewPitchState = (() => {
    let state = { ...pitchState };
    const sortedPlans = [...plannedEvents].sort((a,b) => a.minute - b.minute);
    sortedPlans.forEach(plan => {
        if (plan.minute <= previewMinute && plan.type === 'sub') {
            const slot = Object.keys(state).find(k => state[k] === plan.playerOutId);
            if (slot) state[slot] = plan.playerInId;
        }
    });
    return state;
  })();


  // --- POST MATCH REVIEW ENGINE ---

  const changeMatchStatus = async (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'review') {
      const activeLeague = leagues.find(l => l.id === selectedLeagueId);
      updates.league = activeLeague ? activeLeague.id : ''; 
      updates.stage = 'Group Stage';
      updates.matchdayWeek = 1;
      updates.events = [];
      updates.ratings = {};
      updates.mvps = [];
      updates.opponent = '';
      updates.scoreVJ = 0;
      updates.scoreOpp = 0;
      updates.duration = 90;
    }
    await setDoc(doc(db, "match", "currentLineup"), updates, { merge: true });
  };

  const updateMatchRating = async (playerId, rating) => {
    const newRatings = { ...matchRatings, [playerId]: parseFloat(rating) || 0 };
    await setDoc(doc(db, "match", "currentLineup"), { ratings: newRatings }, { merge: true });
  };

  const addManualEvent = async () => {
    if (!newEvent.playerId || !newEvent.minute) return;
    const eventToSave = { id: Date.now().toString(), type: newEvent.type, minute: parseInt(newEvent.minute) };
    
    if (newEvent.type === 'sub') {
      if (!newEvent.playerOutId) return;
      eventToSave.playerIn = newEvent.playerId;
      eventToSave.playerOut = newEvent.playerOutId;
    } else {
      eventToSave.playerId = newEvent.playerId;
    }

    const updatedEvents = [...matchEvents, eventToSave];
    await updateMatchField('events', updatedEvents);
    setNewEvent({ type: 'goal', playerId: '', playerOutId: '', minute: '' });
  };

  const deleteMatchEvent = async (eventId) => {
    const updatedEvents = matchEvents.filter(e => e.id !== eventId);
    await updateMatchField('events', updatedEvents);
  };

  const finishAndSaveMatch = async () => {
    const playersInvolved = new Set([
        ...Object.values(pitchState),
        ...matchEvents.filter(e => e.type === 'sub').map(e => e.playerOut),
        ...matchEvents.filter(e => e.type === 'sub').map(e => e.playerIn),
        ...Object.keys(matchRatings),
        ...matchMvps
    ].filter(Boolean));

    const newMatch = {
      date: new Date().toISOString(),
      formation,
      pitchState,
      events: matchEvents,
      ratings: matchRatings,
      participated: Array.from(playersInvolved),
      league: matchLeague,
      stage: matchStage,
      matchdayWeek: parseInt(matchdayWeek) || 1,
      mvps: matchMvps,
      opponent: matchOpponent || 'Unknown Opponent',
      scoreVJ: matchScoreVJ || 0,
      scoreOpp: matchScoreOpp || 0,
      duration: parseInt(matchDuration) || 90
    };
    
    await addDoc(collection(db, "pastMatches"), newMatch);
    await setDoc(doc(db, "match", "currentLineup"), { status: 'pre', events: [], plannedEvents: [], ratings: {}, league: '', stage: '', matchdayWeek: 1, mvps: [], opponent: '', scoreVJ: '', scoreOpp: '', duration: 90 }, { merge: true });
    setActiveTab('history');
  };

  const deletePastMatch = async (matchId) => {
    if(window.confirm('Are you sure you want to delete this match?')) {
      await deleteDoc(doc(db, "pastMatches", matchId));
    }
  };

  const addMissingPlayerToMatch = async (matchId, playerId) => {
    const match = pastMatches.find(m => m.id === matchId);
    if (!match || !playerId) return;
    const newParticipated = [...(match.participated || []), playerId];
    await setDoc(doc(db, "pastMatches", matchId), { participated: newParticipated }, { merge: true });
  };


  // --- MULTI-LEAGUE / GROUPS MANAGER ACTIONS ---
  const addLeague = async (name, format) => {
      if (!name) return;
      await addDoc(collection(db, "leagues"), { name, format, teams: [{ name: 'Vodka Juniors', group: 'A' }] });
  };

  const deleteLeague = async (id) => {
      if (window.confirm("Are you sure you want to delete this entire league and its settings? (Match history will remain intact)")) {
          await deleteDoc(doc(db, "leagues", id));
          setSelectedLeagueId(null);
      }
  }

  const addLeagueTeam = async (leagueId, teamName, group = 'A') => {
      const league = leagues.find(l => l.id === leagueId);
      if (!teamName || !league || league.teams.some(t => t.name === teamName)) return;
      
      const newTeams = [...league.teams, { name: teamName, group }];
      await setDoc(doc(db, "leagues", leagueId), { teams: newTeams }, { merge: true });
  };

  const removeLeagueTeam = async (leagueId, teamName) => {
      if (teamName === 'Vodka Juniors') return; 
      const league = leagues.find(l => l.id === leagueId);
      if (league && window.confirm(`Delete ${teamName} from the league?`)) {
          const newTeams = league.teams.filter(t => t.name !== teamName);
          await setDoc(doc(db, "leagues", leagueId), { teams: newTeams }, { merge: true });
      }
  };

  const addOtherMatchResult = async (leagueId, team1, score1, score2, team2, stage, week) => {
      if (!team1 || !team2 || team1 === team2 || score1 === '' || score2 === '') return;
      await addDoc(collection(db, "leagueMatches"), {
          leagueId, team1, team2, score1: parseInt(score1), score2: parseInt(score2), stage: stage || 'Group Stage', matchdayWeek: parseInt(week) || 1, date: new Date().toISOString()
      });
  };

  const deleteOtherMatchResult = async (id) => {
      if (window.confirm("Delete this match result?")) await deleteDoc(doc(db, "leagueMatches", id));
  };

  const calculateLeagueStandings = (league) => {
      let standings = {};
      league.teams.forEach(t => {
          standings[t.name] = { name: t.name, group: t.group, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
      });

      pastMatches.filter(m => m.league === league.id && (!m.stage || m.stage.includes('Group'))).forEach(m => {
          const vj = 'Vodka Juniors';
          const opp = m.opponent;
          if (!standings[vj]) standings[vj] = { name: vj, group: 'A', p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
          if (!standings[opp]) standings[opp] = { name: opp, group: 'B', p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };

          const sVJ = parseInt(m.scoreVJ) || 0;
          const sOpp = parseInt(m.scoreOpp) || 0;

          standings[vj].p++; standings[vj].gf += sVJ; standings[vj].ga += sOpp;
          standings[opp].p++; standings[opp].gf += sOpp; standings[opp].ga += sVJ;

          if (sVJ > sOpp) { standings[vj].w++; standings[vj].pts+=3; standings[opp].l++; }
          else if (sVJ < sOpp) { standings[opp].w++; standings[opp].pts+=3; standings[vj].l++; }
          else { standings[vj].d++; standings[opp].d++; standings[vj].pts++; standings[opp].pts++; }
      });

      leagueMatches.filter(m => m.leagueId === league.id && (!m.stage || m.stage.includes('Group'))).forEach(m => {
          if (!standings[m.team1]) standings[m.team1] = { name: m.team1, group: 'A', p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
          if (!standings[m.team2]) standings[m.team2] = { name: m.team2, group: 'A', p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };

          standings[m.team1].p++; standings[m.team1].gf += m.score1; standings[m.team1].ga += m.score2;
          standings[m.team2].p++; standings[m.team2].gf += m.score2; standings[m.team2].ga += m.score1;

          if (m.score1 > m.score2) { standings[m.team1].w++; standings[m.team1].pts+=3; standings[m.team2].l++; }
          else if (m.score1 < m.score2) { standings[m.team2].w++; standings[m.team2].pts+=3; standings[m.team1].l++; }
          else { standings[m.team1].d++; standings[m.team2].d++; standings[m.team1].pts++; standings[m.team2].pts++; }
      });

      const sorted = Object.values(standings).map(s => { s.gd = s.gf - s.ga; return s; })
          .sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
          
      if (league.format === 'groups') {
          return {
              groupA: sorted.filter(s => s.group === 'A'),
              groupB: sorted.filter(s => s.group === 'B')
          }
      }
      return { standard: sorted };
  };

  // --- STATS ENGINE ---
  const getCalculatedStats = (player) => {
    if (!player) return { goals: 0, assists: 0, avg: 0, mvps: 0, yellowCards: 0, redCards: 0, minutes: 0 };
    let goals = player.goals || 0; 
    let assists = player.assists || 0; 
    let mvps = player.mvps || 0;
    let yellowCards = player.yellowCards || 0;
    let redCards = player.redCards || 0;
    let minutes = player.minutes || 0; // Completely Manual!
    let totalRating = (player.performance || 0) * (player.attendance || 0); 
    let ratingCount = player.attendance || 0;

    pastMatches.forEach(m => {
       if (typeof m.mvp === 'string' && m.mvp === player.id) mvps++;
       if (Array.isArray(m.mvps) && m.mvps.includes(player.id)) mvps++;
       
       (m.events || []).forEach(e => {
           if (e.playerId === player.id || e.playerIn === player.id || e.playerOut === player.id) {
               if (e.type === 'goal' && e.playerId === player.id) goals++;
               if (e.type === 'assist' && e.playerId === player.id) assists++;
               if (e.type === 'yellowCard' && e.playerId === player.id) yellowCards++;
               if (e.type === 'redCard' && e.playerId === player.id) redCards++;
           }
       });
       
       if (m.ratings && m.ratings[player.id]) {
           totalRating += Number(m.ratings[player.id]);
           ratingCount++;
       }
    });

    const avg = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : (player.performance || 0);
    return { goals, assists, avg, mvps, yellowCards, redCards, minutes };
  };

  const getDisplayName = (player) => {
    if (!player) return '';
    const firstName = player.name.split(' ')[0];
    const duplicates = players.filter(p => p.name.split(' ')[0] === firstName);
    if (duplicates.length > 1) return player.name.replace(/\s*\(.*?\)\s*/g, ''); 
    return firstName;
  };

  const getEventText = (ev) => {
    if (ev.type === 'goal') return <span>⚽ <strong className="text-emerald-400">{players.find(p=>p.id===ev.playerId)?.name || 'Unknown'}</strong> scored!</span>;
    if (ev.type === 'assist') return <span>👟 <strong className="text-indigo-300">{players.find(p=>p.id===ev.playerId)?.name || 'Unknown'}</strong> assisted.</span>;
    if (ev.type === 'yellowCard') return <span>🟨 <strong className="text-amber-400">{players.find(p=>p.id===ev.playerId)?.name || 'Unknown'}</strong> booked.</span>;
    if (ev.type === 'redCard') return <span>🟥 <strong className="text-rose-500">{players.find(p=>p.id===ev.playerId)?.name || 'Unknown'}</strong> sent off!</span>;
    if (ev.type === 'sub') return <span>🔄 <strong className="text-emerald-400">{players.find(p=>p.id===ev.playerIn)?.name || 'In'}</strong> ON, <span className="text-slate-500">{players.find(p=>p.id===ev.playerOut)?.name || 'Out'}</span> OFF</span>;
    return null;
  };

  // --- UI RENDER LOGIC ---

  const renderDashboard = () => {
    let dbPlayers = [...players].filter(p => p.name.toLowerCase().includes(dbSearchQuery.toLowerCase()) || p.positions.toLowerCase().includes(dbSearchQuery.toLowerCase()));
    if (dbSortOption === 'name') dbPlayers.sort((a, b) => a.name.localeCompare(b.name));
    else if (dbSortOption === 'performance') dbPlayers.sort((a, b) => getCalculatedStats(b).avg - getCalculatedStats(a).avg);
    else dbPlayers.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    return (
      <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-700 w-full overflow-x-auto">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 shrink-0"><Users className="w-5 h-5 text-indigo-400" /> Squad Database</h2>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-500" /></div>
              <input type="text" placeholder="Search players..." value={dbSearchQuery} onChange={(e) => setDbSearchQuery(e.target.value)} className="w-full bg-slate-800 text-sm text-white border border-slate-600 rounded-md py-1.5 pl-9 pr-3 focus:outline-none focus:border-indigo-500" />
            </div>
            <select value={dbSortOption} onChange={(e) => setDbSortOption(e.target.value)} className="w-full sm:w-auto bg-slate-800 text-sm text-white border border-slate-600 rounded-md py-1.5 px-3 focus:outline-none focus:border-indigo-500">
              <option value="default">Sort: Added (Newest Last)</option>
              <option value="name">Sort: A-Z</option>
              <option value="performance">Sort: Avg Rating</option>
            </select>
            <button onClick={() => setDoc(doc(db, "players", Date.now().toString()), { id: Date.now().toString(), name: 'New Player', positions: '', attendance: 0, refereeDuty: 0, goals: 0, assists: 0, performance: 0, available: true, mvps: 0, yellowCards: 0, redCards: 0, minutes: 0, comments: '' })} className="w-full sm:w-auto flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
        <table className="w-full text-left border-collapse min-w-[1300px]">
          <thead>
            <tr className="bg-slate-800 text-slate-300 text-sm border-b border-slate-700">
              <th className="p-3 font-semibold">Matchday</th>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Position</th>
              <th className="p-3 font-semibold text-center" title="Manual">Att</th>
              <th className="p-3 font-semibold text-center" title="Manual">Ref</th>
              <th className="p-3 font-semibold text-center text-indigo-300" title="Manual">Mins ⏱️</th>
              <th className="p-3 font-semibold text-center text-amber-400" title="Auto-Calculated">MVP 🏆</th>
              <th className="p-3 font-semibold text-center text-indigo-300" title="Auto-Calculated">G 🔒</th>
              <th className="p-3 font-semibold text-center text-indigo-300" title="Auto-Calculated">A 🔒</th>
              <th className="p-3 font-semibold text-center text-amber-400" title="Auto-Calculated">🟨 🔒</th>
              <th className="p-3 font-semibold text-center text-rose-500" title="Auto-Calculated">🟥 🔒</th>
              <th className="p-3 font-semibold text-center text-emerald-400" title="Auto-Calculated">Avg 🔒</th>
              <th className="p-3 font-semibold"><div className="flex items-center gap-1"><MessageSquare className="w-4 h-4"/> Comments</div></th>
              <th className="p-3 text-center">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 text-slate-200">
            {dbPlayers.map(player => {
              const stats = getCalculatedStats(player);
              return (
                <tr key={player.id} className="hover:bg-slate-750 transition-colors group">
                  <td className="p-3">
                    <button onClick={async () => { const newAvail = !player.available; await setDoc(doc(db, "players", player.id), { available: newAvail }, { merge: true }); if (!newAvail && matchStatus === 'pre') { const newState = { ...pitchState }; Object.keys(newState).forEach(k => { if (newState[k] === player.id) delete newState[k]; }); await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true }); } }} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${player.available ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {player.available ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {player.available ? 'In' : 'Out'}
                    </button>
                  </td>
                  <td className="p-3"><SyncInput value={player.name} onSave={(val) => setDoc(doc(db, "players", player.id), { name: val }, { merge: true })} className="bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none w-full" /></td>
                  <td className="p-3"><SyncInput value={player.positions} onSave={(val) => setDoc(doc(db, "players", player.id), { positions: val }, { merge: true })} className="bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none w-24 text-sm" /></td>
                  <td className="p-3 text-center"><SyncInput type="number" value={player.attendance} onSave={(val) => setDoc(doc(db, "players", player.id), { attendance: val }, { merge: true })} className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center" /></td>
                  <td className="p-3 text-center"><SyncInput type="number" value={player.refereeDuty || 0} onSave={(val) => setDoc(doc(db, "players", player.id), { refereeDuty: val }, { merge: true })} className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center" /></td>
                  
                  {/* MANUAL MINUTES */}
                  <td className="p-3 text-center text-indigo-300 font-medium">
                    <SyncInput type="number" value={player.minutes || 0} onSave={(val) => setDoc(doc(db, "players", player.id), { minutes: parseInt(val) || 0 }, { merge: true })} className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center text-indigo-300" />
                  </td>
                  
                  <td className="p-3 text-center text-amber-400 font-bold">{stats.mvps}</td>
                  <td className="p-3 text-center text-indigo-300 font-medium">{stats.goals}</td>
                  <td className="p-3 text-center text-indigo-300 font-medium">{stats.assists}</td>
                  <td className="p-3 text-center text-amber-400 font-medium">{stats.yellowCards}</td>
                  <td className="p-3 text-center text-rose-500 font-medium">{stats.redCards}</td>
                  <td className="p-3 text-center text-emerald-400 font-bold">{stats.avg}</td>
                  <td className="p-3 pr-2">
                    <SyncInput value={player.comments || ''} onSave={(val) => setDoc(doc(db, "players", player.id), { comments: val }, { merge: true })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none w-full min-w-[200px]" placeholder="Add notes..." />
                  </td>
                  <td className="p-3 text-center">
                      <button onClick={() => deletePlayer(player.id)} className="text-slate-500 hover:text-rose-500 transition-colors p-1" title="Delete Player Permanently">
                          <Trash2 className="w-4 h-4 mx-auto"/>
                      </button>
                  </td>
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
      {pastMatches.map((match) => {
        const isEditing = editingHistoryId === match.id;
        const lg = leagues.find(l => l.id === match.league);
        const leagueName = lg ? lg.name : 'Unknown League';
        
        return (
          <div key={match.id} className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-5 relative group">
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
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">{leagueName} {match.stage && `- ${match.stage}`} {match.matchdayWeek && `(Week ${match.matchdayWeek})`}</h3>
                <span className="bg-indigo-600/20 text-indigo-400 px-3 py-0.5 rounded-full text-xs font-bold ml-2">{match.formation}</span>
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
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                  <span>{new Date(match.date).toLocaleDateString()}</span>
                  <span>•</span>
                  {isEditing ? (
                       <span className="flex items-center gap-1">
                           <SyncInput type="number" value={match.duration || 90} onSave={(val) => setDoc(doc(db, "pastMatches", match.id), { duration: val }, { merge: true })} className="w-12 bg-slate-800 border border-slate-600 rounded text-center text-white p-0.5" /> mins
                       </span>
                  ) : (
                       <span>{match.duration || 90}' Match</span>
                  )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <h4 className="text-slate-400 text-sm font-semibold mb-2">Match Events</h4>
                {match.events && match.events.length > 0 ? (
                  <ul className="space-y-2">
                    {match.events.sort((a,b) => a.minute - b.minute).map((ev, j) => (
                      <li key={j} className="text-sm flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-700/50">
                        <span className="text-indigo-400 font-mono w-10">{ev.minute}'</span>{getEventText(ev)}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-slate-500 italic">No events recorded.</p>}

                {((match.mvps && match.mvps.length > 0) || match.mvp) && !isEditing && (
                  <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 w-fit">
                    <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Trophy className="w-3 h-3" /> MVPs</p>
                    <div className="flex flex-wrap gap-2">
                      {typeof match.mvp === 'string' && match.mvp && !match.mvps?.includes(match.mvp) && (
                         <span className="text-white font-bold bg-amber-500/20 px-2 py-1 rounded">{players.find(p => p.id === match.mvp)?.name}</span>
                      )}
                      {Array.isArray(match.mvps) && match.mvps.map(pid => (
                         <span key={pid} className="text-white font-bold bg-amber-500/20 px-2 py-1 rounded">{players.find(p => p.id === pid)?.name}</span>
                      ))}
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
                            <SyncInput type="number" step="0.1" value={match.ratings[pid] || 0} onSave={(val) => { const newRatings = { ...match.ratings, [pid]: parseFloat(val) || 0 }; setDoc(doc(db, "pastMatches", match.id), { ratings: newRatings }, { merge: true }); }} className="w-14 bg-slate-800 border border-slate-600 text-emerald-400 font-bold rounded p-1 text-center focus:outline-none" />
                         ) : (
                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">{match.ratings[pid] || '-'}</span>
                         )}
                       </div>
                     )
                  })}
                </div>
                {isEditing && (
                    <div className="mt-3">
                        <select 
                            onChange={(e) => {
                                addMissingPlayerToMatch(match.id, e.target.value);
                                e.target.value = ''; 
                            }} 
                            className="w-full bg-slate-900 text-slate-400 border border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">+ Add missing player to this match...</option>
                            {players.filter(p => !match.participated?.includes(p.id)).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {pastMatches.length === 0 && (
        <div className="bg-slate-800 p-10 rounded-xl border border-slate-700 text-center">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-xl text-white font-bold">No Match History</h3>
          <p className="text-slate-400 mt-2">Log a post-match review to see it saved here.</p>
        </div>
      )}
    </div>
  );

  const renderLeagueTab = () => {
    const currentLeague = leagues.find(l => l.id === selectedLeagueId);
    
    // Calculate all matches for this specific league
    const allLeagueGames = [
       ...pastMatches.filter(m => m.league === currentLeague?.id).map(m => ({
           id: m.id, team1: 'Vodka Juniors', team2: m.opponent, score1: m.scoreVJ, score2: m.scoreOpp, stage: m.stage, matchdayWeek: m.matchdayWeek || 1, isVJ: true, date: m.date
       })),
       ...leagueMatches.filter(m => m.leagueId === currentLeague?.id).map(m => ({
           id: m.id, team1: m.team1, team2: m.team2, score1: m.score1, score2: m.score2, stage: m.stage, matchdayWeek: m.matchdayWeek || 1, isVJ: false, date: m.date
       }))
    ];
    
    // Extract unique matchdays for grouped view
    const matchdays = [...new Set(allLeagueGames.map(m => m.matchdayWeek))].sort((a,b) => b - a);

    return (
        <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {leagues.map(l => (
                    <button key={l.id} onClick={() => setSelectedLeagueId(l.id)} className={`px-4 py-2 rounded-lg font-bold flex-shrink-0 transition-colors ${selectedLeagueId === l.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                        {l.name}
                    </button>
                ))}
                <button onClick={() => { 
                    const name = prompt("Enter League Name:"); 
                    if (!name) return;
                    const format = window.confirm("Does this league have a Group Stage + Knockout Format?\n\n(Click OK for Groups, Cancel for a Standard Single Table)") ? 'groups' : 'standard';
                    addLeague(name, format); 
                }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1 flex-shrink-0 transition-colors shadow-md">
                    <Plus className="w-4 h-4" /> New League
                </button>
            </div>

            {currentLeague && (
                <>
                {/* SETTINGS MODULE */}
                <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-6 flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                           <h3 className="text-indigo-400 font-bold">Teams & Settings</h3>
                           <button onClick={() => deleteLeague(currentLeague.id)} className="text-rose-500 hover:text-rose-400 text-xs font-bold flex items-center gap-1"><Trash2 className="w-3 h-3"/> Delete League</button>
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                            <input type="text" id="newTeamInput" placeholder="Team Name..." className="flex-1 bg-slate-900 border border-slate-600 text-white rounded p-2 focus:outline-none focus:border-indigo-500 text-sm" />
                            {currentLeague.format === 'groups' && (
                                <select id="newTeamGroup" className="bg-slate-900 border border-slate-600 text-white rounded p-2 text-sm focus:border-indigo-500 focus:outline-none">
                                    <option value="A">Group A</option>
                                    <option value="B">Group B</option>
                                </select>
                            )}
                            <button onClick={() => { 
                                const val = document.getElementById('newTeamInput').value; 
                                const grp = currentLeague.format === 'groups' ? document.getElementById('newTeamGroup').value : 'A';
                                addLeagueTeam(currentLeague.id, val, grp); 
                                document.getElementById('newTeamInput').value = ''; 
                            }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded font-bold transition-colors">Add</button>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            {currentLeague.format === 'groups' ? (
                                <>
                                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Group A</h4>
                                      <div className="flex flex-wrap gap-2">
                                          {currentLeague.teams.filter(t => t.group === 'A').map(t => (
                                              <span key={t.name} className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${t.name === 'Vodka Juniors' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/50' : 'bg-slate-800 text-slate-300 border border-slate-600'}`}>
                                                  {t.name} {t.name !== 'Vodka Juniors' && <button onClick={() => removeLeagueTeam(currentLeague.id, t.name)} className="text-slate-500 hover:text-rose-400"><X className="w-3 h-3"/></button>}
                                              </span>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Group B</h4>
                                      <div className="flex flex-wrap gap-2">
                                          {currentLeague.teams.filter(t => t.group === 'B').map(t => (
                                              <span key={t.name} className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${t.name === 'Vodka Juniors' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/50' : 'bg-slate-800 text-slate-300 border border-slate-600'}`}>
                                                  {t.name} {t.name !== 'Vodka Juniors' && <button onClick={() => removeLeagueTeam(currentLeague.id, t.name)} className="text-slate-500 hover:text-rose-400"><X className="w-3 h-3"/></button>}
                                              </span>
                                          ))}
                                      </div>
                                  </div>
                                </>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {currentLeague.teams.map(t => (
                                        <span key={t.name} className={`text-sm px-3 py-1 rounded-full flex items-center gap-2 ${t.name === 'Vodka Juniors' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/50' : 'bg-slate-700 text-slate-300'}`}>
                                            {t.name} {t.name !== 'Vodka Juniors' && <button onClick={() => removeLeagueTeam(currentLeague.id, t.name)} className="text-slate-500 hover:text-rose-400"><X className="w-3 h-3"/></button>}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-emerald-400 font-bold mb-3 border-b border-slate-700 pb-2">Log Other Match Result</h3>
                        <p className="text-xs text-slate-400 mb-4">Input results between two other teams to update the table.</p>
                        
                        <div className="flex gap-2 mb-2">
                            {currentLeague.format === 'groups' && (
                                <select id="stageSelect" className="flex-1 bg-slate-900 text-white border border-slate-600 rounded p-2 text-sm focus:outline-none focus:border-emerald-500">
                                    <option value="Group Stage">Group Stage</option>
                                    <option value="Semi-Final">Semi-Final</option>
                                    <option value="Final">Final</option>
                                </select>
                            )}
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded p-2 text-sm">
                                <span className="text-slate-400">Matchday/Week:</span>
                                <input type="number" id="matchdayWeekInput" defaultValue="1" className="w-12 bg-transparent text-white focus:outline-none focus:text-emerald-400 font-bold" />
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between gap-2 bg-slate-900 p-3 rounded-lg border border-slate-700">
                            <select id="team1Select" className="w-1/3 bg-slate-800 text-white border border-slate-600 rounded p-2 text-xs sm:text-sm focus:outline-none focus:border-emerald-500">
                                <option value="">Home...</option>
                                {currentLeague.teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                            </select>
                            
                            <input type="number" id="score1Input" className="w-12 bg-slate-800 border border-slate-600 text-white rounded p-2 text-center focus:outline-none focus:border-emerald-500 font-bold" />
                            <span className="text-slate-500">-</span>
                            <input type="number" id="score2Input" className="w-12 bg-slate-800 border border-slate-600 text-white rounded p-2 text-center focus:outline-none focus:border-emerald-500 font-bold" />
                            
                            <select id="team2Select" className="w-1/3 bg-slate-800 text-white border border-slate-600 rounded p-2 text-xs sm:text-sm focus:outline-none focus:border-emerald-500">
                                <option value="">Away...</option>
                                {currentLeague.teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                        <button onClick={() => {
                            const stg = currentLeague.format === 'groups' ? document.getElementById('stageSelect').value : 'League Match';
                            const wk = document.getElementById('matchdayWeekInput').value;
                            addOtherMatchResult(
                                currentLeague.id,
                                document.getElementById('team1Select').value, document.getElementById('score1Input').value,
                                document.getElementById('score2Input').value, document.getElementById('team2Select').value, stg, wk
                            );
                            document.getElementById('team1Select').value = ''; document.getElementById('score1Input').value = '';
                            document.getElementById('score2Input').value = ''; document.getElementById('team2Select').value = '';
                        }} className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg font-bold transition-colors shadow-lg">Save Result</button>
                    </div>
                </div>

                {/* MATCHDAY RESULTS ACCORDION */}
                {matchdays.length > 0 && (
                   <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-6">
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                         <Activity className="w-5 h-5 text-indigo-400" />
                         <h3 className="text-xl font-bold text-white">Results by Matchday</h3>
                      </div>
                      <div className="space-y-6">
                          {matchdays.map(week => (
                              <div key={week}>
                                  <h4 className="text-slate-400 font-bold uppercase tracking-wider mb-2 text-sm">Matchday {week}</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {allLeagueGames.filter(m => m.matchdayWeek === week).map(m => (
                                          <div key={m.id} className="flex justify-between items-center text-sm bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-sm text-slate-300">
                                              <div className="flex flex-col flex-1">
                                                 {m.stage && m.stage !== 'League Match' && <span className="text-[10px] text-emerald-400/80 font-bold uppercase mb-1">{m.stage}</span>}
                                                 <div className="flex justify-between items-center gap-2 w-full">
                                                     <span className={`truncate w-[40%] ${m.team1 === 'Vodka Juniors' ? 'text-indigo-400 font-bold' : ''}`}>{m.team1}</span>
                                                     <span className="bg-slate-800 px-2 py-1 rounded text-white font-black">{m.score1} - {m.score2}</span>
                                                     <span className={`truncate text-right w-[40%] ${m.team2 === 'Vodka Juniors' ? 'text-indigo-400 font-bold' : ''}`}>{m.team2}</span>
                                                 </div>
                                              </div>
                                              {!m.isVJ && (
                                                  <button onClick={() => deleteOtherMatchResult(m.id)} className="text-slate-500 hover:text-rose-