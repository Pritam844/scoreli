import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import BallTimeline from '../../components/BallTimeline';
import Modal from '../../components/Modal';
import Loader from '../../components/Loader';

export default function LiveScoring() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Current innings state
  const [currentInnings, setCurrentInnings] = useState(1);
  const [inningsId, setInningsId] = useState(null);
  const [batting, setBatting] = useState([]);
  const [bowling, setBowling] = useState([]);
  const [balls, setBalls] = useState([]);
  const [extras, setExtras] = useState({ wides: 0, noBalls: 0, byes: 0, legByes: 0 });
  const [totalRuns, setTotalRuns] = useState(0);
  const [totalWickets, setTotalWickets] = useState(0);
  const [totalBalls, setTotalBalls] = useState(0);

  // Active batsmen indices
  const [striker, setStriker] = useState(0);
  const [nonStriker, setNonStriker] = useState(1);
  const [currentBowlerIdx, setCurrentBowlerIdx] = useState(0);

  // Players for selection
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [bowlingTeamPlayers, setBowlingTeamPlayers] = useState([]);

  // Match config
  const [batterMode, setBatterMode] = useState(2); // 1 or 2
  const [maxOvers, setMaxOvers] = useState(20);
  const [innings1Score, setInnings1Score] = useState(null); // Target tracking

  // Modals
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showNewBatsman, setShowNewBatsman] = useState(false);
  const [showNewBowler, setShowNewBowler] = useState(false);
  const [showEndInnings, setShowEndInnings] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showByeModal, setShowByeModal] = useState(false);
  const [wicketType, setWicketType] = useState('bowled');
  const [fielderName, setFielderName] = useState('');
  const [resultText, setResultText] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerSearchText, setPlayerSearchText] = useState('');
  const [byeRuns, setByeRuns] = useState(1);
  const [showNoBallModal, setShowNoBallModal] = useState(false);
  const [noBallRuns, setNoBallRuns] = useState(0);
  const [tempIsCaptain, setTempIsCaptain] = useState(false);
  const [tempIsWK, setTempIsWK] = useState(false);
  const [wicketBatsman, setWicketBatsman] = useState(0); // 0 = striker, 1 = non-striker
  const [isChangingPlayer, setIsChangingPlayer] = useState(false);
  const [changingPlayerType, setChangingPlayerType] = useState('striker'); // striker, nonStriker, bowler

  useEffect(() => {
    fetchMatch();
  }, [id]);

  async function fetchMatch() {
    try {
      const snap = await getDoc(doc(db, 'matches', id));
      if (!snap.exists()) { navigate('/admin/matches'); return; }
      const matchData = { id: snap.id, ...snap.data() };
      setMatch(matchData);
      setBatterMode(matchData.batterMode || 2);
      setMaxOvers(matchData.overs || 20);

      // Load players for both teams
      const allPlayers = await getDocs(collection(db, 'players'));
      const allP = allPlayers.docs.map(d => ({ id: d.id, ...d.data() }));

      const tAPlayers = allP.filter(p => p.team_id === matchData.teamA?.id || p.team_id === 'all');
      const tBPlayers = allP.filter(p => p.team_id === matchData.teamB?.id || p.team_id === 'all');

      setTeamPlayers(tAPlayers);
      setBowlingTeamPlayers(tBPlayers);

      await loadInnings(matchData, tAPlayers, tBPlayers);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load match');
    } finally {
      setLoading(false);
    }
  }

  async function loadInnings(matchData, batTeam, bowlTeam) {
    const inningsSnap = await getDocs(collection(db, 'matches', id, 'innings'));
    const innDocs = inningsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.inningsNumber || 1) - (b.inningsNumber || 1));

    if (innDocs.length === 0) {
      setCurrentInnings(1);
      initBatting(batTeam, matchData.batterMode || 2);
      initBowling(bowlTeam);
    } else if (innDocs.length === 1) {
      const inn = innDocs[0];
      if (inn.completed) {
        setCurrentInnings(2);
        setInnings1Score(inn.totalRuns);
        setTeamPlayers(bowlTeam);
        setBowlingTeamPlayers(batTeam);
        initBatting(bowlTeam, matchData.batterMode || 2);
        initBowling(batTeam);
      } else {
        setCurrentInnings(1);
        restoreInnings(inn);
      }
    } else {
      const inn = innDocs[1];
      setCurrentInnings(2);
      setInnings1Score(innDocs[0].totalRuns || 0);
      setTeamPlayers(bowlTeam);
      setBowlingTeamPlayers(batTeam);
      restoreInnings(inn);
    }
  }

  function restoreInnings(inn) {
    setInningsId(inn.id);
    setBatting(inn.batting || []);
    setBowling(inn.bowling || []);
    setBalls(inn.balls || []);
    setExtras(inn.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0 });
    setTotalRuns(inn.totalRuns || 0);
    setTotalWickets(inn.totalWickets || 0);
    setTotalBalls(inn.totalBalls || 0);
    setStriker(inn.striker ?? 0);
    setNonStriker(inn.nonStriker ?? 1);
    setCurrentBowlerIdx(inn.currentBowlerIdx ?? 0);
  }

  function initBatting(players, mode) {
    setBatting([]);
    setStriker(-1);
    setNonStriker(-1);
  }

  function initBowling(players) {
    setBowling([]);
    setCurrentBowlerIdx(-1);
  }

  function getOversDisplay(ballCount) {
    return `${Math.floor(ballCount / 6)}.${ballCount % 6}`;
  }

  // ===== TARGET & RESULT CALCULATION =====
  function getTarget() {
    if (currentInnings === 2 && innings1Score !== null) {
      return innings1Score + 1;
    }
    return null;
  }

  function getRequiredRuns() {
    const target = getTarget();
    if (target === null) return null;
    return target - totalRuns;
  }

  function autoResult() {
    if (!match) return '';
    const tAName = match.teamA?.name || 'Team A';
    const tBName = match.teamB?.name || 'Team B';

    // If Innings 2 has started
    if (currentInnings === 2 && innings1Score !== null) {
      if (totalRuns > innings1Score) {
        // Chasing team won -> Show run difference
        return `${tBName} won by ${totalRuns - innings1Score} runs`;
      } else if (totalRuns < innings1Score) {
        // Defending team won -> Show run difference
        return `${tAName} won by ${innings1Score - totalRuns} runs`;
      } else {
        return 'Match Tied!';
      }
    }
    
    // Global fallback for finished matches
    const sA = match.teamA?.score || 0;
    const sB = match.teamB?.score || 0;

    if (sB > sA) return `${tBName} won by ${sB - sA} runs`;
    if (sA > sB) return `${tAName} won by ${sA - sB} runs`;
    if (sA === sB && sA > 0) return 'Match Tied!';

    return 'Match Completed';
  }

  async function saveInningsState(updatedState = {}) {
    const data = {
      inningsNumber: currentInnings,
      teamName: currentInnings === 1 ? match.teamA?.name : match.teamB?.name,
      batterMode,
      batting: updatedState.batting || batting,
      bowling: updatedState.bowling || bowling,
      balls: updatedState.balls || balls,
      extras: updatedState.extras || extras,
      totalRuns: updatedState.totalRuns ?? totalRuns,
      totalWickets: updatedState.totalWickets ?? totalWickets,
      totalBalls: updatedState.totalBalls ?? totalBalls,
      striker: updatedState.striker ?? striker,
      nonStriker: updatedState.nonStriker ?? nonStriker,
      currentBowlerIdx: updatedState.currentBowlerIdx ?? currentBowlerIdx,
      completed: updatedState.completed || false
    };

    try {
      if (inningsId) {
        await updateDoc(doc(db, 'matches', id, 'innings', inningsId), data);
      } else {
        const ref = await addDoc(collection(db, 'matches', id, 'innings'), data);
        setInningsId(ref.id);
      }

      // Update match score header
      const teamKey = currentInnings === 1 ? 'teamA' : 'teamB';
      const teamData = { ...match[teamKey] };
      teamData.score = data.totalRuns;
      teamData.wickets = data.totalWickets;
      teamData.overs = parseFloat(getOversDisplay(data.totalBalls));
      await updateDoc(doc(db, 'matches', id), { [teamKey]: teamData });
      setMatch(prev => ({ ...prev, [teamKey]: teamData }));

      // Auto-detect win while chasing
      if (currentInnings === 2 && innings1Score !== null && data.totalRuns > innings1Score) {
        const result = autoResult();
        await updateDoc(doc(db, 'matches', id), {
          status: 'finished',
          result: result || 'Match completed',
          winner: 'teamB'
        });
        toast.success(`🏆 ${result}`);
        navigate('/admin/matches');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save');
    }
  }

  // ===== SCORING ACTIONS =====

  function canScore() {
    if (striker < 0 || !batting[striker]) {
      toast.error('Please select a batsman');
      return false;
    }
    if (batterMode === 2 && (nonStriker < 0 || !batting[nonStriker])) {
      toast.error('Please select a non-striker');
      return false;
    }
    if (currentBowlerIdx < 0 || !bowling[currentBowlerIdx]) {
      toast.error('Please select a bowler');
      return false;
    }
    return true;
  }

  function addRuns(runs) {
    if (!canScore()) return;
    const newBatting = [...batting];
    const newBowling = [...bowling];
    const newBalls = [...balls];

    newBatting[striker] = { ...newBatting[striker] };
    newBatting[striker].runs += runs;
    newBatting[striker].balls += 1;
    if (runs === 4) newBatting[striker].fours += 1;
    if (runs === 6) newBatting[striker].sixes += 1;

    newBowling[currentBowlerIdx] = { ...newBowling[currentBowlerIdx] };
    newBowling[currentBowlerIdx].runs += runs;
    newBowling[currentBowlerIdx].ballsInOver = (newBowling[currentBowlerIdx].ballsInOver || 0) + 1;

    const newTotalBalls = totalBalls + 1;
    const newTotalRuns = totalRuns + runs;

    let newStriker = striker;
    let newNonStriker = nonStriker;

    // Swap on odd runs first (2 batter mode only)
    if (batterMode === 2 && runs % 2 === 1) {
      [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }

    // End of over
    if (newBowling[currentBowlerIdx].ballsInOver >= 6) {
      newBowling[currentBowlerIdx].overs = Math.floor(newBowling[currentBowlerIdx].overs) + 1;
      newBowling[currentBowlerIdx].ballsInOver = 0;

      // Swap strike on over end
      if (batterMode === 2) {
        [newStriker, newNonStriker] = [newNonStriker, newStriker];
      }

      newBalls.push({ runs, isWicket: false });
      setBalls(newBalls);
      setBatting(newBatting);
      setBowling(newBowling);
      setTotalBalls(newTotalBalls);
      setTotalRuns(newTotalRuns);
      setStriker(newStriker);
      setNonStriker(newNonStriker);

      if (newTotalBalls >= maxOvers * 6 || totalWickets >= 10) {
        setShowEndInnings(true);
      } else {
        setShowNewBowler(true);
      }

      saveInningsState({
        batting: newBatting, bowling: newBowling, balls: newBalls,
        totalRuns: newTotalRuns, totalBalls: newTotalBalls, totalWickets,
        striker: newStriker, nonStriker: newNonStriker, currentBowlerIdx
      });
      return;
    }

    newBalls.push({ runs, isWicket: false });

    setBalls(newBalls);
    setBatting(newBatting);
    setBowling(newBowling);
    setTotalBalls(newTotalBalls);
    setTotalRuns(newTotalRuns);
    setStriker(newStriker);
    setNonStriker(newNonStriker);

    saveInningsState({
      batting: newBatting, bowling: newBowling, balls: newBalls,
      totalRuns: newTotalRuns, totalBalls: newTotalBalls, totalWickets,
      striker: newStriker, nonStriker: newNonStriker, currentBowlerIdx
    });
  }

  function addWide() {
    if (!canScore()) return;
    const newBowling = [...bowling];
    newBowling[currentBowlerIdx] = { ...newBowling[currentBowlerIdx] };
    newBowling[currentBowlerIdx].runs += 1;

    const newExtras = { ...extras, wides: extras.wides + 1 };
    const newBalls = [...balls, { runs: 1, isWide: true }];
    const newTotalRuns = totalRuns + 1;

    setBowling(newBowling);
    setExtras(newExtras);
    setBalls(newBalls);
    setTotalRuns(newTotalRuns);

    saveInningsState({
      bowling: newBowling, extras: newExtras, balls: newBalls,
      totalRuns: newTotalRuns, totalBalls, totalWickets,
      batting, striker, nonStriker, currentBowlerIdx
    });
  }

  function addNoBall(runs = 0) {
    if (!canScore()) return;
    const newBatting = [...batting];
    const newBowling = [...bowling];
    const newBalls = [...balls];

    // Bowler gets 1 run for no ball + any runs hit by batsman
    newBowling[currentBowlerIdx] = { ...newBowling[currentBowlerIdx] };
    newBowling[currentBowlerIdx].runs += (1 + runs);

    // Extras record 1 no ball
    const newExtras = { ...extras, noBalls: extras.noBalls + 1 };
    
    // Total runs = 1 (NB) + runs hit
    const newTotalRuns = totalRuns + 1 + runs;

    // Update batsman stats if runs were hit
    let newStriker = striker;
    let newNonStriker = nonStriker;

    newBatting[striker] = { ...newBatting[striker] };
    newBatting[striker].runs += runs;
    newBatting[striker].balls += 1;
    if (runs === 4) newBatting[striker].fours += 1;
    if (runs === 6) newBatting[striker].sixes += 1;

    // Swap strike if odd runs hit
    if (batterMode === 2 && runs % 2 === 1) {
      [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }

    // Ball record shows 1+runs
    newBalls.push({ runs: 1 + runs, isNoBall: true, batsmanRuns: runs });

    setBatting(newBatting);
    setBowling(newBowling);
    setExtras(newExtras);
    setBalls(newBalls);
    setTotalRuns(newTotalRuns);
    setStriker(newStriker);
    setNonStriker(newNonStriker);

    saveInningsState({
      batting: newBatting, bowling: newBowling, extras: newExtras, balls: newBalls,
      totalRuns: newTotalRuns, totalBalls, totalWickets,
      striker: newStriker, nonStriker: newNonStriker, currentBowlerIdx
    });
    setShowNoBallModal(false);
  }

  function addBye(runs) {
    if (!canScore()) return;
    const newBowling = [...bowling];
    newBowling[currentBowlerIdx] = { ...newBowling[currentBowlerIdx] };
    newBowling[currentBowlerIdx].ballsInOver = (newBowling[currentBowlerIdx].ballsInOver || 0) + 1;

    const newExtras = { ...extras, byes: extras.byes + runs };
    const newBalls = [...balls, { runs, isBye: true }];
    const newTotalBalls = totalBalls + 1;
    const newTotalRuns = totalRuns + runs;

    // Update batsman balls faced
    const newBatting = [...batting];
    newBatting[striker] = { ...newBatting[striker], balls: newBatting[striker].balls + 1 };

    let newStriker = striker;
    let newNonStriker = nonStriker;

    if (batterMode === 2 && runs % 2 === 1) {
      [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }

    // Check end of over
    if (newBowling[currentBowlerIdx].ballsInOver >= 6) {
      newBowling[currentBowlerIdx].overs = Math.floor(newBowling[currentBowlerIdx].overs) + 1;
      newBowling[currentBowlerIdx].ballsInOver = 0;
      if (batterMode === 2) [newStriker, newNonStriker] = [newNonStriker, newStriker];
      setBalls(newBalls); setBatting(newBatting); setBowling(newBowling);
      setTotalBalls(newTotalBalls); setTotalRuns(newTotalRuns); setExtras(newExtras);
      setStriker(newStriker); setNonStriker(newNonStriker);
      if (newTotalBalls >= maxOvers * 6 || totalWickets >= 10) {
        setShowEndInnings(true);
      } else {
        setShowNewBowler(true);
      }
      saveInningsState({ batting: newBatting, bowling: newBowling, balls: newBalls, extras: newExtras, totalRuns: newTotalRuns, totalBalls: newTotalBalls, totalWickets, striker: newStriker, nonStriker: newNonStriker, currentBowlerIdx });
      return;
    }

    setBalls(newBalls); setBatting(newBatting); setBowling(newBowling);
    setTotalBalls(newTotalBalls); setTotalRuns(newTotalRuns); setExtras(newExtras);
    setStriker(newStriker); setNonStriker(newNonStriker);

    saveInningsState({ batting: newBatting, bowling: newBowling, balls: newBalls, extras: newExtras, totalRuns: newTotalRuns, totalBalls: newTotalBalls, totalWickets, striker: newStriker, nonStriker: newNonStriker, currentBowlerIdx });
    setShowByeModal(false);
  }

  function addLegBye(runs) {
    if (!canScore()) return;
    const newBowling = [...bowling];
    newBowling[currentBowlerIdx] = { ...newBowling[currentBowlerIdx] };
    newBowling[currentBowlerIdx].ballsInOver = (newBowling[currentBowlerIdx].ballsInOver || 0) + 1;

    const newExtras = { ...extras, legByes: (extras.legByes || 0) + runs };
    const newBalls = [...balls, { runs, isLegBye: true }];
    const newTotalBalls = totalBalls + 1;
    const newTotalRuns = totalRuns + runs;

    const newBatting = [...batting];
    newBatting[striker] = { ...newBatting[striker], balls: newBatting[striker].balls + 1 };

    let newStriker = striker;
    let newNonStriker = nonStriker;

    if (batterMode === 2 && runs % 2 === 1) {
      [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }

    if (newBowling[currentBowlerIdx].ballsInOver >= 6) {
      newBowling[currentBowlerIdx].overs = Math.floor(newBowling[currentBowlerIdx].overs) + 1;
      newBowling[currentBowlerIdx].ballsInOver = 0;
      if (batterMode === 2) [newStriker, newNonStriker] = [newNonStriker, newStriker];
      setBalls(newBalls); setBatting(newBatting); setBowling(newBowling);
      setTotalBalls(newTotalBalls); setTotalRuns(newTotalRuns); setExtras(newExtras);
      setStriker(newStriker); setNonStriker(newNonStriker);
      if (newTotalBalls >= maxOvers * 6 || totalWickets >= 10) {
        setShowEndInnings(true);
      } else {
        setShowNewBowler(true);
      }
      saveInningsState({ batting: newBatting, bowling: newBowling, balls: newBalls, extras: newExtras, totalRuns: newTotalRuns, totalBalls: newTotalBalls, totalWickets, striker: newStriker, nonStriker: newNonStriker, currentBowlerIdx });
      return;
    }

    setBalls(newBalls); setBatting(newBatting); setBowling(newBowling);
    setTotalBalls(newTotalBalls); setTotalRuns(newTotalRuns); setExtras(newExtras);
    setStriker(newStriker); setNonStriker(newNonStriker);

    saveInningsState({ batting: newBatting, bowling: newBowling, balls: newBalls, extras: newExtras, totalRuns: newTotalRuns, totalBalls: newTotalBalls, totalWickets, striker: newStriker, nonStriker: newNonStriker, currentBowlerIdx });
    setShowByeModal(false);
  }

  function handleWicket() {
    if (!canScore()) return;
    setFielderName('');
    setShowWicketModal(true);
  }

  function confirmWicket() {
    const newBatting = [...batting];
    const newBowling = [...bowling];
    const newBalls = [...balls];

    const outIdx = wicketBatsman === 0 ? striker : nonStriker;
    
    if (outIdx < 0 || !newBatting[outIdx]) {
      toast.error('Batsman not found');
      return;
    }

    let howOutText = wicketType;
    const bowler = newBowling[currentBowlerIdx]?.name || 'Unknown';
    if (wicketType === 'caught') {
      howOutText = fielderName ? `c ${fielderName} b ${bowler}` : `c & b ${bowler}`;
    } else if (wicketType === 'stumped') {
      howOutText = fielderName ? `st ${fielderName} b ${bowler}` : `st b ${bowler}`;
    } else if (wicketType === 'run out') {
      howOutText = fielderName ? `run out (${fielderName})` : `run out`;
    } else if (wicketType === 'bowled') {
      howOutText = `b ${bowler}`;
    } else if (wicketType === 'lbw') {
      howOutText = `lbw b ${bowler}`;
    } else if (wicketType === 'hit wicket') {
      howOutText = `hit wicket`;
    }

    newBatting[outIdx] = {
      ...newBatting[outIdx],
      notOut: false,
      howOut: howOutText,
      balls: newBatting[outIdx].balls + 1
    };

    newBowling[currentBowlerIdx] = { ...newBowling[currentBowlerIdx] };
    newBowling[currentBowlerIdx].wickets += 1;
    newBowling[currentBowlerIdx].ballsInOver = (newBowling[currentBowlerIdx].ballsInOver || 0) + 1;

    const newTotalBalls = totalBalls + 1;
    const newTotalWickets = totalWickets + 1;

    if (newBowling[currentBowlerIdx].ballsInOver >= 6) {
      newBowling[currentBowlerIdx].overs = Math.floor(newBowling[currentBowlerIdx].overs) + 1;
      newBowling[currentBowlerIdx].ballsInOver = 0;
    }

    newBalls.push({ runs: 0, isWicket: true });

    setBatting(newBatting);
    setBowling(newBowling);
    setBalls(newBalls);
    setTotalBalls(newTotalBalls);
    setTotalWickets(newTotalWickets);
    
    // CRITICAL: Set the slot to -1 so the next addNewBatsman call can fill it
    let nextStriker = striker;
    let nextNonStriker = nonStriker;
    if (wicketBatsman === 0) {
      nextStriker = -1;
      setStriker(-1);
    } else {
      nextNonStriker = -1;
      setNonStriker(-1);
    }

    setShowWicketModal(false);

    saveInningsState({
      batting: newBatting, bowling: newBowling, balls: newBalls,
      totalRuns, totalBalls: newTotalBalls, totalWickets: newTotalWickets,
      striker: nextStriker, nonStriker: nextNonStriker, currentBowlerIdx
    });

    if (newTotalWickets >= 10 || newTotalBalls >= maxOvers * 6) {
      setShowEndInnings(true);
    } else {
      // Show new batsman modal
      setShowNewBatsman(true);
      if (newBowling[currentBowlerIdx].ballsInOver === 0) {
        setShowNewBowler(true);
      }
    }
  }

  function addNewBatsman() {
    if (!playerSearchText && !selectedPlayerId) return;
    const player = [...teamPlayers, ...bowlingTeamPlayers].find(p => p.id === selectedPlayerId) || {};
    const name = player.name || playerSearchText;
    const photo = player.photo_url || null;
    const newBat = { ...player, name, photo_url: photo, runs: 0, balls: 0, fours: 0, sixes: 0, notOut: true, howOut: '', is_captain: tempIsCaptain, is_wicketkeeper: tempIsWK };
    const newBatting = [...batting, newBat];
    const newIdx = newBatting.length - 1;
    
    setBatting(newBatting);
    
    let newStriker = striker;
    let newNonStriker = nonStriker;

    if (isChangingPlayer) {
      if (changingPlayerType === 'striker') {
        newStriker = newIdx;
        setStriker(newIdx);
      } else {
        newNonStriker = newIdx;
        setNonStriker(newIdx);
      }
      setIsChangingPlayer(false);
    } else {
      // Assign to striker if missing, else assign to non-striker
      if (striker < 0) {
        newStriker = newIdx;
        setStriker(newIdx);
      } else if (batterMode === 2 && nonStriker < 0) {
        newNonStriker = newIdx;
        setNonStriker(newIdx);
      }
    }

    setShowNewBatsman(false);
    setSelectedPlayerId('');
    setPlayerSearchText('');
    setTempIsCaptain(false);
    setTempIsWK(false);

    saveInningsState({
      batting: newBatting, bowling, balls,
      totalRuns, totalBalls, totalWickets,
      striker: newStriker, nonStriker: newNonStriker, currentBowlerIdx
    });
  }

  function addNewBowler() {
    if (!playerSearchText && !selectedPlayerId) return;
    const player = bowlingTeamPlayers.find(p => p.id === selectedPlayerId) || {};
    const name = player.name || playerSearchText;
    const photo = player.photo_url || null;

    if (isChangingPlayer && changingPlayerType === 'bowler') {
      const existingIdx = bowling.findIndex(b => b.name === name);
      const targetIdx = existingIdx >= 0 ? existingIdx : bowling.length;
      
      const newBowling = [...bowling];
      if (existingIdx < 0) {
        newBowling.push({ ...player, name, photo_url: photo, overs: 0, runs: 0, wickets: 0, ballsInOver: 0, is_captain: tempIsCaptain, is_wicketkeeper: tempIsWK });
      }
      
      setBowling(newBowling);
      setCurrentBowlerIdx(targetIdx);
      setShowNewBowler(false);
      setIsChangingPlayer(false);
      setSelectedPlayerId('');
      setPlayerSearchText('');
      saveInningsState({ bowling: newBowling, currentBowlerIdx: targetIdx, batting, balls, totalRuns, totalBalls, totalWickets, striker, nonStriker });
      return;
    }

    const existingIdx = bowling.findIndex(b => b.name === name);
    if (existingIdx >= 0) {
      setCurrentBowlerIdx(existingIdx);
      setShowNewBowler(false);
      setSelectedPlayerId('');
      setPlayerSearchText('');
      saveInningsState({ bowling, currentBowlerIdx: existingIdx, batting, balls, totalRuns, totalBalls, totalWickets, striker, nonStriker });
      return;
    }

    const newBowler = { ...player, name, photo_url: photo, overs: 0, runs: 0, wickets: 0, ballsInOver: 0, is_captain: tempIsCaptain, is_wicketkeeper: tempIsWK };
    const newBowling = [...bowling, newBowler];
    const newIdx = newBowling.length - 1;
    setBowling(newBowling);
    setCurrentBowlerIdx(newIdx);
    setShowNewBowler(false);
    setSelectedPlayerId('');
    setPlayerSearchText('');
    setTempIsCaptain(false);
    setTempIsWK(false);

    saveInningsState({
      bowling: newBowling, currentBowlerIdx: newIdx,
      batting, balls, totalRuns, totalBalls, totalWickets, striker, nonStriker
    });
  }

  function swapStrike() {
    if (batterMode === 1) return;
    const newS = nonStriker;
    const newN = striker;
    setStriker(newS);
    setNonStriker(newN);
    saveInningsState({ striker: newS, nonStriker: newN, batting, bowling, balls, totalRuns, totalBalls, totalWickets, currentBowlerIdx });
  }

  function undoLastBall() {
    if (balls.length === 0) return;
    const lastBall = balls[balls.length - 1];
    const newBalls = balls.slice(0, -1);

    const newBatting = [...batting];
    const newBowling = [...bowling];
    let newTotalRuns = totalRuns;
    let newTotalBalls = totalBalls;
    let newTotalWickets = totalWickets;
    let newStriker = striker;
    let newNonStriker = nonStriker;
    const newExtras = { ...extras };

    // 1. Handle Wicket Restoration
    if (lastBall.isWicket) {
      newTotalWickets -= 1;
      newTotalBalls -= 1;
      // Find the last batsman who was out
      const outIdx = newBatting.findLastIndex(b => !b.notOut);
      if (outIdx >= 0) {
        newBatting[outIdx] = { ...newBatting[outIdx], notOut: true, howOut: '', balls: (newBatting[outIdx].balls || 0) - 1 };
        // Restore them to the empty slot (striker or non-striker)
        if (striker === -1) newStriker = outIdx;
        else if (nonStriker === -1) newNonStriker = outIdx;
      }
      
      if (newBowling[currentBowlerIdx]) {
        newBowling[currentBowlerIdx] = { ...newBowling[currentBowlerIdx], wickets: (newBowling[currentBowlerIdx].wickets || 0) - 1 };
        if (newBowling[currentBowlerIdx].ballsInOver === 0 && newBowling[currentBowlerIdx].overs > 0) {
           newBowling[currentBowlerIdx].overs -= 1;
           newBowling[currentBowlerIdx].ballsInOver = 5;
           if (batterMode === 2) [newStriker, newNonStriker] = [newNonStriker, newStriker];
        } else {
           newBowling[currentBowlerIdx].ballsInOver -= 1;
        }
      }
    } 
    // 2. Handle Extra Runs Restoration
    else if (lastBall.isWide) {
      newTotalRuns -= lastBall.runs || 1;
      newExtras.wides -= 1;
      if (newBowling[currentBowlerIdx]) newBowling[currentBowlerIdx].runs -= lastBall.runs || 1;
    } 
    else if (lastBall.isNoBall) {
      const batRuns = lastBall.batsmanRuns || 0;
      newTotalRuns -= (1 + batRuns);
      newExtras.noBalls -= 1;
      if (newBowling[currentBowlerIdx]) newBowling[currentBowlerIdx].runs -= (1 + batRuns);
      
      if (newBatting[striker]) {
        newBatting[striker] = {
          ...newBatting[striker],
          runs: newBatting[striker].runs - batRuns,
          balls: newBatting[striker].balls - 1,
          fours: batRuns === 4 ? (newBatting[striker].fours || 0) - 1 : (newBatting[striker].fours || 0),
          sixes: batRuns === 6 ? (newBatting[striker].sixes || 0) - 1 : (newBatting[striker].sixes || 0)
        };
      }
      if (batterMode === 2 && batRuns % 2 === 1) [newStriker, newNonStriker] = [newNonStriker, newStriker];
    } 
    else if (lastBall.isBye || lastBall.isLegBye) {
      newTotalRuns -= lastBall.runs;
      newTotalBalls -= 1;
      if (lastBall.isBye) newExtras.byes -= lastBall.runs;
      else newExtras.legByes -= lastBall.runs;
      if (newBatting[striker]) newBatting[striker].balls -= 1;
      if (newBowling[currentBowlerIdx]) {
        if (newBowling[currentBowlerIdx].ballsInOver === 0 && newBowling[currentBowlerIdx].overs > 0) {
          newBowling[currentBowlerIdx].overs -= 1;
          newBowling[currentBowlerIdx].ballsInOver = 5;
          if (batterMode === 2) [newStriker, newNonStriker] = [newNonStriker, newStriker];
        } else {
          newBowling[currentBowlerIdx].ballsInOver -= 1;
        }
      }
      if (batterMode === 2 && lastBall.runs % 2 === 1) [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }
    // 3. Handle Normal Runs Restoration
    else {
      newTotalRuns -= lastBall.runs;
      newTotalBalls -= 1;
      if (newBatting[striker]) {
        newBatting[striker] = { 
          ...newBatting[striker], 
          runs: newBatting[striker].runs - lastBall.runs,
          balls: newBatting[striker].balls - 1,
          fours: lastBall.runs === 4 ? newBatting[striker].fours - 1 : newBatting[striker].fours,
          sixes: lastBall.runs === 6 ? newBatting[striker].sixes - 1 : newBatting[striker].sixes
        };
      }
      if (newBowling[currentBowlerIdx]) {
        newBowling[currentBowlerIdx].runs -= lastBall.runs;
        if (newBowling[currentBowlerIdx].ballsInOver === 0 && newBowling[currentBowlerIdx].overs > 0) {
          newBowling[currentBowlerIdx].overs -= 1;
          newBowling[currentBowlerIdx].ballsInOver = 5;
          if (batterMode === 2) [newStriker, newNonStriker] = [newNonStriker, newStriker];
        } else {
          newBowling[currentBowlerIdx].ballsInOver -= 1;
        }
      }
      if (batterMode === 2 && lastBall.runs % 2 === 1) [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }

    setBalls(newBalls);
    setBatting(newBatting);
    setBowling(newBowling);
    setTotalRuns(newTotalRuns);
    setTotalBalls(newTotalBalls);
    setTotalWickets(newTotalWickets);
    setExtras(newExtras);
    setStriker(newStriker);
    setNonStriker(newNonStriker);
    toast.success('Ball undone');

    saveInningsState({
      batting: newBatting, bowling: newBowling, balls: newBalls, extras: newExtras,
      totalRuns: newTotalRuns, totalBalls: newTotalBalls, totalWickets: newTotalWickets,
      striker: newStriker, nonStriker: newNonStriker, currentBowlerIdx
    });
  }

  async function endInnings() {
    await saveInningsState({ completed: true, batting, bowling, balls, totalRuns, totalBalls, totalWickets, striker, nonStriker, currentBowlerIdx });

    if (currentInnings === 1) {
      setCurrentInnings(2);
      setInningsId(null);
      setInnings1Score(totalRuns);
      const batsTeam = bowlingTeamPlayers;
      const bowlsTeam = teamPlayers;
      setTeamPlayers(batsTeam);
      setBowlingTeamPlayers(bowlsTeam);
      initBatting(batsTeam, batterMode);
      initBowling(bowlsTeam);
      setBalls([]);
      setExtras({ wides: 0, noBalls: 0, byes: 0, legByes: 0 });
      setTotalRuns(0);
      setTotalBalls(0);
      setTotalWickets(0);
      toast.success('Innings 1 complete! Starting innings 2');
    } else {
      const result = autoResult();
      setResultText(result);
      setShowResultModal(true);
    }
    setShowEndInnings(false);
  }

  async function finishMatch() {
    try {
      const result = resultText || autoResult() || 'Match completed';
      const winner = innings1Score !== null
        ? (totalRuns > innings1Score ? 'teamB' : totalRuns < innings1Score ? 'teamA' : null)
        : null;
      await updateDoc(doc(db, 'matches', id), {
        status: 'finished',
        result,
        winner
      });
      toast.success('Match finished!');
      navigate('/admin/matches');
    } catch (err) {
      toast.error('Failed to finish match');
    }
  }

  // ===== SHARE =====
  function shareWhatsApp() {
    const tA = match?.teamA;
    const tB = match?.teamB;
    const text = `🏏 *SCORELI LIVE*\n\n${tA?.name}: ${tA?.score ?? 0}/${tA?.wickets ?? 0} (${tA?.overs ?? 0} ov)\n${tB?.name}: ${tB?.score ?? 0}/${tB?.wickets ?? 0} (${tB?.overs ?? 0} ov)\n\n${match?.result ? '🏆 ' + match.result : currentInnings === 2 ? `Target: ${getTarget()} | Need: ${getRequiredRuns()} runs` : 'Innings 1 in progress'}\n\n📲 Powered by Scoreli`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  if (loading) return <Loader />;
  if (!match) return null;

  const battingTeamName = currentInnings === 1 ? match.teamA?.name : match.teamB?.name;
  const bowlingTeamName = currentInnings === 1 ? match.teamB?.name : match.teamA?.name;
  const target = getTarget();
  const requiredRuns = getRequiredRuns();

  // Available players for suggestions (not yet in batting)
  const availableBatsmen = teamPlayers.filter(p => !batting.some(b => b.name === p.name));

  return (
    <div className="page-content" style={{ paddingBottom: 'var(--space-lg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-md" style={{ paddingTop: 'var(--space-sm)' }}>
        <div className="flex items-center gap-sm">
          <button className="page-back-btn" onClick={() => navigate('/admin/matches')}>←</button>
          <div>
            <h1 className="heading-sm">Live Scoring</h1>
            <div className="text-tiny">
              Inn {currentInnings} • {battingTeamName} • {batterMode === 1 ? '1 Bat' : '2 Bat'} • {maxOvers} ov
            </div>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={shareWhatsApp} title="Share on WhatsApp" style={{ fontSize: 16, padding: '4px 10px' }}>📤</button>
      </div>

      <div className="scoring-panel">
        {/* Score Display */}
        <div className="scoring-score-display">
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>
            {battingTeamName}
          </div>
          <div className="scoring-runs">
            {totalRuns}/{totalWickets}
          </div>
          <div className="scoring-overs">
            Overs: {getOversDisplay(totalBalls)} / {maxOvers}
          </div>

          {/* Target Info */}
          {target !== null && (
            <div style={{
              margin: '6px auto', padding: '4px 14px',
              background: requiredRuns <= 20 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
              borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 600,
              color: requiredRuns <= 20 ? 'var(--accent-green)' : 'var(--accent-yellow)', display: 'inline-block'
            }}>
              Target: {target} • Need {requiredRuns} from {Math.max(0, maxOvers * 6 - totalBalls)} balls
            </div>
          )}

          {/* Current Batsmen */}
          <div className="scoring-batsmen">
            {!batting[striker] ? (
              <button 
                className="btn btn-primary btn-lg" 
                onClick={() => setShowNewBatsman(true)} 
                style={{ flex: 1, padding: '24px 12px', fontSize: 'var(--text-base)', border: '2px solid var(--accent-green)' }}
              >
                + Select Striker
              </button>
            ) : (
              <div 
                className="batsman-card on-strike" 
                onClick={() => { setIsChangingPlayer(true); setChangingPlayerType('striker'); setShowNewBatsman(true); }}
                style={{ cursor: 'pointer' }}
              >
                <div className="batsman-name">
                  {batting[striker].name} *
                  {batting[striker].is_captain && <span className="text-tiny" style={{ color: 'var(--accent-red)', marginLeft: 2 }}>(C)</span>}
                  {batting[striker].is_wicketkeeper && <span className="text-tiny" style={{ color: 'var(--accent-blue)', marginLeft: 2 }}>(WK)</span>}
                </div>
                <div className="batsman-score">{batting[striker].runs}</div>
                <div className="batsman-balls">({batting[striker].balls})</div>
              </div>
            )}
            
            {batterMode === 2 && (
              !batting[nonStriker] ? (
                <button 
                  className="btn btn-outline btn-lg" 
                  onClick={() => { setIsChangingPlayer(false); setShowNewBatsman(true); }} 
                  style={{ flex: 1, padding: '24px 12px', fontSize: 'var(--text-base)', borderStyle: 'dashed', borderWidth: 2 }}
                >
                  + Select Non-Striker
                </button>
              ) : (
                <div 
                  className="batsman-card"
                  onClick={() => { setIsChangingPlayer(true); setChangingPlayerType('nonStriker'); setShowNewBatsman(true); }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="batsman-name">
                    {batting[nonStriker].name}
                    {batting[nonStriker].is_captain && <span className="text-tiny" style={{ color: 'var(--accent-red)', marginLeft: 2 }}>(C)</span>}
                    {batting[nonStriker].is_wicketkeeper && <span className="text-tiny" style={{ color: 'var(--accent-blue)', marginLeft: 2 }}>(WK)</span>}
                  </div>
                  <div className="batsman-score">{batting[nonStriker].runs}</div>
                  <div className="batsman-balls">({batting[nonStriker].balls})</div>
                </div>
              )
            )}
          </div>

          {/* Current Bowler */}
          {!bowling[currentBowlerIdx] ? (
             <button 
               className="btn btn-primary btn-block mt-md" 
               style={{ padding: '20px 12px', fontSize: 'var(--text-base)', border: '2px solid var(--accent-blue)', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }} 
               onClick={() => { setIsChangingPlayer(false); setShowNewBowler(true); }}
             >
               + SELECT OPENING BOWLER
             </button>
          ) : (
            <div 
              className="bowler-card"
              onClick={() => { setIsChangingPlayer(true); setChangingPlayerType('bowler'); setShowNewBowler(true); }}
            >
              <div className="bowler-info">
                <span className="bowler-icon">🎯</span>
                <div className="bowler-details">
                  <div className="bowler-name">
                    {bowling[currentBowlerIdx].name}
                    {bowling[currentBowlerIdx].is_captain && <span className="text-tiny" style={{ color: 'var(--accent-red)', marginLeft: 2 }}>(C)</span>}
                    {bowling[currentBowlerIdx].is_wicketkeeper && <span className="text-tiny" style={{ color: 'var(--accent-blue)', marginLeft: 2 }}>(WK)</span>}
                  </div>
                  <div className="bowler-stats">{bowling[currentBowlerIdx].overs}.{bowling[currentBowlerIdx].ballsInOver || 0}-{bowling[currentBowlerIdx].wickets}-{bowling[currentBowlerIdx].runs}</div>
                </div>
              </div>
              <div className="bowler-change-label">CHANGE</div>
            </div>
          )}
        </div>

        {/* Ball Timeline */}
        {balls.length > 0 && (
          <BallTimeline balls={balls.slice(-18)} />
        )}

        {/* Run Buttons */}
        <div className="run-buttons">
          {[0, 1, 2, 3, 4, 6].map(r => (
            <button
              key={r}
              className={`run-btn run-btn-${r}`}
              onClick={() => addRuns(r)}
              id={`run-btn-${r}`}
            >
              {r === 0 ? "•" : r}
            </button>
          ))}
        </div>

        {/* Action Buttons - Row 1 */}
        <div className="action-buttons-big">
          <button className="action-btn-big action-btn-wicket" onClick={handleWicket} id="wicket-btn">
            <span className="btn-icon">❌</span>
            <span className="btn-label">WICKET</span>
          </button>
        </div>

        {/* Action Buttons - Row 2 */}
        <div className="action-buttons">
          <button className="action-btn action-btn-wide" onClick={addWide} id="wide-btn">
            <span className="btn-label-small">WIDE</span>
            <span className="btn-sub">WD</span>
          </button>
          <button className="action-btn action-btn-noball" onClick={() => { setNoBallRuns(0); setShowNoBallModal(true); }} id="noball-btn">
            <span className="btn-label-small">NO BALL</span>
            <span className="btn-sub">NB</span>
          </button>
          <button className="action-btn action-btn-swap" onClick={swapStrike} id="swap-btn">
             <span className="btn-label-small">SWAP</span>
             <span className="btn-sub">🔄</span>
          </button>
        </div>

        {/* Action Buttons - Row 3 */}
        <div className="action-buttons">
          <button className="action-btn action-btn-bye" onClick={() => { setByeRuns(1); setShowByeModal(true); }} id="bye-btn">
            <span className="btn-label-small">BYE</span>
            <span className="btn-sub">B</span>
          </button>
          <button className="action-btn action-btn-legbye" onClick={() => { setByeRuns(1); setShowByeModal(true); }} id="legbye-btn">
            <span className="btn-label-small">LEG BYE</span>
            <span className="btn-sub">LB</span>
          </button>
          <button className="action-btn action-btn-undo" onClick={undoLastBall} id="undo-btn">
            <span className="btn-label-small">UNDO</span>
            <span className="btn-sub">↩</span>
          </button>
        </div>

        {/* Action Buttons - Row 4 */}
        <div className="action-buttons-full mt-sm">
          <button className="action-btn-full action-btn-endinn" onClick={() => setShowEndInnings(true)} id="end-innings-btn">
            ⏭ END INNINGS
          </button>
        </div>
      </div>

      {/* Wicket Modal */}
      {showWicketModal && (
        <Modal title="Wicket!" onClose={() => setShowWicketModal(false)}>
          {batterMode === 2 && (
            <div className="form-group">
              <label className="form-label">Who got out?</label>
              <div className="flex gap-sm">
                <button 
                  className={`btn btn-block ${wicketBatsman === 0 ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setWicketBatsman(0)}
                  style={{ flex: 1 }}
                >
                  {batting[striker]?.name || 'Striker'}
                </button>
                <button 
                  className={`btn btn-block ${wicketBatsman === 1 ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setWicketBatsman(1)}
                  style={{ flex: 1 }}
                >
                  {batting[nonStriker]?.name || 'Non-Striker'}
                </button>
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Dismissal Type</label>
            <select className="form-select" value={wicketType} onChange={e => setWicketType(e.target.value)} id="wicket-type-select">
              <option value="bowled">Bowled</option>
              <option value="caught">Caught</option>
              <option value="lbw">LBW</option>
              <option value="run out">Run Out</option>
              <option value="stumped">Stumped</option>
              <option value="hit wicket">Hit Wicket</option>
            </select>
          </div>
          {['caught', 'run out', 'stumped'].includes(wicketType) && (
            <div className="form-group mt-sm" style={{ position: 'relative' }}>
              <label className="form-label">Fielder Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Virat Kohli (optional)" 
                value={fielderName}
                onChange={e => setFielderName(e.target.value)}
                id="fielder-name-input"
                autoComplete="off"
              />
              {fielderName.length > 0 && bowlingTeamPlayers.length > 0 && (() => {
                const matches = bowlingTeamPlayers.filter(p => 
                  p.name.toLowerCase().startsWith(fielderName.toLowerCase()) && 
                  p.name.toLowerCase() !== fielderName.toLowerCase()
                );
                return matches.length > 0 ? (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '4px', background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', maxHeight: 150, overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    {matches.map(p => (
                      <div
                        key={p.id}
                        onClick={() => setFielderName(p.name)}
                        style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                      >
                        <div className="flex items-center gap-sm">
                          {p.photo_url ? (
                            <img src={p.photo_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-surface)', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)', fontWeight: 'bold' }}>{p.name.charAt(0)}</div>
                          )}
                          <span>{p.name} <span className="text-tiny text-muted">({p.role})</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          )}
          <button className="btn btn-danger btn-block mt-md" onClick={confirmWicket} id="confirm-wicket-btn">
            Confirm Wicket
          </button>
        </Modal>
      )}

      {/* New Batsman Modal */}
      {showNewBatsman && (
        <Modal title="New Batsman" onClose={() => { setShowNewBatsman(false); setPlayerSearchText(''); setSelectedPlayerId(''); }}>
          <div className="form-group">
            <label className="form-label">Search / Enter Batsman Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Virat Kohli"
              value={playerSearchText}
              onChange={e => {
                setPlayerSearchText(e.target.value);
                setSelectedPlayerId(e.target.value);
              }}
              autoFocus
              id="new-batsman-input"
            />
            {playerSearchText.length > 0 && teamPlayers.length > 0 && (() => {
              const matches = teamPlayers
                .filter(p => !batting.some(b => b.name === p.name))
                .filter(p => p.name.toLowerCase().startsWith(playerSearchText.toLowerCase()));
              return matches.length > 0 ? (
                <div style={{ marginTop: 'var(--space-sm)', background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', maxHeight: 150, overflowY: 'auto' }}>
                  {matches.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedPlayerId(p.id); setPlayerSearchText(p.name); }}
                      style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', background: selectedPlayerId === p.id ? 'var(--bg-surface)' : 'transparent' }}
                    >
                      <div className="flex items-center gap-sm">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-surface)', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)', fontWeight: 'bold' }}>{p.name.charAt(0)}</div>
                        )}
                        <span>{p.name} <span className="text-tiny text-muted">({p.role})</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}
          </div>

          <div className="form-group" style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <label className="flex items-center gap-xs cursor-pointer">
              <input 
                type="checkbox" 
                checked={tempIsCaptain} 
                onChange={e => setTempIsCaptain(e.target.checked)} 
              />
              <span className="text-sm">Captain (C)</span>
            </label>
            <label className="flex items-center gap-xs cursor-pointer">
              <input 
                type="checkbox" 
                checked={tempIsWK} 
                onChange={e => setTempIsWK(e.target.checked)} 
              />
              <span className="text-sm">Wicketkeeper (WK)</span>
            </label>
          </div>

          <button className="btn btn-primary btn-block" onClick={addNewBatsman} id="add-batsman-btn" disabled={!playerSearchText}>
            Add Batsman
          </button>
        </Modal>
      )}

      {/* New Bowler Modal */}
      {showNewBowler && (
        <Modal title="New Over - Select Bowler" onClose={() => { setShowNewBowler(false); setPlayerSearchText(''); setSelectedPlayerId(''); }}>
          <div className="form-group">
            <label className="form-label">Search / Enter Bowler Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Jasprit Bumrah"
              value={playerSearchText}
              onChange={e => {
                setPlayerSearchText(e.target.value);
                setSelectedPlayerId(e.target.value);
              }}
              autoFocus
              id="new-bowler-input"
            />
            {playerSearchText.length > 0 && bowlingTeamPlayers.length > 0 && (() => {
              const matches = bowlingTeamPlayers.filter(p => p.name.toLowerCase().startsWith(playerSearchText.toLowerCase()));
              return matches.length > 0 ? (
                <div style={{ marginTop: 'var(--space-sm)', background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', maxHeight: 150, overflowY: 'auto' }}>
                  {matches.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedPlayerId(p.id); setPlayerSearchText(p.name); }}
                      style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', background: selectedPlayerId === p.id ? 'var(--bg-surface)' : 'transparent' }}
                    >
                      <div className="flex items-center gap-sm">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-surface)', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-red)', fontWeight: 'bold' }}>{p.name.charAt(0)}</div>
                        )}
                        <span>{p.name} <span className="text-tiny text-muted">({p.role})</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}
          </div>

          <div className="form-group" style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <label className="flex items-center gap-xs cursor-pointer">
              <input 
                type="checkbox" 
                checked={tempIsCaptain} 
                onChange={e => setTempIsCaptain(e.target.checked)} 
              />
              <span className="text-sm">Captain (C)</span>
            </label>
            <label className="flex items-center gap-xs cursor-pointer">
              <input 
                type="checkbox" 
                checked={tempIsWK} 
                onChange={e => setTempIsWK(e.target.checked)} 
              />
              <span className="text-sm">Wicketkeeper (WK)</span>
            </label>
          </div>

          <button className="btn btn-primary btn-block" onClick={addNewBowler} id="select-bowler-btn" disabled={!playerSearchText}>
            Start Over
          </button>
        </Modal>
      )}

      {/* No Ball Modal */}
      {showNoBallModal && (
        <Modal title="No Ball + Runs" onClose={() => setShowNoBallModal(false)}>
          <div className="form-group">
            <label className="form-label">Runs from Bat</label>
            <div className="flex gap-xs">
              {[0, 1, 2, 3, 4, 6].map(r => (
                <button
                  key={r}
                  className={`btn btn-sm ${noBallRuns === r ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setNoBallRuns(r)}
                  style={{ flex: 1 }}
                >
                  {r === 0 ? "0" : r}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-md">
            <button className="btn btn-primary btn-block" onClick={() => addNoBall(noBallRuns)}>
              Confirm No Ball {noBallRuns > 0 ? `+ ${noBallRuns} Runs` : ''}
            </button>
          </div>
        </Modal>
      )}

      {/* Bye / Leg Bye Modal */}
      {showByeModal && (
        <Modal title="Bye / Leg Bye" onClose={() => setShowByeModal(false)}>
          <div className="form-group">
            <label className="form-label">Runs</label>
            <div className="flex gap-xs">
              {[1, 2, 3, 4].map(r => (
                <button
                  key={r}
                  className={`btn btn-sm ${byeRuns === r ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setByeRuns(r)}
                  style={{ flex: 1 }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-sm mt-md">
            <button className="btn btn-block" onClick={() => addBye(byeRuns)} style={{ flex: 1, background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(139,92,246,0.3)' }}>
              Bye ({byeRuns})
            </button>
            <button className="btn btn-block" onClick={() => addLegBye(byeRuns)} style={{ flex: 1, background: 'rgba(14,165,233,0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(14,165,233,0.3)' }}>
              Leg Bye ({byeRuns})
            </button>
          </div>
        </Modal>
      )}

      {/* End Innings Confirmation */}
      {showEndInnings && (
        <Modal title="End Innings?" onClose={() => setShowEndInnings(false)}>
          <p className="text-body mb-md">
            Are you sure you want to end innings {currentInnings}?
          </p>
          <p className="text-body mb-md" style={{ fontWeight: 600 }}>
            {battingTeamName}: {totalRuns}/{totalWickets} ({getOversDisplay(totalBalls)})
          </p>
          <div className="flex gap-sm">
            <button className="btn btn-outline btn-block" onClick={() => setShowEndInnings(false)}>Cancel</button>
            <button className="btn btn-primary btn-block" onClick={endInnings} id="confirm-end-innings">
              End Innings
            </button>
          </div>
        </Modal>
      )}

      {/* Result Modal */}
      {showResultModal && (
        <Modal title="🏆 Match Result" onClose={() => setShowResultModal(false)}>
          <div className="form-group">
            <label className="form-label">Result Summary</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Team A won by 5 wickets"
              value={resultText}
              onChange={e => setResultText(e.target.value)}
              id="result-input"
            />
            <div className="text-tiny mt-sm" style={{ color: 'var(--accent-green)' }}>
              Auto: {autoResult() || 'Will be calculated'}
            </div>
          </div>
          <button className="btn btn-primary btn-block" onClick={finishMatch} id="finish-match-btn">
            Finish Match
          </button>
        </Modal>
      )}
    </div>
  );
}
