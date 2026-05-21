import React, { useState, useEffect } from 'react';
import { Users, LayoutTemplate, Shield, Plus, X, GripVertical, CheckCircle, XCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// REPLACE THIS object with the exact one from your Firebase Project Settings!
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

// We keep this just in case the database is completely empty on the first load!
const INITIAL_PLAYERS = [
  { id: '1', name: 'Alex (GK)', positions: 'GK', attendance: 12, refereeDuty: 1, goals: 0, assists: 1, performance: 8.5, available: true },
  { id: '2', name: 'Marcus (CB)', positions: 'CB', attendance: 10, refereeDuty: 0, goals: 1, assists: 0, performance: 7.2, available: true },
  { id: '3', name: 'David (CB)', positions: 'CB, RB', attendance: 14, refereeDuty: 2, goals: 2, assists: 1, performance: 8.0, available: true },
  { id: '4', name: 'Sam (LB)', positions: 'LB, LWB', attendance: 11, refereeDuty: 0, goals: 0, assists: 4, performance: 7.5, available: false },
  { id: '5', name: 'Chris (RB)', positions: 'RB', attendance: 9, refereeDuty: 1, goals: 0, assists: 2, performance: 6.8, available: true },
  { id: '6', name: 'Tommy (CDM)', positions: 'CDM, CM', attendance: 15, refereeDuty: 0, goals: 1, assists: 5, performance: 8.8, available: true },
  { id: '7', name: 'Leo (CM)', positions: 'CM', attendance: 13, refereeDuty: 0, goals: 4, assists: 6, performance: 8.1, available: true },
  { id: '8', name: 'Jamie (CAM)', positions: 'CAM, RW', attendance: 8, refereeDuty: 0, goals: 5, assists: 3, performance: 7.9, available: true },
  { id: '9', name: 'Ryan (LW)', positions: 'LW, ST', attendance: 14, refereeDuty: 1, goals: 8, assists: 4, performance: 8.6, available: true },
  { id: '10', name: 'Dan (RW)', positions: 'RW, RM', attendance: 12, refereeDuty: 0, goals: 6, assists: 7, performance: 8.3, available: true },
  { id: '11', name: 'Mike (ST)', positions: 'ST', attendance: 15, refereeDuty: 3, goals: 14, assists: 2, performance: 9.1, available: true },
  { id: '12', name: 'Niko (SUB)', positions: 'CM, CAM', attendance: 6, refereeDuty: 0, goals: 1, assists: 1, performance: 6.5, available: true },
  { id: '13', name: 'Ben (SUB)', positions: 'CB', attendance: 4, refereeDuty: 0, goals: 0, assists: 0, performance: 6.0, available: true },
  { id: '14', name: 'Will (SUB)', positions: 'ST', attendance: 2, refereeDuty: 0, goals: 2, assists: 0, performance: 7.0, available: false }
];

const FORMATIONS = {
  '4-4-2': [1, 4, 4, 2],
  '4-3-3': [1, 4, 3, 3],
  '3-5-2': [1, 3, 5, 2],
  '4-2-3-1': [1, 4, 2, 3, 1],
  '5-3-2': [1, 5, 3, 2]
};

// A special input component to prevent the cursor from jumping while typing to the live database
const SyncInput = ({ value, onSave, type = "text", className, step }) => {
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
      className={className} 
    />
  );
};

export default function VodkaJuniorsApp() {
  const [activeTab, setActiveTab] = useState('matchday');
  
  // State is now loaded from Firebase!
  const [players, setPlayers] = useState([]);
  const [formation, setFormation] = useState('4-3-3');
  const [customFormationStr, setCustomFormationStr] = useState('1-4-2-3');
  const [pitchState, setPitchState] = useState({});

  // 1. FIREBASE CONNECTION: Players Database
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "players"), (snapshot) => {
      if (snapshot.empty) {
        // If database is completely empty (first time running), seed it with initial players!
        INITIAL_PLAYERS.forEach(async (player) => {
          await setDoc(doc(db, "players", player.id), player);
        });
      } else {
        // Otherwise, download the players from the cloud
        const loadedPlayers = [];
        snapshot.forEach((doc) => {
          loadedPlayers.push({ id: doc.id, ...doc.data() });
        });
        setPlayers(loadedPlayers);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. FIREBASE CONNECTION: Match Lineup Sync
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "match", "currentLineup"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.pitchState) setPitchState(data.pitchState);
        if (data.formation) setFormation(data.formation);
        if (data.customFormationStr) setCustomFormationStr(data.customFormationStr);
      } else {
        // Initialize the match document if it doesn't exist
        setDoc(doc(db, "match", "currentLineup"), {
          pitchState: {},
          formation: '4-3-3',
          customFormationStr: '1-4-2-3'
        });
      }
    });
    return () => unsubscribe();
  }, []);


  // --- FIREBASE WRITE ACTIONS ---

  const handleFormationChange = async (e) => {
    const newForm = e.target.value;
    await setDoc(doc(db, "match", "currentLineup"), { formation: newForm, pitchState: {} }, { merge: true });
  };

  const handleCustomFormationBlur = async () => {
    await setDoc(doc(db, "match", "currentLineup"), { customFormationStr, pitchState: {} }, { merge: true });
  };

  const handleDragStart = (e, playerId) => {
    e.dataTransfer.setData('playerId', playerId);
  };

  const handleDropOnPitch = async (e, slotIndex) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('playerId');
    
    // Calculate new state locally, then push to Firebase
    const newState = { ...pitchState };
    Object.keys(newState).forEach(key => {
      if (newState[key] === playerId) newState[key] = null;
    });
    newState[slotIndex] = playerId;

    await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true });
  };

  const handleDropOnBench = async (e) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('playerId');
    
    const newState = { ...pitchState };
    Object.keys(newState).forEach(key => {
      if (newState[key] === playerId) delete newState[key];
    });

    await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const toggleAvailability = async (id) => {
    const player = players.find(p => p.id === id);
    if (!player) return;

    const newAvailability = !player.available;
    
    // Update player availability in DB
    await setDoc(doc(db, "players", id), { available: newAvailability }, { merge: true });

    // If making unavailable, remove them from the pitch in the DB
    if (newAvailability === false) {
      const newState = { ...pitchState };
      let changed = false;
      Object.keys(newState).forEach(key => {
        if (newState[key] === id) {
          delete newState[key];
          changed = true;
        }
      });
      if (changed) {
        await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true });
      }
    }
  };

  const updatePlayerStat = async (id, field, value) => {
    await setDoc(doc(db, "players", id), { [field]: value }, { merge: true });
  };

  const addNewPlayer = async () => {
    const newId = Date.now().toString();
    const newPlayer = {
      id: newId,
      name: 'New Player',
      positions: '',
      attendance: 0,
      refereeDuty: 0,
      goals: 0,
      assists: 0,
      performance: 0,
      available: true
    };
    await setDoc(doc(db, "players", newId), newPlayer);
  };

  const deletePlayer = async (id) => {
    // Delete from Players DB
    await deleteDoc(doc(db, "players", id));
    
    // Remove from pitch DB if they were on it
    const newState = { ...pitchState };
    let changed = false;
    Object.keys(newState).forEach(key => {
      if (newState[key] === id) {
        delete newState[key];
        changed = true;
      }
    });
    if (changed) {
      await setDoc(doc(db, "match", "currentLineup"), { pitchState: newState }, { merge: true });
    }
  };

  // --- UI RENDER LOGIC ---

  const availablePlayers = players.filter(p => p.available);
  const pitchPlayerIds = Object.values(pitchState).filter(Boolean);
  const benchPlayers = availablePlayers.filter(p => !pitchPlayerIds.includes(p.id));

  const renderDashboard = () => (
    <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-700 w-full overflow-x-auto">
      <div className="p-4 flex justify-between items-center bg-slate-900 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          Squad Database
        </h2>
        <button 
          onClick={addNewPlayer}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Player
        </button>
      </div>
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-slate-800 text-slate-300 text-sm border-b border-slate-700">
            <th className="p-3 font-semibold">Matchday</th>
            <th className="p-3 font-semibold">Name</th>
            <th className="p-3 font-semibold">Position</th>
            <th className="p-3 font-semibold text-center">Att</th>
            <th className="p-3 font-semibold text-center">Ref</th>
            <th className="p-3 font-semibold text-center">G</th>
            <th className="p-3 font-semibold text-center">A</th>
            <th className="p-3 font-semibold text-center">Avg</th>
            <th className="p-3 font-semibold text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700 text-slate-200">
          {players.map(player => (
            <tr key={player.id} className="hover:bg-slate-750 transition-colors group">
              <td className="p-3">
                <button 
                  onClick={() => toggleAvailability(player.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${player.available ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}
                >
                  {player.available ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {player.available ? 'In' : 'Out'}
                </button>
              </td>
              <td className="p-3">
                <SyncInput 
                  value={player.name} 
                  onSave={(val) => updatePlayerStat(player.id, 'name', val)}
                  className="bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none w-full"
                />
              </td>
              <td className="p-3">
                <SyncInput 
                  value={player.positions} 
                  onSave={(val) => updatePlayerStat(player.id, 'positions', val)}
                  className="bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none w-24 text-sm"
                />
              </td>
              <td className="p-3 text-center">
                <SyncInput type="number" value={player.attendance} onSave={(val) => updatePlayerStat(player.id, 'attendance', val)} className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center" />
              </td>
              <td className="p-3 text-center">
                <SyncInput type="number" value={player.refereeDuty} onSave={(val) => updatePlayerStat(player.id, 'refereeDuty', val)} className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center" />
              </td>
              <td className="p-3 text-center">
                <SyncInput type="number" value={player.goals} onSave={(val) => updatePlayerStat(player.id, 'goals', val)} className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center" />
              </td>
              <td className="p-3 text-center">
                <SyncInput type="number" value={player.assists} onSave={(val) => updatePlayerStat(player.id, 'assists', val)} className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center" />
              </td>
              <td className="p-3 text-center">
                <SyncInput type="number" step="0.1" value={player.performance} onSave={(val) => updatePlayerStat(player.id, 'performance', val)} className="w-16 bg-slate-900 border border-slate-700 rounded p-1 text-center" />
              </td>
              <td className="p-3 text-center">
                <button onClick={() => deletePlayer(player.id)} className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-5 h-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPitch = () => {
    const layout = formation === 'Custom' 
      ? customFormationStr.split(/[-,\s]+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0)
      : FORMATIONS[formation] || [1, 4, 3, 3];
      
    let globalSlotIndex = 0;

    return (
      <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] bg-emerald-700 border-4 border-white shadow-2xl rounded-sm overflow-hidden flex flex-col justify-between py-8">
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

              return (
                <div 
                  key={currentSlotIndex}
                  onDrop={(e) => handleDropOnPitch(e, currentSlotIndex)}
                  onDragOver={handleDragOver}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed flex items-center justify-center transition-all cursor-pointer shadow-lg
                    ${assignedPlayer ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900/50 border-white/50 hover:bg-slate-800/60'}`}
                >
                  {assignedPlayer ? (
                    <div 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, assignedPlayer.id)}
                      className="flex flex-col items-center justify-center w-full h-full text-white"
                    >
                      <div className="font-bold text-xs sm:text-sm truncate w-full text-center px-1">
                        {assignedPlayer.name.split(' ')[0]}
                      </div>
                    </div>
                  ) : (
                    <div className="text-white/40 text-xs text-center px-1">Slot</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderMatchday = () => (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Bench Sidebar */}
      <div 
        className="lg:w-1/4 w-full bg-slate-800 rounded-xl shadow-xl border border-slate-700 flex flex-col h-[400px] lg:h-[800px]"
        onDrop={handleDropOnBench}
        onDragOver={handleDragOver}
      >
        <div className="p-4 bg-slate-900 border-b border-slate-700 rounded-t-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Available Bench
          </h2>
          <p className="text-xs text-slate-400 mt-1">Drag players to the pitch</p>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {benchPlayers.length === 0 ? (
            <div className="text-slate-500 text-sm text-center mt-10">No players on the bench. Toggle availability in the dashboard.</div>
          ) : (
            benchPlayers.map(player => (
              <div 
                key={player.id}
                draggable
                onDragStart={(e) => handleDragStart(e, player.id)}
                className="bg-slate-700 p-3 rounded-lg border border-slate-600 cursor-grab active:cursor-grabbing hover:bg-slate-650 transition-colors flex items-center shadow-sm"
              >
                <GripVertical className="w-4 h-4 text-slate-400 mr-2" />
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">{player.name}</div>
                  <div className="text-xs text-indigo-300 font-semibold">{player.positions}</div>
                </div>
                <div className="text-xs bg-slate-900 text-slate-300 px-2 py-1 rounded">
                  Avg: {player.performance}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pitch Area */}
      <div className="lg:w-3/4 w-full flex flex-col gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
          <div className="text-white font-bold">Lineup Builder</div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-slate-300 text-sm font-medium">Formation:</label>
            <select 
              value={formation}
              onChange={handleFormationChange}
              className="bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              {Object.keys(FORMATIONS).map(form => (
                <option key={form} value={form}>{form}</option>
              ))}
              <option value="Custom">Custom...</option>
            </select>

            {formation === 'Custom' && (
              <input
                type="text"
                value={customFormationStr}
                onChange={(e) => setCustomFormationStr(e.target.value)}
                onBlur={handleCustomFormationBlur}
                placeholder="e.g. 1-4-3-3"
                className="bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-32 text-sm"
                title="Enter numbers separated by dashes (e.g. 1-4-3-3)"
              />
            )}
          </div>
        </div>

        {renderPitch()}
        
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Navigation */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900 p-4 sm:px-8 sm:py-6 rounded-2xl shadow-2xl border border-slate-800">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Vodka Juniors
            </h1>
            <p className="text-sm text-slate-400 mt-1">Team Management Platform</p>
          </div>
          
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button 
              onClick={() => setActiveTab('matchday')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'matchday' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutTemplate className="w-4 h-4" /> Matchday
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Users className="w-4 h-4" /> Database
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="animate-in fade-in duration-300 slide-in-from-bottom-4">
          {activeTab === 'dashboard' ? renderDashboard() : renderMatchday()}
        </main>

      </div>
    </div>
  );
}