import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../../components/Loader';
import StatusBadge from '../../components/StatusBadge';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ matches: 0, live: 0, teams: 0, players: 0 });
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const [matchSnap, teamSnap, playerSnap] = await Promise.all([
        getDocs(collection(db, 'matches')),
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'players'))
      ]);

      const allMatches = matchSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const liveCount = allMatches.filter(m => m.status === 'live').length;

      setStats({
        matches: allMatches.length,
        live: liveCount,
        teams: teamSnap.size,
        players: playerSnap.size
      });

      setRecentMatches(
        allMatches.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5)
      );
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  if (loading) return <Loader />;

  return (
    <div className="page-content">
      <div className="flex justify-between items-center mb-lg" style={{ paddingTop: 'var(--space-sm)' }}>
        <div className="flex items-center gap-sm">
          <button className="page-back-btn" onClick={() => navigate('/')} title="Back to Site">←</button>
          <div>
            <h1 className="heading-md">Dashboard</h1>
            <p className="text-small">{user?.email}</p>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleLogout} id="logout-btn">
          Logout
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <div className="stat-card">
          <div className="stat-card-value">{stats.matches}</div>
          <div className="stat-card-label">Total Matches</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ background: 'linear-gradient(135deg, var(--accent-red), var(--accent-orange))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {stats.live}
          </div>
          <div className="stat-card-label">Live Now</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.teams}</div>
          <div className="stat-card-label">Teams</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.players}</div>
          <div className="stat-card-label">Players</div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="heading-sm mb-md">Quick Actions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <button className="btn btn-primary btn-block" onClick={() => navigate('/admin/tournaments')} id="manage-tournaments-btn" style={{ gridColumn: 'span 2' }}>
          🏆 Tournaments
        </button>
        <button className="btn btn-secondary btn-block" onClick={() => navigate('/admin/matches/new')} id="create-match-btn">
          🏏 New Match
        </button>
        <button className="btn btn-secondary btn-block" onClick={() => navigate('/admin/teams')} id="manage-teams-btn">
          👥 Teams
        </button>
        <button className="btn btn-secondary btn-block" onClick={() => navigate('/admin/players')} id="manage-players-btn">
          👤 Players
        </button>
        <button className="btn btn-secondary btn-block" onClick={() => navigate('/admin/matches')} id="all-matches-btn">
          📋 All Matches
        </button>
        <button className="btn btn-outline btn-block" onClick={async () => {
          try {
            setLoading(true);
            const data = {
              teamA: { name: "India", score: 212, wickets: 3, overs: "20.0", color: "#1E88E5", info: 'IND' },
              teamB: { name: "Australia", score: 180, wickets: 8, overs: "18.4", color: "#FDD835", info: 'AUS' },
              status: 'live',
              published: true,
              overs: 20,
              createdAt: new Date(),
              currentInnings: 2,
              battingTeamId: 'teamB',
              bowlingTeamId: 'teamA',
              batting: {
                currentStriker: { id: 'p1', name: "Glenn Maxwell", runs: 45, balls: 22, fours: 3, sixes: 4, photo_url: 'https://i.pravatar.cc/150?u=maxwell' },
                currentNonStriker: { id: 'p2', name: "Pat Cummins", runs: 12, balls: 8, fours: 1, sixes: 0, photo_url: 'https://i.pravatar.cc/150?u=cummins' }
              },
              bowling: {
                currentBowler: { id: 'p3', name: "Jasprit Bumrah", overs: 3.4, runs: 22, wickets: 3, maidens: 0, photo_url: 'https://i.pravatar.cc/150?u=bumrah' }
              },
              scorecard: {
                teamB: {
                  batting: [
                    { id: 'a1', name: 'David Warner', runs: 10, balls: 8, fours: 2, sixes: 0, out: true, dismissal: 'lbw Bumrah', photo_url: 'https://i.pravatar.cc/150?u=warner' },
                    { id: 'a2', name: 'Marnus L.', runs: 25, balls: 20, fours: 2, sixes: 1, out: true, dismissal: 'c Kohli b Ashwin', photo_url: 'https://i.pravatar.cc/150?u=marnus' },
                    { id: 'p1', name: "Glenn Maxwell", runs: 45, balls: 22, fours: 3, sixes: 4, out: false, dismissal: 'not out', photo_url: 'https://i.pravatar.cc/150?u=maxwell' },
                    { id: 'p2', name: "Pat Cummins", runs: 12, balls: 8, fours: 1, sixes: 0, out: false, dismissal: 'not out', photo_url: 'https://i.pravatar.cc/150?u=cummins' }
                  ],
                  bowling: [
                    { id: 'b1', name: 'Mitchell Starc', overs: 4, runs: 42, wickets: 1, maidens: 0, photo_url: 'https://i.pravatar.cc/150?u=starc' },
                    { id: 'b2', name: 'Adam Zampa', overs: 4, runs: 30, wickets: 1, maidens: 0, photo_url: 'https://i.pravatar.cc/150?u=zampa' }
                  ]
                },
                teamA: {
                  batting: [
                    { id: 'i1', name: 'Rohit Sharma', runs: 85, balls: 45, fours: 10, sixes: 5, out: true, dismissal: 'c Smith b Starc', photo_url: 'https://i.pravatar.cc/150?u=rohit' },
                    { id: 'i2', name: 'Virat Kohli', runs: 60, balls: 40, fours: 5, sixes: 2, out: true, dismissal: 'b Zampa', photo_url: 'https://i.pravatar.cc/150?u=kohli' },
                    { id: 'i3', name: 'Suryakumar', runs: 45, balls: 20, fours: 4, sixes: 4, out: false, dismissal: 'not out', photo_url: 'https://i.pravatar.cc/150?u=surya' }
                  ],
                  bowling: [
                    { id: 'p3', name: "Jasprit Bumrah", overs: 3.4, runs: 22, wickets: 3, maidens: 0, photo_url: 'https://i.pravatar.cc/150?u=bumrah' },
                    { id: 'c1', name: 'R. Ashwin', overs: 4, runs: 35, wickets: 2, maidens: 0, photo_url: 'https://i.pravatar.cc/150?u=ashwin' }
                  ]
                }
              },
              timeline: [
                { type: 'run', runs: 1, batsman: 'Maxwell' },
                { type: 'run', runs: 4, batsman: 'Cummins' },
                { type: 'wicket', dismissal: 'bowled', batsman: 'Zampa' },
                { type: 'run', runs: 0, batsman: 'Zampa' },
                { type: 'run', runs: 6, batsman: 'Maxwell' },
                { type: 'run', runs: 1, batsman: 'Maxwell' }
              ]
            };
            const m = await import('firebase/firestore');
            const docRef = await m.addDoc(m.collection(db, 'matches'), data);
            navigate('/match/' + docRef.id);
          } catch (e) {
            console.error(e);
            setLoading(false);
          }
        }} id="seed-match-btn" style={{ gridColumn: 'span 2' }}>
          🧪 Generate Demo Scorecard
        </button>
      </div>

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <>
          <h2 className="heading-sm mb-md">Recent Matches</h2>
          <div className="flex flex-col gap-sm">
            {recentMatches.map(m => (
              <div
                key={m.id}
                className="card"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/admin/scoring/${m.id}`)}
              >
                <div className="card-body" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                        {m.teamA?.name || 'TBA'} vs {m.teamB?.name || 'TBA'}
                      </div>
                      <div className="text-tiny">
                        {m.teamA?.score ?? '-'}/{m.teamA?.wickets ?? 0} • {m.teamB?.score ?? '-'}/{m.teamB?.wickets ?? 0}
                      </div>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
