import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import ScoreTable from '../components/ScoreTable';
import BallTimeline from '../components/BallTimeline';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
}

export default function MatchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState([]);
  const [activeTab, setActiveTab] = useState('scorecard');
  const [activeInnings, setActiveInnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for live updates
    const unsub = onSnapshot(doc(db, 'matches', id), (snap) => {
      if (snap.exists()) {
        setMatch({ id: snap.id, ...snap.data() });
      }
    });

    fetchInnings();
    return unsub;
  }, [id]);

  async function fetchInnings() {
    try {
      // Fetch fresh logos from teams collection fallback
      const matchDoc = await getDoc(doc(db, 'matches', id));
      if (!matchDoc.exists()) return;
      const matchData = matchDoc.data();
      
      const teamSnap = await getDocs(collection(db, 'teams'));
      const teamDetails = {};
      teamSnap.docs.forEach(d => { 
        teamDetails[d.id] = d.data(); 
      });
      
      if (matchData.teamA && teamDetails[matchData.teamA.id]) {
        const oldName = matchData.teamA.name;
        const newName = teamDetails[matchData.teamA.id].name;
        if (oldName !== newName && matchData.result) {
          matchData.result = matchData.result.replaceAll(oldName, newName);
        }
        matchData.teamA.name = newName;
        matchData.teamA.logo_url = teamDetails[matchData.teamA.id].logo_url || null;
      }
      if (matchData.teamB && teamDetails[matchData.teamB.id]) {
        const oldName = matchData.teamB.name;
        const newName = teamDetails[matchData.teamB.id].name;
        if (oldName !== newName && matchData.result) {
          matchData.result = matchData.result.replaceAll(oldName, newName);
        }
        matchData.teamB.name = newName;
        matchData.teamB.logo_url = teamDetails[matchData.teamB.id].logo_url || null;
      }
      setMatch({ id: matchDoc.id, ...matchData });

      const inningsSnap = await getDocs(collection(db, 'matches', id, 'innings'));
      const inn = inningsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      inn.sort((a, b) => (a.inningsNumber || 0) - (b.inningsNumber || 0));
      setInnings(inn);
    } catch (err) {
      console.error('Error fetching innings:', err);
    } finally {
      setLoading(false);
    }
  }

  // Refetch innings periodically for live matches
  useEffect(() => {
    if (match?.status === 'live') {
      const interval = setInterval(fetchInnings, 10000);
      return () => clearInterval(interval);
    }
  }, [match?.status]);

  if (loading) return <Loader />;

  if (!match) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <div className="empty-state-title">Match not found</div>
          <button className="btn btn-outline mt-md" onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    );
  }

  const { teamA, teamB, status, winner, result } = match;
  const currentInnings = innings[activeInnings];

  return (
    <div className="page-content">
      {/* Back button */}
      <button className="page-back-btn" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-md)' }}>
        ←
      </button>

      {/* Match Header */}
      <div className="card" style={{ marginBottom: 'var(--space-md)', background: 'linear-gradient(135deg, var(--bg-card), var(--bg-surface))' }}>
        <div className="card-body">
          <div className="flex justify-between items-center mb-sm">
            <StatusBadge status={status} />
            <div className="flex gap-sm items-center">
              {match.matchDate && (
                <span className="text-tiny">
                  {new Date(match.matchDate?.seconds ? match.matchDate.seconds * 1000 : match.matchDate).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </span>
              )}
              <button 
                className="btn btn-outline btn-sm" 
                title="Share on WhatsApp"
                style={{ padding: '2px 8px', fontSize: 14 }}
                onClick={() => {
                  const tA = match?.teamA;
                  const tB = match?.teamB;
                  const text = `🏏 *SCORELI LOCAL SCORING*\n\n${tA?.name}: ${tA?.score ?? 0}/${tA?.wickets ?? 0} (${tA?.overs ?? 0} ov)\n${tB?.name}: ${tB?.score ?? 0}/${tB?.wickets ?? 0} (${tB?.overs ?? 0} ov)\n\n${match?.result ? '🏆 ' + match.result : 'Live Match in Progress!'}\n\n📲 Made with Scoreli`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
              >📤</button>
            </div>
          </div>

          <div className="match-card-teams">
            <div className={`match-team ${winner === 'teamA' ? 'winner-team' : ''}`}>
              {teamA?.logo_url ? (
                <img src={teamA.logo_url} alt={teamA.name} className="team-avatar" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="team-avatar">{getInitials(teamA?.name)}</div>
              )}
              <div className="team-name">{teamA?.name}</div>
              <div className="team-score">
                {teamA?.score ?? '-'}/{teamA?.wickets ?? 0}
                <span> ({teamA?.overs ?? 0})</span>
              </div>
            </div>
            <div className="match-vs">VS</div>
            <div className={`match-team ${winner === 'teamB' ? 'winner-team' : ''}`}>
              {teamB?.logo_url ? (
                <img src={teamB.logo_url} alt={teamB.name} className="team-avatar" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="team-avatar">{getInitials(teamB?.name)}</div>
              )}
              <div className="team-name">{teamB?.name}</div>
              <div className="team-score">
                {teamB?.score ?? '-'}/{teamB?.wickets ?? 0}
                <span> ({teamB?.overs ?? 0})</span>
              </div>
            </div>
          </div>

          {result && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-md)', padding: 'var(--space-sm)', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>🏆 {result}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ball Timeline */}
      {currentInnings?.balls?.length > 0 && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <BallTimeline balls={currentInnings.balls.slice(-24)} />
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'scorecard'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Innings Selector */}
      {innings.length > 1 && (
        <div className="tabs" style={{ marginBottom: 'var(--space-md)' }}>
          {innings.map((inn, i) => (
            <button
              key={inn.id}
              className={`tab ${activeInnings === i ? 'active' : ''}`}
              onClick={() => setActiveInnings(i)}
            >
              {inn.teamName || `Innings ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <div className="card mb-md">
            <div className="card-body">
              <h3 className="heading-sm mb-sm">Match Info</h3>
              <div className="flex flex-col gap-xs">
                <div className="flex justify-between">
                  <span className="text-small">Status</span>
                  <StatusBadge status={status} />
                </div>
                {match.matchDate && (
                  <div className="flex justify-between">
                    <span className="text-small">Date</span>
                    <span className="text-small" style={{ color: 'var(--text-primary)' }}>
                      {new Date(match.matchDate?.seconds ? match.matchDate.seconds * 1000 : match.matchDate).toLocaleDateString('en-IN', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {result && (
                  <div className="flex justify-between">
                    <span className="text-small">Result</span>
                    <span className="text-small" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{result}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Extras */}
          {currentInnings && (
            <div className="card">
              <div className="card-body">
                <h3 className="heading-sm mb-sm">Extras</h3>
                <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                  <span className="text-small">Wides: {currentInnings.extras?.wides || 0}</span>
                  <span className="text-small">No Balls: {currentInnings.extras?.noBalls || 0}</span>
                  <span className="text-small">Byes: {currentInnings.extras?.byes || 0}</span>
                  <span className="text-small">Total: {(currentInnings.extras?.wides || 0) + (currentInnings.extras?.noBalls || 0) + (currentInnings.extras?.byes || 0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scorecard' && currentInnings && (
        <div>
          {/* Batting */}
          <div className="card mb-md">
            <div className="card-body">
              <ScoreTable type="batting" data={currentInnings.batting || []} />
            </div>
          </div>

          {/* Bowling */}
          <div className="card">
            <div className="card-body">
              <ScoreTable type="bowling" data={currentInnings.bowling || []} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scorecard' && !currentInnings && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Scorecard not available</div>
          <div className="empty-state-text">Scoring hasn't started yet</div>
        </div>
      )}
    </div>
  );
}
