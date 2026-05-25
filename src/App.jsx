import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  LayoutTemplate,
  Shield,
  Plus,
  X,
  GripVertical,
  CheckCircle,
  XCircle,
  Search,
  Download,
  History,
  Play,
  Square,
  Save,
  Activity,
  Clock,
  Trophy,
  Trash2,
  Edit2,
  Check,
  TableProperties,
  Swords,
  MessageSquare,
  ClipboardList,
  ArrowRightLeft,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAI1tfjgtlLqfVEfSnyhUYWIEcz_yjlTCE",
  authDomain: "vodka-juniors.firebaseapp.com",
  projectId: "vodka-juniors",
  storageBucket: "vodka-juniors.firebasestorage.app",
  messagingSenderId: "836406435815",
  appId: "1:836406435815:web:0b10e00b5cc635a8d82742",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fallback data
const INITIAL_PLAYERS = [
  {
    id: "1",
    name: "Alex (GK)",
    positions: "GK",
    attendance: 12,
    refereeDuty: 1,
    goals: 0,
    assists: 0,
    performance: 8.5,
    available: true,
    mvps: 0,
    yellowCards: 0,
    redCards: 0,
    minutes: 0,
    comments: "Solid shot stopper",
  },
  {
    id: "2",
    name: "Marcus (CB)",
    positions: "CB",
    attendance: 10,
    refereeDuty: 0,
    goals: 1,
    assists: 0,
    performance: 7.2,
    available: true,
    mvps: 0,
    yellowCards: 0,
    redCards: 0,
    minutes: 0,
    comments: "Needs to work on passing",
  },
];

const FORMATIONS = {
  "4-4-2": [1, 4, 4, 2],
  "4-3-3": [1, 4, 3, 3],
  "3-5-2": [1, 3, 5, 2],
  "4-2-3-1": [1, 4, 2, 3, 1],
  "5-3-2": [1, 5, 3, 2],
};

const FORMATION_LABELS = {
  "4-4-2": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"],
  "4-3-3": ["GK", "LB", "CB", "CB", "RB", "LCM", "CM", "RCM", "LW", "ST", "RW"],
  "3-5-2": [
    "GK",
    "LCB",
    "CB",
    "RCB",
    "LWB",
    "CM",
    "CDM",
    "CM",
    "RWB",
    "ST",
    "ST",
  ],
  "4-2-3-1": [
    "GK",
    "LB",
    "CB",
    "CB",
    "RB",
    "CDM",
    "CDM",
    "LAM",
    "CAM",
    "RAM",
    "ST",
  ],
  "5-3-2": [
    "GK",
    "LWB",
    "LCB",
    "CB",
    "RCB",
    "RWB",
    "LCM",
    "CM",
    "RCM",
    "ST",
    "ST",
  ],
};

const SyncInput = ({
  value,
  onSave,
  type = "text",
  className,
  step,
  onClick,
  placeholder,
}) => {
  const [localVal, setLocalVal] = useState(value);
  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleBlur = () => {
    let finalVal = localVal;
    if (type === "number") finalVal = parseFloat(localVal) || 0;
    onSave(finalVal);
  };

  return (
    <input
      type={type}
      step={step}
      value={localVal || ""}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onClick={onClick}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default function VodkaJuniorsApp() {
  const [activeTab, setActiveTab] = useState("matchday");

  const [players, setPlayers] = useState([]);
  const [pastMatches, setPastMatches] = useState([]);

  // Matchday State
  const [formation, setFormation] = useState("4-3-3");
  const [customFormationStr, setCustomFormationStr] = useState("1-4-2-3");
  const [pitchState, setPitchState] = useState({});
  const [customLabels, setCustomLabels] = useState({});
  const [matchStatus, setMatchStatus] = useState("pre");
  const [matchEvents, setMatchEvents] = useState([]);
  const [plannedEvents, setPlannedEvents] = useState([]);
  const [matchRatings, setMatchRatings] = useState({});
  const [matchLeague, setMatchLeague] = useState("");
  const [matchStage, setMatchStage] = useState("Group Stage");
  const [matchdayWeek, setMatchdayWeek] = useState(1);
  const [matchMvps, setMatchMvps] = useState([]);
  const [matchOpponent, setMatchOpponent] = useState("");
  const [matchScoreVJ, setMatchScoreVJ] = useState("");
  const [matchScoreOpp, setMatchScoreOpp] = useState("");
  const [matchDuration, setMatchDuration] = useState(90);

  // League Tracker State
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [leagueMatches, setLeagueMatches] = useState([]);

  // Local UI State
  const [benchSearchQuery, setBenchSearchQuery] = useState("");
  const [activeSlotSearch, setActiveSlotSearch] = useState(null);
  const [slotSearchQuery, setSlotSearchQuery] = useState("");
  const [dbSearchQuery, setDbSearchQuery] = useState("");
  const [dbSortOption, setDbSortOption] = useState("default");
  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState(null);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [newEvent, setNewEvent] = useState({
    type: "goal",
    playerId: "",
    playerOutId: "",
    minute: "",
  });
  const [newPlan, setNewPlan] = useState({
    type: "sub",
    minute: "",
    playerInId: "",
    playerOutId: "",
    notes: "",
  });

  const exportRef = useRef(null);

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
    const unsubscribe = onSnapshot(
      collection(db, "pastMatches"),
      (snapshot) => {
        const matches = [];
        snapshot.forEach((doc) => matches.push({ id: doc.id, ...doc.data() }));
        matches
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          .reverse();
        setPastMatches(matches);
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "match", "currentLineup"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPitchState(data.pitchState || {});
          setFormation(data.formation || "4-3-3");
          setCustomFormationStr(data.customFormationStr || "1-4-2-3");
          setCustomLabels(data.customLabels || {});
          setMatchStatus(data.status || "pre");
          setMatchEvents(data.events || []);
          setPlannedEvents(data.plannedEvents || []);
          setMatchRatings(data.ratings || {});
          setMatchLeague(data.league || "");
          setMatchStage(data.stage || "Group Stage");
          setMatchdayWeek(data.matchdayWeek || 1);
          setMatchMvps(data.mvps || []);
          setMatchOpponent(data.opponent || "");
          setMatchScoreVJ(data.scoreVJ || "");
          setMatchScoreOpp(data.scoreOpp || "");
          setMatchDuration(data.duration || 90);
        } else {
          setDoc(doc(db, "match", "currentLineup"), {
            pitchState: {},
            formation: "4-3-3",
            customFormationStr: "1-4-2-3",
            customLabels: {},
            status: "pre",
            events: [],
            plannedEvents: [],
            ratings: {},
            league: "",
            stage: "Group Stage",
            matchdayWeek: 1,
            mvps: [],
            opponent: "",
            scoreVJ: "",
            scoreOpp: "",
            duration: 90,
          });
        }
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "leagues"), (snapshot) => {
      const l = [];
      snapshot.forEach((doc) => l.push({ id: doc.id, ...doc.data() }));
      setLeagues(l);
      if (l.length > 0 && !selectedLeagueId) setSelectedLeagueId(l[0].id);
    });
    return () => unsub();
  }, [selectedLeagueId]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "leagueMatches"), (snapshot) => {
      const m = [];
      snapshot.forEach((doc) => m.push({ id: doc.id, ...doc.data() }));
      setLeagueMatches(m);
    });
    return () => unsub();
  }, []);

  // --- ACTIONS (Write to Cloud) ---

  const handleFormationChange = async (e) => {
    await setDoc(
      doc(db, "match", "currentLineup"),
      { formation: e.target.value, pitchState: {}, customLabels: {} },
      { merge: true },
    );
  };

  const handleCustomFormationBlur = async () => {
    await setDoc(
      doc(db, "match", "currentLineup"),
      { customFormationStr, pitchState: {}, customLabels: {} },
      { merge: true },
    );
  };

  const updateCustomLabel = async (slotIndex, newLabel) => {
    const updatedLabels = {
      ...customLabels,
      [slotIndex]: newLabel.toUpperCase(),
    };
    await setDoc(
      doc(db, "match", "currentLineup"),
      { customLabels: updatedLabels },
      { merge: true },
    );
  };

  const updateMatchField = async (field, value) => {
    await setDoc(
      doc(db, "match", "currentLineup"),
      { [field]: value },
      { merge: true },
    );
  };

  const handleClearLineup = async () => {
    if (window.confirm("Are you sure you want to clear the entire lineup?")) {
      await setDoc(
        doc(db, "match", "currentLineup"),
        { pitchState: {} },
        { merge: true },
      );
    }
  };

  const handleDragStart = (e, playerId) => {
    e.dataTransfer.setData("playerId", playerId);
  };

  const handleDropOnPitch = async (e, slotIndex) => {
    e.preventDefault();
    if (matchStatus !== "pre") return;
    const playerId = e.dataTransfer.getData("playerId");
    const newState = { ...pitchState };
    Object.keys(newState).forEach((key) => {
      if (newState[key] === playerId) newState[key] = null;
    });
    newState[slotIndex] = playerId;
    await setDoc(
      doc(db, "match", "currentLineup"),
      { pitchState: newState },
      { merge: true },
    );
  };

  const handleDropOnBench = async (e) => {
    e.preventDefault();
    if (matchStatus !== "pre") return;
    const playerId = e.dataTransfer.getData("playerId");
    const newState = { ...pitchState };
    Object.keys(newState).forEach((key) => {
      if (newState[key] === playerId) delete newState[key];
    });
    await setDoc(
      doc(db, "match", "currentLineup"),
      { pitchState: newState },
      { merge: true },
    );
  };

  const handleQuickAssign = async (slotIndex, playerId) => {
    if (matchStatus !== "pre") return;
    const newState = { ...pitchState };
    Object.keys(newState).forEach((key) => {
      if (newState[key] === playerId) newState[key] = null;
    });
    newState[slotIndex] = playerId;
    await setDoc(
      doc(db, "match", "currentLineup"),
      { pitchState: newState },
      { merge: true },
    );
    setActiveSlotSearch(null);
    setSlotSearchQuery("");
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleSaveImage = async () => {
    if (exportRef.current) {
      try {
        const { toPng } = await import("https://esm.sh/html-to-image");
        const dataUrl = await toPng(exportRef.current, {
          backgroundColor: "#020617",
          pixelRatio: 2,
        });
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

  // --- GAME PLAN ENGINE ---
  const addPlannedEvent = async () => {
    if (!newPlan.minute) return;
    const planToSave = {
      id: Date.now().toString(),
      ...newPlan,
      minute: parseInt(newPlan.minute),
    };
    const updatedPlans = [...plannedEvents, planToSave];
    await updateMatchField("plannedEvents", updatedPlans);
    setNewPlan({
      type: "sub",
      minute: "",
      playerInId: "",
      playerOutId: "",
      notes: "",
    });
  };

  const deletePlannedEvent = async (id) => {
    const updatedPlans = plannedEvents.filter((p) => p.id !== id);
    await updateMatchField("plannedEvents", updatedPlans);
  };

  const executePlannedEvent = async (plan) => {
    // If it's a sub, convert it to an actual event log
    if (plan.type === "sub") {
      const eventToSave = {
        id: Date.now().toString(),
        type: "sub",
        minute: plan.minute,
        playerIn: plan.playerInId,
        playerOut: plan.playerOutId,
      };
      await updateMatchField("events", [...matchEvents, eventToSave]);
    }
    // Delete it from the plan once executed
    await deletePlannedEvent(plan.id);
  };

  // --- POST MATCH REVIEW ENGINE ---

  const changeMatchStatus = async (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === "review") {
      const activeLeague = leagues.find((l) => l.id === selectedLeagueId);
      updates.league = activeLeague ? activeLeague.id : "";
      updates.stage = "Group Stage";
      updates.matchdayWeek = 1;
      // Do NOT clear plannedEvents here so they carry over to the review!
      updates.events = [];
      updates.ratings = {};
      updates.mvps = [];
      updates.opponent = "";
      updates.scoreVJ = 0;
      updates.scoreOpp = 0;
      updates.duration = 90;
    }
    await setDoc(doc(db, "match", "currentLineup"), updates, { merge: true });
  };

  const updateMatchRating = async (playerId, rating) => {
    const newRatings = { ...matchRatings, [playerId]: parseFloat(rating) || 0 };
    await setDoc(
      doc(db, "match", "currentLineup"),
      { ratings: newRatings },
      { merge: true },
    );
  };

  const addManualEvent = async () => {
    if (!newEvent.playerId || !newEvent.minute) return;
    const eventToSave = {
      id: Date.now().toString(),
      type: newEvent.type,
      minute: parseInt(newEvent.minute),
    };

    if (newEvent.type === "sub") {
      if (!newEvent.playerOutId) return;
      eventToSave.playerIn = newEvent.playerId;
      eventToSave.playerOut = newEvent.playerOutId;
    } else {
      eventToSave.playerId = newEvent.playerId;
    }

    const updatedEvents = [...matchEvents, eventToSave];
    await updateMatchField("events", updatedEvents);
    setNewEvent({ type: "goal", playerId: "", playerOutId: "", minute: "" });
  };

  const deleteMatchEvent = async (eventId) => {
    const updatedEvents = matchEvents.filter((e) => e.id !== eventId);
    await updateMatchField("events", updatedEvents);
  };

  const finishAndSaveMatch = async () => {
    const playersInvolved = new Set(
      [
        ...Object.values(pitchState),
        ...matchEvents.filter((e) => e.type === "sub").map((e) => e.playerOut),
        ...matchEvents.filter((e) => e.type === "sub").map((e) => e.playerIn),
      ].filter(Boolean),
    );

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
      opponent: matchOpponent || "Unknown Opponent",
      scoreVJ: matchScoreVJ || 0,
      scoreOpp: matchScoreOpp || 0,
      duration: parseInt(matchDuration) || 90,
    };

    await addDoc(collection(db, "pastMatches"), newMatch);
    await setDoc(
      doc(db, "match", "currentLineup"),
      {
        status: "pre",
        events: [],
        plannedEvents: [],
        ratings: {},
        league: "",
        stage: "",
        matchdayWeek: 1,
        mvps: [],
        opponent: "",
        scoreVJ: "",
        scoreOpp: "",
        duration: 90,
      },
      { merge: true },
    );
    setActiveTab("history");
  };

  const deletePastMatch = async (matchId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this match? This will remove the match from history and may affect player stats.",
      )
    ) {
      await deleteDoc(doc(db, "pastMatches", matchId));
    }
  };

  const addPlayerToPastMatch = async (matchId, playerId, rating) => {
    const match = pastMatches.find((m) => m.id === matchId);
    if (!match || !playerId) return;
    const participated = Array.from(
      new Set([...(match.participated || []), playerId]),
    );
    const ratings = {
      ...(match.ratings || {}),
      [playerId]: parseFloat(rating) || 0,
    };
    await setDoc(
      doc(db, "pastMatches", matchId),
      { participated, ratings },
      { merge: true },
    );
  };

  const addEventToPastMatch = async (matchId, eventObj) => {
    const match = pastMatches.find((m) => m.id === matchId);
    if (!match || !eventObj) return;
    const events = [...(match.events || []), eventObj];
    await setDoc(doc(db, "pastMatches", matchId), { events }, { merge: true });
  };

  const removeEventFromPastMatch = async (matchId, eventId) => {
    const match = pastMatches.find((m) => m.id === matchId);
    if (!match) return;
    const events = (match.events || []).filter(
      (e) => e.id !== eventId && String(e.id) !== String(eventId),
    );
    await setDoc(doc(db, "pastMatches", matchId), { events }, { merge: true });
  };

  const removePlayerFromPastMatch = async (matchId, playerId) => {
    const match = pastMatches.find((m) => m.id === matchId);
    if (!match) return;
    const participated = (match.participated || []).filter(
      (id) => id !== playerId,
    );
    const ratings = { ...(match.ratings || {}) };
    if (ratings && Object.prototype.hasOwnProperty.call(ratings, playerId))
      delete ratings[playerId];
    await setDoc(
      doc(db, "pastMatches", matchId),
      { participated, ratings },
      { merge: true },
    );
  };

  // --- MULTI-LEAGUE / GROUPS MANAGER ACTIONS ---
  const addLeague = async (name, format) => {
    if (!name) return;
    await addDoc(collection(db, "leagues"), {
      name,
      format,
      teams: [{ name: "Vodka Juniors", group: "A" }],
    });
  };

  const deleteLeague = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this entire league and its settings? (Match history will remain intact)",
      )
    ) {
      await deleteDoc(doc(db, "leagues", id));
      setSelectedLeagueId(null);
    }
  };

  const addLeagueTeam = async (leagueId, teamName, group = "A") => {
    const league = leagues.find((l) => l.id === leagueId);
    if (!teamName || !league || league.teams.some((t) => t.name === teamName))
      return;

    const newTeams = [...league.teams, { name: teamName, group }];
    await setDoc(
      doc(db, "leagues", leagueId),
      { teams: newTeams },
      { merge: true },
    );
  };

  const removeLeagueTeam = async (leagueId, teamName) => {
    if (teamName === "Vodka Juniors") return;
    const league = leagues.find((l) => l.id === leagueId);
    if (league && window.confirm(`Delete ${teamName} from the league?`)) {
      const newTeams = league.teams.filter((t) => t.name !== teamName);
      await setDoc(
        doc(db, "leagues", leagueId),
        { teams: newTeams },
        { merge: true },
      );
    }
  };

  const addOtherMatchResult = async (
    leagueId,
    team1,
    score1,
    score2,
    team2,
    stage,
    week,
  ) => {
    if (!team1 || !team2 || team1 === team2 || score1 === "" || score2 === "")
      return;
    await addDoc(collection(db, "leagueMatches"), {
      leagueId,
      team1,
      team2,
      score1: parseInt(score1),
      score2: parseInt(score2),
      stage: stage || "Group Stage",
      matchdayWeek: parseInt(week) || 1,
      date: new Date().toISOString(),
    });
  };

  const deleteOtherMatchResult = async (id) => {
    if (window.confirm("Delete this match result?"))
      await deleteDoc(doc(db, "leagueMatches", id));
  };

  const calculateLeagueStandings = (league) => {
    let standings = {};
    league.teams.forEach((t) => {
      standings[t.name] = {
        name: t.name,
        group: t.group,
        p: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
      };
    });

    pastMatches
      .filter(
        (m) =>
          m.league === league.id && (!m.stage || m.stage.includes("Group")),
      )
      .forEach((m) => {
        const vj = "Vodka Juniors";
        const opp = m.opponent;
        if (!standings[vj])
          standings[vj] = {
            name: vj,
            group: "A",
            p: 0,
            w: 0,
            d: 0,
            l: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
          };
        if (!standings[opp])
          standings[opp] = {
            name: opp,
            group: "B",
            p: 0,
            w: 0,
            d: 0,
            l: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
          };

        const sVJ = parseInt(m.scoreVJ) || 0;
        const sOpp = parseInt(m.scoreOpp) || 0;

        standings[vj].p++;
        standings[vj].gf += sVJ;
        standings[vj].ga += sOpp;
        standings[opp].p++;
        standings[opp].gf += sOpp;
        standings[opp].ga += sVJ;

        if (sVJ > sOpp) {
          standings[vj].w++;
          standings[vj].pts += 3;
          standings[opp].l++;
        } else if (sVJ < sOpp) {
          standings[opp].w++;
          standings[opp].pts += 3;
          standings[vj].l++;
        } else {
          standings[vj].d++;
          standings[opp].d++;
          standings[vj].pts++;
          standings[opp].pts++;
        }
      });

    leagueMatches
      .filter(
        (m) =>
          m.leagueId === league.id && (!m.stage || m.stage.includes("Group")),
      )
      .forEach((m) => {
        if (!standings[m.team1])
          standings[m.team1] = {
            name: m.team1,
            group: "A",
            p: 0,
            w: 0,
            d: 0,
            l: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
          };
        if (!standings[m.team2])
          standings[m.team2] = {
            name: m.team2,
            group: "A",
            p: 0,
            w: 0,
            d: 0,
            l: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
          };

        standings[m.team1].p++;
        standings[m.team1].gf += m.score1;
        standings[m.team1].ga += m.score2;
        standings[m.team2].p++;
        standings[m.team2].gf += m.score2;
        standings[m.team2].ga += m.score1;

        if (m.score1 > m.score2) {
          standings[m.team1].w++;
          standings[m.team1].pts += 3;
          standings[m.team2].l++;
        } else if (m.score1 < m.score2) {
          standings[m.team2].w++;
          standings[m.team2].pts += 3;
          standings[m.team1].l++;
        } else {
          standings[m.team1].d++;
          standings[m.team2].d++;
          standings[m.team1].pts++;
          standings[m.team2].pts++;
        }
      });

    const sorted = Object.values(standings)
      .map((s) => {
        s.gd = s.gf - s.ga;
        return s;
      })
      .sort(
        (a, b) =>
          b.pts - a.pts ||
          b.gd - a.gd ||
          b.gf - a.gf ||
          a.name.localeCompare(b.name),
      );

    if (league.format === "groups") {
      return {
        groupA: sorted.filter((s) => s.group === "A"),
        groupB: sorted.filter((s) => s.group === "B"),
      };
    }
    return { standard: sorted };
  };

  // --- STATS ENGINE (Includes exact minutes played) ---
  const getCalculatedStats = (player) => {
    if (!player)
      return {
        goals: 0,
        assists: 0,
        avg: 0,
        mvps: 0,
        yellowCards: 0,
        redCards: 0,
        minutes: 0,
      };
    let goals = player.goals || 0;
    let assists = player.assists || 0;
    let mvps = player.mvps || 0;
    let yellowCards = player.yellowCards || 0;
    let redCards = player.redCards || 0;
    let minutes = player.minutes || 0; // Now reading directly from the player object
    let totalRating = (player.performance || 0) * (player.attendance || 0);
    let ratingCount = player.attendance || 0;

    pastMatches.forEach((m) => {
      if (typeof m.mvp === "string" && m.mvp === player.id) mvps++;
      if (Array.isArray(m.mvps) && m.mvps.includes(player.id)) mvps++;

      (m.events || []).forEach((e) => {
        if (e.playerId === player.id) {
          if (e.type === "goal") goals++;
          if (e.type === "assist") assists++;
          if (e.type === "yellowCard") yellowCards++;
          if (e.type === "redCard") redCards++;
        }
      });

      if (m.ratings && m.ratings[player.id]) {
        totalRating += Number(m.ratings[player.id]);
        ratingCount++;
      }
    });

    const avg =
      ratingCount > 0
        ? (totalRating / ratingCount).toFixed(1)
        : player.performance || 0;
    return { goals, assists, avg, mvps, yellowCards, redCards, minutes };
  };

  const getDisplayName = (player) => {
    if (!player) return "";
    const firstName = player.name.split(" ")[0];
    const duplicates = players.filter(
      (p) => p.name.split(" ")[0] === firstName,
    );
    if (duplicates.length > 1) return player.name.replace(/\s*\(.*?\)\s*/g, "");
    return firstName;
  };

  const getEventText = (ev) => {
    if (ev.type === "goal")
      return (
        <span>
          ⚽{" "}
          <strong className="text-emerald-400">
            {players.find((p) => p.id === ev.playerId)?.name || "Unknown"}
          </strong>{" "}
          scored!
        </span>
      );
    if (ev.type === "assist")
      return (
        <span>
          👟{" "}
          <strong className="text-indigo-300">
            {players.find((p) => p.id === ev.playerId)?.name || "Unknown"}
          </strong>{" "}
          assisted.
        </span>
      );
    if (ev.type === "yellowCard")
      return (
        <span>
          🟨{" "}
          <strong className="text-amber-400">
            {players.find((p) => p.id === ev.playerId)?.name || "Unknown"}
          </strong>{" "}
          booked.
        </span>
      );
    if (ev.type === "redCard")
      return (
        <span>
          🟥{" "}
          <strong className="text-rose-500">
            {players.find((p) => p.id === ev.playerId)?.name || "Unknown"}
          </strong>{" "}
          sent off!
        </span>
      );
    if (ev.type === "sub")
      return (
        <span>
          🔄{" "}
          <strong className="text-emerald-400">
            {players.find((p) => p.id === ev.playerIn)?.name || "In"}
          </strong>{" "}
          ON,{" "}
          <span className="text-slate-500">
            {players.find((p) => p.id === ev.playerOut)?.name || "Out"}
          </span>{" "}
          OFF
        </span>
      );
    return null;
  };

  // --- UI RENDER LOGIC ---

  const renderDashboard = () => {
    let dbPlayers = [...players].filter(
      (p) =>
        p.name.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
        p.positions.toLowerCase().includes(dbSearchQuery.toLowerCase()),
    );
    if (dbSortOption === "name")
      dbPlayers.sort((a, b) => a.name.localeCompare(b.name));
    else if (dbSortOption === "performance")
      dbPlayers.sort(
        (a, b) => getCalculatedStats(b).avg - getCalculatedStats(a).avg,
      );
    else dbPlayers.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    return (
      <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-700 w-full overflow-x-auto">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 shrink-0">
            <Users className="w-5 h-5 text-indigo-400" /> Squad Database
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
              onClick={() =>
                setDoc(doc(db, "players", Date.now().toString()), {
                  id: Date.now().toString(),
                  name: "New Player",
                  positions: "",
                  attendance: 0,
                  refereeDuty: 0,
                  goals: 0,
                  assists: 0,
                  performance: 0,
                  available: true,
                  mvps: 0,
                  yellowCards: 0,
                  redCards: 0,
                  minutes: 0,
                  comments: "",
                })
              }
              className="w-full sm:w-auto flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0"
            >
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
              <th className="p-3 font-semibold text-center" title="Manual">
                Att
              </th>
              <th className="p-3 font-semibold text-center" title="Manual">
                Ref
              </th>
              <th
                className="p-3 font-semibold text-center text-indigo-300"
                title="Auto-Calculated"
              >
                Mins ⏱️
              </th>
              <th
                className="p-3 font-semibold text-center text-amber-400"
                title="Auto-Calculated"
              >
                MVP 🏆
              </th>
              <th
                className="p-3 font-semibold text-center text-indigo-300"
                title="Auto-Calculated"
              >
                G 🔒
              </th>
              <th
                className="p-3 font-semibold text-center text-indigo-300"
                title="Auto-Calculated"
              >
                A 🔒
              </th>
              <th
                className="p-3 font-semibold text-center text-amber-400"
                title="Auto-Calculated"
              >
                🟨 🔒
              </th>
              <th
                className="p-3 font-semibold text-center text-rose-500"
                title="Auto-Calculated"
              >
                🟥 🔒
              </th>
              <th
                className="p-3 font-semibold text-center text-emerald-400"
                title="Auto-Calculated"
              >
                Avg 🔒
              </th>
              <th className="p-3 font-semibold">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" /> Comments
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 text-slate-200">
            {dbPlayers.map((player) => {
              const stats = getCalculatedStats(player);
              return (
                <tr
                  key={player.id}
                  className="hover:bg-slate-750 transition-colors group"
                >
                  <td className="p-3">
                    <button
                      onClick={async () => {
                        const newAvail = !player.available;
                        await setDoc(
                          doc(db, "players", player.id),
                          { available: newAvail },
                          { merge: true },
                        );
                        if (!newAvail && matchStatus === "pre") {
                          const newState = { ...pitchState };
                          Object.keys(newState).forEach((k) => {
                            if (newState[k] === player.id) delete newState[k];
                          });
                          await setDoc(
                            doc(db, "match", "currentLineup"),
                            { pitchState: newState },
                            { merge: true },
                          );
                        }
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${player.available ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}
                    >
                      {player.available ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}{" "}
                      {player.available ? "In" : "Out"}
                    </button>
                  </td>
                  <td className="p-3">
                    <SyncInput
                      value={player.name}
                      onSave={(val) =>
                        setDoc(
                          doc(db, "players", player.id),
                          { name: val },
                          { merge: true },
                        )
                      }
                      className="bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none w-full"
                    />
                  </td>
                  <td className="p-3">
                    <SyncInput
                      value={player.positions}
                      onSave={(val) =>
                        setDoc(
                          doc(db, "players", player.id),
                          { positions: val },
                          { merge: true },
                        )
                      }
                      className="bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none w-24 text-sm"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <SyncInput
                      type="number"
                      value={player.attendance}
                      onSave={(val) =>
                        setDoc(
                          doc(db, "players", player.id),
                          { attendance: val },
                          { merge: true },
                        )
                      }
                      className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <SyncInput
                      type="number"
                      value={player.refereeDuty || 0}
                      onSave={(val) =>
                        setDoc(
                          doc(db, "players", player.id),
                          { refereeDuty: val },
                          { merge: true },
                        )
                      }
                      className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center"
                    />
                  </td>
                  <td className="p-3 text-center text-indigo-300 font-medium">
                    <SyncInput
                      type="number"
                      value={player.minutes || 0}
                      onSave={(val) =>
                        setDoc(
                          doc(db, "players", player.id),
                          { minutes: parseInt(val) || 0 },
                          { merge: true },
                        )
                      }
                      className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center text-indigo-300"
                    />
                  </td>
                  <td className="p-3 text-center text-amber-400 font-bold">
                    {stats.mvps}
                  </td>
                  <td className="p-3 text-center text-indigo-300 font-medium">
                    {stats.goals}
                  </td>
                  <td className="p-3 text-center text-indigo-300 font-medium">
                    {stats.assists}
                  </td>
                  <td className="p-3 text-center text-amber-400 font-medium">
                    {stats.yellowCards}
                  </td>
                  <td className="p-3 text-center text-rose-500 font-medium">
                    {stats.redCards}
                  </td>
                  <td className="p-3 text-center text-emerald-400 font-bold">
                    {stats.avg}
                  </td>
                  <td className="p-3 pr-6">
                    <SyncInput
                      value={player.comments || ""}
                      onSave={(val) =>
                        setDoc(
                          doc(db, "players", player.id),
                          { comments: val },
                          { merge: true },
                        )
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none w-full min-w-[200px]"
                      placeholder="Add notes..."
                    />
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
        const lg = leagues.find((l) => l.id === match.league);
        const leagueName = lg ? lg.name : "Unknown League";

        return (
          <div
            key={match.id}
            className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-5 relative group"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEditing ? (
                <button
                  onClick={() => setEditingHistoryId(null)}
                  className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/40"
                  title="Done Editing"
                >
                  <Check className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setEditingHistoryId(match.id)}
                  className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white"
                  title="Edit Match Details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => deletePastMatch(match.id)}
                className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/30"
                title="Delete Match"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col mb-4 border-b border-slate-700 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">
                  {leagueName} {match.stage && `- ${match.stage}`}{" "}
                  {match.matchdayWeek && `(Week ${match.matchdayWeek})`}
                </h3>
                <span className="bg-indigo-600/20 text-indigo-400 px-3 py-0.5 rounded-full text-xs font-bold ml-2">
                  {match.formation}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                {isEditing ? (
                  <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700">
                    <span className="text-white font-bold">Vodka Juniors</span>
                    <SyncInput
                      type="number"
                      value={match.scoreVJ}
                      onSave={(val) =>
                        setDoc(
                          doc(db, "pastMatches", match.id),
                          { scoreVJ: val },
                          { merge: true },
                        )
                      }
                      className="w-12 bg-slate-800 border border-slate-600 rounded text-center text-white"
                    />
                    <span className="text-slate-500">-</span>
                    <SyncInput
                      type="number"
                      value={match.scoreOpp}
                      onSave={(val) =>
                        setDoc(
                          doc(db, "pastMatches", match.id),
                          { scoreOpp: val },
                          { merge: true },
                        )
                      }
                      className="w-12 bg-slate-800 border border-slate-600 rounded text-center text-white"
                    />
                    <SyncInput
                      value={match.opponent}
                      placeholder="Opponent Name"
                      onSave={(val) =>
                        setDoc(
                          doc(db, "pastMatches", match.id),
                          { opponent: val },
                          { merge: true },
                        )
                      }
                      className="bg-slate-800 border border-slate-600 rounded px-2 text-white"
                    />
                  </div>
                ) : (
                  <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                    <span>Vodka Juniors</span>
                    <span className="text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">
                      {match.scoreVJ || 0} - {match.scoreOpp || 0}
                    </span>
                    <span className="text-slate-400">
                      {match.opponent || "Opponent"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <span>{new Date(match.date).toLocaleDateString()}</span>
                <span>•</span>
                {isEditing ? (
                  <span className="flex items-center gap-1">
                    <SyncInput
                      type="number"
                      value={match.duration || 90}
                      onSave={(val) =>
                        setDoc(
                          doc(db, "pastMatches", match.id),
                          { duration: val },
                          { merge: true },
                        )
                      }
                      className="w-12 bg-slate-800 border border-slate-600 rounded text-center text-white p-0.5"
                    />{" "}
                    mins
                  </span>
                ) : (
                  <span>{match.duration || 90}' Match</span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <h4 className="text-slate-400 text-sm font-semibold mb-2">
                  Match Events
                </h4>
                {match.events && match.events.length > 0 ? (
                  <ul className="space-y-2">
                    {match.events
                      .sort((a, b) => a.minute - b.minute)
                      .map((ev, j) => (
                        <li
                          key={ev.id || j}
                          className="text-sm flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-700/50"
                        >
                          <span className="text-indigo-400 font-mono w-10">
                            {ev.minute}'
                          </span>
                          {getEventText(ev)}
                          {isEditing && (
                            <button
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    "Remove this event from the match?",
                                  )
                                )
                                  return;
                                await removeEventFromPastMatch(
                                  match.id,
                                  ev.id || String(j),
                                );
                              }}
                              className="ml-auto text-rose-400 p-1 rounded hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">
                    No events recorded.
                  </p>
                )}

                {isEditing && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <select
                      id={`addEventType-${match.id}`}
                      className="bg-slate-800 border border-slate-600 text-white rounded p-2 text-sm"
                    >
                      <option value="goal">Goal</option>
                      <option value="assist">Assist</option>
                      <option value="yellowCard">Yellow Card</option>
                      <option value="redCard">Red Card</option>
                      <option value="sub">Substitution</option>
                    </select>
                    <select
                      id={`addEventPlayer-${match.id}`}
                      className="bg-slate-800 border border-slate-600 text-white rounded p-2 text-sm"
                    >
                      <option value="">Player...</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select
                      id={`addEventPlayer2-${match.id}`}
                      className="bg-slate-800 border border-slate-600 text-white rounded p-2 text-sm"
                    >
                      <option value="">Player (Out)</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        id={`addEventMinute-${match.id}`}
                        type="number"
                        placeholder="Min"
                        className="w-20 bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white"
                      />
                      <button
                        onClick={async () => {
                          const type = document.getElementById(
                            `addEventType-${match.id}`,
                          ).value;
                          const p1 = document.getElementById(
                            `addEventPlayer-${match.id}`,
                          ).value;
                          const p2 = document.getElementById(
                            `addEventPlayer2-${match.id}`,
                          ).value;
                          const minute = document.getElementById(
                            `addEventMinute-${match.id}`,
                          ).value;
                          if (!minute) return alert("Enter minute");
                          const ev = {
                            id: Date.now().toString(),
                            type,
                            minute: parseInt(minute),
                          };
                          if (type === "sub") {
                            ev.playerIn = p1;
                            ev.playerOut = p2;
                            if (!p1 || !p2)
                              return alert(
                                "Select both players for a substitution",
                              );
                          } else {
                            ev.playerId = p1;
                            if (!p1)
                              return alert("Select a player for this event");
                          }
                          await addEventToPastMatch(match.id, ev);
                          document.getElementById(
                            `addEventMinute-${match.id}`,
                          ).value = "";
                          document.getElementById(
                            `addEventPlayer-${match.id}`,
                          ).value = "";
                          document.getElementById(
                            `addEventPlayer2-${match.id}`,
                          ).value = "";
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded font-bold"
                      >
                        Add Event
                      </button>
                    </div>
                  </div>
                )}

                {((match.mvps && match.mvps.length > 0) || match.mvp) &&
                  !isEditing && (
                    <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 w-fit">
                      <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> MVPs
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {typeof match.mvp === "string" &&
                          match.mvp &&
                          !match.mvps?.includes(match.mvp) && (
                            <span className="text-white font-bold bg-amber-500/20 px-2 py-1 rounded">
                              {players.find((p) => p.id === match.mvp)?.name}
                            </span>
                          )}
                        {Array.isArray(match.mvps) &&
                          match.mvps.map((pid) => (
                            <span
                              key={pid}
                              className="text-white font-bold bg-amber-500/20 px-2 py-1 rounded"
                            >
                              {players.find((p) => p.id === pid)?.name}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
              </div>

              <div className="flex-1">
                <h4 className="text-slate-400 text-sm font-semibold mb-2">
                  Player Ratings
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {match.participated?.map((pid) => {
                    const p = players.find((p) => p.id === pid);
                    if (!p) return null;
                    return (
                      <div
                        key={pid}
                        className="flex justify-between items-center text-sm bg-slate-900/50 p-2 rounded border border-slate-700/50"
                      >
                        <span className="text-slate-300 truncate pr-2">
                          {getDisplayName(p)}
                        </span>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <SyncInput
                              type="number"
                              step="0.1"
                              value={match.ratings[pid] || 0}
                              onSave={(val) => {
                                const newRatings = {
                                  ...match.ratings,
                                  [pid]: parseFloat(val) || 0,
                                };
                                setDoc(
                                  doc(db, "pastMatches", match.id),
                                  { ratings: newRatings },
                                  { merge: true },
                                );
                              }}
                              className="w-14 bg-slate-800 border border-slate-600 text-emerald-400 font-bold rounded p-1 text-center focus:outline-none"
                            />
                          ) : (
                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                              {match.ratings[pid] || "-"}
                            </span>
                          )}
                          {isEditing && (
                            <button
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    "Remove this player from the match?",
                                  )
                                )
                                  return;
                                await removePlayerFromPastMatch(match.id, pid);
                              }}
                              className="text-rose-400 p-1 rounded hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {isEditing && (
                    <div className="col-span-2 mt-2 flex items-center gap-2">
                      <select
                        id={`addPlayerSelect-${match.id}`}
                        className="bg-slate-800 border border-slate-600 text-white rounded p-2 text-sm"
                      >
                        <option value="">Add player...</option>
                        {players
                          .filter(
                            (p) => !(match.participated || []).includes(p.id),
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                      <input
                        id={`addPlayerRating-${match.id}`}
                        type="number"
                        step="0.1"
                        placeholder="Rating"
                        className="w-20 bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white"
                      />
                      <button
                        onClick={async () => {
                          const pid = document.getElementById(
                            `addPlayerSelect-${match.id}`,
                          ).value;
                          const rt = document.getElementById(
                            `addPlayerRating-${match.id}`,
                          ).value;
                          if (!pid) return alert("Select a player to add");
                          await addPlayerToPastMatch(match.id, pid, rt);
                          document.getElementById(
                            `addPlayerSelect-${match.id}`,
                          ).value = "";
                          document.getElementById(
                            `addPlayerRating-${match.id}`,
                          ).value = "";
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded font-bold"
                      >
                        Add
                      </button>
                    </div>
                  )}
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
          <p className="text-slate-400 mt-2">
            Log a post-match review to see it saved here.
          </p>
        </div>
      )}
    </div>
  );

  const renderLeagueTab = () => {
    const currentLeague = leagues.find((l) => l.id === selectedLeagueId);

    // Calculate all matches for this specific league
    const allLeagueGames = [
      ...pastMatches
        .filter((m) => m.league === currentLeague?.id)
        .map((m) => ({
          id: m.id,
          team1: "Vodka Juniors",
          team2: m.opponent,
          score1: m.scoreVJ,
          score2: m.scoreOpp,
          stage: m.stage,
          matchdayWeek: m.matchdayWeek || 1,
          isVJ: true,
          date: m.date,
        })),
      ...leagueMatches
        .filter((m) => m.leagueId === currentLeague?.id)
        .map((m) => ({
          id: m.id,
          team1: m.team1,
          team2: m.team2,
          score1: m.score1,
          score2: m.score2,
          stage: m.stage,
          matchdayWeek: m.matchdayWeek || 1,
          isVJ: false,
          date: m.date,
        })),
    ];

    // Extract unique matchdays for grouped view
    const matchdays = [
      ...new Set(allLeagueGames.map((m) => m.matchdayWeek)),
    ].sort((a, b) => b - a);

    return (
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {leagues.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelectedLeagueId(l.id)}
              className={`px-4 py-2 rounded-lg font-bold flex-shrink-0 transition-colors ${selectedLeagueId === l.id ? "bg-indigo-600 text-white shadow-md" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"}`}
            >
              {l.name}
            </button>
          ))}
          <button
            onClick={() => {
              const name = prompt("Enter League Name:");
              if (!name) return;
              const format = window.confirm(
                "Does this league have a Group Stage + Knockout Format?\n\n(Click OK for Groups, Cancel for a Standard Single Table)",
              )
                ? "groups"
                : "standard";
              addLeague(name, format);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1 flex-shrink-0 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" /> New League
          </button>
        </div>

        {currentLeague && (
          <>
            {/* SETTINGS MODULE */}
            <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-6 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                  <h3 className="text-indigo-400 font-bold">
                    Teams & Settings
                  </h3>
                  <button
                    onClick={() => deleteLeague(currentLeague.id)}
                    className="text-rose-500 hover:text-rose-400 text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete League
                  </button>
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    id="newTeamInput"
                    placeholder="Team Name..."
                    className="flex-1 bg-slate-900 border border-slate-600 text-white rounded p-2 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                  {currentLeague.format === "groups" && (
                    <select
                      id="newTeamGroup"
                      className="bg-slate-900 border border-slate-600 text-white rounded p-2 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="A">Group A</option>
                      <option value="B">Group B</option>
                    </select>
                  )}
                  <button
                    onClick={() => {
                      const val = document.getElementById("newTeamInput").value;
                      const grp =
                        currentLeague.format === "groups"
                          ? document.getElementById("newTeamGroup").value
                          : "A";
                      addLeagueTeam(currentLeague.id, val, grp);
                      document.getElementById("newTeamInput").value = "";
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded font-bold transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {currentLeague.format === "groups" ? (
                    <>
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Group A
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {currentLeague.teams
                            .filter((t) => t.group === "A")
                            .map((t) => (
                              <span
                                key={t.name}
                                className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${t.name === "Vodka Juniors" ? "bg-indigo-900/50 text-indigo-300 border border-indigo-500/50" : "bg-slate-800 text-slate-300 border border-slate-600"}`}
                              >
                                {t.name}{" "}
                                {t.name !== "Vodka Juniors" && (
                                  <button
                                    onClick={() =>
                                      removeLeagueTeam(currentLeague.id, t.name)
                                    }
                                    className="text-slate-500 hover:text-rose-400"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Group B
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {currentLeague.teams
                            .filter((t) => t.group === "B")
                            .map((t) => (
                              <span
                                key={t.name}
                                className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${t.name === "Vodka Juniors" ? "bg-indigo-900/50 text-indigo-300 border border-indigo-500/50" : "bg-slate-800 text-slate-300 border border-slate-600"}`}
                              >
                                {t.name}{" "}
                                {t.name !== "Vodka Juniors" && (
                                  <button
                                    onClick={() =>
                                      removeLeagueTeam(currentLeague.id, t.name)
                                    }
                                    className="text-slate-500 hover:text-rose-400"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {currentLeague.teams.map((t) => (
                        <span
                          key={t.name}
                          className={`text-sm px-3 py-1 rounded-full flex items-center gap-2 ${t.name === "Vodka Juniors" ? "bg-indigo-900/50 text-indigo-300 border border-indigo-500/50" : "bg-slate-700 text-slate-300"}`}
                        >
                          {t.name}{" "}
                          {t.name !== "Vodka Juniors" && (
                            <button
                              onClick={() =>
                                removeLeagueTeam(currentLeague.id, t.name)
                              }
                              className="text-slate-500 hover:text-rose-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-emerald-400 font-bold mb-3 border-b border-slate-700 pb-2">
                  Log Other Match Result
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Input results between two other teams to update the table.
                </p>

                <div className="flex gap-2 mb-2">
                  {currentLeague.format === "groups" && (
                    <select
                      id="stageSelect"
                      className="flex-1 bg-slate-900 text-white border border-slate-600 rounded p-2 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Group Stage">Group Stage</option>
                      <option value="Semi-Final">Semi-Final</option>
                      <option value="Final">Final</option>
                    </select>
                  )}
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded p-2 text-sm">
                    <span className="text-slate-400">Matchday/Week:</span>
                    <input
                      type="number"
                      id="matchdayWeekInput"
                      defaultValue="1"
                      className="w-12 bg-transparent text-white focus:outline-none focus:text-emerald-400 font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 bg-slate-900 p-3 rounded-lg border border-slate-700">
                  <select
                    id="team1Select"
                    className="w-1/3 bg-slate-800 text-white border border-slate-600 rounded p-2 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Home...</option>
                    {currentLeague.teams.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    id="score1Input"
                    className="w-12 bg-slate-800 border border-slate-600 text-white rounded p-2 text-center focus:outline-none focus:border-emerald-500 font-bold"
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    id="score2Input"
                    className="w-12 bg-slate-800 border border-slate-600 text-white rounded p-2 text-center focus:outline-none focus:border-emerald-500 font-bold"
                  />

                  <select
                    id="team2Select"
                    className="w-1/3 bg-slate-800 text-white border border-slate-600 rounded p-2 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Away...</option>
                    {currentLeague.teams.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    const stg =
                      currentLeague.format === "groups"
                        ? document.getElementById("stageSelect").value
                        : "League Match";
                    const wk =
                      document.getElementById("matchdayWeekInput").value;
                    addOtherMatchResult(
                      currentLeague.id,
                      document.getElementById("team1Select").value,
                      document.getElementById("score1Input").value,
                      document.getElementById("score2Input").value,
                      document.getElementById("team2Select").value,
                      stg,
                      wk,
                    );
                    document.getElementById("team1Select").value = "";
                    document.getElementById("score1Input").value = "";
                    document.getElementById("score2Input").value = "";
                    document.getElementById("team2Select").value = "";
                  }}
                  className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg font-bold transition-colors shadow-lg"
                >
                  Save Result
                </button>
              </div>
            </div>

            {/* MATCHDAY RESULTS ACCORDION */}
            {matchdays.length > 0 && (
              <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-xl font-bold text-white">
                    Results by Matchday
                  </h3>
                </div>
                <div className="space-y-6">
                  {matchdays.map((week) => (
                    <div key={week}>
                      <h4 className="text-slate-400 font-bold uppercase tracking-wider mb-2 text-sm">
                        Matchday {week}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allLeagueGames
                          .filter((m) => m.matchdayWeek === week)
                          .map((m) => (
                            <div
                              key={m.id}
                              className="flex justify-between items-center text-sm bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-sm text-slate-300"
                            >
                              <div className="flex flex-col flex-1">
                                {m.stage && m.stage !== "League Match" && (
                                  <span className="text-[10px] text-emerald-400/80 font-bold uppercase mb-1">
                                    {m.stage}
                                  </span>
                                )}
                                <div className="flex justify-between items-center gap-2 w-full">
                                  <span
                                    className={`truncate w-[40%] ${m.team1 === "Vodka Juniors" ? "text-indigo-400 font-bold" : ""}`}
                                  >
                                    {m.team1}
                                  </span>
                                  <span className="bg-slate-800 px-2 py-1 rounded text-white font-black">
                                    {m.score1} - {m.score2}
                                  </span>
                                  <span
                                    className={`truncate text-right w-[40%] ${m.team2 === "Vodka Juniors" ? "text-indigo-400 font-bold" : ""}`}
                                  >
                                    {m.team2}
                                  </span>
                                </div>
                              </div>
                              {!m.isVJ && (
                                <button
                                  onClick={() => deleteOtherMatchResult(m.id)}
                                  className="text-slate-500 hover:text-rose-400 ml-3"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STANDINGS AND KNOCKOUTS MODULE */}
            {(() => {
              const stds = calculateLeagueStandings(currentLeague);

              const renderTable = (data, title) => (
                <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-700 w-full mb-6">
                  <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center gap-2">
                    <TableProperties className="w-5 h-5 text-amber-400" />
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                          <th className="p-3 font-semibold text-center w-10">
                            #
                          </th>
                          <th className="p-3 font-semibold">Club</th>
                          <th className="p-3 font-semibold text-center">MP</th>
                          <th className="p-3 font-semibold text-center">W</th>
                          <th className="p-3 font-semibold text-center">D</th>
                          <th className="p-3 font-semibold text-center">L</th>
                          <th className="p-3 font-semibold text-center">GF</th>
                          <th className="p-3 font-semibold text-center">GA</th>
                          <th className="p-3 font-semibold text-center">GD</th>
                          <th className="p-3 font-semibold text-center text-white">
                            Pts
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700 text-slate-200">
                        {data.map((team, idx) => (
                          <tr
                            key={team.name}
                            className={`transition-colors 
                                            ${team.name === "Vodka Juniors" ? "bg-indigo-900/40 font-bold" : "hover:bg-slate-750"}
                                            ${currentLeague.format === "groups" && idx < 2 ? "border-l-4 border-l-emerald-500" : ""}
                                        `}
                          >
                            <td
                              className={`p-3 text-center font-mono ${currentLeague.format === "groups" && idx < 2 ? "text-emerald-400 font-bold" : "text-slate-500"}`}
                            >
                              {idx + 1}
                            </td>
                            <td className="p-3 flex items-center gap-2">
                              {team.name === "Vodka Juniors" ? (
                                <Shield className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <Shield className="w-4 h-4 text-slate-600" />
                              )}
                              <span
                                className={
                                  team.name === "Vodka Juniors"
                                    ? "text-indigo-300"
                                    : "text-slate-300"
                                }
                              >
                                {team.name}
                              </span>
                            </td>
                            <td className="p-3 text-center">{team.p}</td>
                            <td className="p-3 text-center text-emerald-400">
                              {team.w}
                            </td>
                            <td className="p-3 text-center text-slate-400">
                              {team.d}
                            </td>
                            <td className="p-3 text-center text-rose-400">
                              {team.l}
                            </td>
                            <td className="p-3 text-center">{team.gf}</td>
                            <td className="p-3 text-center">{team.ga}</td>
                            <td className="p-3 text-center">
                              {team.gd > 0 ? `+${team.gd}` : team.gd}
                            </td>
                            <td className="p-3 text-center text-white text-lg font-black">
                              {team.pts}
                            </td>
                          </tr>
                        ))}
                        {data.length === 0 && (
                          <tr>
                            <td
                              colSpan="10"
                              className="p-4 text-center text-slate-500"
                            >
                              No teams assigned.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );

              let A1 = "1st Group A";
              let A2 = "2nd Group A";
              let B1 = "1st Group B";
              let B2 = "2nd Group B";

              if (currentLeague.format === "groups") {
                A1 = stds.groupA[0]?.name || "1st Group A";
                A2 = stds.groupA[1]?.name || "2nd Group A";
                B1 = stds.groupB[0]?.name || "1st Group B";
                B2 = stds.groupB[1]?.name || "2nd Group B";
              }

              const loggedSFs = allLeagueGames.filter(
                (m) => m.stage === "Semi-Final",
              );
              const sf1Match = loggedSFs[0] || null;
              const sf2Match = loggedSFs[1] || null;

              const sf1TeamA = sf1Match ? sf1Match.team1 : A1;
              const sf1TeamB = sf1Match ? sf1Match.team2 : B2;
              const sf2TeamA = sf2Match ? sf2Match.team1 : B1;
              const sf2TeamB = sf2Match ? sf2Match.team2 : A2;

              const getWinnerName = (m, defaultName) => {
                if (!m) return defaultName;
                if (m.score1 > m.score2) return m.team1;
                if (m.score2 > m.score1) return m.team2;
                return "Winner (Pens)";
              };

              const loggedFinals = allLeagueGames.filter(
                (m) => m.stage === "Final",
              );
              const finalMatch = loggedFinals[0] || null;

              const finalTeam1 = finalMatch
                ? finalMatch.team1
                : getWinnerName(sf1Match, "Winner SF 1");
              const finalTeam2 = finalMatch
                ? finalMatch.team2
                : getWinnerName(sf2Match, "Winner SF 2");

              const renderKnockoutBox = (
                match,
                teamA,
                teamB,
                label,
                isFinal = false,
              ) => {
                if (match) {
                  const isVJ = match.isVJ;
                  if (isFinal) {
                    return (
                      <div
                        key={match.id}
                        className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 p-4 rounded-xl border border-amber-500/50 flex flex-col items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      >
                        <div className="w-full flex justify-between items-center gap-4">
                          <span className="text-white font-bold text-lg truncate w-1/2">
                            {match.team1}
                          </span>
                          <span className="text-slate-300 font-medium text-lg truncate text-right w-1/2">
                            {match.team2}
                          </span>
                        </div>
                        <span className="bg-slate-900 px-4 py-2 rounded-lg text-amber-400 font-black text-2xl shadow-inner border border-slate-700">
                          {match.score1} - {match.score2}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={match.id}
                      className={`p-3 rounded-lg border flex justify-between items-center shadow-md ${isVJ ? "bg-indigo-900/40 border-indigo-500/50" : "bg-slate-900 border-slate-700"}`}
                    >
                      <span
                        className={`font-bold truncate w-[40%] ${match.team1 === "Vodka Juniors" ? "text-indigo-300" : "text-slate-300"}`}
                      >
                        {match.team1}
                      </span>
                      <span
                        className={`px-3 py-1 rounded font-black ${isVJ ? "bg-indigo-950 text-emerald-400" : "bg-slate-800 text-white"}`}
                      >
                        {match.score1} - {match.score2}
                      </span>
                      <span
                        className={`font-bold truncate text-right w-[40%] ${match.team2 === "Vodka Juniors" ? "text-indigo-300" : "text-slate-300"}`}
                      >
                        {match.team2}
                      </span>
                    </div>
                  );
                }
                // Placeholder
                if (isFinal) {
                  return (
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-amber-500/30 border-dashed flex flex-col items-center gap-3 shadow-sm">
                      <div className="w-full flex justify-between items-center gap-4 text-slate-500 font-medium text-sm">
                        <span className="truncate text-center flex-1">
                          {teamA}
                        </span>
                        <span className="text-amber-500/50 font-bold text-xs uppercase px-2">
                          VS
                        </span>
                        <span className="truncate text-center flex-1">
                          {teamB}
                        </span>
                      </div>
                      <span className="text-slate-600 font-bold text-xl uppercase tracking-widest">
                        {label}
                      </span>
                    </div>
                  );
                }
                return (
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center border-dashed shadow-sm">
                    <span className="text-slate-500 font-medium truncate w-[40%]">
                      {teamA}
                    </span>
                    <span className="text-slate-600 font-bold text-xs uppercase px-2">
                      {label}
                    </span>
                    <span className="text-slate-500 font-medium truncate text-right w-[40%]">
                      {teamB}
                    </span>
                  </div>
                );
              };

              return (
                <div>
                  {currentLeague.format === "groups" ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {renderTable(
                        stds.groupA,
                        `${currentLeague.name} - Group A`,
                      )}
                      {renderTable(
                        stds.groupB,
                        `${currentLeague.name} - Group B`,
                      )}
                    </div>
                  ) : (
                    renderTable(
                      stds.standard,
                      `${currentLeague.name} Standings`,
                    )
                  )}

                  {currentLeague.format === "groups" && (
                    <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-6 mt-6">
                      <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
                        <Swords className="w-6 h-6 text-rose-500" />
                        <h2 className="text-2xl font-black text-white">
                          Knockout Stage
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-4 text-center">
                            Semi-Finals
                          </h3>
                          <div className="space-y-4">
                            {renderKnockoutBox(
                              sf1Match,
                              sf1TeamA,
                              sf1TeamB,
                              "SF 1",
                            )}
                            {renderKnockoutBox(
                              sf2Match,
                              sf2TeamA,
                              sf2TeamB,
                              "SF 2",
                            )}
                          </div>
                        </div>

                        <div className="relative">
                          {/* Visual connector lines on desktop */}
                          <div className="hidden md:block absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-px bg-slate-700"></div>
                          <div className="hidden md:block absolute -left-8 top-1/4 bottom-1/4 w-px bg-slate-700"></div>

                          <h3 className="text-amber-500 font-bold uppercase tracking-wider mb-4 text-center flex items-center justify-center gap-2">
                            <Trophy className="w-4 h-4" /> Final
                          </h3>
                          <div className="h-full flex items-center justify-center -mt-8">
                            <div className="w-full max-w-sm">
                              {renderKnockoutBox(
                                finalMatch,
                                finalTeam1,
                                finalTeam2,
                                "THE FINAL",
                                true,
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    );
  };

  const renderPostMatchReview = () => {
    const playersInvolved = Array.from(
      new Set(
        [
          ...Object.values(pitchState),
          ...matchEvents
            .filter((e) => e.type === "sub")
            .map((e) => e.playerOut),
          ...matchEvents.filter((e) => e.type === "sub").map((e) => e.playerIn),
        ].filter(Boolean),
      ),
    );

    // Fallback to all available players if lineup wasn't fully built
    const matchAvailablePlayers = players.filter((p) => p.available);
    const activeLeague = leagues.find((l) => l.id === matchLeague);

    return (
      <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-6 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white mb-2">
            Post-Match Review
          </h2>
          <p className="text-slate-400">
            Log all match details, events, and player ratings here.
          </p>
        </div>

        {/* Basic Match Info */}
        <div className="bg-slate-900 rounded-lg p-5 border border-slate-700 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 w-full">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
              Opponent Name
            </label>
            <select
              value={matchOpponent}
              onChange={(e) => updateMatchField("opponent", e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 text-white rounded p-3 focus:outline-none focus:border-indigo-500 font-bold"
            >
              <option value="">Select Opponent...</option>
              {activeLeague &&
                activeLeague.teams
                  .filter((t) => t.name !== "Vodka Juniors")
                  .map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
              <option value="Other">Other / Not in League</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1 block">
                Vodka Jrs
              </label>
              <input
                type="number"
                value={matchScoreVJ}
                onChange={(e) => updateMatchField("scoreVJ", e.target.value)}
                className="w-20 bg-slate-800 border border-indigo-500/50 text-white rounded p-3 focus:outline-none focus:border-indigo-500 font-black text-2xl text-center"
              />
            </div>
            <span className="text-2xl text-slate-500 font-black mt-4">-</span>
            <div className="text-center">
              <label className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1 block">
                Opponent
              </label>
              <input
                type="number"
                value={matchScoreOpp}
                onChange={(e) => updateMatchField("scoreOpp", e.target.value)}
                className="w-20 bg-slate-800 border border-rose-500/50 text-white rounded p-3 focus:outline-none focus:border-rose-500 font-black text-2xl text-center"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-xs text-slate-500 font-bold block mb-1">
              League / Competition
            </label>
            <select
              value={matchLeague}
              onChange={(e) => {
                updateMatchField("league", e.target.value);
                updateMatchField("stage", "Group Stage");
              }}
              className="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="">None / Friendly</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          {activeLeague && activeLeague.format === "groups" && (
            <div className="flex-1">
              <label className="text-xs text-amber-500 font-bold block mb-1">
                Tournament Stage
              </label>
              <select
                value={matchStage}
                onChange={(e) => updateMatchField("stage", e.target.value)}
                className="w-full bg-slate-800 border border-amber-500/50 text-white rounded p-2 focus:outline-none focus:border-amber-500"
              >
                <option value="Group Stage">Group Stage</option>
                <option value="Semi-Final">Semi-Final</option>
                <option value="Final">Final</option>
              </select>
            </div>
          )}
          <div className="w-32">
            <label className="text-xs text-slate-500 font-bold block mb-1">
              Matchday / Wk
            </label>
            <input
              type="number"
              value={matchdayWeek}
              onChange={(e) =>
                updateMatchField("matchdayWeek", parseInt(e.target.value) || 1)
              }
              className="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 focus:outline-none focus:border-indigo-500 text-center font-bold"
            />
          </div>
          <div className="w-32">
            <label className="text-xs text-slate-500 font-bold block mb-1">
              Duration (mins)
            </label>
            <input
              type="number"
              placeholder="90"
              value={matchDuration}
              onChange={(e) =>
                updateMatchField("duration", parseInt(e.target.value) || 0)
              }
              className="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 focus:outline-none focus:border-indigo-500 text-center font-bold"
            />
          </div>
        </div>

        {/* TACTICAL PLAN EXECUTION */}
        {plannedEvents.length > 0 && (
          <div className="bg-indigo-900/30 rounded-lg p-4 border border-indigo-500/50 mb-6">
            <h3 className="text-indigo-400 font-bold mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Confirm Game Plan
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              You pre-planned these moves. Confirm them below to instantly add
              them to the match log.
            </p>
            <div className="space-y-2">
              {plannedEvents
                .sort((a, b) => a.minute - b.minute)
                .map((plan) => (
                  <div
                    key={plan.id}
                    className="text-sm flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-indigo-400 font-mono w-8">
                        {plan.minute}'
                      </span>
                      {plan.type === "sub" ? (
                        <span className="flex flex-col">
                          <span>
                            🔄{" "}
                            <strong className="text-emerald-400">
                              {players.find((p) => p.id === plan.playerInId)
                                ?.name || "In"}
                            </strong>{" "}
                            ON,{" "}
                            <span className="text-slate-500">
                              {players.find((p) => p.id === plan.playerOutId)
                                ?.name || "Out"}
                            </span>{" "}
                            OFF
                          </span>
                          {plan.notes && (
                            <span className="text-xs text-slate-400 italic mt-0.5">
                              "{plan.notes}"
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="flex flex-col">
                          <span>
                            <ArrowRightLeft className="w-3 h-3 inline mr-1 text-amber-500" />{" "}
                            <strong className="text-amber-500">
                              Tactic Shift
                            </strong>
                          </span>
                          {plan.notes && (
                            <span className="text-xs text-slate-300 mt-0.5">
                              {plan.notes}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => executePlannedEvent(plan)}
                        className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 px-3 py-1 rounded text-xs font-bold transition-colors"
                      >
                        ✔️ Confirm
                      </button>
                      <button
                        onClick={() => deletePlannedEvent(plan.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-6 relative overflow-hidden">
          <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider text-slate-400">
            Log Match Event
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Substitutions are optional. If you leave them out, the app will
            assume the starting 11 played the full match.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select
                value={newEvent.type}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, type: e.target.value })
                }
                className="flex-1 bg-slate-800 text-white border border-slate-600 rounded p-1.5 text-xs focus:border-indigo-500"
              >
                <option value="goal">Goal</option>
                <option value="assist">Assist</option>
                <option value="yellowCard">Yellow Card</option>
                <option value="redCard">Red Card</option>
                <option value="sub">Substitution</option>
              </select>
              <input
                type="number"
                placeholder="Min"
                value={newEvent.minute}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, minute: e.target.value })
                }
                className="w-14 bg-slate-800 text-white border border-slate-600 rounded p-1.5 text-center text-xs focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              {newEvent.type === "sub" ? (
                <>
                  <select
                    value={newEvent.playerId}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, playerId: e.target.value })
                    }
                    className="flex-1 bg-slate-800 text-white border border-slate-600 rounded p-1.5 text-xs focus:border-indigo-500"
                  >
                    <option value="">Player IN...</option>
                    {matchAvailablePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newEvent.playerOutId}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, playerOutId: e.target.value })
                    }
                    className="flex-1 bg-slate-800 text-white border border-slate-600 rounded p-1.5 text-xs focus:border-indigo-500"
                  >
                    <option value="">Player OUT...</option>
                    {matchAvailablePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <select
                  value={newEvent.playerId}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, playerId: e.target.value })
                  }
                  className="flex-1 bg-slate-800 text-white border border-slate-600 rounded p-1.5 text-xs focus:border-indigo-500"
                >
                  <option value="">Select Player...</option>
                  {matchAvailablePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={addManualEvent}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded font-bold shadow-md transition-colors text-xs"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-4 mb-6">
          <h3 className="text-indigo-400 font-bold mb-3 border-b border-slate-700 pb-2">
            Event Timeline
          </h3>
          {matchEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No events logged.</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {matchEvents
                .sort((a, b) => a.minute - b.minute)
                .map((ev) => (
                  <div
                    key={ev.id}
                    className="text-sm flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono w-10">
                        {ev.minute}'
                      </span>
                      {getEventText(ev)}
                    </div>
                    <button
                      onClick={() => deleteMatchEvent(ev.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        <h3 className="text-white font-bold mb-4">Player Ratings & MVPs</h3>
        <p className="text-xs text-slate-400 mb-3">
          You can tick multiple players as MVPs. Everyone marked as "Available"
          today is shown below.
        </p>
        <div className="bg-slate-900 rounded-lg border border-slate-700 mb-8 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-800 text-slate-400">
                <th className="p-3">Player</th>
                <th className="p-3 text-center">Rating (1-10)</th>
                <th className="p-3 text-center text-amber-400">MVP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {matchAvailablePlayers.map((player) => {
                return (
                  <tr
                    key={player.id}
                    className="hover:bg-slate-800 transition-colors"
                  >
                    <td className="p-3 text-slate-300 font-medium">
                      {player.name}
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.1"
                        max="10"
                        min="1"
                        placeholder="-"
                        value={matchRatings[player.id] || ""}
                        onChange={(e) =>
                          updateMatchRating(player.id, e.target.value)
                        }
                        className="w-16 bg-slate-800 border border-slate-600 text-emerald-400 font-bold rounded p-1 text-center focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={matchMvps.includes(player.id)}
                        onChange={(e) => {
                          let newMvps = [...matchMvps];
                          if (e.target.checked) newMvps.push(player.id);
                          else
                            newMvps = newMvps.filter((id) => id !== player.id);
                          updateMatchField("mvps", newMvps);
                        }}
                        className="w-5 h-5 accent-amber-500 bg-slate-800 border-slate-600 rounded cursor-pointer"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    if (matchStatus === "review") return renderPostMatchReview();

    const availablePlayers = players.filter((p) => p.available);
    const pitchPlayerIds = Object.values(pitchState).filter(Boolean);
    const benchPlayers = availablePlayers.filter(
      (p) => !pitchPlayerIds.includes(p.id),
    );

    const filteredBench = benchPlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(benchSearchQuery.toLowerCase()) ||
        p.positions.toLowerCase().includes(benchSearchQuery.toLowerCase()),
    );

    const layout =
      formation === "Custom"
        ? customFormationStr
            .split(/[-,\s]+/)
            .map((n) => parseInt(n, 10))
            .filter((n) => !isNaN(n) && n > 0)
        : FORMATIONS[formation] || [1, 4, 3, 3];

    let globalSlotIndex = 0;

    return (
      <div
        ref={exportRef}
        className="flex flex-col lg:flex-row gap-6 bg-slate-950 p-2 sm:p-0 rounded-xl"
      >
        {/* Bench Sidebar */}
        <div
          className="lg:w-1/4 w-full bg-slate-800 rounded-xl shadow-xl border border-slate-700 flex flex-col h-[400px] lg:h-[800px]"
          onDrop={handleDropOnBench}
          onDragOver={handleDragOver}
        >
          <div className="p-4 bg-slate-900 border-b border-slate-700 rounded-t-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" /> Available Bench
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Drag players to the pitch
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
                className="w-full text-sm text-white bg-slate-800 border border-slate-600 rounded-md py-1.5 pl-9 pr-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {filteredBench.length === 0 ? (
              <div className="text-slate-500 text-sm text-center mt-10">
                {benchSearchQuery
                  ? "No players match your search."
                  : "No players on the bench."}
              </div>
            ) : (
              filteredBench.map((player) => {
                const stats = getCalculatedStats(player);
                return (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player.id)}
                    className="bg-slate-700 border border-slate-600 p-3 rounded-lg cursor-grab active:cursor-grabbing hover:bg-slate-650 transition-colors flex items-center shadow-sm"
                  >
                    <GripVertical
                      className="w-4 h-4 text-slate-400 mr-2 shrink-0"
                      data-html2canvas-ignore
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">
                        {player.name}
                      </div>
                      <div className="text-xs text-indigo-300 font-semibold truncate">
                        {player.positions}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 flex flex-col items-end">
                      <span className="text-emerald-400 font-bold">
                        Avg: {stats.avg}
                      </span>
                      <span>
                        <SyncInput
                          type="number"
                          value={player.minutes || 0}
                          onSave={(val) =>
                            setDoc(
                              doc(db, "players", player.id),
                              { minutes: parseInt(val) || 0 },
                              { merge: true },
                            )
                          }
                          className="w-12 bg-slate-800 border border-slate-700 rounded p-1 text-center text-indigo-300 text-sm"
                        />
                        '
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pitch Area */}
        <div className="lg:w-3/4 w-full flex flex-col gap-4">
          {/* Match Control Header */}
          <div
            data-html2canvas-ignore
            className="p-4 bg-slate-800 border border-slate-700 rounded-xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div className="flex items-center gap-2">
              <div className="text-white font-bold text-lg">Lineup Builder</div>
              <button
                onClick={handleClearLineup}
                className="p-2 bg-slate-700 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors ml-2"
                title="Clear Entire Lineup"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleSaveImage}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-md"
              >
                <Download className="w-4 h-4" /> Export Squad
              </button>
              <select
                value={formation}
                onChange={handleFormationChange}
                className="bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-sm"
              >
                {Object.keys(FORMATIONS).map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
                <option value="Custom">Custom...</option>
              </select>
              {formation === "Custom" && (
                <input
                  type="text"
                  value={customFormationStr}
                  onChange={(e) => setCustomFormationStr(e.target.value)}
                  onBlur={handleCustomFormationBlur}
                  placeholder="1-4-3-3"
                  className="bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-24 text-sm"
                />
              )}
              <button
                onClick={() => changeMatchStatus("review")}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg font-bold transition-colors shadow-md ml-auto sm:ml-0"
              >
                To Post-Match Review <Play className="w-4 h-4 fill-current" />
              </button>
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
              <div
                key={rowIndex}
                className="flex justify-evenly items-center w-full relative z-10 px-4"
              >
                {Array.from({ length: playerCountInRow }).map((_, colIndex) => {
                  const currentSlotIndex = globalSlotIndex++;
                  const assignedPlayerId = pitchState[currentSlotIndex];
                  const assignedPlayer = players.find(
                    (p) => p.id === assignedPlayerId,
                  );
                  const defaultLabel = FORMATION_LABELS[formation]
                    ? FORMATION_LABELS[formation][currentSlotIndex] || "POS"
                    : "POS";
                  const currentLabel =
                    customLabels[currentSlotIndex] || defaultLabel;

                  return (
                    <div
                      className="relative flex flex-col items-center"
                      key={currentSlotIndex}
                    >
                      <div
                        onDrop={(e) => handleDropOnPitch(e, currentSlotIndex)}
                        onDragOver={handleDragOver}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!assignedPlayer) {
                            setActiveSlotSearch(
                              activeSlotSearch === currentSlotIndex
                                ? null
                                : currentSlotIndex,
                            );
                            setSlotSearchQuery("");
                            setSelectedPlayerDetails(null);
                          } else {
                            setSelectedPlayerDetails(assignedPlayer);
                            setActiveSlotSearch(null);
                          }
                        }}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shadow-lg z-20 ${assignedPlayer ? "bg-indigo-600 border-indigo-400" : "bg-slate-900/50 border-white/50 border-dashed hover:bg-slate-800/60"}`}
                      >
                        {assignedPlayer ? (
                          <div
                            draggable
                            onDragStart={(e) =>
                              handleDragStart(e, assignedPlayer.id)
                            }
                            className="flex flex-col items-center justify-center w-full h-full text-white"
                          >
                            <div className="font-bold text-xs sm:text-sm truncate w-full text-center px-1">
                              {getDisplayName(assignedPlayer)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-white/40 text-xs text-center px-1 flex flex-col items-center">
                            <Plus className="w-4 h-4 mb-1" />
                          </div>
                        )}
                      </div>

                      <SyncInput
                        value={currentLabel}
                        onSave={(val) =>
                          updateCustomLabel(currentSlotIndex, val)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 bg-transparent text-white/80 font-bold text-[10px] sm:text-xs text-center w-16 focus:outline-none focus:bg-slate-800/50 rounded px-1 transition-colors z-20"
                        title="Edit position label"
                      />

                      {/* Quick Search Popover */}
                      {activeSlotSearch === currentSlotIndex && (
                        <div
                          className="absolute z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-2 w-48 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                          onClick={(e) => e.stopPropagation()}
                          data-html2canvas-ignore
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-300 font-semibold">
                              Assign Player
                            </span>
                            <button
                              onClick={() => setActiveSlotSearch(null)}
                              className="text-slate-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search bench..."
                            value={slotSearchQuery}
                            onChange={(e) => setSlotSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 text-white px-2 py-1.5 rounded text-xs border border-slate-700 focus:outline-none focus:border-indigo-500 mb-2"
                          />
                          <div className="max-h-40 overflow-y-auto flex flex-col gap-1 custom-scrollbar">
                            {benchPlayers
                              .filter((p) =>
                                p.name
                                  .toLowerCase()
                                  .includes(slotSearchQuery.toLowerCase()),
                              )
                              .map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() =>
                                    handleQuickAssign(currentSlotIndex, p.id)
                                  }
                                  className="text-left text-xs text-slate-200 hover:bg-indigo-600 px-2 py-1.5 rounded flex justify-between items-center"
                                >
                                  <span className="truncate">
                                    {p.name.replace(/\s*\(.*?\)\s*/g, "")}
                                  </span>
                                  <span className="text-[10px] text-indigo-300 ml-1">
                                    {p.positions}
                                  </span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* TACTICAL GAME PLAN MODULE */}
          <div
            data-html2canvas-ignore
            className="mt-4 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-6"
          >
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-400" /> Tactical
              Game Plan
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Pre-plan substitutions and tactical changes. You can execute these
              with one click during the post-match review.
            </p>

            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-6 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <select
                  value={newPlan.type}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, type: e.target.value })
                  }
                  className="flex-1 bg-slate-800 text-white border border-slate-600 rounded p-2 text-sm focus:border-indigo-500"
                >
                  <option value="sub">Substitution</option>
                  <option value="tactic">Positional / Tactical Change</option>
                </select>
                <input
                  type="number"
                  placeholder="Min"
                  value={newPlan.minute}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, minute: e.target.value })
                  }
                  className="w-20 bg-slate-800 text-white border border-slate-600 rounded p-2 text-center text-sm focus:border-indigo-500"
                />
              </div>

              {newPlan.type === "sub" && (
                <div className="flex gap-2">
                  <select
                    value={newPlan.playerInId}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, playerInId: e.target.value })
                    }
                    className="flex-1 bg-slate-800 text-white border border-slate-600 rounded p-2 text-sm focus:border-indigo-500"
                  >
                    <option value="">Player IN (Bench)...</option>
                    {availablePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newPlan.playerOutId}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, playerOutId: e.target.value })
                    }
                    className="flex-1 bg-slate-800 text-white border border-slate-600 rounded p-2 text-sm focus:border-indigo-500"
                  >
                    <option value="">Player OUT...</option>
                    {availablePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Indications / Notes (e.g. 'Move Marcus to RB')"
                  value={newPlan.notes}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, notes: e.target.value })
                  }
                  className="flex-1 bg-slate-800 text-white border border-slate-600 rounded p-2 text-sm focus:border-indigo-500"
                />
                <button
                  onClick={addPlannedEvent}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded font-bold shadow-md transition-colors text-sm"
                >
                  Add Plan
                </button>
              </div>
            </div>

            {plannedEvents.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {plannedEvents
                  .sort((a, b) => a.minute - b.minute)
                  .map((plan) => (
                    <div
                      key={plan.id}
                      className="text-sm flex items-center justify-between bg-slate-900 p-3 rounded border border-slate-700/50 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-indigo-400 font-mono font-bold w-8 mt-0.5">
                          {plan.minute}'
                        </span>
                        {plan.type === "sub" ? (
                          <div className="flex flex-col">
                            <span>
                              🔄{" "}
                              <strong className="text-emerald-400">
                                {players.find((p) => p.id === plan.playerInId)
                                  ?.name || "In"}
                              </strong>{" "}
                              ON,{" "}
                              <span className="text-slate-500">
                                {players.find((p) => p.id === plan.playerOutId)
                                  ?.name || "Out"}
                              </span>{" "}
                              OFF
                            </span>
                            {plan.notes && (
                              <span className="text-xs text-slate-400 italic mt-1 border-l-2 border-indigo-500/50 pl-2">
                                "{plan.notes}"
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span>
                              <ArrowRightLeft className="w-4 h-4 inline mr-1 text-amber-500" />{" "}
                              <strong className="text-amber-500">
                                Tactic Shift
                              </strong>
                            </span>
                            {plan.notes && (
                              <span className="text-xs text-slate-300 mt-1">
                                {plan.notes}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => deletePlannedEvent(plan.id)}
                        className="text-slate-500 hover:text-rose-400 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Navigation */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 p-4 sm:px-8 sm:py-6 rounded-2xl shadow-2xl border border-slate-800">
          <div className="flex items-center gap-4">
            <img
              src="/Vodka Juniors.jpeg"
              alt="Vodka Juniors Crest"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-lg border border-slate-700 object-cover"
            />
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                Vodka Juniors
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Team Management Platform
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center bg-slate-800 rounded-lg p-1 border border-slate-700 w-full md:w-auto">
            <button
              onClick={() => setActiveTab("matchday")}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all min-w-[100px] ${activeTab === "matchday" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
            >
              <LayoutTemplate className="w-4 h-4" /> Matchday
            </button>
            <button
              onClick={() => setActiveTab("league")}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all min-w-[100px] ${activeTab === "league" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
            >
              <Trophy className="w-4 h-4" /> League
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all min-w-[100px] ${activeTab === "dashboard" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
            >
              <Users className="w-4 h-4" /> Database
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all min-w-[100px] ${activeTab === "history" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
            >
              <Activity className="w-4 h-4" /> History
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="animate-in fade-in duration-300 slide-in-from-bottom-4">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "league" && renderLeagueTab()}
          {activeTab === "matchday" && renderMatchday()}
          {activeTab === "history" && renderHistory()}
        </main>
      </div>
    </div>
  );
}
