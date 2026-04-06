import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Loader from '../components/Loader';
import StatusBadge from '../components/StatusBadge';

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('table');

  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [pointsTable, setPointsTable] = useState([]);

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  async function fetchTournamentData() {
    try {
      const snap = await getDoc(doc(db, 'tournaments', id));
      if (!snap.exists()) return navigate('/tournaments');
      setTournament({ id: snap.id, ...snap.data() });

      // Fetch teams and matches simultaneously
      const [teamSnap, matchSnap] = await Promise.all([
        getDocs(query(collection(db, 'tournament_teams'), where('tournamentId', '==', id))),
        getDocs(query(collection(db, 'matches'), where('tournamentId', '==', id)))
      ]);

      const teamData = teamSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const matchData = matchSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      setTeams(teamData);
      setMatches(matchData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      calculatePointsTable(teamData, matchData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function calculatePointsTable(teamData, matchData) {
    const table = teamData.map(team => {
      const teamMatches = matchData.filter(m => (m.teamA?.id === team.id || m.teamB?.id === team.id) && m.status === 'finished');
      let wins = 0, losses = 0, ties = 0, points = 0;
      let runsScored = 0, oversFaced = 0, runsConceded = 0, oversBowled = 0;

      teamMatches.forEach(m => {
        const isTeamA = m.teamA?.id === team.id;
        const result = m.winner;
        if ((isTeamA && result === 'teamA') || (!isTeamA && result === 'teamB')) { wins++; points += 2; }
        else if (result === 'tie') { ties++; points += 1; }
        else losses++;

        if (isTeamA) {
          runsScored += m.teamA?.score || 0; oversFaced += Number(m.teamA?.overs || 0);
          runsConceded += m.teamB?.score || 0; oversBowled += Number(m.teamB?.overs || 0);
        } else {
          runsScored += m.teamB?.score || 0; oversFaced += Number(m.teamB?.overs || 0);
          runsConceded += m.teamA?.score || 0; oversBowled += Number(m.teamA?.overs || 0);
        }
      });

      const nrr = (oversFaced > 0 && oversBowled > 0) ? (runsScored / oversFaced) - (runsConceded / oversBowled) : 0;
      return { ...team, matches: teamMatches.length, wins, losses, ties, points, nrr: nrr.toFixed(3) };
    });

    table.sort((a, b) => b.points - a.points || b.nrr - a.nrr);
    setPointsTable(table);
  }

  if (loading) return <Loader />;

  return (
    <div className="page-content" style={{ paddingBottom: 'var(--space-2xl)' }}>
      <div className="header mb-lg">
        <button className="page-back-btn" onClick={() => navigate('/tournaments')}>←</button>
        <div style={{ marginTop: 'var(--space-sm)' }}>
          <h1 className="heading-md">{tournament?.name}</h1>
          <div className="flex gap-sm items-center mt-xs">
            <StatusBadge status={tournament?.status} />
            <span className="text-tiny" style={{ opacity: 0.6 }}>Season {tournament?.season}</span>
          </div>
        </div>
      </div>

      <div className="tabs mb-lg">
        {['table', 'matches'].map(tab => (
          <button 
            key={tab} 
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'table' ? 'Standings' : 'Fixtures'}
          </button>
        ))}
      </div>

      {activeTab === 'table' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-body px-0" style={{ padding: 0 }}>
            <table className="score-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 'var(--space-md)' }}>Team</th>
                  <th>M</th>
                  <th>W</th>
                  <th>L</th>
                  <th>NRR</th>
                  <th style={{ paddingRight: 'var(--space-md)' }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {pointsTable.map((t, idx) => (
                  <tr key={t.id} className={idx < 4 ? 'highlight-row' : ''}>
                    <td style={{ paddingLeft: 'var(--space-md)' }}>
                      <div className="flex items-center gap-sm">
                        <span className="text-tiny opacity-40" style={{ width: 10 }}>{idx + 1}</span>
                        <div className="team-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{t.name[0]}</div>
                        <span className="font-bold">{t.name}</span>
                      </div>
                    </td>
                    <td>{t.matches}</td>
                    <td>{t.wins}</td>
                    <td>{t.losses}</td>
                    <td style={{ color: Number(t.nrr) >= 0 ? 'var(--accent-green)' : 'var(--text-error)' }}>
                        {Number(t.nrr) > 0 ? '+' : ''}{t.nrr}
                    </td>
                    <td style={{ paddingRight: 'var(--space-md)', fontWeight: 800 }}>{t.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="flex flex-col gap-md">
          {matches.map(m => (
            <div key={m.id} className="card" onClick={() => navigate(`/match/${m.id}`)} style={{ cursor: 'pointer' }}>
               <div className="card-body py-md">
                <div className="flex justify-between items-center mb-sm">
                  <StatusBadge status={m.status} />
                  <span className="text-tiny" style={{ opacity: 0.5 }}>#{m.id.slice(-4).toUpperCase()}</span>
                </div>
                <div className="match-card-teams flex items-center justify-between" style={{ gap: 'var(--space-md)' }}>
                  <div className="flex flex-col items-center gap-xs" style={{ width: '40%' }}>
                    <div className="team-avatar" style={{ width: 44, height: 44 }}>{m.teamA.name[0]}</div>
                    <span className="text-tiny text-center font-bold">{m.teamA.name}</span>
                  </div>
                  <div className="text-tiny font-bold opacity-30 text-center flex-1">VS</div>
                  <div className="flex flex-col items-center gap-xs" style={{ width: '40%' }}>
                    <div className="team-avatar" style={{ width: 44, height: 44 }}>{m.teamB.name[0]}</div>
                    <span className="text-tiny text-center font-bold">{m.teamB.name}</span>
                  </div>
                </div>
                {m.result && (
                  <div className="mt-md pt-md text-tiny text-center font-bold" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--accent-green)' }}>
                    🏆 {m.result}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
